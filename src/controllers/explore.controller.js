const WardrobeItem = require("../models/wardrobeItem.model");
const Wardrobe = require("../models/wardrobe.model");

/* ======================================================
   EXPLORE – GET ALL PUBLIC (NON-PREMIUM) ITEMS ONLY
====================================================== */
exports.getExploreItems = async (req, res) => {
  try {
    const { category, search, sort = "newest", page = 1, limit = 20 } = req.query;

    const filter = {
      visibility: "public",
      accessLevel: "normal",
    };

    if (category && category !== "All") {
      filter.category = category; // categoryId
    }

    if (search) {
      const wardrobes = await Wardrobe.find({
        name: { $regex: search, $options: "i" },
      }).select("_id");

      filter.$or = [
        { brand: { $regex: search, $options: "i" } },
        { wardrobe: { $in: wardrobes.map(w => w._id) } },
      ];
    }

    let sortQuery = { createdAt: -1 };
    if (sort === "price-high") sortQuery = { price: -1 };
    if (sort === "price-low") sortQuery = { price: 1 };

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      WardrobeItem.find(filter)
        .populate("wardrobe", "name")
        .populate("category", "name type") // 🔥 FIX
        .sort(sortQuery)
        .skip(skip)
        .limit(Number(limit))
        .select("images category brand price wardrobe createdAt")
        .lean(),

      WardrobeItem.countDocuments(filter),
    ]);

    res.json({ items, total });
  } catch (error) {
    console.error("EXPLORE ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};

