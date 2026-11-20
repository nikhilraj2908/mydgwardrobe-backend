const mongoose = require("mongoose");

const storySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    media: {
      type: String,
      required: true,
    },

    mediaType: {
      type: String,
      enum: ["image", "video"],
      default: "image",
    },

    duration: {
      type: Number,
      default: 5,
    },

    viewers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    storyType: {
      type: String,
      enum: ["standard", "post", "combo"],
      default: "standard",
    },

    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WardrobeItem",
    },

    outfit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Outfit",
    },

    caption: {
      type: String,
      default: "",
      maxlength: 300,
    },

    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Story", storySchema);
