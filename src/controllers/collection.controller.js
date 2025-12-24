const mongoose = require("mongoose");
const Wardrobe = require("../models/wardrobe.model");
const WardrobeItem = require("../models/wardrobeItem.model"); // ✅ correct case
const User = require("../models/user.model");

exports.getUserWardrobesWithStats = async (req, res) => {
  try {
    const { userId } = req.params;

    // viewer may be undefined (public feed)
    const viewerId = req.user?.id;
    const isOwner =
      viewerId && viewerId.toString() === userId.toString();

    // fetch user info
    const user = await User.findById(userId).select("username photo");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // fetch all wardrobes of the user
    const wardrobes = await Wardrobe.find({ user: userId }).lean();

    const wardrobesWithStats = await Promise.all(
      wardrobes.map(async (wardrobe) => {
        const filter = {
          user: userId,
          wardrobe: wardrobe.name, // string-based relation
        };

        // restrict others to public items only
        if (!isOwner) {
          filter.visibility = "public";
        }

        const items = await WardrobeItem.find(filter).lean();

        const totalItems = items.length;
        const totalWorth = items.reduce(
          (sum, item) => sum + (item.price || 0),
          0
        );

        // cover image must always be PUBLIC
        const coverImage =
          items.find((i) => i.visibility === "public")?.imageUrl ||
          null;

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
      wardrobes: wardrobesWithStats,
    });
  } catch (err) {
    console.error("COLLECTION CONTROLLER ERROR:", err);
    res.status(500).json({ message: "Failed to load collections" });
  }
};
