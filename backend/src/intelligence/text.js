// Small text helpers shared by every engine.

const ABBREVIATIONS = /\b(?:mr|mrs|ms|dr|prof|sr|jr|st|vs|etc|inc|ltd|co|e\.g|i\.e|approx|no|fig)\.$/i;

// Splits text into sentences. Good enough for prose; not a full NLP sentence splitter.
export function splitSentences(text) {
  const sentences = [];
  for (const line of String(text).split('\n')) {
    const parts = line.split(/(?<=[.!?]["'”’)]?)\s+(?=["'“‘(]?[A-Z0-9])/);
    let buffer = '';
    for (const part of parts) {
      buffer = buffer ? `${buffer} ${part}` : part;
      if (!ABBREVIATIONS.test(buffer.trim())) {
        if (buffer.trim()) sentences.push(buffer.trim());
        buffer = '';
      }
    }
    if (buffer.trim()) sentences.push(buffer.trim());
  }
  return sentences;
}

export function words(text) {
  return String(text).match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g) || [];
}

export function countSyllables(word) {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  if (w.length <= 3) return 1;
  const groups = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '').match(/[aeiouy]{1,2}/g);
  return Math.max(1, groups ? groups.length : 1);
}

export function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Whole-word, case-insensitive matcher that also works for terms like "e-mail" or "C++".
export function termRegex(term, flags = 'gi') {
  return new RegExp(`(?<![\\w-])${escapeRegExp(term.trim())}(?![\\w-])`, flags);
}

// Keeps the capitalisation of the word being replaced ("Utilize" -> "Use").
export function matchCase(original, replacement) {
  if (!replacement) return replacement;
  if (original === original.toUpperCase() && original.length > 1) return replacement.toUpperCase();
  if (original[0] === original[0].toUpperCase()) return replacement[0].toUpperCase() + replacement.slice(1);
  return replacement;
}

export function truncate(text, max = 240) {
  const t = String(text).trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

export const STOPWORDS = new Set(
  `a an the and or but if then else of to in on at by for with from as is are was were be been being it its this that
  these those we you they he she i our your their his her my me us them not no do does did so than too very can will
  just should would could may might must have has had into about over under more most such only own same also which who
  whom what when where why how all any both each few other some there here up down out off again further once`.split(/\s+/)
);
