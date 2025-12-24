// models/view.model.js
const mongoose = require("mongoose");

const viewSchema = new mongoose.Schema(
  {
    postType: {
      type: String,
      enum: ["collection", "wardrobe", "item"],
      required: true,
    },
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("View", viewSchema);
