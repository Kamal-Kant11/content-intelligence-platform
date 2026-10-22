import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseBlocks } from '../src/intelligence/normalize.js';
import * as readability from '../src/intelligence/content_quality/readability.js';
import * as structure from '../src/intelligence/content_quality/structure.js';
import * as vocabulary from '../src/intelligence/content_quality/vocabulary.js';
import * as grammar from '../src/intelligence/content_quality/grammar.js';
import { score } from '../src/intelligence/scoring/scorer.js';

const checks = (findings) => findings.map((f) => f.check);

test('readability flags long sentences, difficult words and filler', () => {
  const long = Array.from({ length: 30 }, (_, i) => `word${i}`).join(' ') + '.';
  const { findings, metrics } = readability.run(parseBlocks(`${long}\n\nWe utilize a very simple tool.`));
  assert.ok(checks(findings).includes('readability.long_sentence'));
  const wording = findings.find((f) => f.check === 'readability.difficult_wording');
  assert.equal(wording.text, 'utilize');
  assert.equal(wording.replacement, 'use');
  assert.ok(checks(findings).includes('readability.filler_word'));
  assert.ok(metrics.readingEase !== undefined);
});

test('readability respects a configured sentence limit (brand rule)', () => {
  const { findings } = readability.run(parseBlocks('One two three four five six seven.'), { maxSentenceWords: 5, sentenceRuleId: 'r1' });
  assert.equal(findings[0].category, 'rule');
  assert.equal(findings[0].ruleId, 'r1');
});

test('readability detects passive voice', () => {
  const { findings } = readability.run(parseBlocks('The report was written by the team.'));
  assert.ok(checks(findings).includes('readability.passive_voice'));
});

test('structure flags long paragraphs, single-item lists and missing headings', () => {
  const para = Array.from({ length: 160 }, () => 'word').join(' ') + '.';
  const blocks = parseBlocks(`${para}\n\n${para}\n\n- only item`);
  const found = checks(structure.run(blocks).findings);
  assert.ok(found.includes('structure.long_paragraph'));
  assert.ok(found.includes('structure.single_item_list'));
  assert.ok(found.includes('structure.no_headings'));
});

test('vocabulary: forbidden, preferred and required terms', () => {
  const blocks = parseBlocks('Our revolutionary platform. Send an e-mail.');
  const { findings } = vocabulary.run(blocks, {
    forbiddenTerms: [{ term: 'revolutionary' }],
    preferredTerms: [{ term: 'e-mail', preferred: 'email' }],
    requiredTerms: [{ term: 'Acme' }],
  });
  assert.deepEqual(checks(findings).sort(), ['vocabulary.forbidden_term', 'vocabulary.preferred_term', 'vocabulary.required_term']);
  assert.equal(findings.find((f) => f.check === 'vocabulary.preferred_term').replacement, 'email');
});

test('vocabulary matches whole words only', () => {
  const { findings } = vocabulary.run(parseBlocks('Synergyless text.'), { forbiddenTerms: [{ term: 'synergy' }], preferredTerms: [] });
  assert.equal(findings.length, 0);
});

test('grammar catches common mistakes with exact replacements', () => {
  const text = 'He don\'t know. We was late. It is a apple and an user. I could of gone. Read the the manual. There is many issues. It is better then before.';
  const findings = grammar.run(parseBlocks(text)).findings;
  const replacements = findings.map((f) => f.replacement);
  for (const expected of ["He doesn't", 'We were', 'an apple', 'a user', 'could have', 'the', 'There are many', 'better than']) {
    assert.ok(replacements.includes(expected), `missing ${expected}: ${JSON.stringify(replacements)}`);
  }
});

test('grammar a/an handles sounds and acronyms', () => {
  assert.equal(grammar.startsWithVowelSound('hour'), true);
  assert.equal(grammar.startsWithVowelSound('university'), false);
  assert.equal(grammar.startsWithVowelSound('FAQ'), true);
  assert.equal(grammar.startsWithVowelSound('URL'), false);
});

test('clean text produces no grammar findings', () => {
  assert.equal(grammar.run(parseBlocks('The team shipped the release on time.')).findings.length, 0);
});

test('scorer: 100 - 20 critical - 5 warning - 1 info, confidence-weighted', () => {
  const result = score(
    [
      { category: 'grammar', check: 'a', severity: 'critical', confidence: 1 },
      { category: 'grammar', check: 'b', severity: 'warning', confidence: 1 },
      { category: 'readability', check: 'c', severity: 'info', confidence: 1 },
    ],
    ['a', 'b', 'c', 'd', 'e']
  );
  assert.equal(result.overallScore, 74);
  assert.equal(result.summary.passed, 2);
  assert.equal(result.categoryScores.readability, 99);
  assert.equal(score([{ category: 'x', check: 'x', severity: 'warning', confidence: 0.5 }]).overallScore, 98);
});
