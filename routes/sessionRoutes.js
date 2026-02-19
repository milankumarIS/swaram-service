// Voice Agent Service — routes/sessionRoutes.js
const express = require("express");
const router = express.Router();
const controller = require("../controllers/sessionController");
const { authenticate } = require("../middleware/authMiddleware");
const { workerAuth } = require("../middleware/workerAuthMiddleware");

// GET /api/agents/:agentId/sessions — list sessions for an agent (dashboard)
router.get("/agents/:agentId/sessions", authenticate, controller.getSessions);

// GET /api/sessions/:sessionId — full session detail + transcript
router.get("/:sessionId", authenticate, controller.getSession);

// PATCH /api/sessions/:sessionId/end — called by Python worker to close session
router.patch("/:sessionId/end", workerAuth, controller.endSession);

module.exports = router;
