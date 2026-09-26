// Compute pgvector embeddings for PaperArchivePage.ocrText rows that lack them.
// Idempotent + resumable. Provider is chosen by AI_PROVIDER in apps/api/.env:
//   - openai: OpenAI-compatible /embeddings (needs AI_API_KEY)
//   - ollama: local Ollama /api/embed (free, no key; default nomic-embed-text)
//
// Run: npx tsx apps/api/prisma/embed-papers.ts
import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PROVIDER = process.env.AI_PROVIDER ?? 'openai';
const OLLAMA = PROVIDER === 'ollama';
const API_KEY = OLLAMA ? undefined : process.env.AI_API_KEY;
const MODEL =
  process.env.AI_EMBEDDING_MODEL ?? (OLLAMA ? 'nomic-embed-text' : 'text-embedding-3-small');
const BASE =
  process.env.AI_EMBEDDING_BASE_URL ?? (OLLAMA ? 'http://localhost:11434' : 'https://api.openai.com/v1');
// Configurable batch size (spec §18: AI_EMBED_BATCH_SIZE, example 32). Ollama
// embeds one model pass per batch — keep it modest on CPU.
const BATCH = Math.max(
  Number(process.env.AI_EMBED_BATCH_SIZE ?? 32) || 32,
  1,
);

function requireKey() {
  if (OLLAMA) return;
  if (!API_KEY) {
    console.error('AI_API_KEY is not set. Cannot compute embeddings.');
    process.exit(1);
  }
}

async function embed(texts: string[]): Promise<number[][]> {
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += BATCH) {
    const chunk = texts.slice(i, i + BATCH);
    if (OLLAMA) {
      const res = await fetch(`${BASE}`.replace(/\/v1\/?$/, '') + '/api/embed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: MODEL, input: chunk }),
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
    const res = await fetch(`${BASE}/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
      body: JSON.stringify({ model: MODEL, input: chunk }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`embedding API ${res.status}: ${body.slice(0, 300)}`);
    }
    const json = (await res.json()) as { data: { index: number; embedding: number[] }[] };
    const ordered = new Array(chunk.length);
    for (const d of json.data) ordered[d.index] = d.embedding;
    out.push(...ordered);
  }
  return out;
}

async function main() {
  requireKey();
  // embedding is an unmapped pgvector column -> raw SQL only.
  const pages = await prisma.$queryRaw<{ id: string; ocrText: string | null }[]>(
    Prisma.sql`SELECT id, "ocrText" FROM "PaperArchivePage"
               WHERE "ocrText" IS NOT NULL AND "ocrText" <> '' AND "embedding" IS NULL
               ORDER BY id LIMIT 8000`,
  );
  console.log(`pages needing embeddings: ${pages.length}  (batch=${BATCH} model=${MODEL})`);

  let done = 0;
  const started = Date.now();
  for (const page of pages) {
    const text = page.ocrText!.trim();
    if (!text) continue;
    const [vec] = await embed([text]);
    // PostgreSQL native positional params + explicit vector cast at the
    // boundary. Prisma's `?` placeholder mis-binds for pgvector casts, so use
    // $1/$2 directly (verified against the live DB).
    const sql = `UPDATE "PaperArchivePage" SET embedding = $1::vector WHERE id = $2 AND embedding IS NULL`;
    try {
      await prisma.$executeRawUnsafe(sql, `[${vec.join(',')}]`, page.id);
      done++;
      if (done % 10 === 0 || done === pages.length) {
        const pct = pages.length ? Math.round((done / pages.length) * 100) : 100;
        const elapsed = (Date.now() - started) / 1000;
        const rate = elapsed > 0 ? done / elapsed : 0;
        const eta = rate > 0 ? ((pages.length - done) / rate).toFixed(0) : '?';
        console.log(`  ${pct}%  embedded ${done}/${pages.length}  (${rate.toFixed(1)} pages/s, ETA ${eta}s)`);
      }
    } catch (e) {
      console.error(`FAILED ${page.id}: ${String(e.message ?? e).slice(0, 200)}`);
    }
  }
  const remaining = await prisma.$queryRaw<{ c: bigint }[]>(
    Prisma.sql`SELECT COUNT(*)::bigint AS c FROM "PaperArchivePage"
               WHERE "ocrText" IS NOT NULL AND "ocrText" <> '' AND "embedding" IS NULL`,
  );
  console.log(`done. embedded in this run: ${done}  remaining: ${remaining[0]?.c ?? 0}`);
}

main()
  .catch((e) => {
    console.error(e.message || e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());