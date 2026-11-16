
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { PDF_LAYOUT } from './parameters.js';

const SAME_LINE_RATIO = PDF_LAYOUT.sameLineRatio;
const WORD_GAP_RATIO = PDF_LAYOUT.wordGapRatio;

function linesFromRuns(items) {
  const runs = [];
  for (const item of items) {
    if (!('str' in item) || item.str === '') continue;
    const [a, b, , , x, y] = item.transform;
    runs.push({
      str: item.str,
      x,
      y,
      size: Math.hypot(a, b) || item.height || 10,
      width: item.width || 0,
    });
  }

  runs.sort((p, q) => q.y - p.y || p.x - q.x);

  const lines = [];
  for (const run of runs) {
    const line = lines[lines.length - 1];
    if (line && Math.abs(line.y - run.y) <= Math.max(line.size, run.size) * SAME_LINE_RATIO) {
      line.runs.push(run);
    } else {
      lines.push({ y: run.y, size: run.size, runs: [run] });
    }
  }

  return lines
    .map((line) => {
      let text = '';
      let previousEnd = null;
      for (const run of [...line.runs].sort((p, q) => p.x - q.x)) {
        const gap = previousEnd === null ? 0 : run.x - previousEnd;
        if (gap > line.size * WORD_GAP_RATIO && !text.endsWith(' ') && !run.str.startsWith(' ')) text += ' ';
        text += run.str;
        previousEnd = run.x + run.width;
      }
      return text.trimEnd();
    })
    .filter((line) => line.length > 0)
    .join('\n');
}

function formFieldsOnPage(annotations, page) {
  const fields = [];
  for (const annotation of annotations) {
    if (annotation.subtype !== 'Widget') continue;
    const raw = annotation.fieldValue;
    const value = Array.isArray(raw) ? raw.join(', ') : typeof raw === 'string' ? raw.trim() : '';
    if (!value) continue;
    fields.push({ page, name: String(annotation.fieldName || '').trim() || 'Unnamed field', value });
  }
  return fields;
}

export async function extractPdfText(buffer) {
  const task = getDocument({
    data: new Uint8Array(buffer),
    verbosity: 0,
    isEvalSupported: false,
    useSystemFonts: false,
    disableFontFace: true,
  });
  const pdf = await task.promise;

  const pageCount = pdf.numPages;
  const pages = [];
  const fields = [];
  try {
    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const annotations = await page.getAnnotations();

      pages.push(linesFromRuns(content.items));
      fields.push(...formFieldsOnPage(annotations, pageNumber));
      page.cleanup();
    }
  } finally {
    await task.destroy();
  }

  return { pageCount, text: pages.filter(Boolean).join('\n\n'), pages, fields };
}
