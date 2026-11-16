import mongoose from 'mongoose';

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
  res.status(database === 'up' ? 200 : 503).json({ status: database === 'up' ? 'ok' : 'degraded', database });
}
