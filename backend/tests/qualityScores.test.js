import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkGrammar } from '../src/services/grammarCheck.js';
import { checkReadability, countSyllables } from '../src/services/readability.js';

test('syllables: common words are counted correctly', () => {
  assert.equal(countSyllables('table'), 2);
  assert.equal(countSyllables('make'), 1);
  assert.equal(countSyllables('fire'), 1);
  assert.equal(countSyllables('cat'), 1);
  assert.equal(countSyllables('wonderful'), 3);
});

test('grammar: clean text has no issues and a full score', () => {
  const result = checkGrammar('This is a clear sentence. It has no mistakes.');
  assert.equal(result.issueCount, 0);
  assert.equal(result.score, 100);
});

test('grammar: finds repeated words, lowercase i, and a/an mistakes', () => {
  const result = checkGrammar('the the cat is here. i think so. a apple fell. an university opened.');
  const ids = result.issues.map((i) => i.id);
  assert.ok(ids.includes('repeated-word'));
  assert.ok(ids.includes('lowercase-i'));
  assert.ok(ids.includes('a-before-vowel'));
  assert.ok(ids.includes('an-before-consonant'), '"an university" should be flagged');
  assert.equal(checkGrammar('A university and an hour and an apple.').issueCount, 0);
  assert.ok(result.score < 100);
});

test('grammar: empty text has no score', () => {
  assert.equal(checkGrammar('').score, null);
});

test('readability: short simple sentence is very easy', () => {
  const result = checkReadability('The cat sat on the mat.');
  assert.equal(result.score, 100);
  assert.equal(result.label, 'Very easy');
});

test('readability: long dense sentence scores lower', () => {
  const hard = checkReadability(
    'Notwithstanding the considerable institutional complexities, administrators underestimated the implementation requirements.'
  );
  assert.ok(hard.score < 50, `expected below 50, got ${hard.score}`);
  assert.ok(hard.gradeLevel > 12);
});
