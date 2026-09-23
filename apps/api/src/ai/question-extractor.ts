/**
 * Deterministic question extraction from SEE paper OCR text (ARCHIVE_EXTRACT).
 * Works with zero API keys — questions are real questions cut from the scanned
 * paper archive stored in Supabase, so generation is grounded strictly in the
 * "database" (the archived CDC-based SEE papers).
 */

export interface ExtractedQuestion {
  /** Raw question text (may still contain OCR noise, trimmed). */
  text: string;
  /** Marks inferred from the paper, e.g. trailing "(5)" or "5×1=5". */
  marks: number | null;
  /** Options detected when the block looks like an MCQ (a) b) c) d)). */
  options?: string[];
}

const QUESTION_START = /^(?:\(\s*)?(\d+)(?:\s*[\.\)]|\s+)[\s\)]*(?:\.\.\.|\.)?/;
const NEPALI_NUMERAL_START = /^[०-९]+[\.\)]/;
const OPTION_START = /^(?:\(\s*)?([a-dA-D])(?:\s*[\.\)]|\s+)[\s\)]*(.*)$/;
const TRAILING_MARKS = /\((\d+(?:\s*\+\s*\d+)*)\)\s*$/;
const GROUP_MARKS = /(\d+)\s*[\u00d7xX*]\s*(\d+)\s*=\s*(\d+)/;

const SKIP_LINES = [
  'candidates are required',
  'attempt all questions',
  'read the following',
  'based on the text',
  'based on the passage',
  'answer the following',
  'give very short answer',
  'write the full form',
  'write appropriate technical',
  'full marks',
  'time allowed',
  'symbol no',
  'compulsory',
  'grade increment',
  'pre board',
  'model question',
  'पूर्णाङ्क',
  'समय',
  'परीक्षार्थी',
  'उत्तर दिनुहोस्',
  'सबै प्रश्नहरूको',
  'निर्देशन',
];

function isSkipLine(line: string): boolean {
  const l = line.toLowerCase();
  return SKIP_LINES.some((s) => l.includes(s));
}

function sumTrailingMarks(line: string): number | null {
  const m = line.match(TRAILING_MARKS);
  if (!m) return null;
  return m[1]
    .replace(/\s/g, '')
    .split('+')
    .map(Number)
    .reduce((a, b) => a + b, 0);
}

/** Clean OCR artifacts that we know are page furniture. */
function cleanSegment(segment: string): string {
  return segment
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l) => !/^[0-9]+$/.test(l)) // lone page numbers
    .filter((l) => !/^(re-|gi-|pa-)/i.test(l)) // exam codes
    .join(' ')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function splitOptions(text: string): { head: string; options: string[] } | null {
  const optionMatches = text.split('\n').map((l) => l.trim().match(/^(?:\(\s*)?([a-dA-D])(?:\s*[\.\)])/));
  const found = optionMatches.filter((m) => m && m[1].length === 1);
  if (found.length < 2) return null;

  const lines = text.split('\n');
  const firstOptionIdx = lines.findIndex((l) => /\)|\./.test(l) && OPTION_START.test(l));
  if (firstOptionIdx === -1) return null;

  const head = lines.slice(0, firstOptionIdx).join(' ').trim();
  const options: string[] = [];
  for (let i = firstOptionIdx; i < lines.length; i++) {
    const line = lines[i].trim();
    const m = line.match(/^(?:\(\s*)?([a-dA-D])(?:\s*[\.\)])\s*(.*)$/);
    if (m) {
      options.push(m[2].trim());
    } else if (options.length) {
      options[options.length - 1] += ` ${line}`;
    }
  }
  return { head, options };
}

/**
 * Split OCR text into question blocks. Imperfect but deterministic: a new
 * question starts at a digit (or Devanagari-numeral) marker; option lines
 * a)–d) stay glued to their question; trailing "(N)" or "(N+M)" becomes marks.
 */
export function extractQuestions(ocrText: string): ExtractedQuestion[] {
  const lines = ocrText
    .replace(/\r/g, '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const blocks: string[] = [];
  const marksByBlock: (number | null)[] = [];
  let current: string[] = [];
  let currentMarks: number | null = null;

  const flush = () => {
    if (current.length) {
      blocks.push(current.join('\n'));
      marksByBlock.push(currentMarks);
    }
    current = [];
    currentMarks = null;
  };

  for (const line of lines) {
    // A group header starts a new block (marks often follow, e.g. "(5×1=5)").
    if (/^(?:group\s*)?['"']?[a-zA-Z]|समूह/.test(line) && /(group|समूह)/i.test(line)) {
      flush();
      const gm = line.match(GROUP_MARKS);
      if (gm) currentMarks = Number(gm[3]);
      continue;
    }

    if (isSkipLine(line)) {
      // keep going; skip furniture but do not start a new question
      continue;
    }

    if (QUESTION_START.test(line) || NEPALI_NUMERAL_START.test(line)) {
      flush();
      current.push(line.replace(QUESTION_START, '').trim());
      const m = sumTrailingMarks(line);
      if (m !== null) currentMarks = m;
      continue;
    }

    if (current.length) {
      current.push(line);
      // option lines attached below are handled at block build time
      const m = sumTrailingMarks(line);
      if (m !== null && currentMarks === null) currentMarks = m;
    }
  }
  flush();

  const out: ExtractedQuestion[] = [];
  for (let i = 0; i < blocks.length; i++) {
    const raw = blocks[i];
    const cleaned = cleanSegment(raw);
    if (cleaned.length < 15) continue;

    const withOptions = splitOptions(raw);
    if (withOptions && withOptions.options.length >= 2) {
      const head = cleanSegment(withOptions.head);
      if (head.length < 10) continue;
      out.push({
        text: head,
        marks: marksByBlock[i],
        options: withOptions.options.map((o) => o.trim()).filter(Boolean).slice(0, 4),
      });
      continue;
    }

    out.push({ text: cleaned, marks: marksByBlock[i] });
  }
  return out;
}

/** Pick the archive subjects (title + slug count) for the generator UI. */
export function inferSubjectFilter(subjectIdOrName: string): string {
  const s = subjectIdOrName.toLowerCase().replace(/[_-]+/g, ' ');
  return s.trim();
}