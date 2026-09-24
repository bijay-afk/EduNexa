const http = require('http');
const net = require('net');
const hosts = [
  'aws-0-ap-northeast-2.pooler.supabase.com',
  'aws-0-ap-south-1.pooler.supabase.com',
  'db.xrhdakmfgmenijovvhfl.supabase.co',
];
const test = (host) =>
  new Promise((resolve) => {
    const t = setTimeout(() => resolve('TIMEOUT'), 7000);
    const s = net.connect(6543, host, () => {
      clearTimeout(t);
      resolve('TCP-OK');
      s.destroy();
    });
    s.on('error', (e) => {
      clearTimeout(t);
      resolve('TCP-ERR ' + e.code);
    });
  });
const server = http.createServer(async (req, res) => {
  res.setHeader('content-type', 'application/json');
  if (req.url === '/api/v1/health') {
    res.end(JSON.stringify({ ok: true }));
    return;
  }
  if (req.url !== '/debug') {
    res.end(JSON.stringify({ hint: 'use /debug' }));
    return;
  }
  const tcp = {};
  for (const h of hosts) tcp[h] = await test(h);
  const result = { tcp, prisma: null };
  const url = process.env.DATABASE_URL || '(unset)';
  result.dbUrl = url.replace(/:[^:@/]+@/, ':****@');
  try {
    const { PrismaClient } = require('/app/node_modules/.prisma/client');
    const p = new PrismaClient({ datasources: { db: { url } } });
    const t0 = Date.now();
    await p.$connect();
    result.prisma = { ok: true, connectMs: Date.now() - t0 };
    const r = await p.user.count();
    result.prisma.userCount = r;
    await p.$disconnect();
  } catch (e) {
    result.prisma = { ok: false, error: String((e && e.message) || e) };
  }
  res.end(JSON.stringify(result, null, 2));
});
server.listen(3000, '0.0.0.0', () => console.log('debug listening on 3000'));