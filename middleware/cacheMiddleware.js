// Voice Agent Service — middleware/cacheMiddleware.js
const redis = require("../config/redis");
const logger = require("winston");

/**
 * cacheKey — either a string or a function(req) => string
 */
const cacheGet = (cacheKey) => {
  return async (req, res, next) => {
    if (process.env.DISABLE_REDIS === "1") return next();
    try {
      const key = typeof cacheKey === "function" ? cacheKey(req) : cacheKey;
      if (!key) return next();
      const raw = await redis.get(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        return res.json(parsed);
      }
      req._cacheKey = key;
      next();
    } catch (err) {
      logger.warn("Cache read error:", err.message || err);
      next();
    }
  };
};

const cacheSet = (cacheKey, ttlSeconds = 60) => {
  return async (req, res, next) => {
    if (process.env.DISABLE_REDIS === "1") return next();
    const originalJson = res.json.bind(res);
    res.json = async (payload) => {
      try {
        const key = typeof cacheKey === "function" ? cacheKey(req) : (req._cacheKey || cacheKey);
        if (key) {
          await redis.set(key, JSON.stringify(payload), "EX", ttlSeconds);
        }
      } catch (err) {
        logger.warn("Cache write error:", err.message || err);
      }
      return originalJson(payload);
    };
    next();
  };
};

const cacheInvalidate = (cacheKey) => {
  return async (req, res, next) => {
    if (process.env.DISABLE_REDIS === "1") return next();
    try {
      const key = typeof cacheKey === "function" ? cacheKey(req) : cacheKey;
      if (key) await redis.del(key);
    } catch (err) {
      logger.warn("Cache invalidate error:", err.message || err);
    }
    next();
  };
};

module.exports = { cacheGet, cacheSet, cacheInvalidate };
