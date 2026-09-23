// Import the staged SEE paper archive (apps/api/prisma/data/papers.json) into
// PostgreSQL. Idempotent: papers are keyed on sourceKey (the source URL); pages
// are upserted per paper. OCR text is stored on each page ready for embedding.
//
// Run with a reachable DATABASE_URL:
//   npx tsx apps/api/prisma/seed-papers.ts
import { PrismaClient, PaperExamType, ContentStatus } from '@prisma/client';
import * as fs from 'node:fs';
import * as path from 'node:path';

const prisma = new PrismaClient();
const DATA = path.join(__dirname, '..', 'data', 'papers.json');

const EXAM_TYPE: Record<string, PaperExamType> = {
  PAST: 'PAST',
  GRADE_INCREMENT: 'GRADE_INCREMENT',
  MODEL: 'MODEL',
  PREBOARD: 'PREBOARD',
};

async function main() {
  const dataset = JSON.parse(fs.readFileSync(DATA, 'utf8'));
  console.log(`dataset: ${dataset.papers.length} papers, ${dataset.pdfs.length} pdfs`);

  let paperCount = 0;
  let pageCount = 0;

  for (const paper of dataset.papers) {
    const subject = paper.subject;
    const existing = await prisma.paperArchive.findUnique({ where: { sourceKey: paper.url } });

    const data = {
      title: paper.title,
      subject,
      subjectSlug: paper.subjectSlug,
      examType: EXAM_TYPE[paper.examType] ?? 'PAST',
      year: paper.year ?? null,
      paperYear: paper.paperYear ?? null,
      sourceUrl: paper.url,
      sourceIndex: paper.sourceIndex ? Number(paper.sourceIndex) : null,
      imageDir: paper.imageDir,
      pageCount: paper.pages.length,
      status: 'PUBLISHED' as ContentStatus,
    };

    const record = existing
      ? await prisma.paperArchive.update({ where: { id: existing.id }, data })
      : await prisma.paperArchive.create({ data: { sourceKey: paper.url, ...data } });
    paperCount++;

    for (const [i, page] of paper.pages.entries()) {
      const pageOrder = i + 1;
      const exists = await prisma.paperArchivePage.findUnique({
        where: { paperId_pageOrder: { paperId: record.id, pageOrder } },
      });
      const pageData = {
        ocrText: page.ocrText && page.ocrText.trim() ? page.ocrText : null,
        imageUrl: page.url,
      };
      if (exists) {
        await prisma.paperArchivePage.update({ where: { id: exists.id }, data: pageData });
      } else {
        await prisma.paperArchivePage.create({
          data: { paperId: record.id, pageOrder, ...pageData },
        });
      }
      pageCount++;
    }
  }

  // PDFs: stored as papers with a single "page" whose file *is* the pdf (no OCR).
  for (const pdf of dataset.pdfs) {
    const srcKey = `pdf:${pdf.url}`;
    const existing = await prisma.paperArchive.findUnique({ where: { sourceKey: srcKey } });
    const data = {
      title: pdf.title,
      subject: 'PDF',
      subjectSlug: 'pdfs',
      examType: 'MODEL' as PaperExamType,
      year: null,
      paperYear: null,
      sourceUrl: pdf.url,
      sourceIndex: null,
      imageDir: '/papers/pdfs',
      pageCount: 1,
      status: 'PUBLISHED' as ContentStatus,
    };
    const record = existing
      ? await prisma.paperArchive.update({ where: { id: existing.id }, data })
      : await prisma.paperArchive.create({ data: { sourceKey: srcKey, ...data } });
    const pdfPage = await prisma.paperArchivePage.findUnique({
      where: { paperId_pageOrder: { paperId: record.id, pageOrder: 1 } },
    });
    if (!pdfPage) {
      await prisma.paperArchivePage.create({
        data: {
          paperId: record.id,
          pageOrder: 1,
          imageUrl: pdf.url,
          ocrText: null,
        },
      });
    }
  }

  const totals = await Promise.all([
    prisma.paperArchive.count(),
    prisma.paperArchivePage.count(),
    prisma.paperArchivePage.count({ where: { ocrText: { not: null } } }),
  ]);

  console.log(
    `import complete. papers: ${paperCount}  pages: ${pageCount}  ` +
      `archiveRows: ${totals[0]}  pageRows: ${totals[1]}  withOcr: ${totals[2]}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());