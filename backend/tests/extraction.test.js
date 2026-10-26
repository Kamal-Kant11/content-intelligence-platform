// File extraction, HTML extraction, SSRF protection and DOCX export.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractFileText, htmlToText } from '../src/services/extractionService.js';
import { fetchPublicPage, isPublicAddress } from '../src/services/safeFetch.js';
import { buildDocx, exportFilename } from '../src/services/exportService.js';

test('TXT: UTF-8 and Windows-1252 files are read', async () => {
  assert.equal(await extractFileText(Buffer.from('Hello café.\r\n'), 'a.txt'), 'Hello café.');
  assert.equal(await extractFileText(Buffer.from([0x63, 0x61, 0x66, 0xe9]), 'a.txt'), 'café');
});

test('rejects unsupported, empty, disguised and binary files', async () => {
  await assert.rejects(extractFileText(Buffer.from('x'), 'a.exe'), { status: 400 });
  await assert.rejects(extractFileText(Buffer.alloc(0), 'a.txt'), /empty/);
  await assert.rejects(extractFileText(Buffer.from('just text'), 'a.pdf'), /not a valid PDF/);
  await assert.rejects(extractFileText(Buffer.from('just text'), 'a.docx'), /not a valid DOCX/);
  await assert.rejects(extractFileText(Buffer.from([0x48, 0x00, 0x49]), 'a.txt'), /text file/);
  await assert.rejects(extractFileText(Buffer.from('  \n  '), 'a.txt'), /No readable text/);
});

// Smallest valid PDF with one text line per entry in `lines`.
function makePdf(lines) {
  const stream = `BT /F1 12 Tf 72 720 Td 14 TL ${lines.map((l) => `(${l}) '`).join(' ')} ET`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = objects.map((body, i) => {
    const offset = pdf.length;
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
    return offset;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf, 'latin1');
}

test('PDF: text is extracted and wrapped lines are joined', async () => {
  const text = await extractFileText(makePdf(['The quick brown fox jumps', 'over the lazy dog.']), 'story.pdf');
  assert.equal(text, 'The quick brown fox jumps over the lazy dog.');
});

test('DOCX: export and extraction round-trip', async () => {
  const buffer = await buildDocx('Title', 'First paragraph.\n\nSecond paragraph.');
  const text = await extractFileText(buffer, 'report.docx');
  assert.match(text, /First paragraph\.\s+Second paragraph\./);
});

test('export filenames are safe and contain no ids', () => {
  assert.equal(exportFilename('Q3 Report: Draft #2', 'docx'), 'Q3-Report-Draft-2-approved.docx');
  assert.equal(exportFilename('../../etc/passwd', 'txt'), 'etcpasswd-approved.txt');
  assert.equal(exportFilename('', 'txt'), 'document-approved.txt');
});

test('HTML: keeps the main readable text, drops menus and scripts', () => {
  const html = `<html><head><title>My Post</title><script>alert(1)</script></head><body>
    <nav><a>Home</a><a>About</a></nav>
    <article><h1>Hello</h1><p>First   paragraph.</p><ul><li>One</li><li>Two</li></ul></article>
    <footer>Copyright</footer></body></html>`;
  const { title, text } = htmlToText(html);
  assert.equal(title, 'My Post');
  assert.equal(text, 'Hello\n\nFirst paragraph.\n\nOne\n\nTwo');
});

test('SSRF: private, loopback and metadata addresses are not public', () => {
  for (const ip of ['127.0.0.1', '10.1.2.3', '172.16.0.1', '192.168.1.1', '169.254.169.254', '100.64.0.1', '0.0.0.0', '::1', '::', 'fd00::1', 'fe80::1', '::ffff:127.0.0.1']) {
    assert.equal(isPublicAddress(ip), false, ip);
  }
  for (const ip of ['8.8.8.8', '1.1.1.1', '2606:4700:4700::1111']) assert.equal(isPublicAddress(ip), true, ip);
});

test('SSRF: blocked URLs are rejected before any request', async () => {
  for (const url of ['http://localhost/', 'http://127.0.0.1/', 'http://[::1]/', 'http://169.254.169.254/latest/meta-data', 'http://10.0.0.1/']) {
    await assert.rejects(fetchPublicPage(url), /private network/, url);
  }
  await assert.rejects(fetchPublicPage('ftp://example.com/'), /http/);
  await assert.rejects(fetchPublicPage('https://example.com:8443/'), /standard ports/);
  await assert.rejects(fetchPublicPage('http://user:pass@example.com/'), /username/);
  await assert.rejects(fetchPublicPage('not a url'), /valid URL/);
});
