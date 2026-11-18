import { checkReadability, readabilitySpans } from './readability.js';
import { LINE, WORD_PATTERN } from './parameters.js';

const countWords = (text) => (text.match(WORD_PATTERN) || []).length;

export function splitLines(text) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, i) => ({ number: i + 1, text: line }));
}

function readabilityOf(text) {
  if (countWords(text) < LINE.minWordsForReadability) return { score: null, label: null, gradeLevel: null };
  const r = checkReadability(text);
  return { score: r.score, label: r.label, gradeLevel: r.gradeLevel };
}

export function analyzeDocumentLines(text) {
  const lines = splitLines(text).map((line) => ({
    number: line.number,
    text: line.text,
    words: countWords(line.text),
    readability: readabilityOf(line.text),
    readabilityIssues: readabilitySpans(line.text),
  }));

  return {
    lines,
    overall: {
      words: countWords(text),
      readability: readabilityOf(text),
    },
  };
}
