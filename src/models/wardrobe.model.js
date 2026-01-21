const mongoose = require("mongoose");

const wardrobeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    color: {
      type: String,
      required: true, // hex or predefined color
    },

    itemCount: {
      type: Number,
      default: 0,
    },
      // ✅ ADD THIS
    isSystem: {
      type: Boolean,
      default: false,
      index: true,
    },

    isDefault: {
      type: Boolean,
      default: false, // for "All Wardrobes" later
    },
  },
  { timestamps: true }
);

// Prevent duplicate wardrobe names per user
wardrobeSchema.index({ user: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("Wardrobe", wardrobeSchema);
