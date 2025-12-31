const WardrobeItem = require("../models/wardrobeItem.model");

/* ======================================================
   EXPLORE – GET ALL PUBLIC ITEMS
   Supports:
   - Category filter
   - Search (category, brand, wardrobe)
====================================================== */
exports.getExploreItems = async (req, res) => {
  try {
    const { category, search } = req.query;

    // Base filter: only public items
    const filter = {
      visibility: "public",
    };

    // Category filter
    if (category && category !== "All") {
      filter.category = category;
    }

    // Search filter
    if (search) {
      filter.$or = [
        { category: { $regex: search, $options: "i" } },
        { brand: { $regex: search, $options: "i" } },
        { wardrobe: { $regex: search, $options: "i" } },
      ];
    }

    const items = await WardrobeItem.find(filter)
      .sort({ createdAt: -1 })
      .select(
        "imageUrl category brand price wardrobe createdAt"
      )
      .lean();

    res.json(items);
  } catch (error) {
    console.error("EXPLORE CONTROLLER ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};
