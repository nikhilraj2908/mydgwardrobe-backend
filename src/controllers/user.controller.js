const User = require("../models/user.model");
const Wardrobe = require("../models/wardrobe.model");
const WardrobeItem = require("../models/wardrobeItem.model");
const Story = require("../models/story.model");
const Like = require("../models/like.model");
const Comment = require("../models/comment.model");
const Follow = require("../models/follow.model");
const SavedItem = require("../models/savedItem.model");
const Notification = require("../models/notification.model");
const { deleteFromS3 } = require("../utils/s3");

// GET PROFILE
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.json(user);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
};

// UPDATE PROFILE
// exports.updateProfile = async (req, res) => {
//   try {
//     const updated = await User.findByIdAndUpdate(
//       req.user.id,
//       req.body,
//       { new: true }
//     ).select("-password");

//     res.json(updated);
//   } catch {
//     res.status(500).json({ message: "Server error" });
//   }
// };
exports.updateProfile = async (req, res) => {
  try {
    const { username, bio, mobile, gender, dob } = req.body;

    const currentUser = await User.findById(req.user.id);
    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const updateData = {};

    // Only update username if provided and changed
    if (username && username.trim() !== "" && username.trim() !== currentUser.username) {
      const existingUser = await User.findOne({
        username: username.trim(),
        _id: { $ne: req.user.id },
      });
      if (existingUser) {
        return res.status(409).json({ message: "Username already taken. Please choose another username." });
      }
      updateData.username = username.trim();
    }

    // Only update mobile if provided and changed
    if (mobile !== undefined && mobile.trim() !== "" && mobile.trim() !== (currentUser.mobile || "")) {
      const existingMobile = await User.findOne({
        mobile: mobile.trim(),
        _id: { $ne: req.user.id },
      });
      if (existingMobile) {
        return res.status(409).json({ message: "Mobile number already registered to another account." });
      }
      updateData.mobile = mobile.trim();
    }

    if (bio !== undefined) updateData.bio = bio;
    if (gender && ["Male", "Female"].includes(gender)) updateData.gender = gender;
    if (dob) updateData.dob = dob;

    // If profile image uploaded
    if (req.file) {
      updateData.photo = req.file.key;
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true }
    ).select("-password");

    res.json({
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (err) {
    console.error("UPDATE PROFILE ERROR:", err);
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0] || "Field";
      const fieldName = field === "username" ? "Username" : field === "mobile" ? "Mobile number" : field;
      return res.status(409).json({ message: `${fieldName} is already taken. Please choose another.` });
    }
    res.status(500).json({ message: "Server error" });
  }
};


exports.getUserById = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId)
      .select("-password -email"); // hide sensitive fields

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (err) {
    res.status(400).json({ message: "Invalid user id" });
  }
};

/* =====================================================
   SEARCH USERS (PUBLIC)
   GET /api/user/search?q=
===================================================== */
exports.searchUsers = async (req, res) => {
  try {
    const { q } = req.query;

    // ⛔ Ignore very small searches
    if (!q || q.trim().length < 2) {
      return res.json({ users: [] });
    }

    const users = await User.find({
      username: { $regex: q, $options: "i" }, // case-insensitive
    })
      .select("_id username photo bio")
      .limit(10)
      .lean();

    res.json({ users });
  } catch (err) {
    console.error("USER SEARCH ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* =====================================================
   BLOCK / UNBLOCK USER (UGC COMPLIANCE)
===================================================== */
exports.blockUser = async (req, res) => {
  try {
    const currentUserId = req.user.id || req.user._id;
    const { targetUserId } = req.params;

    if (currentUserId.toString() === targetUserId.toString()) {
      return res.status(400).json({ message: "You cannot block yourself" });
    }

    await User.findByIdAndUpdate(currentUserId, {
      $addToSet: { blockedUsers: targetUserId },
    });

    res.json({ message: "User blocked successfully" });
  } catch (err) {
    console.error("BLOCK USER ERROR:", err);
    res.status(500).json({ message: "Server error blocking user" });
  }
};

exports.unblockUser = async (req, res) => {
  try {
    const currentUserId = req.user.id || req.user._id;
    const { targetUserId } = req.params;

    await User.findByIdAndUpdate(currentUserId, {
      $pull: { blockedUsers: targetUserId },
    });

    res.json({ message: "User unblocked successfully" });
  } catch (err) {
    console.error("UNBLOCK USER ERROR:", err);
    res.status(500).json({ message: "Server error unblocking user" });
  }
};

exports.getBlockedUsers = async (req, res) => {
  try {
    const currentUserId = req.user.id || req.user._id;
    const user = await User.findById(currentUserId)
      .populate("blockedUsers", "username photo")
      .lean();

    res.json(user?.blockedUsers || []);
  } catch (err) {
    console.error("GET BLOCKED USERS ERROR:", err);
    res.status(500).json({ message: "Server error fetching blocked users" });
  }
};

/* =====================================================
   DELETE ACCOUNT (GOOGLE PLAY POLICY REQUIREMENT)
   DELETE /api/user/me
===================================================== */
exports.deleteAccount = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;

    // 1️⃣ Delete profile photo from S3
    const user = await User.findById(userId);
    if (user && user.photo) {
      try {
        await deleteFromS3(user.photo);
      } catch (e) {
        console.error("Failed to delete user profile photo from S3:", e);
      }
    }

    // 2️⃣ Find and delete user's wardrobe items & their S3 images
    const items = await WardrobeItem.find({ user: userId }).select("images imageUrl");
    for (const item of items) {
      if (Array.isArray(item.images)) {
        for (const img of item.images) {
          try {
            await deleteFromS3(img);
          } catch (e) {}
        }
      } else if (item.imageUrl) {
        try {
          await deleteFromS3(item.imageUrl);
        } catch (e) {}
      }
    }
    await WardrobeItem.deleteMany({ user: userId });

    // 3️⃣ Delete user's wardrobes
    await Wardrobe.deleteMany({ user: userId });

    // 4️⃣ Find and delete user's stories & S3 media
    const stories = await Story.find({ user: userId }).select("media");
    for (const story of stories) {
      if (story.media) {
        try {
          await deleteFromS3(story.media);
        } catch (e) {}
      }
    }
    await Story.deleteMany({ user: userId });

    // 5️⃣ Clean up social records (likes, comments, follows, saves, notifications)
    await Promise.all([
      Like.deleteMany({ user: userId }),
      Comment.deleteMany({ user: userId }),
      Follow.deleteMany({ $or: [{ follower: userId }, { following: userId }] }),
      SavedItem.deleteMany({ user: userId }),
      Notification.deleteMany({ $or: [{ user: userId }, { sender: userId }] }),
    ]);

    // 6️⃣ Delete the user account record
    await User.findByIdAndDelete(userId);

    console.log(`✅ Cascading account deletion completed for user ${userId}`);
    res.json({ message: "Account and all associated data deleted successfully" });
  } catch (err) {
    console.error("DELETE ACCOUNT ERROR:", err);
    res.status(500).json({ message: "Server error deleting account" });
  }
};