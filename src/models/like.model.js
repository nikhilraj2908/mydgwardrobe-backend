const mongoose = require("mongoose");

const likeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    postType: {
      type: String,
      enum: ["item", "wardrobe"],
      required: true,
    },

    postId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
  },
  { timestamps: true }
);

// Prevent duplicate likes
likeSchema.index({ user: 1, postType: 1, postId: 1 }, { unique: true });

module.exports = mongoose.model("Like", likeSchema);
