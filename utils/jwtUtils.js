// Voice Agent Service — utils/jwtUtils.js
const jwt = require("jsonwebtoken");

const SECRET = process.env.JWT_SECRET || "change_this_jwt_secret";
const ALGO = "HS512";
const DEFAULT_EXP = process.env.JWT_EXP || "7d";

if (!process.env.JWT_SECRET) {
  console.warn("JWT_SECRET not set — please set a strong secret in production.");
}

const generateToken = (payload, expiresIn = DEFAULT_EXP) => {
  return jwt.sign(payload, SECRET, { algorithm: ALGO, expiresIn });
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, SECRET, { algorithms: [ALGO] });
  } catch (err) {
    const e = new Error("Invalid or expired token");
    e.status = 401;
    throw e;
  }
};

module.exports = { generateToken, verifyToken };
