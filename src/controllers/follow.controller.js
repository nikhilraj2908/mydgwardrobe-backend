const Follow = require("../models/follow.model");

/* ================================
   FOLLOW / UNFOLLOW USER
================================ */
exports.toggleFollow = async (req, res) => {
  try {
    const followerId = req.user.id;
    const { userId } = req.body; // user to follow

    if (!userId) {
      return res.status(400).json({ message: "User ID required" });
    }

    if (followerId === userId) {
      return res.status(400).json({ message: "You cannot follow yourself" });
    }

    const existing = await Follow.findOne({
      follower: followerId,
      following: userId,
    });

    if (existing) {
      await existing.deleteOne();
      return res.json({ following: false });
    }

    await Follow.create({
      follower: followerId,
      following: userId,
    });

    res.json({ following: true });
  } catch (err) {
    console.error("Follow error:", err);
    res.status(500).json({ message: "Failed to follow user" });
  }
};

/* ================================
   CHECK FOLLOW STATUS
================================ */
exports.isFollowing = async (req, res) => {
  try {
    const followerId = req.user.id;
    const { userId } = req.params;

    const exists = await Follow.exists({
      follower: followerId,
      following: userId,
    });

    res.json({ following: !!exists });
  } catch (err) {
    res.status(500).json({ message: "Failed to check follow status" });
  }
};

/* ================================
   GET FOLLOW COUNTS
================================ */
exports.getFollowCounts = async (req, res) => {
  try {
    const { userId } = req.params;

    const followers = await Follow.countDocuments({
      following: userId,
    });

    const following = await Follow.countDocuments({
      follower: userId,
    });

    res.json({ followers, following });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch follow counts" });
  }
};
