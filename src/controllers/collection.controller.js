const mongoose = require("mongoose");
const Wardrobe = require("../models/wardrobe.model");
const WardrobeItem= require("../models/wardrobeItem.model")
const User = require("../models/user.model");
exports.getUserWardrobesWithStats = async (req, res) => {
  try {
    const { userId } = req.params;

    // Viewer (may be undefined)
    const viewerId = req.user?.id;
    const isOwner =
      viewerId && viewerId.toString() === userId.toString();

    // Get user info (for header)
    const user = await User.findById(userId).select(
      "username photo"
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Get ALL wardrobes of user
    const wardrobes = await Wardrobe.find({ user: userId }).lean();

    const result = await Promise.all(
      wardrobes.map(async (wardrobe) => {
        // Build item filter
        const itemFilter = {
          user: userId,
          wardrobe: wardrobe.name, // string match (correct)
        };

        // Only others are restricted to public
        if (!isOwner) {
          itemFilter.visibility = "public";
        }

        const items = await WardrobeItem.find(itemFilter).lean();

        const totalItems = items.length;

        const totalWorth = items.reduce(
          (sum, item) => sum + (item.price || 0),
          0
        );

        // Cover image should ALWAYS come from a public item
        const coverImage =
          items.find((i) => i.visibility === "public")
            ?.imageUrl || null;

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
