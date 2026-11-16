import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractPdfText } from '../src/services/pdfText.js';

const at = (x, y, text, size = 14) => `BT /F1 ${size} Tf ${x} ${y} Td (${text}) Tj ET`;

function makePdf(pages) {
  const objects = [];
  const pageIds = pages.map((_, i) => 4 + i * 3);
  const fontId = 3;
  objects[1] = '<< /Type /Catalog /Pages 2 0 R /AcroForm << /Fields [] >> >>';
  objects[2] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>`;
  objects[fontId] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';

  pages.forEach((page, i) => {
    const pageId = 4 + i * 3;
    const contentId = pageId + 1;
    const ops = page.ops.join('\n');
    const fieldObjects = page.fields.map((value, f) => {
      const id = 100 + i * 10 + f;
      objects[id] = `<< /Type /Annot /Subtype /Widget /FT /Tx /T (field${f}) /V (${value}) /Rect [40 ${600 - f * 30} 300 ${620 - f * 30}] /P ${pageId} 0 R >>`;
      return `${id} 0 R`;
    });
    const annots = fieldObjects.length ? ` /Annots [${fieldObjects.join(' ')}]` : '';
    objects[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R${annots} >>`;
    objects[contentId] = `<< /Length ${ops.length} >>\nstream\n${ops}\nendstream`;
  });

  let body = '%PDF-1.4\n';
  const offsets = [];
  const ids = Object.keys(objects).map(Number).sort((a, b) => a - b);
  for (const id of ids) {
    offsets[id] = Buffer.byteLength(body, 'latin1');
    body += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }
  const size = Math.max(...ids) + 1;
  const xref = Buffer.byteLength(body, 'latin1');
  body += `xref\n0 ${size}\n0000000000 65535 f \n`;
  for (let id = 1; id < size; id++) {
    body += offsets[id] === undefined ? '0000000000 65535 f \n' : `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
  }
  body += `trailer\n<< /Size ${size} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(body, 'latin1');
}

test('PDF: every line of every page is extracted in order', async () => {
  const pdf = makePdf([
    { ops: [at(40, 740, 'Invoice number 1042'), at(40, 716, 'Total due: 250 dollars')], fields: [] },
    { ops: [at(40, 740, 'Second page line')], fields: [] },
  ]);
  const result = await extractPdfText(pdf);
  assert.equal(result.pageCount, 2);
  assert.equal(result.text, 'Invoice number 1042\nTotal due: 250 dollars\n\nSecond page line');
});

test('PDF: text drawn out of order is put back in reading order', async () => {
  const pdf = makePdf([{ ops: [at(40, 500, 'Bottom line'), at(40, 740, 'Top line'), at(40, 620, 'Middle line')], fields: [] }]);
  const result = await extractPdfText(pdf);
  assert.equal(result.text, 'Top line\nMiddle line\nBottom line');
});

test('PDF: words placed apart on the same line keep a space between them', async () => {
  const pdf = makePdf([{ ops: [at(40, 740, 'Hello'), at(120, 740, 'World'), at(260, 740, 'again')], fields: [] }]);
  const result = await extractPdfText(pdf);
  assert.equal(result.text, 'Hello World again');
});

test('PDF: form field values are included', async () => {
  const pdf = makePdf([{ ops: [at(40, 740, 'Name:')], fields: ['Jane Doe'] }]);
  const result = await extractPdfText(pdf);
  assert.equal(result.text, 'Name:');
  assert.deepEqual(result.fields, [{ page: 1, name: 'field0', value: 'Jane Doe' }]);
});

test('PDF: a PDF with no text gives empty text, not an error', async () => {
  const pdf = makePdf([{ ops: [], fields: [] }]);
  const result = await extractPdfText(pdf);
  assert.equal(result.pageCount, 1);
  assert.equal(result.text, '');
});
