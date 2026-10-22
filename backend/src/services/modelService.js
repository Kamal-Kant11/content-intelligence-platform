// Model provider layer. The rest of the app asks for "classify with model X"
// and never touches model files directly, so the provider can be swapped later
// (a different local algorithm, an ONNX model, ...) without touching the engines.
//
// Providers:
//   LocalModelProvider - loads trained JSON models from config.modelDir
//   MockModelProvider  - fixed answers, used by tests
import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config/config.js';
import { NaiveBayes } from '../ml/naiveBayes.js';

export const TONE_LABELS = ['formal', 'conversational', 'promotional', 'technical'];

class LocalModelProvider {
  constructor() {
    this.models = new Map(); // name -> { model, meta }
  }

  async load(dir) {
    this.models.clear();
    let files = [];
    try {
      files = (await fs.readdir(dir)).filter((f) => f.endsWith('.json'));
    } catch {
      console.warn(`No model directory at ${dir}. Run "npm run train" in backend/.`);
      return;
    }
    for (const file of files) {
      const json = JSON.parse(await fs.readFile(path.join(dir, file), 'utf8'));
      const { model, ...meta } = json;
      this.models.set(meta.name, { model: NaiveBayes.fromJSON(model), meta });
    }
    console.log(`Loaded models: ${[...this.models.keys()].join(', ') || 'none'}`);
  }

  classify(name, text) {
    const entry = this.models.get(name);
    return entry ? entry.model.predict(text) : null;
  }

  info() {
    return [...this.models.values()].map(({ meta }) => meta);
  }

  version(name) {
    return this.models.get(name)?.meta.version ?? null;
  }
}

export class MockModelProvider {
  // answers: { modelName: (text) => ({ label, confidence, scores }) }
  constructor(answers = {}) {
    this.answers = answers;
  }
  async load() {}
  classify(name, text) {
    return this.answers[name] ? this.answers[name](text) : null;
  }
  info() {
    return Object.keys(this.answers).map((name) => ({ name, version: 'mock' }));
  }
  version(name) {
    return this.answers[name] ? 'mock' : null;
  }
}

let provider = new LocalModelProvider();

export const loadModels = () => provider.load(config.modelDir);
export const classify = (name, text) => provider.classify(name, text);
export const modelInfo = () => provider.info();
export const modelVersion = (name) => provider.version(name);
export const hasModel = (name) => provider.version(name) !== null;

export function setModelProvider(next) {
  provider = next;
}
