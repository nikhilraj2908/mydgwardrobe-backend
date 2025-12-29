const mongoose = require("mongoose");

const storySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    media: {
      type: String, // image or video URL
      required: true,
    },

    mediaType: {
      type: String,
      enum: ["image", "video"],
      default: "image",
    },

    duration: {
      type: Number, // seconds (e.g. 10, 30, 3600)
      default: 10,
    },

    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // Mongo auto-delete
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Story", storySchema);
