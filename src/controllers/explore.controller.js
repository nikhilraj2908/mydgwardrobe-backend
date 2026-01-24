const WardrobeItem = require("../models/wardrobeItem.model");
const Wardrobe = require("../models/wardrobe.model");

/* ======================================================
   EXPLORE – GET ALL PUBLIC ITEMS
====================================================== */
exports.getExploreItems = async (req, res) => {
  try {
    const {
      category,
      search,
      sort = "newest",
      page = 1,
      limit = 20,
    } = req.query;

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

    /* ================= SORT MAPPING ================= */
    let sortQuery = { createdAt: -1 }; // default

    switch (sort) {
      case "price-high":
        sortQuery = { price: -1 };
        break;

      case "price-low":
        sortQuery = { price: 1 };
        break;

      case "popular":
        sortQuery = { likes: -1 };
        break;

      case "newest":
      default:
        sortQuery = { createdAt: -1 };
    }

    /* ================= QUERY ================= */
    const skip = (Number(page) - 1) * Number(limit);

    const [items, total] = await Promise.all([
      WardrobeItem.find(filter)
        .populate("wardrobe", "name")
        .sort(sortQuery)
        .skip(skip)
        .limit(Number(limit))
        .select("images imageUrl category brand price wardrobe createdAt")
        .lean(),

      WardrobeItem.countDocuments(filter),
    ]);

    /* ================= IMAGE NORMALIZATION ================= */
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
        imageUrl: undefined,
      };
    });

    res.json({
      items: normalized,
      total,
    });

  } catch (error) {
    console.error("EXPLORE CONTROLLER ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};
