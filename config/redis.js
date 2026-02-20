// Voice Agent Service — config/redis.js
const IORedis = require("ioredis");
const logger = require("winston");

const redisHost = process.env.REDIS_HOST || "localhost";
const redisPort = parseInt(process.env.REDIS_PORT || "6379", 10);
const redisPassword = process.env.REDIS_PASSWORD || undefined;

const redisConfig = {
  host: redisHost,
  port: redisPort,
  lazyConnect: true,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
};

// Add password if provided
if (redisPassword) {
  redisConfig.password = redisPassword;
}

const redis = new IORedis(redisConfig);

redis.on("connect", () => logger.info("Redis client connected"));
redis.on("error", (err) => logger.warn("Redis error:", err.message || err));
redis.on("close", () => logger.info("Redis connection closed"));

module.exports = redis;
