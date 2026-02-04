const mongoose = require("mongoose");

const wardrobeItemSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    images: {
      type: [String],
      required: true,
      validate: [(arr) => arr.length > 0, "At least one image is required"],
    },

    // ✅ FIX 1: store category as ObjectId
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },

    // ✅ FIX 2: explicitly store category type
    categoryType: {
      type: String,
      enum: ["mens", "womens", "unisex"],
      required: true,
      index: true,
    },

    wardrobe: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Wardrobe",
      required: true,
      index: true,
    },

    price: {
      type: Number,
      default: 0,
      min: 0,
    },

    brand: {
      type: String,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },

    visibility: {
      type: String,
      enum: ["public", "private"],
      default: "private",
      index: true,
    },

    accessLevel: {
      type: String,
      enum: ["normal", "premium"],
      default: "normal",
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("WardrobeItem", wardrobeItemSchema);
