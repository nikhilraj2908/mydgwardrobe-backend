const WardrobeItem = require("../models/wardrobeItem.model");
const Wardrobe = require("../models/wardrobe.model");
/* ======================================================
   ADD ITEM TO WARDROBE
====================================================== */
// const addWardrobeItem = async (req, res) => {
//   try {
//     const userId = req.user.id;

//     const {
//       category,
//       wardrobe,
//       price,
//       brand,
//       visibility,
//     } = req.body;
// console.log("REQ BODY:", req.body);
// console.log("REQ FILE:", req.file);

//     if (!req.file) {
//       return res.status(400).json({ message: "Image required" });
//     }

//     if (!category || !wardrobe) {
//       return res
//         .status(400)
//         .json({ message: "Category and wardrobe required" });
//     }

//     const item = await WardrobeItem.create({
//       user: userId,
//       imageUrl: `/uploads/wardrobe/${req.file.filename}`,
//       category,
//       wardrobe,
//       price,
//       brand,
//       visibility,
//     });

//     res.status(201).json({
//       message: "Item added to wardrobe",
//       item,
//     });
//   } catch (err) {
//     console.error("ADD WARDROBE ERROR:", err);
//     res.status(500).json({ message: "Server error" });
//   }
// };


/* ======================================================
   ADD ITEM TO WARDROBE (AUTO-CREATE WARDROBE IF NEEDED)
====================================================== */
const addWardrobeItem = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "At least one image is required" });
    }
    const imagePaths = req.files.map(file =>
      file.path.replace(/\\/g, "/") // ✅ FIX WINDOWS PATH
    );

    const { category, wardrobe, brand, visibility, description } = req.body;
    const price = Number(req.body.price || 0);

    if (!category || !wardrobe) {
      return res.status(400).json({
        message: "Category and wardrobe are required",
      });
    }

    /* ===============================
       1️⃣ FIND OR CREATE WARDROBE
       =============================== */

    let wardrobeDoc = await Wardrobe.findOne({
      name: wardrobe.trim(),
      user: req.user._id,
    });

    if (!wardrobeDoc) {
      wardrobeDoc = await Wardrobe.create({
        name: wardrobe.trim(),
        user: req.user._id,
        color: "#A855F7",   // ✅ REQUIRED FIELD
        itemCount: 0,
        isDefault: false,
      });
    }

    /* ===============================
       2️⃣ CREATE WARDROBE ITEM
       =============================== */
    const item = await WardrobeItem.create({
      user: req.user._id,
      wardrobe: wardrobeDoc._id,
      images: imagePaths,
      category,
      price,
      brand,
      description: description || "",
      visibility: visibility || "private",
    });

    /* ===============================
       3️⃣ UPDATE ITEM COUNT
       =============================== */

    await Wardrobe.findByIdAndUpdate(
      wardrobeDoc._id,
      { $inc: { itemCount: 1 } }
    );

    res.status(201).json({
      message: "Item added to wardrobe successfully",
      wardrobe: wardrobeDoc,
      item,
    });

  } catch (error) {
    console.error("ADD WARDROBE ITEM ERROR:", error);

    // Duplicate wardrobe edge-case safety
    if (error.code === 11000) {
      return res.status(409).json({
        message: "Wardrobe with this name already exists",
      });
    }

    res.status(500).json({
      message: "Internal server error while adding wardrobe item",
      error: error.message,
    });
  }
};


/* ======================================================
   GET USER WARDROBE ITEMS
====================================================== */
const getMyWardrobeItems = async (req, res) => {
  try {
    const userId = req.user._id;

    const items = await WardrobeItem.find({ user: userId })
      .sort({ createdAt: -1 });

    res.json(items);
  } catch (err) {
    console.error("GET WARDROBE ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* =========================================================
   CREATE NEW WARDROBE
========================================================= */
const createWardrobe = async (req, res) => {
  try {
    const userId = req.user._id
    const { name, color } = req.body;

    if (!name || !color) {
      return res.status(400).json({
        message: "Wardrobe name and color are required",
      });
    }

    const wardrobe = await Wardrobe.create({
      user: userId,
      name: name.trim(),
      color,
    });

    res.status(201).json({
      message: "Wardrobe created successfully",
      wardrobe,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({
        message: "Wardrobe with this name already exists",
      });
    }

    console.error("CREATE WARDROBE ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* =========================================================
   GET USER WARDROBES
========================================================= */
// const getMyWardrobes = async (req, res) => {
//   try {
//     const userId = req.user.id;

//     const wardrobes = await Wardrobe.find({ user: userId })
//       .sort({ createdAt: -1 });

//     res.json({ wardrobes });
//   } catch (err) {
//     console.error("GET WARDROBES ERROR:", err);
//     res.status(500).json({ message: "Server error" });
//   }
// };
const getMyWardrobes = async (req, res) => {
  try {
    const userId = req.user._id;

    const wardrobes = await Wardrobe.find({ user: userId })
      .sort({ createdAt: -1 })
      .lean();

    const items = await WardrobeItem.find({ user: userId })
      .select("wardrobe price")
      .lean();

    const enrichedWardrobes = wardrobes.map((wardrobe) => {
      const wardrobeItems = items.filter(
        (item) =>
          item.wardrobe &&
          item.wardrobe.toString() === wardrobe._id.toString()
      );

      const totalWorth = wardrobeItems.reduce(
        (sum, item) => sum + (Number(item.price) || 0),
        0
      );

      return {
        ...wardrobe,
        itemCount: wardrobeItems.length,
        totalWorth,
      };
    });

    res.json({ wardrobes: enrichedWardrobes });
  } catch (err) {
    console.error("GET WARDROBES ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};



const getWardrobePublicItems = async (req, res) => {
  try {
    const { wardrobeId } = req.params;

    const wardrobe = await Wardrobe.findById(wardrobeId).lean();
    if (!wardrobe) {
      return res.status(404).json({ message: "Wardrobe not found" });
    }

    const items = await WardrobeItem.find({
      wardrobe: wardrobe._id,
      visibility: "public",
    }).lean();

    res.json({ wardrobe, items });
  } catch (err) {
    console.error("GET PUBLIC WARDROBE ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ======================================================
   DELETE WARDROBE ITEM
====================================================== */
const deleteWardrobeItem = async (req, res) => {
  try {
    const userId = req.user._id;
    const { itemId } = req.params;

    // 1️⃣ Find item
    const item = await WardrobeItem.findById(itemId);

    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    // 2️⃣ Ownership check
    if (item.user.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // 3️⃣ Find wardrobe (by name + user)
    const wardrobe = await Wardrobe.findById(item.wardrobe);

    // 4️⃣ Delete item
    await item.deleteOne();

    // 5️⃣ Decrease wardrobe itemCount
    if (wardrobe) {
      await Wardrobe.findByIdAndUpdate(wardrobe._id, {
        $inc: { itemCount: -1 },
      });
    }

    res.json({ message: "Item deleted successfully" });
  } catch (err) {
    console.error("DELETE WARDROBE ITEM ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};


const getSingleWardrobeItem = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await WardrobeItem.findById(id)
      .populate("user", "username photo")
      .populate("wardrobe", "name")
      .lean();
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }
    res.json(item);
  }
  catch (err) {
    console.error("Get single item error:", err);
    res.status(500).json({ message: "server error" });
  }
}

const getWardrobeItemsByWardrobe = async (req, res) => {
  try {
    const { wardrobeId } = req.params;
    const userId = req.user?._id; // optional auth

    // 1️⃣ Find wardrobe
    const wardrobe = await Wardrobe.findById(wardrobeId);
    if (!wardrobe) {
      return res.status(404).json({ message: "Wardrobe not found" });
    }

    // 2️⃣ Check ownership
    const isOwner =
      userId && wardrobe.user.toString() === userId.toString();

    // 3️⃣ Build filter
    const filter = {
      wardrobe: wardrobeId,
      ...(isOwner ? {} : { visibility: "public" }),
    };

    // 4️⃣ Fetch items
    const items = await WardrobeItem.find(filter)
      .sort({ createdAt: -1 });

    res.json(items);
  } catch (err) {
    console.error("WARDROBE ITEMS ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const getPublicUserItems = async (req, res) => {
  try {
    const { userId } = req.params;
    const viewerId = req.user?._id;

    const isOwner =
      viewerId && viewerId.toString() === userId.toString();

    const filter = {
      user: userId,
      ...(isOwner ? {} : { visibility: "public" }),
    };

    const items = await WardrobeItem.find(filter)
      .populate("wardrobe", "name color")
      .sort({ createdAt: -1 });

    res.json({ items });
  } catch (err) {
    console.error("GET PUBLIC USER ITEMS ERROR:", err);
    res.status(500).json({ message: err.message });
  }
};
/* ======================================================
   DELETE SINGLE WARDROBE (WITH ITEMS)
====================================================== */
const deleteWardrobe = async (req, res) => {
  try {
    const userId = req.user._id;
    const { wardrobeId } = req.params;

    // 1️⃣ Find wardrobe
    const wardrobe = await Wardrobe.findById(wardrobeId);

    if (!wardrobe) {
      return res.status(404).json({ message: "Wardrobe not found" });
    }

    // 2️⃣ Ownership check
    if (wardrobe.user.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Not authorized to delete this wardrobe" });
    }

    // 3️⃣ Delete all items inside wardrobe
    await WardrobeItem.deleteMany({ wardrobe: wardrobeId });

    // 4️⃣ Delete wardrobe itself
    await wardrobe.deleteOne();

    res.json({
      message: "Wardrobe and all associated items deleted successfully",
    });
  } catch (err) {
    console.error("DELETE WARDROBE ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};


/* ======================================================
   DELETE MULTIPLE WARDROBES (BULK)
====================================================== */
const deleteMultipleWardrobes = async (req, res) => {
  try {
    const userId = req.user._id;
    const { wardrobeIds } = req.body;

    if (!Array.isArray(wardrobeIds) || wardrobeIds.length === 0) {
      return res.status(400).json({
        message: "wardrobeIds must be a non-empty array",
      });
    }

    // 1️⃣ Find wardrobes owned by user
    const wardrobes = await Wardrobe.find({
      _id: { $in: wardrobeIds },
      user: userId,
    });

    if (wardrobes.length === 0) {
      return res.status(404).json({
        message: "No wardrobes found to delete",
      });
    }

    const validWardrobeIds = wardrobes.map(w => w._id);

    // 2️⃣ Delete all items inside these wardrobes
    await WardrobeItem.deleteMany({
      wardrobe: { $in: validWardrobeIds },
    });

    // 3️⃣ Delete wardrobes
    await Wardrobe.deleteMany({
      _id: { $in: validWardrobeIds },
      user: userId,
    });

    res.json({
      message: "Selected wardrobes and their items deleted successfully",
      deletedCount: validWardrobeIds.length,
    });
  } catch (err) {
    console.error("BULK DELETE WARDROBES ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};


const updateWardrobe = async (req, res) => {
  try {
    const userId = req.user._id;
    const { wardrobeId } = req.params;
    const { name, color } = req.body;

    if (!name && !color) {
      return res.status(400).json({
        message: "Nothing to update",
      });
    }

    // 1️⃣ Find wardrobe
    const wardrobe = await Wardrobe.findById(wardrobeId);

    if (!wardrobe) {
      return res.status(404).json({ message: "Wardrobe not found" });
    }

    // 2️⃣ Ownership check
    if (wardrobe.user.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // 3️⃣ Prevent duplicate wardrobe names (same user)
    if (name) {
      const exists = await Wardrobe.findOne({
        user: userId,
        name: name.trim(),
        _id: { $ne: wardrobeId },
      });

      if (exists) {
        return res.status(409).json({
          message: "Wardrobe with this name already exists",
        });
      }

      wardrobe.name = name.trim();
    }

    // 4️⃣ Optional color update
    if (color) {
      wardrobe.color = color;
    }

    await wardrobe.save();

    res.json({
      message: "Wardrobe updated successfully",
      wardrobe,
    });
  } catch (err) {
    console.error("UPDATE WARDROBE ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};
/* ======================================================
   DELETE MULTIPLE WARDROBE ITEMS (BULK)
====================================================== */
const deleteMultipleWardrobeItems = async (req, res) => {
  try {
    const userId = req.user._id;
    const { itemIds } = req.body;

    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return res.status(400).json({
        message: "itemIds must be a non-empty array",
      });
    }

    // 1️⃣ Fetch items owned by user
    const items = await WardrobeItem.find({
      _id: { $in: itemIds },
      user: userId,
    }).select("wardrobe");

    if (items.length === 0) {
      return res.status(404).json({
        message: "No items found to delete",
      });
    }

    // 2️⃣ Count deletions per wardrobe
    const wardrobeCountMap = {};

    items.forEach(item => {
      const wid = item.wardrobe.toString();
      wardrobeCountMap[wid] = (wardrobeCountMap[wid] || 0) + 1;
    });

    // 3️⃣ Delete items
    await WardrobeItem.deleteMany({
      _id: { $in: items.map(i => i._id) },
      user: userId,
    });

    // 4️⃣ Update itemCount per wardrobe
    const updatePromises = Object.entries(wardrobeCountMap).map(
      ([wardrobeId, count]) =>
        Wardrobe.findByIdAndUpdate(wardrobeId, {
          $inc: { itemCount: -count },
        })
    );

    await Promise.all(updatePromises);

    res.json({
      message: "Selected wardrobe items deleted successfully",
      deletedCount: items.length,
    });
  } catch (err) {
    console.error("BULK DELETE ITEMS ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  addWardrobeItem,
  getMyWardrobeItems,
  createWardrobe,
  getMyWardrobes,
  getWardrobePublicItems,
  deleteWardrobeItem,
  getSingleWardrobeItem,
  getWardrobeItemsByWardrobe,
  getPublicUserItems,
   deleteWardrobe,
  deleteMultipleWardrobes,
  updateWardrobe,
  deleteMultipleWardrobeItems
};
