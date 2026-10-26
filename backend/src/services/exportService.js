// Builds the downloadable TXT / DOCX files for an approved version.
import { Document, Packer, Paragraph, TextRun } from 'docx';

// "Q3 Report: Draft #2" -> "Q3-Report-Draft-2". No ids or other internal data in the name.
export function exportFilename(title, extension) {
  const slug = String(title || '')
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '-')
    .slice(0, 60)
    .replace(/-+$/, '');
  return `${slug || 'document'}-approved.${extension}`;
}

// One Word paragraph per blank-line-separated block; single line breaks are kept inside it.
export function buildDocx(title, text) {
  const paragraphs = text.split(/\n{2,}/).map(
    (block) =>
      new Paragraph({
        spacing: { after: 200 },
        children: block.split('\n').map((line, i) => new TextRun(i ? { text: line, break: 1 } : { text: line })),
      })
  );
  const doc = new Document({ creator: 'ContentIQ', title, sections: [{ children: paragraphs }] });
  return Packer.toBuffer(doc);
}
