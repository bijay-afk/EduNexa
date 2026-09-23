const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const c = await p.curriculum.findMany({ include: { grades: { include: { subjects: { include: { chapters: { include: { topics: true } } } } } } } });
  console.log('curriculums:', c.length);
  for (const cur of c) {
    console.log(' ', cur.code, cur.name, cur.status);
    for (const g of cur.grades) {
      console.log('   grade', g.code, g.name);
      for (const s of g.subjects) console.log('      subject', s.code, s.name, 'chapters:', s.chapters.length, 'topics:', s.chapters.reduce((a, ch) => a + ch.topics.length, 0));
    }
  }
  const users = await p.user.findMany({ select: { id: true, email: true, role: true, active: true, fullName: true } });
  console.log('users:', JSON.stringify(users, null, 1));
  await p.$disconnect();
})();