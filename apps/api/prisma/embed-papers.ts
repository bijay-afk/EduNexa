// Compute pgvector embeddings for PaperArchivePage.ocrText rows that lack them.
// Idempotent + resumable. Uses the OpenAI-compatible embedding API from env
// (AI_API_KEY, AI_EMBEDDING_MODEL, AI_EMBEDDING_BASE_URL optional).
//
// Run: npx tsx apps/api/prisma/embed-papers.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const API_KEY = process.env.AI_API_KEY;
const MODEL = process.env.AI_EMBEDDING_MODEL ?? 'text-embedding-3-small';
const BASE = process.env.AI_EMBEDDING_BASE_URL ?? 'https://api.openai.com/v1';
const BATCH = 128;

function requireKey() {
  if (!API_KEY) {
    console.error('AI_API_KEY is not set. Cannot compute embeddings.');
    process.exit(1);
  }
}

async function embed(texts: string[]): Promise<number[][]> {
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += BATCH) {
    const chunk = texts.slice(i, i + BATCH);
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
  const pages = await prisma.paperArchivePage.findMany({
    where: { ocrText: { not: null, not: '' }, embedding: null },
    select: { id: true, ocrText: true },
    take: 8000,
    orderBy: { id: 'asc' },
  });
  console.log(`pages needing embeddings: ${pages.length}`);

  let done = 0;
  for (const page of pages) {
    const text = page.ocrText!.trim();
    if (!text) continue;
    const [vec] = await embed([text]);
    const sql = `UPDATE "PaperArchivePage" SET embedding = CAST(? AS vector) WHERE id = ? AND embedding IS NULL`;
    try {
      await prisma.$executeRawUnsafe(sql, `[${vec.join(',')}]`, page.id);
      done++;
      if (done % 25 === 0) console.log(`embedded ${done}/${pages.length}`);
    } catch (e) {
      console.error(`FAILED ${page.id}: ${String(e.message ?? e).slice(0, 200)}`);
    }
  }
  const remaining = await prisma.paperArchivePage.count({
    where: { ocrText: { not: null, not: '' }, embedding: null },
  });
  console.log(`done. embedded in this run: ${done}  remaining: ${remaining}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());