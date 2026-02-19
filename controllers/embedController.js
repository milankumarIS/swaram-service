// Voice Agent Service — controllers/embedController.js
// The critical endpoint that the iframe widget calls to start a voice session.
const { v4: uuidv4 } = require("uuid");
const Agent = require("../models/Agent");
const AgentSession = require("../models/AgentSession");
const { createRoom, dispatchAgent, createLiveKitToken, getLivekitUrl } = require("../services/livekitService");
const { checkSessionQuota } = require("../services/quotaService");
const User = require("../models/User");

/**
 * POST /api/embed/token
 * Body: { embed_token }
 * Public endpoint (CORS allowed), rate-limited via route.
 * Returns LiveKit credentials for a visitor to join a room.
 */
exports.getToken = async (req, res, next) => {
  try {
    const { embed_token } = req.body;
    if (!embed_token) {
      return res.status(400).json({ error: "embed_token is required" });
    }

    // 1. Fetch agent by embed token
    const agent = await Agent.findOne({
      where: { embed_token, is_active: true },
    });
    if (!agent) {
      return res.status(404).json({ error: "Agent not found or inactive" });
    }

    // 2. Validate origin against allowed_domains (in production only)
    if (process.env.NODE_ENV === "production") {
      const origin = req.headers.origin || "";
      if (origin && agent.allowed_domains.length > 0) {
        try {
          const hostname = new URL(origin).hostname.replace(/^www\./, "");
          const allowed = agent.allowed_domains.some(
            (d) => d.replace(/^www\./, "") === hostname
          );
          if (!allowed) {
            return res.status(403).json({ error: "Domain not allowed for this agent" });
          }
        } catch {
          return res.status(403).json({ error: "Invalid origin header" });
        }
      }
    }

    // 3. Check quota (get agent owner's plan)
    const owner = await User.findByPk(agent.user_id, { attributes: ["plan"] });
    const quota = await checkSessionQuota(agent.id, owner?.plan || "free");
    if (!quota.allowed) {
      return res.status(429).json({ error: quota.reason });
    }

    // 4. Create LiveKit room with agent metadata
    const sessionId = uuidv4();
    const roomName = `agent-${agent.id}-${sessionId}`;
    const visitorIdentity = `visitor-${uuidv4()}`;

    // Room metadata is read by the Python agent worker on room join
    const roomMetadata = JSON.stringify({
      agentId: agent.id,
      sessionId,
    });

    await createRoom(roomName, roomMetadata, agent.max_call_duration_sec);

    // 4b. Explicitly dispatch the agent worker
    // Using pool name "my-agent" by default
    const agentPoolName = process.env.AGENT_NAME || "my-agent";
    await dispatchAgent(roomName, agentPoolName, roomMetadata);

    // 5. Issue LiveKit JWT for the visitor participant
    const livekitToken = await createLiveKitToken({
      roomName,
      identity: visitorIdentity,
      ttl: agent.max_call_duration_sec + 60,
    });

    // 6. Log session start in DB
    await AgentSession.create({
      id: sessionId,
      agent_id: agent.id,
      livekit_room_name: roomName,
      visitor_identity: visitorIdentity,
    });

    // 7. Return credentials to the widget
    return res.json({
      livekitUrl: getLivekitUrl(),
      livekitToken,
      roomName,
      sessionId,
      welcomeMessage: agent.welcome_message,
      agentName: agent.slug,
    });
  } catch (err) {
    next(err);
  }
};
