import { READABILITY, WORD_PATTERN } from './parameters.js';

const round1 = (n) => Math.round(n * 10) / 10;

export function countSyllables(word) {
  let w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  if (w.length <= 3) return 1;
  w = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
  w = w.replace(/^y/, '');
  const groups = w.match(/[aeiouy]{1,2}/g);
  return groups ? groups.length : 1;
}

function bandFor(score) {
  return READABILITY.bands.find((band) => score >= band.min).label;
}

export function sentenceSegments(text = '') {
  return [...text.matchAll(/[^.!?]+[.!?]*/g)]
    .map((m) => {
      const lead = m[0].length - m[0].trimStart().length;
      const trimmed = m[0].trim();
      return { start: m.index + lead, end: m.index + lead + trimmed.length, text: trimmed };
    })
    .filter((s) => /[\p{L}\p{N}]/u.test(s.text));
}

export function readabilitySpans(text = '') {
<<<<<<< HEAD
  const sentences = sentenceSegments(text);
  const spans = [];
  for (const sentence of sentences) {
    const words = (sentence.text.match(WORD_PATTERN) || []).length;
    if (words > READABILITY.longSentenceWords) {
      spans.push({
        start: sentence.start,
        end: sentence.end,
        kind: 'readability',
        id: 'long-sentence',
        label: `Long sentence (${words} words)`,
        sentence: sentence.text,
        sentenceStart: sentence.start,
        sentenceEnd: sentence.end,
        advice: `This sentence has ${words} words. Split it into two or more shorter sentences where it says "and", "but", "because" or has a semicolon. Keep only the details the reader needs.`,
      });
    }
  }
  for (const m of text.matchAll(WORD_PATTERN)) {
    const syllables = countSyllables(m[0]);
    if (syllables >= READABILITY.complexWordSyllables) {
      const sentence = sentences.find((s) => m.index >= s.start && m.index < s.end) ?? { start: m.index, end: m.index + m[0].length, text: m[0] };
      spans.push({
        start: m.index,
        end: m.index + m[0].length,
        kind: 'readability',
        id: 'complex-word',
        label: 'Complex word',
        word: m[0],
        syllables,
        sentence: sentence.text,
        sentenceStart: sentence.start,
        sentenceEnd: sentence.end,
        advice: `"${m[0]}" has ${syllables} syllables. Replace it with a shorter, everyday word that means the same thing.`,
      });
=======
  const spans = [];
  for (const sentence of sentenceSegments(text)) {
    const words = (sentence.text.match(WORD_PATTERN) || []).length;
    if (words > READABILITY.longSentenceWords) {
      spans.push({ start: sentence.start, end: sentence.end, kind: 'readability', id: 'long-sentence', label: `Long sentence (${words} words)` });
    }
  }
  for (const m of text.matchAll(WORD_PATTERN)) {
    if (countSyllables(m[0]) >= READABILITY.complexWordSyllables) {
      spans.push({ start: m.index, end: m.index + m[0].length, kind: 'readability', id: 'complex-word', label: 'Complex word' });
>>>>>>> bfa39c5c92556a58a6a4353a3094e5a37d68e0e8
    }
  }
  return spans;
}

export function checkReadability(text = '') {
  const words = text.match(WORD_PATTERN) || [];
  if (words.length === 0) {
    return { score: null, label: null, gradeLevel: null, words: 0, sentences: 0, wordsPerSentence: 0, syllablesPerWord: 0, complexWords: 0, longSentences: 0 };
  }

  const sentences = sentenceSegments(text);
  const sentenceCount = Math.max(1, sentences.length);
  const syllables = words.map(countSyllables);
  const totalSyllables = syllables.reduce((sum, n) => sum + n, 0);
  const wordsPerSentence = words.length / sentenceCount;
  const syllablesPerWord = totalSyllables / words.length;

  const score = Math.min(
    100,
    Math.max(0, READABILITY.easeBase - READABILITY.easePerWordPerSentence * wordsPerSentence - READABILITY.easePerSyllablePerWord * syllablesPerWord)
  );
  const gradeLevel = Math.max(
    0,
    READABILITY.gradeWordsPerSentence * wordsPerSentence + READABILITY.gradeSyllablesPerWord * syllablesPerWord - READABILITY.gradeBase
  );

  return {
    score: Math.round(score),
    label: bandFor(score),
    gradeLevel: round1(gradeLevel),
    words: words.length,
    sentences: sentenceCount,
    wordsPerSentence: round1(wordsPerSentence),
    syllablesPerWord: round1(syllablesPerWord),
    complexWords: syllables.filter((n) => n >= READABILITY.complexWordSyllables).length,
    longSentences: sentences.filter((s) => (s.text.match(WORD_PATTERN) || []).length > READABILITY.longSentenceWords).length,
  };
}
