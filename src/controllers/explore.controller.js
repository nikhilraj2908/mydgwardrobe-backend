const WardrobeItem = require("../models/wardrobeItem.model");
const Wardrobe = require("../models/wardrobe.model");

/* ======================================================
   EXPLORE – GET ALL PUBLIC ITEMS
====================================================== */
exports.getExploreItems = async (req, res) => {
  try {
    const { category, search } = req.query;

    const filter = { visibility: "public" };

    if (category && category !== "All") {
      filter.category = category;
    }

    if (search) {
      const wardrobes = await Wardrobe.find({
        name: { $regex: search, $options: "i" },
      }).select("_id");

      filter.$or = [
        { category: { $regex: search, $options: "i" } },
        { brand: { $regex: search, $options: "i" } },
        { wardrobe: { $in: wardrobes.map(w => w._id) } },
      ];
    }

    const items = await WardrobeItem.find(filter)
      .populate("wardrobe", "name")
      .sort({ createdAt: -1 })
      .select("images imageUrl category brand price wardrobe createdAt")
      .lean();

    // 🔥 Normalize image paths
    const normalized = items.map(item => {
      let images = [];

      if (Array.isArray(item.images) && item.images.length > 0) {
        images = item.images;
      } else if (item.imageUrl) {
        images = [item.imageUrl];
      }

      images = images.map(p => p.replace(/\\/g, "/"));

      return {
        ...item,
        images,
        imageUrl: undefined, // prevent confusion
      };
    });

    res.json({
      items: normalized,
      total: normalized.length,
    });

  } catch (error) {
    console.error("EXPLORE CONTROLLER ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};
