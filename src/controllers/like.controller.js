const Like = require("../models/like.model");
const Notification = require("../models/notification.model");

/* ======================================================
   TOGGLE LIKE
====================================================== */
exports.toggleLike = async (req, res) => {
  try {
    const userId = req.user.id;
    const { postType, postId } = req.body;

    if (!postType || !postId) {
      return res
        .status(400)
        .json({ message: "postType and postId required" });
    }

    const existing = await Like.findOne({
      user: userId,
      postType,
      postId,
    });

    // UNLIKE
    if (existing) {
      await existing.deleteOne();
      return res.json({ liked: false });
    }

    // LIKE
    const like = await Like.create({
      user: userId,
      postType,
      postId,
    });

    // 🔔 CREATE NOTIFICATION (ONLY ON NEW LIKE)
    if (postType === "item") {
      const item = await require("../models/wardrobeItem.model").findById(
        postId
      );

      if (item && item.user.toString() !== userId) {
        await Notification.create({
          user: item.user,        // receiver
          actor: userId,          // who liked
          type: "like",
          item: item._id,
          message: "liked your item",
        });
      }
    }

    return res.json({ liked: true });
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



exports.getMyLikeStatus = async (req, res) => {
  try {
    const userId = req.user.id; // from auth middleware
    const { postId, postType } = req.params;

    const like = await Like.findOne({
      user: userId,
      postId,
      postType,
    });

    res.json({
      liked: !!like,
    });
  } catch (err) {
    console.error("getMyLikeStatus error:", err);
    res.status(500).json({ message: "Failed to fetch like status" });
  }
};