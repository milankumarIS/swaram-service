// Voice Agent Service — config/database.js
const { Sequelize } = require("sequelize");
const fs = require("fs");
const path = require("path");
const winston = require("winston");

const logger = winston.createLogger({
  transports: [
    new winston.transports.Console({ format: winston.format.simple() }),
  ],
});

const { DB_NAME, DB_USER, DB_PASSWORD, DB_HOST, DB_PORT } = process.env;

const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST,
  port: parseInt(DB_PORT || "5432", 10),
  dialect: "postgres",
  logging: process.env.NODE_ENV === "development" ? console.log : false,
  pool: { max: 20, min: 2, idle: 10000, acquire: 30000 },
  schema: "voiceagent",
});

async function testConnection() {
  await sequelize.authenticate();
  logger.info("Connected to Postgres");
}

async function runInitSql() {
  const sqlPath = path.join(__dirname, "..", "db", "init-db.sql");
  if (fs.existsSync(sqlPath) && fs.statSync(sqlPath).size > 0) {
    logger.info("Running init-db.sql...");
    const sql = fs.readFileSync(sqlPath, "utf8");
    // Run statements separated by semicolons (skip empty lines)
    const statements = sql
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    for (const stmt of statements) {
      await sequelize.query(stmt);
    }
    logger.info("init-db.sql executed successfully.");
  } else {
    logger.info("No init-db.sql to run.");
  }
}

module.exports = { sequelize, testConnection, runInitSql };
