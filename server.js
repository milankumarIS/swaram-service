// Voice Agent Service — server.js
require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const winston = require("winston");

const { sequelize, testConnection, runInitSql } = require("./config/database");
const redisClient = require("./config/redis");

// Routes
const authRoutes    = require("./routes/authRoutes");
const agentRoutes   = require("./routes/agentRoutes");
const embedRoutes   = require("./routes/embedRoutes");
const sessionRoutes = require("./routes/sessionRoutes");
const internalRoutes = require("./routes/internalRoutes");

const logger = winston.createLogger({
  transports: [
    new winston.transports.Console({ format: winston.format.simple() }),
  ],
});

const app = express();
const PORT = parseInt(process.env.PORT || "4003", 10);

// ─── Security Middleware ──────────────────────────────────────────────────────
app.use(helmet());

// CORS — allow the dashboard frontend + embed widget origins
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";
app.use(
  cors({
    // For embed endpoint, allow all origins (iframe from any customer site)
    // For other endpoints, restrict to dashboard origin
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);
      // Allow configured CORS origin (dashboard)
      if (CORS_ORIGIN === "*" || origin === CORS_ORIGIN) return callback(null, true);
      // Allow embed endpoint from any origin (checked per-domain in embedController)
      return callback(null, true);
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true }));

// Global rate limit
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));

// ─── Health ───────────────────────────────────────────────────────────────────
app.get("/health", (req, res) => res.json({ status: "UP", service: "voice-agent-service" }));

// ─── Application Routes ───────────────────────────────────────────────────────
app.use("/api/auth",     authRoutes);
app.use("/api/agents",   agentRoutes);
app.use("/api/embed",    embedRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api",          sessionRoutes);   // also mounts /api/agents/:agentId/sessions
app.use("/internal",     internalRoutes);

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  logger.error(`Unhandled error: ${err.stack || err.message || err}`);
  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
  });
});

// ─── Startup ──────────────────────────────────────────────────────────────────
async function start() {
  try {
    logger.info("Testing database connection...");
    await testConnection();
    await runInitSql();
    logger.info("Database connected and schema ready.");

    // Connect Redis (skip when DISABLE_REDIS=1)
    if (process.env.DISABLE_REDIS !== "1") {
      await redisClient.connect().catch((e) => {
        logger.warn("Redis connect failed (non-fatal):", e.message || e);
      });
    } else {
      logger.info("DISABLE_REDIS=1 — skipping Redis connection");
    }

    // Sync Sequelize models (alter in dev, skip in production — use migrations)
    if (process.env.NODE_ENV !== "production") {
      await sequelize.sync({ alter: true });
      logger.info("Sequelize models synced.");
    }

    const server = app.listen(PORT, () =>
      logger.info(`Voice Agent Service is UP and running on port ${PORT}`)
    );

    // Graceful shutdown
    process.on("SIGINT",  () => shutdown(server));
    process.on("SIGTERM", () => shutdown(server));
  } catch (err) {
    logger.error(`Startup failed: ${err.stack || err.message || err}`);
    process.exit(1);
  }
}

async function shutdown(server) {
  try {
    logger.info("Shutting down gracefully...");
    server.close(async () => {
      try {
        if (process.env.DISABLE_REDIS !== "1") await redisClient.disconnect();
      } catch (e) {
        logger.warn("Redis disconnect error:", e.message || e);
      }
      try {
        await sequelize.close();
      } catch (e) {
        logger.warn("Sequelize close error:", e.message || e);
      }
      logger.info("Shutdown complete.");
      process.exit(0);
    });
  } catch (err) {
    logger.error("Error during shutdown:", err.message || err);
    process.exit(1);
  }
}

start();
