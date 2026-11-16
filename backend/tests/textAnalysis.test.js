import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeText } from '../src/services/textAnalysis.js';

test('analysis: counts words, sentences and paragraphs', () => {
  const stats = analyzeText('The cat sat. The dog ran fast!\n\nA bird flew away?');
  assert.equal(stats.words, 11);
  assert.equal(stats.sentences, 3);
  assert.equal(stats.paragraphs, 2);
  assert.equal(stats.averageWordsPerSentence, 3.7);
});

test('analysis: top words skip stopwords and short words', () => {
  const stats = analyzeText('Apples apples apples and the pears pears. A an of');
  assert.deepEqual(stats.topWords, [
    { word: 'apples', count: 3 },
    { word: 'pears', count: 2 },
  ]);
});

test('analysis: empty text gives zeros', () => {
  const stats = analyzeText('');
  assert.equal(stats.words, 0);
  assert.equal(stats.sentences, 0);
  assert.equal(stats.readingTimeMinutes, 0);
  assert.deepEqual(stats.topWords, []);
});
