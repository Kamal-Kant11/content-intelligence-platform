import jwt from 'jsonwebtoken';
import { config } from '../config/config.js';
import User from '../models/User.js';

// The JWT lives in an HTTP-only cookie, so page scripts can never read it.
// SameSite=Strict keeps the browser from sending it with requests started by other sites.
export const AUTH_COOKIE = 'contentiq_token';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

const cookieOptions = () => ({ httpOnly: true, secure: config.cookieSecure, sameSite: 'strict', path: '/' });

export function setAuthCookie(res, userId) {
  const token = jwt.sign({ id: userId }, config.jwtSecret, { expiresIn: '7d' });
  res.cookie(AUTH_COOKIE, token, { ...cookieOptions(), maxAge: SEVEN_DAYS_MS });
}

export function clearAuthCookie(res) {
  res.clearCookie(AUTH_COOKIE, cookieOptions());
}

// Protects private routes: req.user is the signed-in user.
export async function protect(req, res, next) {
  try {
    const token = req.cookies?.[AUTH_COOKIE];
    if (!token) return res.status(401).json({ message: 'Not authorized. Please log in.' });

    let payload;
    try {
      payload = jwt.verify(token, config.jwtSecret);
    } catch {
      clearAuthCookie(res);
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
