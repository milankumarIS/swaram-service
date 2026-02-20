// Voice Agent Service — routes/agentRoutes.js
const express = require("express");
const router = express.Router();
const controller = require("../controllers/agentController");
const { authenticate } = require("../middleware/authMiddleware");
const { cacheGet, cacheInvalidate } = require("../middleware/cacheMiddleware");

// All agent routes require authentication
router.use(authenticate);

// POST /api/agents — create agent
router.post(
  "/",
  cacheInvalidate((req) => `agents:user:${req.user.id}`),
  controller.createAgent,
);

// POST /api/agents/preview — create temporary preview agent
router.post("/preview", controller.createPreviewAgent);

// GET /api/agents — list all agents for user
router.get(
  "/",
  cacheGet((req) => `agents:user:${req.user.id}`),
  controller.getAll,
);

// GET /api/agents/:id — get single agent
router.get(
  "/:id",
  cacheGet((req) => `agents:${req.params.id}`),
  controller.getById,
);

// PATCH /api/agents/:id — update agent
router.patch(
  "/:id",
  cacheInvalidate((req) => `agents:${req.params.id}`),
  cacheInvalidate((req) => `agents:user:${req.user.id}`),
  controller.updateAgent,
);

// DELETE /api/agents/:id — deactivate agent
router.delete(
  "/:id",
  cacheInvalidate((req) => `agents:${req.params.id}`),
  cacheInvalidate((req) => `agents:user:${req.user.id}`),
  controller.deleteAgent,
);

module.exports = router;
