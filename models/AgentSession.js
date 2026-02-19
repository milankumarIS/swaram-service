// Voice Agent Service — models/AgentSession.js
const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const AgentSession = sequelize.define(
  "agent_session",
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    agent_id: {
      type: DataTypes.UUID,
      allowNull: true, // SET NULL on agent delete
    },
    livekit_room_name: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    visitor_identity: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    started_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    ended_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    duration_sec: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    transcript: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
  },
  {
    tableName: "agent_sessions",
    timestamps: false,
    underscored: true,
    schema:'voiceagent',
    indexes: [
      { fields: ["agent_id"] },
      { fields: ["started_at"] },
    ],
  }
);

module.exports = AgentSession;
