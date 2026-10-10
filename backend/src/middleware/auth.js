import jwt from 'jsonwebtoken';
import { config } from '../config/config.js';
import User from '../models/User.js';

// Protects private routes. Expects:  Authorization: Bearer <token>
export async function protect(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'Not authorized. Please log in.' });

    let payload;
    try {
      payload = jwt.verify(token, config.jwtSecret);
    } catch {
      return res.status(401).json({ message: 'Session expired or invalid. Please log in again.' });
    }

    const user = await User.findById(payload.id);
    if (!user) return res.status(401).json({ message: 'Account no longer exists.' });

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}
