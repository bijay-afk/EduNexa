// Embedding + retrieval verification for the SEE archive pipeline.
//
// 1. Coverage report (no key required): pages with/without OCR text, pages with
//    embeddings, vector dimension, duplicate embeddings.
// 2. Semantic retrieval demo (requires AI_API_KEY + a query string): embeds the
//    query with the configured embedding API and runs a pgvector cosine search
//    over stored page embeddings.
//
// Run:  npx tsx apps/api/prisma/embed-verify.ts                    # coverage only
//       npx tsx apps/api/prisma/embed-verify.ts "surface area" 5   # retrieval
import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const API_KEY = process.env.AI_API_KEY;
const PROVIDER = process.env.AI_PROVIDER ?? 'openai';
const OLLAMA = PROVIDER === 'ollama';
const MODEL =
  process.env.AI_EMBEDDING_MODEL ?? (OLLAMA ? 'nomic-embed-text' : 'text-embedding-3-small');
const BASE =
  process.env.AI_EMBEDDING_BASE_URL ?? (OLLAMA ? 'http://localhost:11434' : 'https://api.openai.com/v1');

async function embed(text: string): Promise<number[]> {
  if (OLLAMA) {
    const res = await fetch(`${BASE}`.replace(/\/v1\/?$/, '') + '/api/embed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL, input: text }),
    });
    if (!res.ok) throw new Error(`ollama /api/embed ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const json = (await res.json()) as { embeddings: number[][][] };
    const first = json.embeddings?.[0];
    return Array.isArray(first) && Array.isArray(first[0]) ? (first as number[][])[0] : (first as number[]);
  }
  const res = await fetch(`${BASE}/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({ model: MODEL, input: text }),
  });
  if (!res.ok) throw new Error(`embedding API ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const json = (await res.json()) as { data: { embedding: number[] }[] };
  return json.data[0].embedding;
}

async function report() {
  const total = await prisma.paperArchivePage.count();
  const withOcr = await prisma.paperArchivePage.count({ where: { ocrText: { not: null, not: '' } } });

  // embedding is an unmapped pgvector column -> raw SQL only.
  const [withEmbedding, missing] = await prisma.$queryRaw<
    { c: bigint }[]
  >(
    Prisma.sql`SELECT (SELECT COUNT(*) FROM "PaperArchivePage" WHERE "embedding" IS NOT NULL) AS c`,
  );
  const [missingRow] = await prisma.$queryRaw<
    { c: bigint }[]
  >(
    Prisma.sql`SELECT COUNT(*)::bigint AS c FROM "PaperArchivePage" WHERE "ocrText" IS NOT NULL AND "ocrText" <> '' AND "embedding" IS NULL`,
  );

  const emb = Number(withEmbedding[0]?.c ?? 0);
  const miss = Number(missingRow?.c ?? 0);

  console.log(`pages          total: ${total}`);
  console.log(`pages           with OCR: ${withOcr}`);
  console.log(`pages      with embedding: ${emb}  (${withOcr ? Math.round((emb / withOcr) * 100) : 0}% of OCR pages)`);
  console.log(`pages   OCR but no emb  : ${miss}  <- these still need db:embed:papers`);

  const dimRow = await prisma.$queryRaw<{ dim: number }[]>(
    Prisma.sql`SELECT vector_dims("embedding")::int AS dim FROM "PaperArchivePage" WHERE "embedding" IS NOT NULL LIMIT 1`,
  );
  console.log(`vector dimension: ${dimRow[0]?.dim ?? '(none stored)'}`);

  const dup = await prisma.$queryRaw<{ distinct: number; rows: number }[]>(
    Prisma.sql`SELECT COUNT(*)::int AS distinct, COALESCE(SUM(c), 0)::int AS rows FROM (
        SELECT "embedding"::text AS v, COUNT(*)::int AS c FROM "PaperArchivePage"
        WHERE "embedding" IS NOT NULL GROUP BY "embedding"::text HAVING COUNT(*) > 1) d`,
  );
  console.log(`duplicate embeddings (identical): distinct=${dup[0]?.distinct ?? 0} rows=${dup[0]?.rows ?? 0}`);

  if (miss > 0 && miss <= 15) {
    const samples = await prisma.$queryRaw<
      { id: string; pageOrder: number; paperId: string }[]
    >(
      Prisma.sql`SELECT id, "pageOrder", "paperId" FROM "PaperArchivePage"
                 WHERE "ocrText" IS NOT NULL AND "ocrText" <> '' AND "embedding" IS NULL
                 ORDER BY "pageOrder" LIMIT ${miss}`,
    );
    for (const s of samples) console.log(`   missing: page=${s.pageOrder} paper=${s.paperId}`);
  }
}

async function retrieve(query: string, limit: number) {
  if (!OLLAMA && !API_KEY) {
    console.error('Retrieval demo skipped: set AI_API_KEY (openai) in apps/api/.env and re-run.');
    return;
  }
  console.log(`embedding query (${MODEL}): "${query}"`);
  const vec = await embed(query);
  const hits = await prisma.$queryRaw<
    { id: string; pageOrder: number; imageUrl: string | null; paperId: string; score: number }[]
  >(
    Prisma.sql`SELECT id, "pageOrder", "imageUrl", "paperId",
                      1 - ("embedding" <=> CAST(${`[${vec.join(',')}]`} AS vector)) AS score
               FROM "PaperArchivePage"
               WHERE "embedding" IS NOT NULL
               ORDER BY "embedding" <=> CAST(${`[${vec.join(',')}]`} AS vector)
               LIMIT ${limit}`,
  );
  console.log(`top ${hits.length} results:`);
  for (const h of hits) {
    const paper = await prisma.paperArchive.findUnique({
      where: { id: h.paperId },
      select: { title: true, subject: true, year: true },
    });
    console.log(
      `  ${h.score.toFixed(4)}  p.${h.pageOrder}  ${paper?.title ?? h.paperId}  ${paper?.subject ?? ''} BS ${paper?.year ?? ''}`,
    );
  }
}

async function main() {
  const [, , q1, q2] = process.argv;
  const query = q1; // first positional arg = query string (may contain spaces)
  if (query) {
    const limit = Number(q2) > 0 ? Number(q2) : 5;
    await report();
    console.log('---');
    await retrieve(query, limit);
  } else {
    await report();
    console.log('---');
    if (!OLLAMA && !API_KEY) {
      console.log('Retrieval demo: set AI_API_KEY, then run  npx tsx apps/api/prisma/embed-verify.ts "your query" [limit]');
    } else {
      await retrieve('similarity search demo query', 3);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());