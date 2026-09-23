const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const by = await p.paperArchive.groupBy({ by: ['subject'], _count: { _all: true } });
  const rows = by
    .map((b) => ({ subject: b.subject, n: b._count._all }))
    .filter((r) => r.subject !== 'PDF')
    .sort((a, b) => b.n - a.n);
  for (const r of rows) console.log(String(r.n).padStart(3), r.subject);
  console.log('TOTAL', rows.reduce((a, r) => a + r.n, 0), '| PDFs', by.find((b) => b.subject === 'PDF')?._count._all);
  const sample = await p.paperArchivePage.findFirst({
    where: { ocrText: { not: null } },
    select: { ocrText: true, paper: { select: { title: true } } },
  });
  console.log('SAMPLE OCR:', String(sample.ocrText).slice(0, 140).replace(/\n/g, ' '));
  const exam = await p.paperArchive.groupBy({ by: ['examType'], _count: { _all: true } });
  console.log('EXAM TYPES:', exam.map((e) => `${e.examType}:${e._count._all}`).join(' '));
  await p.$disconnect();
})();