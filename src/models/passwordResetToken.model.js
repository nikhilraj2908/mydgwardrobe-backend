const mongoose = require("mongoose");

const PasswordResetSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      index: true,
    },

    otp: {
      type: String,
      required: true,
    },

    verified: {
      type: Boolean,
      default: false,   // ⭐ IMPORTANT
    },

    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PasswordReset", PasswordResetSchema);
