// Stage SEE DB assets into apps/web/public/papers (served by the web app)
// and emit apps/api/prisma/data/papers.json (the canonical import dataset).
// Idempotent: re-running re-syncs files and regenerates the dataset.
const fs = require('fs');
const path = require('path');

const SRC = 'C:\\Users\\yadev\\Desktop\\SEE DB';
const WEB_PUBLIC = path.join(__dirname, '..', 'apps', 'web', 'public', 'papers');
const DATA_DIR = path.join(__dirname, '..', 'apps', 'api', 'prisma', 'data');
const DATA_FILE = path.join(DATA_DIR, 'papers.json');

const SUBJECT_SLUGS = {
  English: 'english',
  Nepali: 'nepali',
  Mathematics: 'mathematics',
  'Additional Mathematics': 'additional-mathematics',
  Science: 'science',
  'Social Studies': 'social-studies',
  Economics: 'economics',
  'Population Education': 'population-education',
  'Environmental Science': 'environmental-science',
  Accountancy: 'accountancy',
  'Computer Science': 'computer-science',
  Education: 'education',
  Geography: 'geography',
  'Technical (Highway Engineering)': 'technical-highway-engineering',
  'Technical (Basic Electronics)': 'technical-basic-electronics',
};

const EXAM_TYPES_RE = [
  [/grade increment|supplementary/i, 'GRADE_INCREMENT'],
  [/model|sample question/i, 'MODEL'],
  [/pre[- ]`boarding|pre[- ]?board|preparatory|pre[- ]qualifying/i, 'PREBOARD'],
];

const YEAR_RE = /20\d\d/;
const BS_YEAR_RE = /\(?(20\d\d)\)?\s*(?:\(?(\d{4})\)?)?/;

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/\(|\)/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70);
}

function classify(entry) {
  const title = entry.title;
  const examType = EXAM_TYPES_RE.find(([re]) => re.test(title))?.[1] ?? 'PAST';
  const years = title.match(/\d{4}/g) ?? [];
  const year = years.length ? parseInt(years[0], 10) : null;
  const paperYear = years.length > 1 ? parseInt(years[1], 10) : null;
  return { examType, year, paperYear };
}

function main() {
  const index = JSON.parse(fs.readFileSync(path.join(SRC, 'index.json'), 'utf8'));
  const all = [];
  let skipped = 0;
  Object.entries(index.subjects).forEach(([subject, entries]) => {
    entries.forEach((entry) => {
      const subjSlug = SUBJECT_SLUGS[subject] || slugify(subject);
      const num = entry.dir.match(/\[(\d+)\]/)?.[1] ?? String(all.length + 1);
      const slug = slugify(entry.title.replace(/^-\s*/, ''));
      const rel = `${subjSlug}/${num}-${slug}`;
      const destDir = path.join(WEB_PUBLIC, ...rel.split('/'));
      const srcDir = path.join(SRC, entry.dir.replace(/^\\/, ''));
      if (!fs.existsSync(path.join(srcDir, 'meta.json'))) {
        skipped++;
        return;
      }
      const metaRaw = fs.readFileSync(path.join(srcDir, 'meta.json'), 'utf8');
      const meta = JSON.parse(metaRaw);
      const pages = [];
      for (const p of meta.pages || []) {
        if (!p.file) continue;
        const from = path.join(srcDir, p.file);
        const relUrl = `/papers/${rel}/${p.file}`;
        if (fs.existsSync(from)) {
          fs.mkdirSync(destDir, { recursive: true });
          fs.copyFileSync(from, path.join(destDir, p.file));
          pages.push({ file: p.file, url: relUrl, size: fs.statSync(from).size });
        }
      }
      if (pages.length) {
        all.push({
          sourceIndex: num,
          title: entry.title,
          subject,
          subjectSlug: subjSlug,
          url: entry.url,
          ...classify(entry),
          dir: entry.dir,
          imageDir: `/papers/${rel}`,
          pages,
        });
      }
    });
  });

  // Also carry the two top-level PDFs (if they are real files) into the dataset.
  const pdfs = [];
  for (const name of ['10 SETS MQ GRADE X.pdf', 'SEE 55 SETS MQ OPT MATHS.pdf']) {
    const from = path.join(SRC, name);
    if (fs.existsSync(from) && fs.statSync(from).size > 0) {
      fs.mkdirSync(path.join(WEB_PUBLIC, 'pdfs'), { recursive: true });
      fs.copyFileSync(from, path.join(WEB_PUBLIC, 'pdfs', name));
      pdfs.push({ title: name.replace('-', ' '), url: `/papers/pdfs/${name}`, size: fs.statSync(from).size });
    }
  }

  fs.mkdirSync(DATA_DIR, { recursive: true });
  const dataset = {
    generatedAt: new Date().toISOString(),
    source: 'educatenepal.com SEE question papers (scraped)',
    papers: all,
    pdfs,
  };
  fs.writeFileSync(DATA_FILE, JSON.stringify(dataset, null, 2));

  const totalPages = all.reduce((a, p) => a + p.pages.length, 0);
  console.log(`papers: ${all.length}  pages: ${totalPages}  pdfs: ${pdfs.length}  skipped(sources missing): ${skipped}`);
  console.log(`dataset written: ${DATA_FILE}`);
  console.log(`assets served under: ${WEB_PUBLIC}`);
}

main();