import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { config } from './config/config.js';
import healthRoutes from './routes/healthRoutes.js';
import authRoutes from './routes/authRoutes.js';
import documentRoutes from './routes/documentRoutes.js';
import optimizationRoutes from './routes/optimizationRoutes.js';
import brandRoutes from './routes/brandRoutes.js';

// Builds the Express app without connecting to MongoDB or listening, so tests can import it.
export function createApp() {
  const app = express();

  app.use(cors({ origin: config.clientOrigin, exposedHeaders: ['Content-Disposition'] }));
  app.use(express.json({ limit: '2mb' }));

  app.use('/api/health', healthRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/documents', documentRoutes);
  app.use('/api/optimizations', optimizationRoutes);
  app.use('/api/brands', brandRoutes);

  app.use((req, res) => res.status(404).json({ message: 'Route not found.' }));

  // Central error handler. Express 5 forwards errors thrown in async handlers here.
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (err instanceof multer.MulterError) {
      const message =
        err.code === 'LIMIT_FILE_SIZE' ? 'File is too large. Maximum size is 10 MB.' : 'Invalid file upload.';
      return res.status(err.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ message });
    }
    if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'Invalid JSON body.' });
    if (err.type === 'entity.too.large') return res.status(413).json({ message: 'Request body is too large.' });
    if (err.name === 'ValidationError') {
      const first = Object.values(err.errors || {})[0];
      return res.status(400).json({ message: first?.message || 'Invalid data.' });
    }
    if (err.status && err.status < 500) return res.status(err.status).json({ message: err.message });

    console.error(err);
    res.status(500).json({ message: 'Something went wrong on the server.' });
  });

  return app;
}
