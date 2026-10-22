// Extraction: file / URL -> markdown-like text that normalization understands.
// DOCX and web pages keep their heading / list / quote structure.
import fs from 'node:fs/promises';
import path from 'node:path';
import dns from 'node:dns/promises';
import net from 'node:net';
import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';
import { config } from '../config/config.js';
import { badRequest } from '../utils/httpError.js';
import { normalizeText } from '../intelligence/normalize.js';

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', mdash: '—', ndash: '–', hellip: '…' };

function decodeEntities(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') {
      const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

export function htmlToMarkdown(html) {
  let body = String(html)
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style|noscript|svg|nav|footer|header|form|iframe|aside)\b[\s\S]*?<\/\1>/gi, '');
  const main = body.match(/<(article|main)\b[^>]*>([\s\S]*?)<\/\1>/i);
  if (main) body = main[2];

  const md = body
    .replace(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi, (m, n, t) => `\n\n${'#'.repeat(Number(n))} ${t.replace(/<[^>]+>/g, '').trim()}\n\n`)
    .replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, (m, t) => `\n- ${t.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()}`)
    .replace(/<\/(ul|ol)>/gi, '\n\n')
    .replace(/<blockquote\b[^>]*>([\s\S]*?)<\/blockquote>/gi, (m, t) => `\n\n> ${t.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()}\n\n`)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|section|tr|table)>/gi, '\n\n')
    .replace(/<[^>]+>/g, ' ');

  return normalizeText(
    decodeEntities(md)
      .split('\n')
      .map((l) => l.replace(/[ \t]+/g, ' ').trim())
      .join('\n')
  );
}

export const htmlTitle = (html) => decodeEntities(String(html).match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '').trim();

// Never throws for a bad file: returns '' and the caller decides what to do.
export async function extractFile(filePath) {
  try {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.txt') return normalizeText(await fs.readFile(filePath, 'utf8'));
    if (ext === '.docx') return htmlToMarkdown((await mammoth.convertToHtml({ path: filePath })).value);
    if (ext === '.pdf') {
      const parser = new PDFParse({ data: await fs.readFile(filePath) });
      try {
        return normalizeText((await parser.getText()).text);
      } finally {
        await parser.destroy();
      }
    }
    return '';
  } catch (err) {
    console.error('Text extraction failed:', err.message);
    return '';
  }
}

function isPrivateAddress(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
  }
  const v6 = ip.toLowerCase();
  return v6 === '::1' || v6 === '::' || v6.startsWith('fc') || v6.startsWith('fd') || v6.startsWith('fe80') || v6.startsWith('::ffff:127.');
}

async function assertPublicUrl(url) {
  if (!['http:', 'https:'].includes(url.protocol)) throw badRequest('Only http and https URLs are supported.');
  if (config.allowPrivateUrls) return;
  const addresses = await dns.lookup(url.hostname, { all: true }).catch(() => []);
  if (!addresses.length) throw badRequest('Could not resolve that website.');
  if (addresses.some((a) => isPrivateAddress(a.address))) throw badRequest('Private or local network addresses are not allowed.');
}

// Fetches a public web page and returns { title, content }.
// Redirects are followed by hand so every hop is checked against private addresses.
export async function extractUrl(rawUrl) {
  let url;
  try {
    url = new URL(String(rawUrl).trim());
  } catch {
    throw badRequest('Enter a valid URL, including http:// or https://.');
  }

  let res;
  for (let hop = 0; ; hop++) {
    await assertPublicUrl(url);
    try {
      res = await fetch(url, {
        redirect: 'manual',
        signal: AbortSignal.timeout(config.urlFetchTimeoutMs),
        headers: { 'User-Agent': 'ContentAssuranceBot/1.0', Accept: 'text/html,text/plain' },
      });
    } catch {
      throw badRequest('Could not reach that URL.');
    }
    const location = res.headers.get('location');
    if (res.status < 300 || res.status >= 400 || !location) break;
    if (hop >= 4) throw badRequest('Too many redirects.');
    url = new URL(location, url);
  }
  if (!res.ok) throw badRequest(`The website responded with status ${res.status}.`);

  const type = res.headers.get('content-type') || '';
  if (!/text\/html|text\/plain|application\/xhtml/.test(type)) throw badRequest('That URL is not a web page or text file.');

  const reader = res.body.getReader();
  const chunks = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > config.urlMaxBytes) {
      await reader.cancel();
      break; // keep what we have; 2 MB of HTML is plenty of text
    }
    chunks.push(value);
  }
  const body = Buffer.concat(chunks).toString('utf8');
  const isHtml = !/text\/plain/.test(type);
  return {
    title: isHtml ? htmlTitle(body) : '',
    content: isHtml ? htmlToMarkdown(body) : normalizeText(body),
  };
}
