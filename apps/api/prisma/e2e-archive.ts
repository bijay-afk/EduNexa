// Live E2E acceptance for the SEE archive pipeline (Sprint 1 + 2).
//
// Exercises the REAL ArchiveService against the configured database (Supabase):
//   discover paper -> extract questions (x2 for idempotency) ->
//   hierarchy-validation negative check -> map to chapter/topic -> approve ->
//   import into a teacher's question bank -> print the full provenance chain.
//
// Run: npm run db:accept:archive  (or: npx tsx prisma/e2e-archive.ts)
import { ArchiveService } from '../src/archive/archive.service';
import { PrismaService } from '../src/prisma/prisma.service';

const prisma = new PrismaService();
const archive = new ArchiveService(prisma);

async function main() {
  const teacher = await prisma.user.findFirstOrThrow({
    where: { role: 'TEACHER' },
    select: { id: true, email: true },
  });
  const paper = await prisma.paperArchive.findFirstOrThrow({
    where: { subject: 'Mathematics', pages: { some: { ocrText: { not: null } } } },
    orderBy: { year: 'desc' },
    select: { id: true, title: true, subject: true, year: true },
  });
  const mathSubject = await prisma.subject.findFirstOrThrow({
    where: { name: 'Mathematics' },
    select: { id: true, name: true },
  });
  const algebra = await prisma.chapter.findFirstOrThrow({
    where: { subjectId: mathSubject.id, name: 'Algebra' },
    select: { id: true, name: true },
  });
  const topic = await prisma.topic.findFirstOrThrow({
    where: { chapterId: algebra.id },
    select: { id: true, name: true },
  });
  const foreignTopic = await prisma.topic.findFirstOrThrow({
    where: { chapter: { subjectId: { not: mathSubject.id } } },
    select: { id: true, name: true },
  });

  console.log(`[e2e] teacher    : ${teacher.email} (${teacher.id})`);
  console.log(`[e2e] paper      : ${paper.title} (${paper.id})`);
  console.log(`[e2e] mapping to : ${mathSubject.name} / ${algebra.name} / ${topic.name}`);

  // 1. First extraction
  const before = await prisma.archiveQuestion.count({ where: { paperArchiveId: paper.id } });
  const first = await archive.extractQuestions(paper.id);
  const afterFirst = await prisma.archiveQuestion.count({ where: { paperArchiveId: paper.id } });
  console.log(`[e2e] extract #1 : created=${first.created} updated=${first.updated} (paper questions ${before} -> ${afterFirst})`);
  if (first.created === 0) {
    throw new Error('E2E failed: extraction created no questions');
  }

  // 2. Re-extraction must be idempotent
  const second = await archive.extractQuestions(paper.id);
  const afterSecond = await prisma.archiveQuestion.count({ where: { paperArchiveId: paper.id } });
  console.log(
    `[e2e] extract #2 : created=${second.created} updated=${second.updated} (paper questions ${afterFirst} -> ${afterSecond})`,
  );
  if (second.created !== 0 || afterSecond !== afterFirst) {
    throw new Error('E2E failed: extraction is not idempotent');
  }

  // 3. Pick one extracted question and prove page/paper association
  const question = await prisma.archiveQuestion.findFirstOrThrow({
    where: { paperArchiveId: paper.id },
    orderBy: { sourcePageNumber: 'asc' },
    include: {
      page: { select: { id: true, pageOrder: true, imageUrl: true, ocrState: true } },
      paper: { select: { id: true, title: true, subject: true, year: true } },
    },
  });
  console.log(`[e2e] sample q   : Q${question.questionNumber ?? '?'} p.${question.sourcePageNumber} "${question.sourceText.slice(0, 80)}…"`);

  // 4. Server-side hierarchy validation must reject a topic from another subject
  let rejected = false;
  try {
    await archive.updateQuestion(question.id, teacher.id, {
      subjectId: mathSubject.id,
      chapterId: algebra.id,
      topicId: foreignTopic.id,
      mappingStatus: 'APPROVED',
    });
  } catch (err) {
    rejected = String(err).includes('BadRequest');
  }
  console.log(`[e2e] validation : topic "${foreignTopic.name}" under "${algebra.name}" -> rejected=${rejected}`);
  if (!rejected) throw new Error('E2E failed: hierarchy validation did not reject foreign topic');

  // 5. Approve a real mapping
  const mapped = await archive.updateQuestion(question.id, teacher.id, {
    subjectId: mathSubject.id,
    chapterId: algebra.id,
    topicId: topic.id,
    mappingStatus: 'APPROVED',
  });
  console.log(
    `[e2e] mapping    : mappingStatus=${mapped.mappingStatus} chapterId=${mapped.chapterId} topicId=${mapped.topicId} mappedById=${mapped.mappedById}`,
  );
  if (mapped.mappingStatus !== 'APPROVED' || !mapped.topicId) {
    throw new Error('E2E failed: mapping did not approve');
  }

  // 6. Import into the teacher's question bank (provenance is stored here)
  const imported = await archive.importQuestion(question.id, teacher.id);
  const created = await prisma.question.findUniqueOrThrow({
    where: { id: imported.id },
    select: {
      id: true,
      status: true,
      difficulty: true,
      ownerId: true,
      sourceRefs: true,
      topicId: true,
    },
  });
  console.log(`[e2e] imported   : question=${created.id} status=${created.status} difficulty=${created.difficulty}`);
  console.log(`[e2e] provenance : ${JSON.stringify(created.sourceRefs)}`);

  const bankItem = await prisma.questionBankItem.findFirst({
    where: { questionId: created.id },
    select: { bank: { select: { ownerId: true } } },
  });
  if (!bankItem || bankItem.bank.ownerId !== teacher.id) {
    throw new Error('E2E failed: imported question not linked to teacher bank');
  }
  console.log(`[e2e] bank       : bank item present (owner ${bankItem.bank.ownerId})`);

  // 7. Full provenance chain: Question -> ArchiveQuestion -> Page -> Paper
  const provenance = await prisma.archiveQuestion.findUniqueOrThrow({
    where: { id: question.id },
    select: {
      sourceText: true,
      sourcePageNumber: true,
      questionNumber: true,
      state: true,
      mappingStatus: true,
      importedQuestionId: true,
      page: { select: { pageOrder: true, imageUrl: true, ocrState: true } },
      paper: { select: { title: true, subject: true, year: true } },
    },
  });
  console.log(`[e2e] CHAIN      : "${created.sourceRefs?.sourceLocator}"`);
  console.log(`[e2e] CHAIN      : scan=${provenance.page.imageUrl} (state=${provenance.page.ocrState})`);
  console.log(
    `[e2e] CHAIN      : paper ${provenance.paper.title} (${provenance.paper.subject} BS ${provenance.paper.year}) page ${provenance.sourcePageNumber} Q${provenance.questionNumber ?? '?'}`,
  );

  // 8. Coverage reflects the fresh mapping
  const cov = await archive.coverage();
  console.log(`[e2e] coverage   : extracted=${cov.dataHealth.extractedQuestions} mapped=${cov.dataHealth.mappedQuestions}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log('[e2e] PASS — SEE archive pipeline verified end-to-end against live data.');
  })
  .catch(async (e) => {
    console.error('[e2e] FAIL:', e.message || e);
    await prisma.$disconnect();
    process.exit(1);
  });