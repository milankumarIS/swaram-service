// Voice Agent Service — middleware/encryptMiddleware.js
const { decrypt, encrypt } = require("../utils/encryptUtils");
const logger = require("winston");

/**
 * Decrypt incoming request body if it contains `encrypted` field (base64).
 * Sets req.body to the decrypted JSON object.
 * If body is already plain JSON, keeps it as-is.
 */
const decryptPayloadMiddleware = (req, res, next) => {
  try {
    if (req.body && req.body.encrypted) {
      try {
        const decrypted = decrypt(req.body.encrypted);
        req.body = JSON.parse(decrypted);
      } catch (e) {
        logger.warn("Failed decrypting payload:", e.message || e);
        return res.status(400).json({ error: "Invalid encrypted payload" });
      }
    }
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Encrypt outgoing responses.
 * Wraps response body into { encrypted: "<base64>" }.
 * Skip if query param ?noenc=1 is present.
 */
const encryptResponseMiddleware = (req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = (payload) => {
    try {
      if (req.query && req.query.noenc === "1") {
        return originalJson(payload);
      }
      const plaintext = JSON.stringify(payload);
      const ciphertext = encrypt(plaintext);
      return originalJson({ encrypted: ciphertext });
    } catch (err) {
      logger.error("Failed to encrypt response:", err.message || err);
      return originalJson({ error: "Encryption error" });
    }
  };
  next();
};

module.exports = { decryptPayloadMiddleware, encryptResponseMiddleware };
