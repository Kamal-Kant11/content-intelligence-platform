import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { config, connectDB } from './config/config.js';
import authRoutes from './routes/authRoutes.js';
import documentRoutes from './routes/documentRoutes.js';

const app = express();

app.use(cors({ origin: config.clientOrigin }));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);

app.use((req, res) => res.status(404).json({ message: 'Route not found.' }));

// Central error handler
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) {
    const message =
      err.code === 'LIMIT_FILE_SIZE' ? 'File is too large. Maximum size is 10 MB.' : 'Invalid file upload.';
    return res.status(err.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ message });
  }
  if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'Invalid JSON body.' });
  if (err.status && err.status < 500) return res.status(err.status).json({ message: err.message });

  console.error(err);
  res.status(500).json({ message: 'Something went wrong on the server.' });
});

try {
  await connectDB();
  app.listen(config.port, () => console.log(`API running on http://localhost:${config.port}`));
} catch (err) {
  console.error('Startup failed:', err.message);
  process.exit(1);
}
