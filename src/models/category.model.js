const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    type: {
      type: String,
      enum: ["mens", "womens", "unisex"],
      required: true,
    },

    icon: { type: String },

    coverImage: {
      type: String,
      required: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    // 🔥 WHO CREATED IT
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // 🔥 WHERE IT SHOULD APPEAR
    scope: {
      type: String,
      enum: ["explore", "user"],
      default: "user", // IMPORTANT
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Category", categorySchema);
