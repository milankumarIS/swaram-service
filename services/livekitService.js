// Voice Agent Service — services/livekitService.js
const { RoomServiceClient, AccessToken, AgentDispatchClient } = require("livekit-server-sdk");

const LIVEKIT_HOST = process.env.LIVEKIT_HOST || "";
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || "";
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || "";
const LIVEKIT_URL = process.env.LIVEKIT_URL || "";

let roomService = null;
let jobService = null;

const getRoomService = () => {
  if (!roomService) {
    if (!LIVEKIT_HOST || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
      throw new Error("LiveKit env vars not configured (LIVEKIT_HOST, LIVEKIT_API_KEY, LIVEKIT_API_SECRET)");
    }
    roomService = new RoomServiceClient(LIVEKIT_HOST, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
  }
  return roomService;
};

const getJobService = () => {
  if (!jobService) {
    if (!LIVEKIT_HOST || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
      throw new Error("LiveKit env vars not configured");
    }
    jobService = new AgentDispatchClient(LIVEKIT_HOST, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
  }
  return jobService;
};

/**
 * Create a LiveKit room for a visitor session.
 * Room metadata is read by the Python agent worker on join.
 * @param {string} name - unique room name
 * @param {string} metadata - JSON string with { agentId, sessionId }
 * @param {number} maxDurationSec - used for emptyTimeout
 */
const createRoom = async (name, metadata, maxDurationSec) => {
  const svc = getRoomService();
  await svc.createRoom({
    name,
    metadata,
    maxParticipants: 5,       // visitor + Python agent worker
    emptyTimeout: 300,         // destroy room after 5m if no one joins
  });
};

/**
 * Explicitly dispatch an agent to a room.
 * @param {string} roomName
 * @param {string} agentName - the name the worker registered with
 * @param {string} metadata - optional metadata for the agent
 */
const dispatchAgent = async (roomName, agentName, metadata) => {
  const svc = getJobService();
  try {
    // Note: In livekit-server-sdk v2.x, JobServiceClient is replaced by AgentDispatchClient
    // and dispatchAgent is replaced by createDispatch.
    // We pass metadata here so the worker can access it via ctx.job.metadata
    await svc.createDispatch(roomName, agentName, { metadata });
  } catch (err) {
    console.warn(`Agent dispatch failed for ${agentName} in room ${roomName}:`, err.message);
  }
};

/**
 * Issue a LiveKit JWT for a visitor participant.
 * @param {{ roomName: string, identity: string, ttl: number }} opts
 * @returns {Promise<string>} LiveKit access token (JWT)
 */
const createLiveKitToken = async ({ roomName, identity, ttl }) => {
  if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
    throw new Error("LiveKit API key/secret not configured");
  }
  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity,
    ttl,
  });
  at.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
  });
  return await at.toJwt();
};

const getLivekitUrl = () => LIVEKIT_URL;

module.exports = { createRoom, dispatchAgent, createLiveKitToken, getLivekitUrl };
