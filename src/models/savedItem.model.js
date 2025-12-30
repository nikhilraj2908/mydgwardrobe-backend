const mongoose = require("mongoose");

const savedItemSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WardrobeItem",
      required: true,
    },
  },
  { timestamps: true }
);

/* Prevent duplicate saves */
savedItemSchema.index({ user: 1, item: 1 }, { unique: true });

module.exports = mongoose.model("SavedItem", savedItemSchema);
