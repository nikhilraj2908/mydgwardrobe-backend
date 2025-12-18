// const mongoose = require("mongoose");

// const userSchema = new mongoose.Schema(
//   {
//     username: { type: String, required: true, trim: true ,unique:true},

//     email: { type: String, required: true, unique: true, lowercase: true },

//     mobile: { type: String, required: true },

//     gender: { type: String, enum: ["Male", "Female"], required: true },

//     password: { type: String, required: true, select: false },

//     dob: { type: Date},

//     isVerified: { type: Boolean, default: false },

//     role: { type: String, enum: ["user", "superadmin"], default: "user" },
//   },
//   { timestamps: true }
// );

// module.exports = mongoose.model("User", userSchema);
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    // Common
    username: {
      type: String,
      trim: true,
      unique: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },

    role: {
      type: String,
      enum: ["user", "superadmin"],
      default: "user",
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    // =========================
    // AUTH TYPE
    // =========================
    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },

    googleId: {
      type: String,
      index: true,
    },

    photo: {
      type: String,
    },

    // =========================
    // LOCAL AUTH FIELDS
    // =========================
    password: {
      type: String,
      select: false,
    },

    mobile: {
      type: String,
    },

    gender: {
      type: String,
      enum: ["Male", "Female"],
    },

    dob: {
      type: Date,
    },
    profileCompleted: {
        type: Boolean,
        default: false,
    },
    bio: { type: String }

  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
