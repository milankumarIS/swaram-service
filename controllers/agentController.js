// Voice Agent Service — controllers/agentController.js
const { v4: uuidv4 } = require("uuid");
const { nanoid } = require("nanoid");
const Agent = require("../models/Agent");
const AgentSession = require("../models/AgentSession");
const { encryptApiKey } = require("../utils/encryptUtils");
const { sequelize } = require("../config/database");

// Fields safe to return to the dashboard (no encrypted keys)
const SAFE_FIELDS = [
  "id",
  "user_id",
  "name",
  "slug",
  "llm_provider",
  "llm_model",
  "system_prompt",
  "welcome_message",
  "stt_language_code",
  "tts_voice",
  "tts_language_code",
  "max_call_duration_sec",
  "allowed_domains",
  "embed_token",
  "is_active",
  "created_at",
  "updated_at",
];

/**
 * POST /api/agents
 * Create a new voice agent
 */
exports.createAgent = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const {
      name,
      llm_model,
      llm_api_key,
      system_prompt,
      welcome_message,
      sarvam_api_key,
      stt_language_code,
      tts_voice,
      tts_language_code,
      max_call_duration_sec,
      allowed_domains,
    } = req.body;

    if (!name || !system_prompt) {
      return res
        .status(400)
        .json({ error: "name and system_prompt are required" });
    }

    // Generate URL-safe slug: lowercase name + 6-char nanoid suffix
    const slug =
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") +
      "-" +
      nanoid(6);
    const embed_token = uuidv4();

    // Encrypt API keys before storing
    const llm_api_key_enc = llm_api_key ? encryptApiKey(llm_api_key) : null;
    const sarvam_api_key_enc = sarvam_api_key
      ? encryptApiKey(sarvam_api_key)
      : null;

    const agent = await Agent.create({
      user_id: userId,
      name,
      slug,
      llm_model: llm_model || "gemini-2.5-flash",
      llm_api_key_enc,
      system_prompt,
      welcome_message: welcome_message || "Hello! How can I help you today?",
      sarvam_api_key_enc,
      stt_language_code: stt_language_code || "en-IN",
      tts_voice: tts_voice || "meera",
      tts_language_code: tts_language_code || "en-IN",
      max_call_duration_sec: max_call_duration_sec || 300,
      allowed_domains: allowed_domains || [],
      embed_token,
    });

    const appUrl = process.env.APP_URL || "http://localhost:4002";

    return res.status(201).json({
      agentId: agent.id,
      slug: agent.slug,
      embedToken: agent.embed_token,
      embedUrl: `${appUrl}/embed/${agent.slug}?token=${agent.embed_token}`,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/agents
 * List all agents for the authenticated user with session counts
 */
exports.getAll = async (req, res, next) => {
  try {
    const agents = await Agent.findAll({
      where: {
        user_id: req.user.id,
        is_preview: false, // Exclude preview agents
      },
      attributes: [
        ...SAFE_FIELDS,
        [
          sequelize.literal(`(
            SELECT COUNT(*)
            FROM voiceagent.agent_sessions
            WHERE agent_sessions.agent_id = agent.id
            AND agent_sessions.started_at >= NOW() - INTERVAL '30 days'
          )`),
          "session_count_30d",
        ],
      ],
      order: [["created_at", "DESC"]],
    });
    return res.json(agents);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/agents/:id
 * Get single agent (owner only)
 */
exports.getById = async (req, res, next) => {
  try {
    const agent = await Agent.findOne({
      where: { id: req.params.id, user_id: req.user.id },
      attributes: SAFE_FIELDS,
    });
    if (!agent) return res.status(404).json({ error: "Agent not found" });
    return res.json(agent);
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/agents/:id
 * Partial update — only updates provided fields
 */
exports.updateAgent = async (req, res, next) => {
  try {
    const agent = await Agent.findOne({
      where: { id: req.params.id, user_id: req.user.id },
    });
    if (!agent) return res.status(404).json({ error: "Agent not found" });

    const {
      name,
      llm_model,
      llm_api_key,
      system_prompt,
      welcome_message,
      sarvam_api_key,
      stt_language_code,
      tts_voice,
      tts_language_code,
      max_call_duration_sec,
      allowed_domains,
      is_active,
    } = req.body;

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (llm_model !== undefined) updates.llm_model = llm_model;
    if (llm_api_key !== undefined)
      updates.llm_api_key_enc = encryptApiKey(llm_api_key);
    if (system_prompt !== undefined) updates.system_prompt = system_prompt;
    if (welcome_message !== undefined)
      updates.welcome_message = welcome_message;
    if (sarvam_api_key !== undefined)
      updates.sarvam_api_key_enc = encryptApiKey(sarvam_api_key);
    if (stt_language_code !== undefined)
      updates.stt_language_code = stt_language_code;
    if (tts_voice !== undefined) updates.tts_voice = tts_voice;
    if (tts_language_code !== undefined)
      updates.tts_language_code = tts_language_code;
    if (max_call_duration_sec !== undefined)
      updates.max_call_duration_sec = max_call_duration_sec;
    if (allowed_domains !== undefined)
      updates.allowed_domains = allowed_domains;
    if (is_active !== undefined) updates.is_active = is_active;

    await agent.update(updates);
    const updated = await Agent.findByPk(agent.id, { attributes: SAFE_FIELDS });
    return res.json(updated);
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/agents/:id
 * Soft-delete (deactivate) an agent
 */
exports.deleteAgent = async (req, res, next) => {
  try {
    const agent = await Agent.findOne({
      where: { id: req.params.id, user_id: req.user.id },
    });
    if (!agent) return res.status(404).json({ error: "Agent not found" });
    await agent.update({ is_active: false });
    return res.json({ message: "Agent deactivated successfully" });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/agents/preview
 * Create a temporary preview agent for testing (auto-deletes after 5 minutes)
 */
exports.createPreviewAgent = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const {
      name,
      llm_model,
      llm_api_key,
      system_prompt,
      welcome_message,
      sarvam_api_key,
      stt_language_code,
      tts_voice,
      tts_language_code,
      max_call_duration_sec,
      allowed_domains,
    } = req.body;

    if (!name || !system_prompt) {
      return res
        .status(400)
        .json({ error: "name and system_prompt are required" });
    }

    // Generate URL-safe slug with "preview-" prefix
    const slug =
      "preview-" +
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") +
      "-" +
      nanoid(8);
    const embed_token = uuidv4();

    // Calculate auto-delete time (5 minutes from now)
    const deleteAfter = new Date(Date.now() + 5 * 60 * 1000);

    // Encrypt API keys before storing
    const llm_api_key_enc = llm_api_key ? encryptApiKey(llm_api_key) : null;
    const sarvam_api_key_enc = sarvam_api_key
      ? encryptApiKey(sarvam_api_key)
      : null;

    const agent = await Agent.create({
      user_id: userId,
      name: `[PREVIEW] ${name}`,
      slug,
      llm_model: llm_model || "gemini-2.5-flash",
      llm_api_key_enc,
      system_prompt,
      welcome_message: welcome_message || "Hello! How can I help you today?",
      sarvam_api_key_enc,
      stt_language_code: stt_language_code || "en-IN",
      tts_voice: tts_voice || "meera",
      tts_language_code: tts_language_code || "en-IN",
      max_call_duration_sec: max_call_duration_sec || 300,
      allowed_domains: allowed_domains || [],
      embed_token,
      is_preview: true,
      delete_after: deleteAfter,
    });

    const embedUrl = process.env.EMBED_URL || "http://localhost:5173";

    return res.status(201).json({
      agentId: agent.id,
      slug: agent.slug,
      embedToken: agent.embed_token,
      embedUrl: `${embedUrl}/embed/${agent.slug}?token=${agent.embed_token}`,
      deleteAfter: deleteAfter.toISOString(),
      expiresIn: "5 minutes",
    });
  } catch (err) {
    next(err);
  }
};
