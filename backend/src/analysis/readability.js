// Parameter 2: readability, measured with the Flesch Reading Ease formula (a math formula, not ML):
//   206.835 - 1.015 x (words / sentences) - 84.6 x (syllables / words)
// Higher is easier. Raw values can fall below 0 or above 100; the display score is clamped to 0..100.
import { syllable } from 'syllable';
import { getSentences, getWords } from '../utils/text.js';

export const LONG_SENTENCE_WORDS = 25;

const LEVELS = [
  [90, 'Very easy', '5th grade'],
  [80, 'Easy', '6th grade'],
  [70, 'Fairly easy', '7th grade'],
  [60, 'Standard', '8th–9th grade'],
  [50, 'Fairly difficult', '10th–12th grade'],
  [30, 'Difficult', 'College'],
  [-Infinity, 'Very difficult', 'College graduate'],
];

export function readingLevel(fleschReadingEase) {
  const [, label, audience] = LEVELS.find(([min]) => fleschReadingEase >= min);
  return { label, audience };
}

const round = (n, digits = 1) => Math.round(n * 10 ** digits) / 10 ** digits;

export function analyzeReadability(text) {
  const words = getWords(text);
  const sentences = getSentences(text);
  if (!words.length || !sentences.length) {
    return {
      score: null,
      fleschReadingEase: null,
      wordCount: 0,
      sentenceCount: 0,
      syllableCount: 0,
      avgSentenceLength: 0,
      avgWordLength: 0,
      avgSyllablesPerWord: 0,
      longSentenceCount: 0,
      level: { label: 'Not enough text', audience: '' },
    };
  }

  // Numbers ("2024") have no syllables in the dictionary; count them as one.
  const syllables = words.reduce((sum, w) => sum + Math.max(1, syllable(w)), 0);
  const wordsPerSentence = words.length / sentences.length;
  const syllablesPerWord = syllables / words.length;
  const fre = 206.835 - 1.015 * wordsPerSentence - 84.6 * syllablesPerWord;

  return {
    score: Math.max(0, Math.min(100, Math.round(fre))),
    fleschReadingEase: round(fre),
    wordCount: words.length,
    sentenceCount: sentences.length,
    syllableCount: syllables,
    avgSentenceLength: round(wordsPerSentence),
    avgWordLength: round(words.reduce((sum, w) => sum + w.length, 0) / words.length),
    avgSyllablesPerWord: round(syllablesPerWord, 2),
    longSentenceCount: sentences.filter((s) => getWords(s).length > LONG_SENTENCE_WORDS).length,
    level: readingLevel(fre),
  };
}
