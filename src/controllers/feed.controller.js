// controllers/feed.controller.js
const WardrobeItem = require("../models/wardrobeItem.model");

const getPublicFeed = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 6;
    const skip = (page - 1) * limit;

    const items = await WardrobeItem.find({ visibility: "public" })
      .populate("user", "username photo")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      page,
      count: items.length,
      items,
    });
  } catch (err) {
    console.error("FEED ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { getPublicFeed };
