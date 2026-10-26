import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config/config.js';
import healthRoutes from './routes/healthRoutes.js';
import authRoutes from './routes/authRoutes.js';
import documentRoutes from './routes/documentRoutes.js';

// Builds the Express app without connecting to MongoDB or listening, so tests can import it.
export function createApp() {
  const app = express();

  if (config.logRequests) {
    app.use((req, res, next) => {
      const started = Date.now();
      res.on('finish', () => console.log(`${req.method} ${req.path} ${res.statusCode} ${Date.now() - started}ms`));
      next();
    });
  }

  app.use(cors({ origin: config.clientOrigin, credentials: true }));
  app.use(cookieParser());
  app.use(express.json({ limit: '1mb' }));

  app.use('/api/health', healthRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/documents', documentRoutes);

  app.use((req, res) => res.status(404).json({ message: 'Route not found.' }));

  // Central error handler. Express 5 forwards errors thrown in async handlers here.
  // Every error response has the same shape: { message }.
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'Invalid JSON body.' });
    if (err.type === 'entity.too.large') return res.status(413).json({ message: 'Request body is too large.' });
    if (err.name === 'MulterError') {
      if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ message: `The file is too large. The limit is ${config.maxFileBytes / 1024 / 1024} MB.` });
      return res.status(400).json({ message: 'Upload one PDF, DOCX or TXT file in the "file" field.' });
    }
    if (err.name === 'ValidationError') {
      const first = Object.values(err.errors || {})[0];
      return res.status(400).json({ message: first?.message || 'Invalid data.' });
    }
    if (err.status && (err.status < 500 || err.expose)) return res.status(err.status).json({ message: err.message });

    console.error(err);
    res.status(500).json({ message: 'Something went wrong on the server.' });
  });

  return app;
}
