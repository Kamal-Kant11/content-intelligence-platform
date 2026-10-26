// Turns an uploaded file or a web page into plain text for the analysis pipeline.
import path from 'node:path';
import * as cheerio from 'cheerio';
import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';
import { badRequest } from '../utils/httpError.js';
import { hasWords, normalizeText } from '../utils/text.js';
import { fetchPublicPage } from './safeFetch.js';

export const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.txt'];

const startsWith = (buffer, signature) => buffer.subarray(0, signature.length).equals(Buffer.from(signature, 'latin1'));

// PDFs break lines at the page edge: join wrapped lines and words hyphenated across lines,
// keep blank lines as paragraph breaks, and drop the "-- 1 of 3 --" page markers.
function unwrapPdfText(text) {
  return text
    .replace(/^\s*--\s*\d+\s+of\s+\d+\s*--\s*$/gm, '')
    .replace(/(\p{L})-\n(\p{Ll})/gu, '$1$2')
    .replace(/([^\n])\n(?!\n|\s*[-•*]\s|\s*\d+[.)]\s)/g, '$1 ');
}

async function pdfToText(buffer) {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    return unwrapPdfText((await parser.getText()).text);
  } finally {
    await parser.destroy();
  }
}

function decodeTxt(buffer) {
  if (buffer.includes(0)) throw badRequest('This does not look like a text file.');
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder('windows-1252').decode(buffer); // older Windows editors
  }
}

// Checks the real file type (not just the extension) and returns its text.
export async function extractFileText(buffer, originalName) {
  const ext = path.extname(originalName || '').toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) throw badRequest('Only PDF, DOCX and TXT files are supported.');
  if (!buffer?.length) throw badRequest('The file is empty.');

  let text;
  if (ext === '.pdf') {
    if (!startsWith(buffer, '%PDF-')) throw badRequest('This file is not a valid PDF.');
    try {
      text = await pdfToText(buffer);
    } catch (err) {
      console.error('PDF extraction failed:', err.message);
      throw badRequest('Could not read this PDF. It may be damaged or password-protected.');
    }
  } else if (ext === '.docx') {
    if (!startsWith(buffer, 'PK\x03\x04')) throw badRequest('This file is not a valid DOCX document.');
    try {
      text = (await mammoth.extractRawText({ buffer })).value;
    } catch (err) {
      console.error('DOCX extraction failed:', err.message);
      throw badRequest('Could not read this DOCX file. It may be damaged.');
    }
  } else {
    text = decodeTxt(buffer);
  }

  text = normalizeText(text);
  if (!hasWords(text)) {
    throw badRequest(
      ext === '.pdf' ? 'No text found in this PDF. Scanned (image-only) PDFs are not supported.' : 'No readable text found in this file.'
    );
  }
  return text;
}

const BLOCKS = 'h1,h2,h3,h4,h5,h6,p,li,blockquote,pre,figcaption,dt,dd,td,th';

// Main readable text of an HTML page: drops scripts, menus, footers and forms, prefers
// <article>/<main>, and keeps one paragraph per block element.
export function htmlToText(html) {
  const $ = cheerio.load(html);
  const title = $('title').first().text().replace(/\s+/g, ' ').trim() || $('h1').first().text().replace(/\s+/g, ' ').trim();

  $('script,style,noscript,template,svg,iframe,nav,header,footer,aside,form,button,select').remove();
  const root = [$('article').first(), $('main').first(), $('[role="main"]').first(), $('body')].find((el) => el.length) || $.root();

  const blocks = [];
  root.find(BLOCKS).each((_, el) => {
    if ($(el).find(BLOCKS).length) return; // a container; its inner blocks are collected on their own
    const text = $(el).text().replace(/\s+/g, ' ').trim();
    if (text) blocks.push(text);
  });
  const text = blocks.length ? blocks.join('\n\n') : root.text().replace(/\s+/g, ' ').trim();
  return { title, text: normalizeText(text) };
}

export async function extractUrlText(rawUrl) {
  const page = await fetchPublicPage(rawUrl);
  const { title, text } = page.isHtml ? htmlToText(page.body) : { title: '', text: normalizeText(page.body) };
  if (!hasWords(text)) {
    throw badRequest('No readable text found on that page. It may be built with JavaScript; copy the text and use Paste Text instead.');
  }
  return { url: page.finalUrl, title, text };
}
