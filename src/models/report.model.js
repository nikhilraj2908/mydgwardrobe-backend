const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema(
  {
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    targetType: {
      type: String,
      enum: ["item", "wardrobe", "user", "comment"],
      required: true,
    },
    targetId: {
      type: String,
      required: true,
    },
    reason: {
      type: String,
      required: true,
    },
    details: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["pending", "reviewed", "dismissed", "action_taken"],
      default: "pending",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Report", reportSchema);

