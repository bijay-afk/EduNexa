import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface JsonCompletion {
  json: unknown;
  promptTokens: number;
  completionTokens: number;
}

export type Provider = 'openai' | 'ollama';

/**
 * Chat/completions + embeddings client with pluggable providers:
 *
 * - `openai`: OpenAI (or any OpenAI-compatible base URL with a Bearer key).
 *   Chat calls use `response_format: { type: 'json_object' }`.
 * - `ollama`: fully free local inference (defaults to http://localhost:11434,
 *   no API key). Chat goes through the OpenAI-compatible `/v1/chat/completions`
 *   endpoint; embeddings use the native `/api/embed` endpoint because Ollama's
 *   OpenAI-compat surface has no `/embeddings`.
 *
 * The response is untrusted data: every field is re-validated server-side by
 * the AiGenerationService (zod) regardless of provider.
 *
 * Reads AI_PROVIDER / AI_API_KEY / AI_MODEL / AI_CHAT_BASE_URL /
 * AI_EMBEDDING_MODEL / AI_EMBEDDING_BASE_URL from the validated env.
 */
@Injectable()
export class LlmProvider {
  constructor(private readonly config: ConfigService) {}

  get provider(): Provider {
    return (this.config.get<string>('AI_PROVIDER') ?? 'openai') as Provider;
  }

  get isConfigured(): boolean {
    // Ollama needs no credentials; it just needs the local service running.
    if (this.provider === 'ollama') return true;
    return Boolean(this.config.get<string>('AI_API_KEY'));
  }

  get model(): string {
    const explicit = this.config.get<string>('AI_MODEL');
    if (explicit) return explicit;
    return this.provider === 'ollama' ? 'llama3.2' : 'gpt-4o-mini';
  }

  private get baseUrl(): string {
    return (
      this.config.get<string>('AI_CHAT_BASE_URL') ??
      (this.provider === 'ollama' ? 'http://localhost:11434/v1' : 'https://api.openai.com/v1')
    );
  }

  private authHeaders(): Record<string, string> {
    if (this.provider === 'ollama') return {};
    const key = this.config.get<string>('AI_API_KEY');
    if (!key) return {};
    return { Authorization: `Bearer ${key}` };
  }

  async completeJson(messages: ChatMessage[], model = this.model): Promise<JsonCompletion> {
    if (this.provider === 'openai' && !this.config.get<string>('AI_API_KEY')) {
      throw new Error('AI_API_KEY is not set — trusted LLM generation is unavailable.');
    }
    const body: Record<string, unknown> = {
      model,
      messages,
      temperature: 0.4,
    };
    // Ollama ignores response_format; instructing JSON-only lives in the prompt.
    if (this.provider === 'openai') body.response_format = { type: 'json_object' };

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...this.authHeaders() },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const bodyText = await res.text();
      throw new Error(`chat/completions ${res.status}: ${bodyText.slice(0, 300)}`);
    }
    const json = (await res.json()) as {
      choices: { message: { content: string } }[];
      usage?: { prompt_tokens: number; completion_tokens: number };
    };
    const raw = json.choices[0]?.message?.content;
    if (!raw) throw new Error('Empty completion from LLM provider');
    return {
      json: parseJson(raw),
      promptTokens: json.usage?.prompt_tokens ?? 0,
      completionTokens: json.usage?.completion_tokens ?? 0,
    };
  }

  /** Embed text chunks with the configured embedding model (pgvector retrieval). */
  async embedTexts(texts: string[], model?: string): Promise<number[][]> {
    const embedModel = model ?? this.embeddingModel;
    const BATCH = 128;
    const out: number[][] = [];
    for (let i = 0; i < texts.length; i += BATCH) {
      const chunk = texts.slice(i, i + BATCH);
      if (this.provider === 'ollama') {
        const root = this.ollamaEmbeddingRoot;
        const res = await fetch(`${root}/api/embed`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: embedModel, input: chunk }),
        });
        if (!res.ok) {
          const body = await res.text();
          throw new Error(`ollama /api/embed ${res.status}: ${body.slice(0, 300)}`);
        }
        const json = (await res.json()) as { embeddings: number[][] };
        if (!json.embeddings?.length) throw new Error('Ollama returned no embeddings');
        out.push(...json.embeddings);
        continue;
      }

      const key = this.config.get<string>('AI_API_KEY');
      if (!key) throw new Error('AI_API_KEY is not set — embeddings are unavailable.');
      const base =
        this.config.get<string>('AI_EMBEDDING_BASE_URL') ?? 'https://api.openai.com/v1';
      const res = await fetch(`${base}/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({ model: embedModel, input: chunk }),
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`embeddings ${res.status}: ${body.slice(0, 300)}`);
      }
      const json = (await res.json()) as { data: { index: number; embedding: number[] }[] };
      const ordered = new Array<number[]>(chunk.length);
      for (const d of json.data) ordered[d.index] = d.embedding;
      out.push(...ordered);
    }
    return out;
  }

  private get embeddingModel(): string {
    const explicit = this.config.get<string>('AI_EMBEDDING_MODEL');
    if (explicit) return explicit;
    return this.provider === 'ollama' ? 'nomic-embed-text' : 'text-embedding-3-small';
  }

  /** Ollama native API root (no /v1 suffix); /api/embed lives here. */
  private get ollamaEmbeddingRoot(): string {
    return (
      this.config.get<string>('AI_EMBEDDING_BASE_URL') ?? this.baseUrl.replace(/\/v1\/?$/, '')
    ).replace(/\/v1\/?$/, '');
  }
}

function parseJson(raw: string): unknown {
  const trimmed = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/m, '').trim();
  return JSON.parse(trimmed);
}