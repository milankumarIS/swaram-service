// Voice Agent Service — routes/dashboardRoutes.js
const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/authMiddleware");
const dashboardController = require("../controllers/dashboardController");
const { cacheGet, cacheSet } = require("../middleware/cacheMiddleware");

// GET /api/dashboard/stats (Protected)
router.get(
  "/stats",
  authenticate,
  cacheGet((req) => `dashboard:stats:user:${req.user.id}`),
  cacheSet((req) => `dashboard:stats:user:${req.user.id}`, 300), // 5 minutes
  dashboardController.getDashboardStats,
);

module.exports = router;
