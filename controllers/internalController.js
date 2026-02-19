// Voice Agent Service — controllers/internalController.js
// Internal-only endpoint consumed by the Python agent worker.
// Returns decrypted API keys so the worker can call Gemini + Sarvam.
// Protected by X-Worker-Secret header — must NOT be internet-accessible.

const Agent = require("../models/Agent");
const { decryptApiKey } = require("../utils/encryptUtils");

/**
 * GET /internal/agents/:id/config
 * Returns full agent config with decrypted API keys.
 * Called by Python worker after joining a LiveKit room.
 */
exports.getAgentConfig = async (req, res, next) => {
  try {
    const agent = await Agent.findOne({
      where: { id: req.params.id, is_active: true },
    });

    if (!agent) {
      return res.status(404).json({ error: "Agent not found or inactive" });
    }

    // Decrypt sensitive keys before returning (never stored decrypted)
    let llm_api_key = null;
    let sarvam_api_key = null;

    try {
      if (agent.llm_api_key_enc) {
        llm_api_key = decryptApiKey(agent.llm_api_key_enc);
      }
    } catch (e) {
      return res.status(500).json({ error: "Failed to decrypt LLM API key" });
    }

    try {
      if (agent.sarvam_api_key_enc) {
        sarvam_api_key = decryptApiKey(agent.sarvam_api_key_enc);
      }
    } catch (e) {
      return res.status(500).json({ error: "Failed to decrypt Sarvam API key" });
    }

    return res.json({
      id: agent.id,
      name: agent.name,
      slug: agent.slug,
      llm_provider: agent.llm_provider,
      llm_model: agent.llm_model,
      llm_api_key,                          // decrypted — only sent to worker
      system_prompt: agent.system_prompt,
      welcome_message: agent.welcome_message,
      sarvam_api_key,                        // decrypted — only sent to worker
      stt_language_code: agent.stt_language_code,
      tts_voice: agent.tts_voice,
      tts_language_code: agent.tts_language_code,
      max_call_duration_sec: agent.max_call_duration_sec,
    });
  } catch (err) {
    next(err);
  }
};
