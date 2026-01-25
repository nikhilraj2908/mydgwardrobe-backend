const mongoose = require("mongoose");
const Wardrobe = require("../models/wardrobe.model");
const WardrobeItem = require("../models/wardrobeItem.model");
const User = require("../models/user.model");
const Like = require("../models/like.model");
const CollectionView = require("../models/collectionView.model");
const getUserWardrobesWithStats = async (req, res) => {
  try {
    const { userId } = req.params;

    const viewerId = req.user?.id;
    const isOwner = viewerId && viewerId.toString() === userId.toString();

    const user = await User.findById(userId).select("username photo");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const wardrobes = await Wardrobe.find({ user: userId }).lean();

    const result = await Promise.all(
      wardrobes.map(async (wardrobe) => {
        const itemFilter = {
          user: userId,
          wardrobe: wardrobe._id, // ✅ FIXED
        };

        if (!isOwner) {
          itemFilter.visibility = "public";
        }

        const items = await WardrobeItem.find(itemFilter).lean();

        const totalItems = items.length;
        const totalWorth = items.reduce(
          (sum, item) => sum + (item.price || 0),
          0
        );
        // ✅ pick first visible item
        const firstVisibleItem = items.find(
          (i) => isOwner || i.visibility === "public"
        );

        // ✅ extract image correctly (new system first)
        let images = [];

        if (firstVisibleItem) {
          if (Array.isArray(firstVisibleItem.images) && firstVisibleItem.images.length) {
            images = [firstVisibleItem.images[0]];
          } else if (firstVisibleItem.imageUrl) {
            images = [firstVisibleItem.imageUrl]; // legacy fallback
          }
        }

        return {
          _id: wardrobe._id,
          name: wardrobe.name,
          color: wardrobe.color,
          totalItems,
          totalWorth,

          // ✅ NEW — what frontend actually uses
          images,

          // ⚠️ optional legacy support
          coverImage: images[0] || null,

          hasPrivateItems: isOwner
            ? items.some((i) => i.visibility === "private")
            : false,
        };

      })
    );

    res.json({
      user,
      isOwner,
      wardrobes: result,
    });
  } catch (error) {
    console.error("COLLECTION CONTROLLER ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};



const getCollectionLikeCount = async (req, res) => {
  try {
    const { userId } = req.params;
    const viewerId = req.user?.id;

    const isOwner =
      viewerId && viewerId.toString() === userId.toString();

    // 1️⃣ Get all wardrobes of the user
    const wardrobes = await Wardrobe.find({ user: userId }).select("_id");
    const wardrobeIds = wardrobes.map(w => w._id);

    if (wardrobeIds.length === 0) {
      return res.json({ totalLikes: 0 });
    }

    // 2️⃣ Get item IDs inside these wardrobes
    const itemFilter = {
      wardrobe: { $in: wardrobeIds },
    };

    if (!isOwner) {
      itemFilter.visibility = "public";
    }

    const items = await WardrobeItem.find(itemFilter).select("_id");
    const itemIds = items.map(i => i._id);

    if (itemIds.length === 0) {
      return res.json({ totalLikes: 0 });
    }

    // 3️⃣ Count likes for these items
    const totalLikes = await Like.countDocuments({
      postType: "item",
      postId: { $in: itemIds },
    });

    res.json({ totalLikes });
  } catch (error) {
    console.error("COLLECTION LIKE ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

const trackCollectionView = async (req, res) => {
  try {
    const { userId } = req.params;
    const viewerId = req.user?.id;

    // ❌ no login → no view
    if (!viewerId) {
      return res.json({ counted: false });
    }

    // ❌ owner viewing own collection
    if (viewerId.toString() === userId.toString()) {
      return res.json({ counted: false });
    }

    await CollectionView.findOneAndUpdate(
      { viewer: viewerId, owner: userId },
      { $setOnInsert: { viewer: viewerId, owner: userId } },
      { upsert: true }
    );

    const totalViews = await CollectionView.countDocuments({
      owner: userId,
    });

    res.json({ totalViews });
  } catch (error) {
    console.error("COLLECTION VIEW ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};
const getCollectionViewCount = async (req, res) => {
  try {
    const { userId } = req.params;

    const totalViews = await CollectionView.countDocuments({
      owner: userId,
    });

    res.json({ totalViews });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
module.exports = {
  getUserWardrobesWithStats,
  getCollectionLikeCount,
  trackCollectionView,
  getCollectionViewCount
};