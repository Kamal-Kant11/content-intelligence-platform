import { READING_SPEED, STOPWORDS, WORD_PATTERN } from './parameters.js';

const STOPWORD_SET = new Set(STOPWORDS);
const round1 = (n) => Math.round(n * 10) / 10;

export function analyzeText(text = '') {
  const words = text.match(WORD_PATTERN) || [];
  const sentences = text
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => /[\p{L}\p{N}]/u.test(s));
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim()).length;
  const lines = text.split('\n').filter((l) => l.trim()).length;

  const lower = words.map((w) => w.toLowerCase());
  const counts = new Map();
  for (const word of lower) {
    if (word.length < 3 || STOPWORD_SET.has(word) || /^\d+$/.test(word)) continue;
    counts.set(word, (counts.get(word) || 0) + 1);
  }
  const topWords = [...counts]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 10)
    .map(([word, count]) => ({ word, count }));

  const letters = words.reduce((sum, w) => sum + w.length, 0);

  return {
    characters: text.length,
    charactersNoSpaces: text.replace(/\s/g, '').length,
    words: words.length,
    uniqueWords: new Set(lower).size,
    sentences: sentences.length,
    paragraphs,
    lines,
    averageWordsPerSentence: sentences.length ? round1(words.length / sentences.length) : 0,
    averageWordLength: words.length ? round1(letters / words.length) : 0,
    readingTimeMinutes: words.length ? round1(words.length / READING_SPEED.wordsPerMinute) : 0,
    topWords,
  };
}
