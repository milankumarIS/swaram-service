// Voice Agent Service — models/Agent.js
const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Agent = sequelize.define(
  "agent",
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    name: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    slug: {
      type: DataTypes.TEXT,
      allowNull: false,
      unique: true,
    },
    // LLM config
    llm_provider: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: "gemini",
    },
    llm_model: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: "gemini-2.5-flash",
    },
    llm_api_key_enc: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    // Agent personality
    system_prompt: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    welcome_message: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: "Hello! How can I help you today?",
    },
    // Voice config (Sarvam AI)
    sarvam_api_key_enc: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    stt_language_code: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: "en-IN",
    },
    tts_voice: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: "anushka",
    },
    tts_language_code: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: "en-IN",
    },
    // Behavior
    max_call_duration_sec: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 300,
    },
    // Embed security
    allowed_domains: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: false,
      defaultValue: [],
    },
    embed_token: {
      type: DataTypes.TEXT,
      allowNull: false,
      unique: true,
    },
    // Status
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    // Preview agent flags
    is_preview: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    delete_after: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "agents",
    schema: "voiceagent",
    timestamps: true,
    underscored: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      { fields: ["user_id"] },
      { unique: true, fields: ["embed_token"] },
      { unique: true, fields: ["slug"] },
      { fields: ["is_active"] },
      { fields: ["is_preview", "delete_after"] },
    ],
  },
);

module.exports = Agent;
