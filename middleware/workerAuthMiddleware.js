// Voice Agent Service — middleware/workerAuthMiddleware.js
// Protects internal routes used by the Python agent worker.
// The worker must send the X-Worker-Secret header with the shared secret.

const WORKER_SECRET = process.env.WORKER_SECRET;

if (!WORKER_SECRET) {
  console.warn("WORKER_SECRET not set — internal routes are unprotected. Set in production!");
}

const workerAuth = (req, res, next) => {
  const secret = req.headers["x-worker-secret"];
  if (!secret || secret !== WORKER_SECRET) {
    return res.status(403).json({ error: "Forbidden — invalid worker secret" });
  }
  return next();
};

module.exports = { workerAuth };
