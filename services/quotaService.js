// Voice Agent Service — services/quotaService.js
// Plan-based session limits. Checks concurrent active sessions per agent.

const AgentSession = require("../models/AgentSession");
const { Op } = require("sequelize");

const PLAN_LIMITS = {
  free: 500,
  pro: 20,
  business: 100,
};

/**
 * Check if a user can start another session based on their plan.
 * @param {string} agentId
 * @param {string} userPlan - 'free' | 'pro' | 'business'
 * @returns {Promise<{ allowed: boolean, reason?: string }>}
 */
const checkSessionQuota = async (agentId, userPlan) => {
  const limit = PLAN_LIMITS[userPlan] ?? PLAN_LIMITS.free;

  // Count active sessions (started but not ended) for this agent
  const activeSessions = await AgentSession.count({
    where: {
      agent_id: agentId,
      started_at: { [Op.ne]: null },
      ended_at: null,
    },
  });

  if (activeSessions >= limit) {
    return {
      allowed: false,
      reason: `Concurrent session limit reached for your plan (${userPlan}: max ${limit} sessions). Upgrade to increase your limit.`,
    };
  }

  return { allowed: true };
};

module.exports = { checkSessionQuota, PLAN_LIMITS };
