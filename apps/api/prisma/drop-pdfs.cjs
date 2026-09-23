const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const pdfs = await p.paperArchive.findMany({ where: { subject: 'PDF' }, include: { pages: true } });
  console.log(JSON.stringify(pdfs.map((x) => ({ title: x.title, url: x.sourceUrl, pages: x.pages.length })), null, 1));
  for (const pdf of pdfs) {
    const paper = await p.paperArchive.delete({ where: { id: pdf.id } });
    console.log('deleted', paper.title);
  }
  const left = await p.paperArchive.count();
  const page = await p.paperArchivePage.count();
  console.log('after: papers', left, 'pages', page);
  await p.$disconnect();
})();