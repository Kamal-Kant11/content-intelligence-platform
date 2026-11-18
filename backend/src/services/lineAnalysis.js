<<<<<<< HEAD
import { checkReadability, readabilitySpans } from './readability.js';
=======
import { checkGrammar } from './grammarCheck.js';
import { checkReadability, readabilitySpans } from './readability.js';
import { optimizeLine } from './optimizer.js';
>>>>>>> bfa39c5c92556a58a6a4353a3094e5a37d68e0e8
import { LINE, WORD_PATTERN } from './parameters.js';

const countWords = (text) => (text.match(WORD_PATTERN) || []).length;

export function splitLines(text) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, i) => ({ number: i + 1, text: line }));
}

<<<<<<< HEAD
=======
function grammarOf(text, minWords) {
  const words = countWords(text);
  if (words === 0) return { score: null, issues: 0 };
  const issues = checkGrammar(text).issueCount;
  const score = Math.max(0, Math.round(100 - (issues / Math.max(words, minWords)) * 100 * 2));
  return { score, issues };
}

>>>>>>> bfa39c5c92556a58a6a4353a3094e5a37d68e0e8
function readabilityOf(text) {
  if (countWords(text) < LINE.minWordsForReadability) return { score: null, label: null, gradeLevel: null };
  const r = checkReadability(text);
  return { score: r.score, label: r.label, gradeLevel: r.gradeLevel };
}

<<<<<<< HEAD
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
=======
function summarize(text) {
  return {
    words: countWords(text),
    grammar: grammarOf(text, LINE.grammarMinWordsPerDocument),
    readability: readabilityOf(text),
  };
}

export function analyzeDocumentLines(text) {
  const lines = splitLines(text).map((line) => {
    const optimizedText = optimizeLine(line.text);
    return {
      number: line.number,
      text: line.text,
      optimizedText,
      changed: optimizedText !== line.text,
      mistakes: checkGrammar(line.text).spans,
      readabilityIssues: readabilitySpans(line.text),
      words: countWords(line.text),
      grammar: {
        original: grammarOf(line.text, LINE.grammarMinWordsPerLine),
        optimized: grammarOf(optimizedText, LINE.grammarMinWordsPerLine),
      },
      readability: {
        original: readabilityOf(line.text),
        optimized: readabilityOf(optimizedText),
      },
    };
  });

  const optimizedDocument = lines.map((l) => l.optimizedText).join('\n');
  return {
    lines,
    overall: {
      original: summarize(text),
      optimized: summarize(optimizedDocument),
>>>>>>> bfa39c5c92556a58a6a4353a3094e5a37d68e0e8
    },
  };
}
