const Like = require("../models/like.model");

/* ======================================================
   TOGGLE LIKE
====================================================== */
exports.toggleLike = async (req, res) => {
  try {
    const userId = req.user.id;
    const { postType, postId } = req.body;

    if (!postType || !postId) {
      return res.status(400).json({ message: "postType and postId required" });
    }

    const existing = await Like.findOne({ user: userId, postType, postId });

    if (existing) {
      await existing.deleteOne();
      return res.json({ liked: false });
    }

    await Like.create({ user: userId, postType, postId });
    res.json({ liked: true });
  } catch (err) {
    console.error("LIKE ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ======================================================
   GET LIKE COUNT
====================================================== */
exports.getLikeCount = async (req, res) => {
  try {
    const { postType, postId } = req.params;

    const count = await Like.countDocuments({ postType, postId });

    res.json({ count });
  } catch (err) {
    console.error("LIKE COUNT ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};
