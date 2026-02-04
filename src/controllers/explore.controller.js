const WardrobeItem = require("../models/wardrobeItem.model");
const Wardrobe = require("../models/wardrobe.model");
const Category = require("../models/category.model");
/* ======================================================
   EXPLORE – GET ALL PUBLIC (NON-PREMIUM) ITEMS ONLY
====================================================== */
/* ======================================================
   EXPLORE – GET ALL PUBLIC (NON-PREMIUM) ITEMS ONLY
====================================================== */
exports.getExploreItems = async (req, res) => {
  try {
    const { category, search, sort = "newest", page = 1, limit = 20, gender } = req.query;

    const filter = {
      visibility: "public",
      accessLevel: "normal",
    };

    if (category && category !== "All") {
      filter.category = category;
    }

    // IMPORTANT FIX: Handle gender filtering properly
    if (gender) {
      if (gender === 'unisex') {
        // When 'All' is selected, show items of all genders AND unisex
        filter.gender = { $in: ['mens', 'womens', 'unisex'] };
      } else {
        // For specific gender (mens/womens), show items of that gender AND unisex
        filter.gender = { $in: [gender, 'unisex'] };
      }
    }

    if (search) {
      const wardrobes = await Wardrobe.find({
        name: { $regex: search, $options: "i" },
      }).select("_id");

      const categories = await Category.find({
        name: { $regex: search, $options: "i" },
      }).select("_id");

      filter.$or = [
        { brand: { $regex: search, $options: "i" } },
        { wardrobe: { $in: wardrobes.map(w => w._id) } },
        { category: { $in: categories.map(c => c._id) } },
      ];
    }

    let sortQuery = { createdAt: -1 };
    if (sort === "price-high") sortQuery = { price: -1 };
    if (sort === "price-low") sortQuery = { price: 1 };

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      WardrobeItem.find(filter)
        .populate("wardrobe", "name")
        .populate("category", "name type")
        .sort(sortQuery)
        .skip(skip)
        .limit(Number(limit))
        .select("images category brand price wardrobe createdAt gender") // Added gender
        .lean(),

      WardrobeItem.countDocuments(filter),
    ]);

    // Debug log to see what's being returned
    console.log("Explore items query:", {
      filter,
      gender,
      itemsCount: items.length,
      total
    });

    res.json({ items, total });
  } catch (error) {
    console.error("EXPLORE ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};

