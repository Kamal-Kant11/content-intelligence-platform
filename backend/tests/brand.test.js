import { test } from 'node:test';
import assert from 'node:assert/strict';
import { learnFromSources, profileFromObservations } from '../src/intelligence/brand/extraction.js';
import { generateRules } from '../src/intelligence/brand/ruleGeneration.js';
import { buildEngineOptions } from '../src/intelligence/brand/ruleConfig.js';
import * as claims from '../src/intelligence/claims/analysis.js';
import { parseBlocks } from '../src/intelligence/normalize.js';
import { runAnalysis } from '../src/intelligence/pipeline.js';
import { rewriteBlock, splitLongSentence } from '../src/intelligence/rewrite/rewriter.js';

// A mock model provider: no trained model needed for these tests.
const mockClassify = (name, text) => {
  if (name === 'tone') return /!/.test(text) ? { label: 'promotional', confidence: 0.9 } : { label: 'conversational', confidence: 0.8 };
  if (name === 'claim') return /\d/.test(text) ? { label: 'claim', confidence: 0.9 } : { label: 'not_claim', confidence: 0.9 };
  return null;
};

const guidelines = {
  _id: 'src1',
  content: `# Writing guidelines

Our voice is clear, confident and human. Avoid buzzwords such as "synergy", "leverage" and "streamline".
Use "customers" instead of "clients". Use active voice. Keep sentences under 20 words.

We write for you, so we keep things simple and friendly for our readers every day.

You can always reach our team when you need help with your account or your billing.`,
};

test('explicit guidelines become explicit observations with evidence', () => {
  const obs = learnFromSources([guidelines], mockClassify);
  const explicit = obs.filter((o) => o.origin === 'explicit');
  const kinds = explicit.map((o) => o.data.kind).sort();
  assert.deepEqual(kinds, ['forbidden', 'passive', 'preferred', 'sentenceLength', 'traits']);
  assert.deepEqual(explicit.find((o) => o.data.kind === 'forbidden').data.terms, ['synergy', 'leverage', 'streamline']);
  assert.equal(explicit.find((o) => o.data.kind === 'sentenceLength').data.maxWords, 20);
  for (const o of explicit) assert.equal(o.evidence[0].sourceId, 'src1');
});

test('observations generate suggested rules, explicit wins over inferred', () => {
  const obs = learnFromSources([guidelines], mockClassify).map((o, i) => ({ ...o, _id: `o${i}` }));
  const rules = generateRules(obs);
  const types = rules.map((r) => r.type);
  assert.ok(types.includes('forbidden_term'));
  assert.ok(types.includes('preferred_term'));
  assert.ok(types.includes('passive_voice'));
  assert.equal(rules.find((r) => r.type === 'sentence_length').configuration.maxWords, 20);
  assert.equal(new Set(rules.map((r) => r.fingerprint)).size, rules.length, 'fingerprints are unique');

  const profile = profileFromObservations(obs);
  assert.ok(profile.voice.traits.includes('clear'));
  assert.ok(profile.voice.tone.includes('conversational'));
});

test('only active, enabled rules configure the engines', () => {
  const opts = buildEngineOptions([
    { _id: 'a', type: 'forbidden_term', status: 'active', enabled: true, severity: 'critical', category: 'vocabulary', configuration: { terms: ['leverage'] } },
    { _id: 'b', type: 'forbidden_term', status: 'suggested', enabled: true, configuration: { terms: ['ignored'] } },
    { _id: 'c', type: 'sentence_length', status: 'active', enabled: false, configuration: { maxWords: 10 } },
  ]);
  assert.ok(opts.vocabulary.forbiddenTerms.some((t) => t.term === 'leverage' && t.ruleId === 'a'));
  assert.ok(!opts.vocabulary.forbiddenTerms.some((t) => t.term === 'ignored'));
  assert.equal(opts.readability.maxSentenceWords, undefined);
});

test('claims: mismatch against an approved source is flagged with evidence', () => {
  const chunks = claims.chunkText('Customers experienced a 37% improvement in efficiency after adopting the product.').map((c) => ({
    ...c,
    sourceId: 's1',
    sourceName: 'Case study',
  }));
  const { findings, metrics } = claims.run(parseBlocks('Our product improves efficiency by 50%.'), { chunks }, mockClassify);
  assert.equal(findings[0].check, 'claim.mismatch');
  assert.match(findings[0].message, /50%.*37%/);
  assert.equal(findings[0].evidence[0].sourceId, 's1');
  assert.equal(metrics.claims.mismatched, 1);
});

test('claims: matching figure is supported', () => {
  const chunks = [{ chunkId: 'c1', text: 'Customers saw a 37% improvement in efficiency.', sourceId: 's1', sourceName: 'Case' }];
  const { findings, metrics } = claims.run(parseBlocks('Customers see a 37% efficiency improvement.'), { chunks }, mockClassify);
  assert.equal(findings.length, 0);
  assert.equal(metrics.claims.supported, 1);
});

test('pipeline: brand tone rule produces a voice finding from the model', () => {
  const blocks = parseBlocks('Buy our amazing product today and change everything forever!');
  const rules = [{ _id: 't', type: 'tone', status: 'active', enabled: true, severity: 'warning', category: 'voice', configuration: { allowed: ['conversational'] } }];
  const result = runAnalysis(blocks, { rules, classify: mockClassify });
  const voice = result.findings.find((f) => f.check === 'voice.tone_mismatch');
  assert.equal(voice.source, 'model');
  assert.equal(voice.ruleId, 't');
  assert.ok(result.findings.every((f, i) => f.findingId === `f_${String(i + 1).padStart(3, '0')}`));
});

test('rewriter applies replacements, removes forbidden words and splits long sentences', () => {
  const block = { blockId: 'block_01', type: 'paragraph', text: 'Our revolutionary, world-class platform helps teams utilize data' };
  const result = runAnalysis([{ ...block, position: 0 }]);
  const out = rewriteBlock(block, result.findings);
  assert.equal(out.proposedText, 'Our platform helps teams use data.');
  assert.ok(out.reasons.length >= 3);

  const long = 'The team reviewed every document in the archive carefully, and they found that most of the older files needed new headings and shorter paragraphs.';
  assert.equal(
    splitLongSentence(long, 20),
    'The team reviewed every document in the archive carefully. They found that most of the older files needed new headings and shorter paragraphs.'
  );
});
