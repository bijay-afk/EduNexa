// OCR all staged paper page images with Tesseract (eng+nep) and attach
// extracted text to apps/api/prisma/data/papers.json.
// Resumable: skips papers already carrying ocrText on every page.
// Run: node scripts/ocr-papers.cjs   (tesseract must be on PATH or set TESSERACT_BIN)
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const DATA_FILE = path.join(__dirname, '..', 'apps', 'api', 'prisma', 'data', 'papers.json');
const WEB_PUBLIC = path.join(__dirname, '..', 'apps', 'web', 'public');

const TESSERACT = process.env.TESSERACT_BIN || 'C:\\Program Files\\Tesseract-OCR\\tesseract.exe';
const TESSDATA = 'C:\\Users\\yadev\\AppData\\Local\\Tesseract-OCR\\tessdata';
const LANGS = 'eng+nep';
const PSM = '3';
const CONCURRENCY = Number(process.env.OCR_CONCURRENCY || 4);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function ocr(imagePath) {
  const args = [imagePath, 'stdout', '--tessdata-dir', TESSDATA, '-l', LANGS, '--psm', PSM];
  return execFileSync(TESSERACT, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, windowsHide: true });
}

async function main() {
  const dataset = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  let done = 0;
  let queued = 0;
  let failed = 0;
  let qi = 0;

  const jobs = [];
  for (const paper of dataset.papers) {
    for (const page of paper.pages) {
      jobs.push({ paper, page });
    }
  }

  const worker = async () => {
    while (qi < jobs.length) {
      const { paper, page } = jobs[qi++];
      if (page.ocrText) {
        done++;
        continue;
      }
      const p = path.join(WEB_PUBLIC, ...paper.imageDir.split('/').filter(Boolean), page.file);
      if (!fs.existsSync(p)) {
        page.ocrText = '';
        page.ocrError = 'image missing on disk';
        failed++;
        continue;
      }
      try {
        page.ocrText = ocr(p);
        delete page.ocrError;
        done++;
        if (done % 50 === 0) await fs.promises.writeFile(DATA_FILE, JSON.stringify(dataset, null, 2));
      } catch (e) {
        page.ocrError = String((e.stderr || e.message || e)).slice(0, 300);
        failed++;
      }
    }
  };

  const workers = await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  await Promise.all(workers);
  await fs.promises.writeFile(DATA_FILE, JSON.stringify(dataset, null, 2));

  const totalPages = dataset.papers.reduce((a, p) => a + p.pages.length, 0);
  const withText = dataset.papers.reduce(
    (a, p) => a + p.pages.filter((pg) => pg.ocrText && pg.ocrText.trim()).length,
    0,
  );
  console.log(`pages: ${totalPages}  ocr'd: ${withText}  failed: ${failed}  empty: ${totalPages - withText - failed}`);

  const subjects = {};
  for (const p of dataset.papers) {
    const t = p.pages.filter((pg) => pg.ocrText && pg.ocrText.trim()).length;
    subjects[p.subject] = (subjects[p.subject] || 0) + t;
  }
  console.log(JSON.stringify(subjects));
}

main().catch((e) => {
  console.error('FATAL', e);
  process.exit(1);
});