// Voice Agent Service — controllers/authController.js
const User = require("../models/User");
const { hashPassword, comparePassword } = require("../utils/encryptUtils");
const { generateToken } = require("../utils/jwtUtils");

/**
 * POST /api/auth/register
 * Body: { email, password }
 */
exports.register = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const password_hash = await hashPassword(password);
    const user = await User.create({ email, password_hash });

    const accessToken = generateToken({ id: user.id, email: user.email, plan: user.plan });

    return res.status(201).json({
      message: "Registration successful",
      accessToken,
      user: { id: user.id, email: user.email, plan: user.plan },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const valid = await comparePassword(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const accessToken = generateToken(
      { id: user.id, email: user.email, plan: user.plan },
      process.env.JWT_EXP || "7d"
    );
    const refreshToken = generateToken(
      { id: user.id, type: "refresh" },
      "30d"
    );

    return res.json({
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, plan: user.plan },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/auth/me
 * Returns the authenticated user's public profile
 */
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ["id", "email", "plan", "created_at"],
    });
    if (!user) return res.status(404).json({ error: "User not found" });
    return res.json(user);
  } catch (err) {
    next(err);
  }
};
