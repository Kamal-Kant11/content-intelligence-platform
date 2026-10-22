import mongoose from 'mongoose';
import { config } from '../config/config.js';
import { modelInfo } from '../services/modelService.js';

// GET /api/health - confirms the app, MongoDB and the local models are working (PDF Task 1.4).
export async function health(_req, res) {
  let database = 'down';
  try {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.db.admin().ping();
      database = 'up';
    }
  } catch {
    database = 'down';
  }
  const models = modelInfo().map(({ name, version, metrics }) => ({ name, version, accuracy: metrics?.accuracy ?? null }));
  const ok = database === 'up';
  res.status(ok ? 200 : 503).json({ status: ok ? 'ok' : 'degraded', database, engineVersion: config.engineVersion, models });
}

// GET /api/health/models - full metadata of the trained models (labels, dataset, metrics).
export function models(_req, res) {
  res.json({ models: modelInfo() });
}
