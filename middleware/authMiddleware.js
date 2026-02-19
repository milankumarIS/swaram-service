// Voice Agent Service — middleware/authMiddleware.js
const { verifyToken } = require("../utils/jwtUtils");

const authenticate = (req, res, next) => {
  try {
    const header = req.headers.authorization || req.headers.Authorization;
    if (!header) return res.status(401).json({ error: "Authorization header missing" });

    const parts = header.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
      return res.status(401).json({ error: "Invalid auth header, expected: Bearer <token>" });
    }

    const payload = verifyToken(parts[1]);
    req.user = payload;
    return next();
  } catch (err) {
    return res.status(err.status || 401).json({ error: err.message || "Unauthorized" });
  }
};

module.exports = { authenticate };
