import mongoose from 'mongoose';
import { config, connectDB } from './config/config.js';
import { createApp } from './app.js';
import { migrateLegacyDocuments } from './db/migrations.js';
import { loadModels } from './services/modelService.js';

// Log anything that would otherwise crash the process silently.
process.on('unhandledRejection', (err) => console.error('Unhandled promise rejection:', err));

function listen(app, port) {
  return new Promise((resolve, reject) => {
    const server = app.listen(port);
    server.once('listening', () => resolve(server));
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        reject(
          new Error(
            `Port ${port} is already in use, probably by another copy of this backend. ` +
              `Stop it (close its terminal, or find it with "netstat -ano | findstr :${port}" and run "taskkill /PID <pid> /F"), ` +
              'or set a different PORT in backend/.env.'
          )
        );
      } else {
        reject(err);
      }
    });
  });
}

let server;

// Close the HTTP server and MongoDB on Ctrl+C or when node --watch restarts,
// so the port is free again immediately.
async function shutdown(signal) {
  console.log(`${signal} received, shutting down...`);
  const force = setTimeout(() => process.exit(1), 5000).unref();
  try {
    if (server) await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
  } finally {
    clearTimeout(force);
    process.exit(0);
  }
}
process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));

try {
  await connectDB();
  await migrateLegacyDocuments();
  await loadModels();
  server = await listen(createApp(), Number(config.port));
  console.log(`API running on http://localhost:${config.port}`);
} catch (err) {
  console.error(`Startup failed: ${err.message}`);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
}
