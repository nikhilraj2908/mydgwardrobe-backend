const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true, // receiver
    },
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // who liked/commented/followed
    },
    type: {
      type: String,
      enum: ["like", "comment", "follow", "system"],
      required: true,
    },
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WardrobeItem",
    },
    title: { type: String }, 
    message: String,
    read: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);
