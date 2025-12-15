const mongoose = require("mongoose");

const wardrobeItemSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    imageUrl: {
      type: String,
      required: true,
    },

    category: {
      type: String,
      required: true,
    },

    wardrobe: {
      type: String,
      required: true,
    },

    price: {
      type: Number,
      default: 0,
    },

    brand: {
      type: String,
    },

    visibility: {
      type: String,
      enum: ["public", "private"],
      default: "private",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("WardrobeItem", wardrobeItemSchema);
