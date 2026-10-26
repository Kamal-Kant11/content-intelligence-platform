// Small text helpers shared by extraction, analysis and optimization.

// Unix line endings, no control characters, no trailing spaces, at most one blank line in a row.
export function normalizeText(raw) {
  return String(raw ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/ /g, ' ')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F﻿]/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// A word is a run of letters/digits, allowing inner apostrophes and hyphens ("don't", "well-known").
const WORD_RE = /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu;

export const getWords = (text) => String(text ?? '').match(WORD_RE) || [];

// Sentence boundary: . ! or ? (optionally followed by a closing quote/bracket) and then whitespace.
// The capture group keeps the whitespace when used with split(), so text can be rebuilt exactly.
export const SENTENCE_SPLIT_RE = /((?<=[.!?]["'”’)\]]*)\s+)/;

// Line breaks also end a sentence, so headings and list items are not glued together.
export function getSentences(text) {
  return String(text ?? '')
    .split('\n')
    .flatMap((line) => line.split(SENTENCE_SPLIT_RE).filter((_, i) => i % 2 === 0))
    .map((s) => s.trim())
    .filter((s) => getWords(s).length > 0);
}

export function hasWords(text) {
  return getWords(text).length > 0;
}
