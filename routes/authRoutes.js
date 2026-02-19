// Voice Agent Service — routes/authRoutes.js
const express = require("express");
const router = express.Router();
const controller = require("../controllers/authController");
const { authenticate } = require("../middleware/authMiddleware");

// POST /api/auth/register
router.post("/register", controller.register);

// POST /api/auth/login
router.post("/login", controller.login);

// GET /api/auth/me — protected
router.get("/me", authenticate, controller.getMe);

module.exports = router;
