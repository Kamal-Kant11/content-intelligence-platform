// Normalization + block parsing (PDF Phase 3).
//
// Every input (write, paste, file, URL) is turned into the same lightweight
// markdown-like text, and then into blocks. Blocks are created HERE, during
// normalization, never by the analysis engines.
//
//   # Heading            -> { type: 'heading', level: 1 }
//   - item / 1. item     -> { type: 'list' }   (consecutive items form one block)
//   > quoted text        -> { type: 'quote' }
//   anything else        -> { type: 'paragraph' } (wrapped lines are joined)
//   blank line           -> block separator

export const BLOCK_TYPES = ['heading', 'paragraph', 'list', 'quote'];

export function normalizeText(raw) {
  return String(raw ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/\0/g, '')
    .replace(/[​-‍﻿]/g, '')
    .replace(/[ \t]/g, ' ')
    .split('\n')
    .map((line) => line.replace(/ +$/g, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const HEADING_RE = /^(#{1,6})\s+(.*)$/;
const LIST_RE = /^\s*(?:[-*•]|\d+[.)])\s+(.*)$/;
const QUOTE_RE = /^>\s?(.*)$/;

// A short single line with no closing punctuation, followed by more text,
// is treated as a heading (common in plain text and PDF extraction).
function looksLikeHeading(line) {
  const wordsCount = line.split(/\s+/).length;
  return wordsCount <= 10 && /^[A-Z0-9]/.test(line) && !/[.!?,;:]$/.test(line);
}

export const blockId = (i) => `block_${String(i + 1).padStart(2, '0')}`;

export function parseBlocks(text) {
  const raw = [];
  const chunks = normalizeText(text).split(/\n\s*\n/);

  for (let c = 0; c < chunks.length; c++) {
    const lines = chunks[c].split('\n').map((l) => l.trim()).filter(Boolean);
    let current = null;
    const flush = () => {
      if (current) raw.push(current);
      current = null;
    };

    for (const line of lines) {
      const heading = line.match(HEADING_RE);
      const item = line.match(LIST_RE);
      const quote = line.match(QUOTE_RE);

      if (heading) {
        flush();
        raw.push({ type: 'heading', level: heading[1].length, text: heading[2].trim() });
      } else if (item) {
        if (current?.type !== 'list') flush();
        current ??= { type: 'list', items: [] };
        current.items.push(item[1].trim());
      } else if (quote) {
        if (current?.type !== 'quote') flush();
        current ??= { type: 'quote', parts: [] };
        current.parts.push(quote[1].trim());
      } else if (current?.type === 'list') {
        current.items[current.items.length - 1] += ` ${line}`; // wrapped list item
      } else {
        if (current?.type !== 'paragraph') flush();
        current ??= { type: 'paragraph', parts: [] };
        current.parts.push(line);
      }
    }
    flush();
  }

  // Promote short title-like single-line paragraphs to headings.
  for (let i = 0; i < raw.length; i++) {
    const b = raw[i];
    if (b.type === 'paragraph' && b.parts.length === 1 && i < raw.length - 1 && looksLikeHeading(b.parts[0])) {
      raw[i] = { type: 'heading', level: 2, text: b.parts[0] };
    }
  }

  return raw
    .map((b) => {
      if (b.type === 'list') return { type: 'list', text: b.items.join('\n') };
      if (b.type === 'quote' || b.type === 'paragraph') return { type: b.type, text: b.parts.join(' ').replace(/\s+/g, ' ') };
      return b;
    })
    .filter((b) => b.text)
    .map((b, position) => ({ blockId: blockId(position), type: b.type, position, text: b.text, ...(b.level ? { level: b.level } : {}) }));
}

// Blocks -> text. Used to build currentContent after review.
export function assembleContent(blocks) {
  return [...blocks]
    .sort((a, b) => a.position - b.position)
    .map((b) => {
      if (b.type === 'heading') return `${'#'.repeat(b.level || 2)} ${b.text}`;
      if (b.type === 'list') return b.text.split('\n').map((item) => `- ${item}`).join('\n');
      if (b.type === 'quote') return `> ${b.text}`;
      return b.text;
    })
    .join('\n\n');
}

export const countWords = (text) => (String(text).match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g) || []).length;
