const mongoose = require("mongoose");

const outfitItemSchema = new mongoose.Schema(
  {
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WardrobeItem",
      required: true,
    },
    x: {
      type: Number,
      default: 0,
    },
    y: {
      type: Number,
      default: 0,
    },
    scale: {
      type: Number,
      default: 1,
    },
    width: {
      type: Number,
      default: 180,
    },
    height: {
      type: Number,
      default: 180,
    },
    zIndex: {
      type: Number,
      default: 1,
    },
  },
  { _id: false }
);

const outfitSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      default: "My Matched Pair",
    },
    items: {
      type: [outfitItemSchema],
      validate: [(arr) => arr.length > 0, "At least one item is required in a pair"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    isFavorite: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Outfit", outfitSchema);

