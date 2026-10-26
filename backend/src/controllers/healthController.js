import mongoose from 'mongoose';
import { config } from '../config/config.js';
import { pingLanguageTool } from '../analysis/grammar.js';

// GET /api/health - confirms the app, MongoDB and the grammar service (LanguageTool) are working.
// The HTTP status follows the database only: LanguageTool is an external service, and the app
// still serves documents, history and downloads while it is down.
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
  const grammarService = await pingLanguageTool();
  const ok = database === 'up' && grammarService === 'up';
  res.status(database === 'up' ? 200 : 503).json({
    status: ok ? 'ok' : 'degraded',
    database,
    grammarService,
    languageToolUrl: config.languageToolUrl,
  });
}
