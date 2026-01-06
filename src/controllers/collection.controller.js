const mongoose = require("mongoose");
const Wardrobe = require("../models/wardrobe.model");
const WardrobeItem = require("../models/wardrobeItem.model");
const User = require("../models/user.model");
exports.getUserWardrobesWithStats = async (req, res) => {
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

        const coverImage =
          items.find((i) => i.visibility === "public")?.imageUrl || null;

        return {
          _id: wardrobe._id,
          name: wardrobe.name,
          color: wardrobe.color,
          totalItems,
          totalWorth,
          coverImage,
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
