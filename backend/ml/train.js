// Trains the local models from the labelled datasets in ml/data and writes
// them to ml/models/<name>.json, which the API loads at startup.
//
//   npm run train              train every model
//   npm run train -- tone      train one model
//   npm run train -- tone --folds 10 --alpha 0.5
//
// Each run first reports k-fold cross-validation metrics (how well the model
// does on examples it has NOT seen), then trains the final model on all data.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NaiveBayes } from '../src/ml/naiveBayes.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));

const MODELS = {
  tone: {
    data: 'tone.jsonl',
    description: 'Classifies the tone of a block of text. Used for brand voice learning and voice findings.',
  },
  claim: {
    data: 'claim.jsonl',
    description: 'Detects sentences that make a factual or measurable claim. Used by claims & evidence checks.',
  },
};

function parseArgs(argv) {
  const args = { names: [], folds: 5, alpha: 1, ngram: 2, seed: 42 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--folds') args.folds = Number(argv[++i]);
    else if (a === '--alpha') args.alpha = Number(argv[++i]);
    else if (a === '--ngram') args.ngram = Number(argv[++i]);
    else if (a === '--seed') args.seed = Number(argv[++i]);
    else args.names.push(a);
  }
  if (!args.names.length) args.names = Object.keys(MODELS);
  return args;
}

async function readJsonl(file) {
  const raw = await fs.readFile(file, 'utf8');
  return raw
    .split(/\r?\n/)
    .map((line, i) => [line.trim(), i + 1])
    .filter(([line]) => line && !line.startsWith('//'))
    .map(([line, n]) => {
      const row = JSON.parse(line);
      if (typeof row.text !== 'string' || typeof row.label !== 'string') {
        throw new Error(`${path.basename(file)} line ${n}: each row needs "text" and "label"`);
      }
      return row;
    });
}

// Deterministic shuffle so results are reproducible for a given --seed.
function shuffle(items, seed) {
  let s = seed >>> 0;
  const rand = () => ((s = (s + 0x6d2b79f5) >>> 0), ((s ^ (s >>> 15)) * (1 | s) >>> 0) / 4294967296);
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// Stratified folds: every fold gets a similar share of each label.
function stratifiedFolds(examples, k, seed) {
  const folds = Array.from({ length: k }, () => []);
  const byLabel = {};
  for (const ex of shuffle(examples, seed)) (byLabel[ex.label] ||= []).push(ex);
  let i = 0;
  for (const group of Object.values(byLabel)) for (const ex of group) folds[i++ % k].push(ex);
  return folds;
}

function evaluate(examples, args) {
  const labels = [...new Set(examples.map((e) => e.label))].sort();
  const confusion = Object.fromEntries(labels.map((a) => [a, Object.fromEntries(labels.map((b) => [b, 0]))]));
  const folds = stratifiedFolds(examples, args.folds, args.seed);

  for (let k = 0; k < folds.length; k++) {
    const train = folds.filter((_, i) => i !== k).flat();
    const model = new NaiveBayes({ alpha: args.alpha, ngram: args.ngram }).train(train);
    for (const ex of folds[k]) confusion[ex.label][model.predict(ex.text).label] += 1;
  }

  const total = examples.length;
  const correct = labels.reduce((sum, l) => sum + confusion[l][l], 0);
  const perLabel = {};
  for (const l of labels) {
    const tp = confusion[l][l];
    const predicted = labels.reduce((s, a) => s + confusion[a][l], 0);
    const actual = labels.reduce((s, b) => s + confusion[l][b], 0);
    const precision = predicted ? tp / predicted : 0;
    const recall = actual ? tp / actual : 0;
    const f1 = precision + recall ? (2 * precision * recall) / (precision + recall) : 0;
    perLabel[l] = { precision: round(precision), recall: round(recall), f1: round(f1), support: actual };
  }
  const macroF1 = round(labels.reduce((s, l) => s + perLabel[l].f1, 0) / labels.length);
  return { accuracy: round(correct / total), macroF1, folds: args.folds, perLabel, confusion };
}

const round = (n) => Math.round(n * 1000) / 1000;

function printReport(name, examples, metrics) {
  console.log(`\n=== ${name}: ${examples.length} examples, ${metrics.folds}-fold cross-validation`);
  console.log(`accuracy ${metrics.accuracy}   macro-F1 ${metrics.macroF1}`);
  console.log('label'.padEnd(16) + 'precision  recall  f1     support');
  for (const [label, m] of Object.entries(metrics.perLabel)) {
    console.log(
      label.padEnd(16) +
        String(m.precision).padEnd(11) +
        String(m.recall).padEnd(8) +
        String(m.f1).padEnd(7) +
        m.support
    );
  }
  const labels = Object.keys(metrics.confusion);
  console.log('confusion (rows = actual, columns = predicted)');
  console.log(''.padEnd(16) + labels.map((l) => l.slice(0, 10).padEnd(11)).join(''));
  for (const a of labels) {
    console.log(a.padEnd(16) + labels.map((b) => String(metrics.confusion[a][b]).padEnd(11)).join(''));
  }
}

async function trainOne(name, args) {
  const spec = MODELS[name];
  if (!spec) throw new Error(`Unknown model "${name}". Known: ${Object.keys(MODELS).join(', ')}`);

  const examples = await readJsonl(path.join(ROOT, 'data', spec.data));
  const counts = examples.reduce((c, e) => ((c[e.label] = (c[e.label] || 0) + 1), c), {});
  if (Object.keys(counts).length < 2) throw new Error(`${spec.data} needs at least two labels.`);

  const metrics = evaluate(examples, args);
  printReport(name, examples, metrics);

  const model = new NaiveBayes({ alpha: args.alpha, ngram: args.ngram }).train(examples);
  const out = {
    name,
    version: new Date().toISOString().replace(/[-:]/g, '').slice(0, 15),
    description: spec.description,
    labels: model.labels,
    trainedAt: new Date().toISOString(),
    dataset: { file: spec.data, examples: examples.length, labelCounts: counts },
    hyperparameters: { alpha: args.alpha, ngram: args.ngram },
    metrics: { accuracy: metrics.accuracy, macroF1: metrics.macroF1, folds: metrics.folds, perLabel: metrics.perLabel },
    model: model.toJSON(),
  };
  await fs.mkdir(path.join(ROOT, 'models'), { recursive: true });
  const file = path.join(ROOT, 'models', `${name}.json`);
  await fs.writeFile(file, JSON.stringify(out));
  console.log(`saved ${path.relative(process.cwd(), file)} (version ${out.version})`);
}

const args = parseArgs(process.argv.slice(2));
for (const name of args.names) await trainOne(name, args);
console.log('\nDone. Restart the API so it loads the new models.');
