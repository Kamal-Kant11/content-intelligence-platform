// Export: blocks -> downloadable file (DOCX, PDF, TXT, Markdown).
// Headings, lists and quotes are kept as real structure in every format.
// The original file's visual styling (fonts, images, tables) is not kept:
// only its text structure is stored after extraction.
import path from 'node:path';
import { Document as DocxDocument, HeadingLevel, Packer, Paragraph, TextRun } from 'docx';
import PDFDocument from 'pdfkit';
import { badRequest } from '../utils/httpError.js';
import { assembleContent } from '../intelligence/normalize.js';

export const EXPORT_FORMATS = {
  docx: { ext: 'docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
  pdf: { ext: 'pdf', mime: 'application/pdf' },
  txt: { ext: 'txt', mime: 'text/plain; charset=utf-8' },
  md: { ext: 'md', mime: 'text/markdown; charset=utf-8' },
};

// "Same way as uploaded": a PDF comes back as PDF, a DOCX as DOCX, a TXT as TXT.
// Written, pasted and URL content defaults to DOCX.
export function sourceFormat(doc) {
  const ext = path.extname(doc.source?.fileName || '').slice(1).toLowerCase();
  return EXPORT_FORMATS[ext] ? ext : 'docx';
}

export function resolveFormat(requested, doc) {
  const format = !requested || requested === 'source' ? sourceFormat(doc) : String(requested).toLowerCase();
  if (!EXPORT_FORMATS[format]) throw badRequest(`format must be one of: source, ${Object.keys(EXPORT_FORMATS).join(', ')}.`);
  return format;
}

const HEADINGS = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3, HeadingLevel.HEADING_4, HeadingLevel.HEADING_5, HeadingLevel.HEADING_6];

async function toDocx(title, blocks) {
  const children = [];
  for (const b of blocks) {
    if (b.type === 'heading') {
      children.push(new Paragraph({ text: b.text, heading: HEADINGS[Math.min(5, (b.level || 2) - 1)] }));
    } else if (b.type === 'list') {
      for (const item of b.text.split('\n')) children.push(new Paragraph({ text: item, bullet: { level: 0 } }));
    } else if (b.type === 'quote') {
      children.push(new Paragraph({ children: [new TextRun({ text: b.text, italics: true })], indent: { left: 720 }, spacing: { after: 160 } }));
    } else {
      children.push(new Paragraph({ children: [new TextRun(b.text)], spacing: { after: 160 } }));
    }
  }
  const doc = new DocxDocument({ creator: 'AI Content Assurance Platform', title, sections: [{ children }] });
  return Packer.toBuffer(doc);
}

// PDFKit's built-in fonts only cover Western European characters.
const WIN_ANSI_EXTRA = '‘’“”–—…•€™';
const pdfSafe = (s) => [...s].map((c) => (c.charCodeAt(0) <= 0xff || WIN_ANSI_EXTRA.includes(c) ? c : '?')).join('');

function toPdf(title, blocks) {
  return new Promise((resolve, reject) => {
    const pdf = new PDFDocument({ size: 'A4', margin: 64, info: { Title: title, Creator: 'AI Content Assurance Platform' } });
    const chunks = [];
    pdf.on('data', (c) => chunks.push(c));
    pdf.on('end', () => resolve(Buffer.concat(chunks)));
    pdf.on('error', reject);

    const sizes = [22, 18, 15, 13, 12, 12];
    for (const b of blocks) {
      const text = pdfSafe(b.text);
      if (b.type === 'heading') {
        pdf.moveDown(0.6).font('Helvetica-Bold').fontSize(sizes[Math.min(5, (b.level || 2) - 1)]).fillColor('#111111').text(text);
        pdf.moveDown(0.3);
      } else if (b.type === 'list') {
        pdf.font('Helvetica').fontSize(11).fillColor('#222222');
        for (const item of text.split('\n')) pdf.text(`•  ${item}`, { indent: 12, lineGap: 2 });
        pdf.moveDown(0.6);
      } else if (b.type === 'quote') {
        pdf.font('Helvetica-Oblique').fontSize(11).fillColor('#444444').text(text, pdf.page.margins.left + 24, undefined, { lineGap: 2 });
        pdf.x = pdf.page.margins.left;
        pdf.moveDown(0.6);
      } else {
        pdf.font('Helvetica').fontSize(11).fillColor('#222222').text(text, { lineGap: 3, align: 'left' });
        pdf.moveDown(0.6);
      }
    }
    pdf.end();
  });
}

function toText(blocks) {
  return blocks
    .map((b) => {
      if (b.type === 'list') return b.text.split('\n').map((i) => `• ${i}`).join('\n');
      if (b.type === 'quote') return `“${b.text}”`;
      return b.text;
    })
    .join('\n\n');
}

export async function renderBlocks({ title, blocks, format }) {
  const ordered = [...blocks].sort((a, b) => a.position - b.position);
  let buffer;
  if (format === 'docx') buffer = await toDocx(title, ordered);
  else if (format === 'pdf') buffer = await toPdf(title, ordered);
  else if (format === 'md') buffer = Buffer.from(assembleContent(ordered), 'utf8');
  else buffer = Buffer.from(toText(ordered), 'utf8');
  return { buffer, ...EXPORT_FORMATS[format] };
}

export function fileName(base, suffix, ext) {
  const safe = String(base).replace(/[\\/:*?"<>|\x00-\x1f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) || 'document';
  return `${safe}${suffix ? ` (${suffix})` : ''}.${ext}`;
}

export function sendFile(res, { buffer, mime }, name) {
  const ascii = name.replace(/[^\x20-\x7e]/g, '_').replace(/"/g, "'");
  res.setHeader('Content-Type', mime);
  res.setHeader('Content-Disposition', `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`);
  res.setHeader('Content-Length', buffer.length);
  res.send(buffer);
}
