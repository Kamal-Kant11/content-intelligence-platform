// The only config file: environment settings + database connection.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

// Always read backend/.env, whatever folder the server is started from.
// Variables already set in the environment win over the file.
dotenv.config({ path: path.join(backendRoot, '.env'), quiet: true });

export const config = {
  port: process.env.PORT || 5000,
  mongoUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  uploadDir: path.join(backendRoot, 'uploads'), // private folder, never served publicly
  maxFileSize: 10 * 1024 * 1024, // 10 MB

  // Local ML models (trained with `npm run train`, see backend/ml/README.md)
  modelDir: process.env.MODEL_DIR || path.join(backendRoot, 'ml', 'models'),

  // Bump when an intelligence engine changes, so cached analyses are recomputed.
  engineVersion: '1.1.0',

  // URL input
  urlFetchTimeoutMs: 10_000,
  urlMaxBytes: 2 * 1024 * 1024,
  allowPrivateUrls: process.env.ALLOW_PRIVATE_URLS === 'true',
};

// Fails early with a message that says what to fix.
export function validateConfig() {
  const missing = ['MONGODB_URI', 'JWT_SECRET'].filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(
      `Missing ${missing.join(' and ')} in ${path.join(backendRoot, '.env')}. Copy .env.example to .env and fill it in.`
    );
  }
  if (!Number.isInteger(Number(config.port)) || Number(config.port) <= 0) {
    throw new Error(`PORT must be a number, got "${config.port}".`);
  }
}

export async function connectDB(uri = config.mongoUri) {
  validateConfig();
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  } catch (err) {
    throw new Error(
      `Cannot connect to MongoDB at ${uri.replace(/\/\/[^@/]*@/, '//***@')} (${err.message}). ` +
        'Is MongoDB running? On Windows: open Services and start "MongoDB Server", or run "net start MongoDB" as administrator.'
    );
  }
  console.log('MongoDB connected');
}
