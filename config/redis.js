// Voice Agent Service — config/redis.js
const IORedis = require("ioredis");
const logger = require("winston");

const redisHost = process.env.REDIS_HOST || "localhost";
const redisPort = parseInt(process.env.REDIS_PORT || "6379", 10);

const redis = new IORedis({ host: redisHost, port: redisPort, lazyConnect: true });

redis.on("connect", () => logger.info("Redis client connected"));
redis.on("error", (err) => logger.warn("Redis error:", err.message || err));
redis.on("close", () => logger.info("Redis connection closed"));

module.exports = redis;
