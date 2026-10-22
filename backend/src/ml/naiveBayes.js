// Multinomial Naive Bayes text classifier, written from scratch (no AI API, no
// native dependencies). Trained by ml/train.js and saved as plain JSON.
//
// How it works:
//   1. Text -> features (lowercased words + word pairs, numbers collapsed to <num>).
//   2. Training counts how often each feature appears under each label.
//   3. Prediction scores each label with  log P(label) + sum log P(feature | label),
//      using Laplace smoothing (alpha) so unseen words don't zero a label out.
//   4. Scores are turned into probabilities with a softmax. Raw Naive Bayes is
//      badly over-confident on long texts, so the scores are divided by
//      sqrt(featureCount) first (a simple temperature calibration).

const TOKEN_RE = /[a-z]+(?:'[a-z]+)?|\d+(?:[.,]\d+)?|[%!?$€£]/g;

export function tokenize(text) {
  return (String(text).toLowerCase().match(TOKEN_RE) || []).map((t) => (/^\d/.test(t) ? '<num>' : t));
}

export function featurize(text, ngram = 2) {
  const tokens = tokenize(text);
  const features = [...tokens];
  if (ngram >= 2) {
    for (let i = 0; i < tokens.length - 1; i++) features.push(`${tokens[i]}_${tokens[i + 1]}`);
  }
  return features;
}

export class NaiveBayes {
  constructor({ alpha = 1, ngram = 2 } = {}) {
    this.alpha = alpha;
    this.ngram = ngram;
    this.labels = [];
    this.docCounts = {}; // label -> number of training examples
    this.featureCounts = {}; // label -> { feature -> count }
    this.totalFeatures = {}; // label -> total feature occurrences
    this.vocabulary = new Set();
    this.trainingSize = 0;
  }

  train(examples) {
    for (const { text, label } of examples) {
      if (!this.docCounts[label]) {
        this.labels.push(label);
        this.docCounts[label] = 0;
        this.featureCounts[label] = {};
        this.totalFeatures[label] = 0;
      }
      this.docCounts[label] += 1;
      for (const f of featurize(text, this.ngram)) {
        this.featureCounts[label][f] = (this.featureCounts[label][f] || 0) + 1;
        this.totalFeatures[label] += 1;
        this.vocabulary.add(f);
      }
      this.trainingSize += 1;
    }
    return this;
  }

  predict(text) {
    if (!this.labels.length) throw new Error('Model has not been trained.');
    const features = featurize(text, this.ngram).filter((f) => this.vocabulary.has(f));
    const V = this.vocabulary.size;
    const temperature = Math.max(1, Math.sqrt(features.length));

    const logits = {};
    for (const label of this.labels) {
      let score = Math.log(this.docCounts[label] / this.trainingSize);
      const counts = this.featureCounts[label];
      const denom = this.totalFeatures[label] + this.alpha * V;
      for (const f of features) score += Math.log(((counts[f] || 0) + this.alpha) / denom);
      logits[label] = score / temperature;
    }

    const max = Math.max(...Object.values(logits));
    const exp = Object.fromEntries(Object.entries(logits).map(([l, s]) => [l, Math.exp(s - max)]));
    const sum = Object.values(exp).reduce((a, b) => a + b, 0);
    const scores = Object.fromEntries(Object.entries(exp).map(([l, e]) => [l, e / sum]));

    const label = this.labels.reduce((best, l) => (scores[l] > scores[best] ? l : best), this.labels[0]);
    return { label, confidence: scores[label], scores, knownFeatures: features.length };
  }

  toJSON() {
    return {
      algorithm: 'multinomial-naive-bayes',
      alpha: this.alpha,
      ngram: this.ngram,
      labels: this.labels,
      docCounts: this.docCounts,
      featureCounts: this.featureCounts,
      totalFeatures: this.totalFeatures,
      vocabulary: [...this.vocabulary],
      trainingSize: this.trainingSize,
    };
  }

  static fromJSON(json) {
    const model = new NaiveBayes({ alpha: json.alpha, ngram: json.ngram });
    model.labels = json.labels;
    model.docCounts = json.docCounts;
    model.featureCounts = json.featureCounts;
    model.totalFeatures = json.totalFeatures;
    model.vocabulary = new Set(json.vocabulary);
    model.trainingSize = json.trainingSize;
    return model;
  }
}
