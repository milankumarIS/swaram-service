// Voice Agent Service — routes/internalRoutes.js
// Only accessible from internal network (Python agent worker)
// Protected by X-Worker-Secret header
const express = require("express");
const router = express.Router();
const controller = require("../controllers/internalController");
const { workerAuth } = require("../middleware/workerAuthMiddleware");

// GET /internal/agents/:id/config
router.get("/agents/:id/config", workerAuth, controller.getAgentConfig);

module.exports = router;
