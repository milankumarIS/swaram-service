// Voice Agent Service — controllers/dashboardController.js
const Agent = require("../models/Agent");
const AgentSession = require("../models/AgentSession");
const { sequelize } = require("../config/database");
const { Op } = require("sequelize");

/**
 * GET /api/dashboard/stats
 * Get aggregated statistics for authenticated user's dashboard
 */
exports.getDashboardStats = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get all user's agents
    const agents = await Agent.findAll({
      where: {
        user_id: userId,
        is_preview: false, // Exclude preview agents
      },
      attributes: ["id"],
    });

    const agentIds = agents.map((a) => a.id);

    if (agentIds.length === 0) {
      return res.json({
        totalSessions: 0,
        totalTalkTime: "0m",
        totalTalkTimeSeconds: 0,
        agentCount: 0,
        activeSessions: 0,
      });
    }

    // Aggregate session statistics
    const sessionStats = await AgentSession.findOne({
      where: {
        agent_id: { [Op.in]: agentIds },
      },
      attributes: [
        [sequelize.fn("COUNT", sequelize.col("id")), "totalSessions"],
        [sequelize.fn("SUM", sequelize.col("duration_sec")), "totalDuration"],
        [
          sequelize.fn(
            "COUNT",
            sequelize.literal("CASE WHEN ended_at IS NULL THEN 1 END"),
          ),
          "activeSessions",
        ],
      ],
      raw: true,
    });

    const totalSessions = parseInt(sessionStats.totalSessions) || 0;
    const totalDurationSec = parseInt(sessionStats.totalDuration) || 0;
    const activeSessions = parseInt(sessionStats.activeSessions) || 0;

    // Format talk time as "Xh Ym" or "Ym" or "Xs"
    let formattedTalkTime = "0m";
    if (totalDurationSec > 0) {
      const hours = Math.floor(totalDurationSec / 3600);
      const minutes = Math.floor((totalDurationSec % 3600) / 60);
      const seconds = totalDurationSec % 60;

      if (hours > 0) {
        formattedTalkTime = minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
      } else if (minutes > 0) {
        formattedTalkTime = `${minutes}m`;
      } else {
        formattedTalkTime = `${seconds}s`;
      }
    }

    return res.json({
      totalSessions,
      totalTalkTime: formattedTalkTime,
      totalTalkTimeSeconds: totalDurationSec,
      agentCount: agents.length,
      activeSessions,
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return res.status(500).json({ error: "Failed to fetch dashboard stats" });
  }
};
