// Voice Agent Service — routes/embedRoutes.js
// Public-facing endpoint called by the iframe widget.
// Must allow cross-origin requests (CORS) and be rate-limited.
const express = require("express");
const rateLimit = require("express-rate-limit");
const router = express.Router();
const controller = require("../controllers/embedController");

// Rate limit: 10 session starts per IP per minute
const embedRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many session requests. Please wait a moment and try again." },
});

// POST /api/embed/token
router.post("/token", embedRateLimit, controller.getToken);

module.exports = router;
