import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { NaiveBayes, featurize } from '../src/ml/naiveBayes.js';

test('features include words, bigrams and normalised numbers', () => {
  assert.deepEqual(featurize('Save 50% now!'), ['save', '<num>', '%', 'now', '!', 'save_<num>', '<num>_%', '%_now', 'now_!']);
});

test('naive bayes learns, predicts and survives JSON serialisation', () => {
  const model = new NaiveBayes().train([
    { text: 'buy now amazing deal', label: 'promo' },
    { text: 'huge sale buy today', label: 'promo' },
    { text: 'the server returns json', label: 'tech' },
    { text: 'configure the database index', label: 'tech' },
  ]);
  assert.equal(model.predict('amazing sale today').label, 'promo');
  const restored = NaiveBayes.fromJSON(JSON.parse(JSON.stringify(model.toJSON())));
  const p = restored.predict('database returns json');
  assert.equal(p.label, 'tech');
  assert.ok(p.confidence > 0.5 && p.confidence <= 1);
  assert.ok(Math.abs(Object.values(p.scores).reduce((a, b) => a + b, 0) - 1) < 1e-9);
});

const trained = (name) => {
  const file = new URL(`../ml/models/${name}.json`, import.meta.url);
  return fs.existsSync(file) ? NaiveBayes.fromJSON(JSON.parse(fs.readFileSync(file, 'utf8')).model) : null;
};

test('trained tone model recognises clear examples', { skip: !trained('tone') && 'run npm run train first' }, () => {
  const tone = trained('tone');
  assert.equal(tone.predict('Unlock incredible growth with our revolutionary platform today!').label, 'promotional');
  assert.equal(tone.predict('Set the environment variable and restart the server process.').label, 'technical');
});

test('trained claim model recognises a measurable claim', { skip: !trained('claim') && 'run npm run train first' }, () => {
  const claim = trained('claim');
  assert.equal(claim.predict('Our platform cuts costs by 30%.').label, 'claim');
  assert.equal(claim.predict('Click the button to open your settings.').label, 'not_claim');
});
