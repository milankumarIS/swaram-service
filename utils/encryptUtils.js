// Voice Agent Service — utils/encryptUtils.js
// Two encryption contexts:
//   1. AES-256-CBC (same as Voice Service) — for request/response body encrypt/decrypt
//   2. AES-256-GCM — for sensitive API keys stored in the database (Gemini, Sarvam)

const crypto = require("crypto");
const bcrypt = require("bcryptjs");

// ─── Body encryption (AES-256-CBC, matches Voice Service pattern) ─────────────
const AES_ALGO = "aes-256-cbc";
const AES_SECRET = process.env.AES_SECRET || "change_this_aes_secret_min_32_chars";
const AES_KEY = crypto.createHash("sha256").update(String(AES_SECRET)).digest();

if (!process.env.AES_SECRET) {
  console.warn("AES_SECRET not set — please set in production.");
}

const encrypt = (plaintext) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(AES_ALGO, AES_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(String(plaintext), "utf8"), cipher.final()]);
  return Buffer.concat([iv, encrypted]).toString("base64");
};

const decrypt = (b64) => {
  const data = Buffer.from(b64, "base64");
  const iv = data.slice(0, 16);
  const ciphertext = data.slice(16);
  const decipher = crypto.createDecipheriv(AES_ALGO, AES_KEY, iv);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString("utf8");
};

// ─── API Key encryption (AES-256-GCM) — for Gemini + Sarvam keys in DB ───────
const GCM_ALGO = "aes-256-gcm";
const ENC_KEY_HEX = process.env.ENCRYPTION_KEY || "";
// ENCRYPTION_KEY must be a 64-char hex string (32 bytes). Generate: openssl rand -hex 32
const GCM_KEY = ENC_KEY_HEX.length === 64
  ? Buffer.from(ENC_KEY_HEX, "hex")
  : crypto.createHash("sha256").update("fallback_key_change_in_production").digest();

if (!process.env.ENCRYPTION_KEY) {
  console.warn("ENCRYPTION_KEY not set — API keys stored with fallback key. Set in production!");
}

const encryptApiKey = (plaintext) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(GCM_ALGO, GCM_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(String(plaintext), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Format: iv:tag:encrypted (all base64), use : as separator
  return [iv.toString("base64"), tag.toString("base64"), encrypted.toString("base64")].join(":");
};

const decryptApiKey = (encoded) => {
  const parts = encoded.split(":");
  if (parts.length !== 3) throw new Error("Invalid encrypted API key format");
  const [ivB64, tagB64, encB64] = parts;
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const encrypted = Buffer.from(encB64, "base64");
  const decipher = crypto.createDecipheriv(GCM_ALGO, GCM_KEY, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
};

// ─── Password hashing ─────────────────────────────────────────────────────────
const hashPassword = async (plain) => {
  const rounds = parseInt(process.env.BCRYPT_ROUNDS, 10) || 12;
  return bcrypt.hash(plain, rounds);
};

const comparePassword = async (plain, hash) => bcrypt.compare(plain, hash);

module.exports = { encrypt, decrypt, encryptApiKey, decryptApiKey, hashPassword, comparePassword };
