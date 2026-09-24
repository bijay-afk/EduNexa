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
  if (req.url === '/api/v1/health') {
    res.setHeader('content-type', 'text/plain');
    res.end('ok');
    return;
  }
  const out = {};
  for (const h of hosts) out[h] = await test(h);
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(out));
});
server.listen(3000, '0.0.0.0', () => console.log('debug listening on 3000'));