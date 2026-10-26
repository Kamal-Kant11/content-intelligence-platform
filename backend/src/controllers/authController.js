import bcrypt from "bcrypt";
import User from "../models/User.js";
import { clearAuthCookie, setAuthCookie } from "../middleware/auth.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;




// register
export async function signup(req, res, next) {
  try {
    // Express 5 leaves req.body undefined when no JSON body is sent
    const body = req.body ?? {};
    const name = String(body.name || "").trim();
    const email = String(body.email || "")
      .trim()
      .toLowerCase();
    const { password, confirmPassword } = body;

    if (name.length < 2)
      return res
        .status(400)
        .json({ message: "Full name must be at least 2 characters." });
    if (!EMAIL_RE.test(email))
      return res.status(400).json({ message: "Enter a valid email address." });
    if (
      typeof password !== "string" ||
      password.length < 8 ||
      password.length > 72
    )
      return res
        .status(400)
        .json({ message: "Password must be 8–72 characters." });
    if (!/[A-Za-z]/.test(password) || !/\d/.test(password))
      return res
        .status(400)
        .json({ message: "Password must include a letter and a number." });
    if (password !== confirmPassword)
      return res.status(400).json({ message: "Passwords do not match." });

    if (await User.exists({ email })) {
      return res
        .status(409)
        .json({ message: "An account with this email already exists." });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, passwordHash });

    setAuthCookie(res, user._id);
    res.status(201).json({ user });
  } catch (err) {
    if (err.code === 11000)
      return res
        .status(409)
        .json({ message: "An account with this email already exists." });
    next(err);
  }
}



// login
export async function login(req, res, next) {
  try {
    const body = req.body ?? {};
    const email = String(body.email || "")
      .trim()
      .toLowerCase();
    const password = typeof body.password === "string" ? body.password : "";

    if (!EMAIL_RE.test(email) || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required." });
    }

    const user = await User.findOne({ email }).select("+passwordHash");
    const ok = user && (await bcrypt.compare(password, user.passwordHash));
    if (!ok)
      return res.status(401).json({ message: "Invalid email or password." });

    setAuthCookie(res, user._id);
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

export function logout(_req, res) {
  clearAuthCookie(res);
  res.json({ message: "Logged out." });
}

export function getMe(req, res) {
  res.json({ user: req.user });
}
