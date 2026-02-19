// Voice Agent Service — models/User.js
const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const User = sequelize.define(
  "user",
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    email: {
      type: DataTypes.TEXT,
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
    },
    password_hash: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    plan: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: "free",
      validate: { isIn: [["free", "pro", "business"]] },
    },
  },
  {
    tableName: "users",
    schema:'voiceagent',
    timestamps: true,
    underscored: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [{ unique: true, fields: ["email"] }],
  }
);

module.exports = User;
