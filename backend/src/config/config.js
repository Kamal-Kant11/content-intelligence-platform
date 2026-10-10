// The only config file: environment settings + database connection.
import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

export const config = {
  port: process.env.PORT || 5000,
  mongoUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  uploadDir: path.join(backendRoot, 'uploads'), // private folder, never served publicly
  maxFileSize: 10 * 1024 * 1024, // 10 MB
};

export async function connectDB() {
  if (!config.mongoUri || !config.jwtSecret) {
    throw new Error('MONGODB_URI and JWT_SECRET must be set in backend/.env');
  }
  await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 8000 });
  console.log('MongoDB connected');
}
