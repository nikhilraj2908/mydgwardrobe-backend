const WardrobeItem = require("../models/wardrobeItem.model");
const Wardrobe = require("../models/wardrobe.model");

/* ======================================================
   EXPLORE – GET ALL PUBLIC ITEMS
====================================================== */
exports.getExploreItems = async (req, res) => {
  try {
    const { category, search } = req.query;

    const filter = {
      visibility: "public",
    };

    // Category filter
    if (category && category !== "All") {
      filter.category = category;
    }

    let itemsQuery = WardrobeItem.find(filter)
      .populate("wardrobe", "name") // ✅ REQUIRED
      .sort({ createdAt: -1 })
      .select("imageUrl category brand price wardrobe createdAt");

    // 🔍 SEARCH FIX (IMPORTANT)
    if (search) {
      const wardrobes = await Wardrobe.find({
        name: { $regex: search, $options: "i" },
      }).select("_id");

      itemsQuery = WardrobeItem.find({
        visibility: "public",
        ...(category && category !== "All" ? { category } : {}),
        $or: [
          { category: { $regex: search, $options: "i" } },
          { brand: { $regex: search, $options: "i" } },
          { wardrobe: { $in: wardrobes.map(w => w._id) } }, // ✅ CORRECT
        ],
      })
        .populate("wardrobe", "name")
        .sort({ createdAt: -1 })
        .select("imageUrl category brand price wardrobe createdAt");
    }

    const items = await itemsQuery.lean();

    res.json(items);
  } catch (error) {
    console.error("EXPLORE CONTROLLER ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};
