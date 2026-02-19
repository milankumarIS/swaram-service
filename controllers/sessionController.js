// Voice Agent Service — controllers/sessionController.js
const AgentSession = require("../models/AgentSession");
const Agent = require("../models/Agent");

/**
 * GET /api/agents/:agentId/sessions
 * List all sessions for an agent (owner only)
 */
exports.getSessions = async (req, res, next) => {
  try {
    const { agentId } = req.params;

    // Verify agent belongs to user
    const agent = await Agent.findOne({
      where: { id: agentId, user_id: req.user.id },
      attributes: ["id"],
    });
    if (!agent) return res.status(404).json({ error: "Agent not found" });

    const sessions = await AgentSession.findAll({
      where: { agent_id: agentId },
      attributes: ["id", "livekit_room_name", "visitor_identity", "started_at", "ended_at", "duration_sec"],
      order: [["started_at", "DESC"]],
      limit: 100,
    });

    return res.json(sessions);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/sessions/:sessionId
 * Get full session detail including transcript
 */
exports.getSession = async (req, res, next) => {
  try {
    const session = await AgentSession.findByPk(req.params.sessionId);
    if (!session) return res.status(404).json({ error: "Session not found" });

    // Verify the session's agent belongs to the requesting user
    const agent = await Agent.findOne({
      where: { id: session.agent_id, user_id: req.user.id },
      attributes: ["id"],
    });
    if (!agent) return res.status(403).json({ error: "Access denied" });

    return res.json(session);
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/sessions/:sessionId/end
 * Called by the Python worker to mark a session as ended.
 * Protected by workerAuth middleware.
 */
exports.endSession = async (req, res, next) => {
  try {
    const { duration_sec, transcript } = req.body;
    const session = await AgentSession.findByPk(req.params.sessionId);
    if (!session) return res.status(404).json({ error: "Session not found" });

    await session.update({
      ended_at: new Date(),
      duration_sec: duration_sec || null,
      transcript: transcript || session.transcript,
    });

    return res.json({ message: "Session ended", sessionId: session.id });
  } catch (err) {
    next(err);
  }
};
