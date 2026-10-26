// Unit tests for the two parameters (grammar, readability) and the optimization rules.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyGrammarFixes, chunkText, grammarScore } from '../src/analysis/grammar.js';
import { analyzeReadability, readingLevel } from '../src/analysis/readability.js';
import { simplifyText, splitLongSentence } from '../src/analysis/simplify.js';
import { getSentences, normalizeText } from '../src/utils/text.js';

const issue = (text, start, issueType, suggestions) => ({
  text,
  start,
  end: start + text.length,
  issueType,
  message: 'test',
  suggestions,
  suggestionCount: suggestions.length,
});

test('grammar score: no issues is 100, empty text is null', () => {
  assert.equal(grammarScore([], 250), 100);
  assert.equal(grammarScore([], 0), null);
});

test('grammar score: weighted issues per 1,000 words', () => {
  // 3 grammar issues (weight 2) in 300 words -> 20 per 1,000 -> 80
  const issues = Array.from({ length: 3 }, () => ({ issueType: 'grammar' }));
  assert.equal(grammarScore(issues, 300), 80);
  // Short texts count as 100 words: 1 grammar issue in 10 words -> 80, not 0
  assert.equal(grammarScore([{ issueType: 'grammar' }], 10), 80);
  // Never below 0
  assert.equal(grammarScore(Array.from({ length: 200 }, () => ({ issueType: 'grammar' })), 100), 0);
});

test('grammar fixes: applies only single, mechanical suggestions', () => {
  const text = 'We was at teh park to recieve it. Very very good.';
  const issues = [
    issue('We was', 0, 'grammar', ['We were']),
    issue('teh', 10, 'misspelling', ['the']),
    issue('recieve', 21, 'misspelling', ['receive', 'relieve']), // ambiguous
    issue('Very very', 34, 'style', ['Very']), // style hint
  ];
  const result = applyGrammarFixes(text, issues);
  assert.equal(result.text, 'We were at the park to recieve it. Very very good.');
  assert.equal(result.changes.length, 2);
  assert.equal(result.skipped, 2);
});

test('grammar fixes: skips stale and overlapping issues', () => {
  const text = 'teh cat';
  const result = applyGrammarFixes(text, [issue('teh', 0, 'misspelling', ['the']), issue('teh c', 0, 'grammar', ['x']), issue('dog', 4, 'misspelling', ['cat'])]);
  assert.equal(result.text, 'the cat');
});

test('chunkText splits long text at boundaries and keeps every character', () => {
  const text = 'Hello world. '.repeat(3000);
  const chunks = chunkText(text, 1000);
  assert.ok(chunks.length > 1);
  assert.equal(chunks.map((c) => c.text).join(''), text);
  assert.ok(chunks.every((c) => c.text.length <= 1000));
  assert.equal(chunks[1].start, chunks[0].text.length);
});

test('readability: Flesch Reading Ease from words, sentences and syllables', () => {
  const r = analyzeReadability('The cat sat on the mat. It was happy.');
  assert.equal(r.wordCount, 9);
  assert.equal(r.sentenceCount, 2);
  // 206.835 - 1.015 * 4.5 - 84.6 * (10 / 9)
  assert.equal(r.fleschReadingEase, 108.3);
  assert.equal(r.score, 100); // display score is clamped
  assert.equal(r.level.label, 'Very easy');
});

test('readability: harder text scores lower', () => {
  const easy = analyzeReadability('We ship fast. You get it soon. It works well.');
  const hard = analyzeReadability(
    'Organizational transformation initiatives necessitate comprehensive stakeholder communication, infrastructural modernization, and continuous institutional evaluation methodologies.'
  );
  assert.ok(easy.score > hard.score);
  assert.equal(hard.level.label, 'Very difficult');
});

test('readability: empty text is handled', () => {
  const r = analyzeReadability('   ');
  assert.equal(r.score, null);
  assert.equal(r.wordCount, 0);
});

test('reading levels follow the Flesch bands', () => {
  assert.equal(readingLevel(65).label, 'Standard');
  assert.equal(readingLevel(45).label, 'Difficult');
  assert.equal(readingLevel(-20).label, 'Very difficult');
});

test('sentences: decimals stay together, line breaks end sentences', () => {
  assert.deepEqual(getSentences('Version 3.5 is out! Try it.\nHeading'), ['Version 3.5 is out!', 'Try it.', 'Heading']);
});

test('simplify: plain wording keeps case and whole words only', () => {
  const { text, changes } = simplifyText('In order to utilize it, we waited approximately one hour. The farm is self-sufficient.');
  assert.equal(text, 'To use it, we waited about one hour. The farm is self-sufficient.');
  assert.equal(changes.length, 3);
});

test('simplify: splits long sentences at clause boundaries, not lists', () => {
  const long =
    'The team reviewed every support ticket from the last quarter in detail, and the engineers fixed the most common problems before the next release went out.';
  const split = splitLongSentence(long);
  assert.equal(
    split,
    'The team reviewed every support ticket from the last quarter in detail. The engineers fixed the most common problems before the next release went out.'
  );

  const list = 'We bought apples, pears, and plums and many other kinds of fresh fruit from the local farmers market on Saturday morning before lunch.';
  assert.equal(splitLongSentence(list), list);
});

test('simplify: text without matches is returned unchanged', () => {
  const text = 'Short and clear.\n\nAnother paragraph.';
  assert.deepEqual(simplifyText(text), { text, changes: [] });
});

test('normalizeText cleans line endings and blank lines', () => {
  assert.equal(normalizeText('a\r\nb  \n\n\n\nc\u0000'), 'a\nb\n\nc');
});
