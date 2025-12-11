const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, trim: true ,unique:true},

    email: { type: String, required: true, unique: true, lowercase: true },

    mobile: { type: String, required: true },

    gender: { type: String, enum: ["Male", "Female"], required: true },

    password: { type: String, required: true, select: false },

    dob: { type: Date},

    isVerified: { type: Boolean, default: false },

    role: { type: String, enum: ["user", "superadmin"], default: "user" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
