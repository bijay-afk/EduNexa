import { PrismaClient, Permission } from '@prisma/client';

const prisma = new PrismaClient();

const PERMISSIONS: Array<Pick<Permission, 'key' | 'description'>> = [
  { key: 'content:create', description: 'Create content' },
  { key: 'content:update', description: 'Update content' },
  { key: 'content:publish', description: 'Publish content' },
  { key: 'content:review', description: 'Review content' },
  { key: 'question:create', description: 'Create questions' },
  { key: 'question:update', description: 'Update questions' },
  { key: 'question:review', description: 'Review questions' },
  { key: 'question_generation:create', description: 'Run AI question generation' },
  { key: 'quiz:create', description: 'Create quizzes' },
  { key: 'assignment:create', description: 'Create assignments' },
  { key: 'exam:create', description: 'Create exams' },
  { key: 'student:read', description: 'View students' },
  { key: 'performance:read', description: 'View performance analytics' },
  { key: 'analytics:read', description: 'View platform analytics' },
  { key: 'audit:read', description: 'View audit logs' },
  { key: 'user:manage', description: 'Manage users' },
  { key: 'curriculum:manage', description: 'Manage curriculum' },
];

async function main() {
  console.log('Seeding permissions...');
  for (const p of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: p.key },
      update: { description: p.description },
      create: p,
    });
  }

  const org = await prisma.organization.upsert({
    where: { slug: 'demo-academy' },
    update: {},
    create: { name: 'Demo Academy', slug: 'demo-academy' },
  });

  const curriculum = await prisma.curriculum.upsert({
    where: { code: 'NEP-GRADE10' },
    update: { status: 'PUBLISHED' },
    create: {
      code: 'NEP-GRADE10',
      name: 'Nepal Grade 10 Curriculum',
      status: 'PUBLISHED',
    },
  });

  const grade = await prisma.grade.upsert({
    where: { curriculumId_code: { curriculumId: curriculum.id, code: '10' } },
    update: {},
    create: { curriculumId: curriculum.id, name: 'Class 10', code: '10', order: 1 },
  });

  const math = await prisma.subject.upsert({
    where: { gradeId_code: { gradeId: grade.id, code: 'math' } },
    update: {},
    create: { gradeId: grade.id, name: 'Mathematics', code: 'math', order: 1 },
  });

  const algebra = await prisma.chapter.upsert({
    where: { subjectId_name: { subjectId: math.id, name: 'Algebra' } },
    update: {},
    create: { subjectId: math.id, name: 'Algebra', order: 1 },
  });

  const quadratic = await prisma.topic.upsert({
    where: { chapterId_name: { chapterId: algebra.id, name: 'Quadratic Equations' } },
    update: {},
    create: {
      chapterId: algebra.id,
      name: 'Quadratic Equations',
      order: 1,
      summary: 'Standard form, factorisation, and the quadratic formula.',
    },
  });

  const topicContent = await prisma.contentItem.upsert({
    where: { topicId_contentType_title: { topicId: quadratic.id, contentType: 'NOTE', title: 'Quadratic Equations — Notes' } },
    update: {},
    create: {
      topicId: quadratic.id,
      contentType: 'NOTE',
      title: 'Quadratic Equations — Notes',
      status: 'PUBLISHED',
      blocks: [
        { type: 'heading', text: 'Quadratic Equations' },
        { type: 'paragraph', text: 'An equation of the form ax² + bx + c = 0, where a ≠ 0.' },
        { type: 'formula', latex: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}' },
        {
          type: 'example',
          text: 'Solve x² - 5x + 6 = 0.',
          children: [{ type: 'paragraph', text: '(x - 2)(x - 3) = 0 so x = 2 or x = 3.' }],
        },
      ],
    },
  });

  console.log('Seed complete.');
  console.log(JSON.stringify({ org: org.id, math: math.id, algebra: algebra.id, quadratic: quadratic.id, topicContent: topicContent.id }, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());