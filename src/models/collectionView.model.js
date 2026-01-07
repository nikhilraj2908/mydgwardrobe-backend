const mongoose = require("mongoose");

const CollectionViewSchema = new mongoose.Schema(
  {
    viewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

// 🔒 prevent duplicate views
CollectionViewSchema.index(
  { viewer: 1, owner: 1 },
  { unique: true }
);

module.exports = mongoose.model("CollectionView", CollectionViewSchema);
