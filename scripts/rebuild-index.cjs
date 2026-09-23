// Rebuild SEE DB/index.json + _manifest.json from what actually exists on disk
// (some subject folders were intentionally removed by the user).
const fs = require('fs');
const path = require('path');
const SRC = 'C:\\Users\\yadev\\Desktop\\SEE DB';

function cleanIndex() {
  const old = JSON.parse(fs.readFileSync(path.join(SRC, 'index.json'), 'utf8'));
  const subjects = {};
  let total = 0;
  for (const [subject, entries] of Object.entries(old.subjects)) {
    const kept = entries.filter((e) => fs.existsSync(path.join(SRC, e.dir.replace(/^\\/, ''), 'meta.json')));
    if (kept.length) subjects[subject] = kept;
    total += kept.length;
  }
  fs.writeFileSync(
    path.join(SRC, 'index.json'),
    JSON.stringify({ ...old, total, withPages: total, subjects }, null, 2),
  );
  const manifest = JSON.parse(fs.readFileSync(path.join(SRC, '_manifest.json'), 'utf8'));
  const keepUrls = new Set(Object.values(subjects).flat().map((e) => e.url));
  const keptPp = (manifest.papers || manifest).filter?.((p) => keepUrls.has(p.url));
  console.log('index rebuilt. papers:', total);
  console.log('sample subjects:', Object.keys(subjects).join(', '));
}

cleanIndex();