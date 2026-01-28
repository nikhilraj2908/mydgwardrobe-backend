const WardrobeItem = require("../models/wardrobeItem.model");
const Wardrobe = require("../models/wardrobe.model");

const { deleteFromS3 } = require("../utils/s3");


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

    console.log("REQ BODY:", req.body)
    console.log("REQ FILES:", req.files)

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "At least one image is required" });
    }
    const imagePaths = req.files.map(file => file.key);


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
    const allowedVisibility = ["public", "private"];

    const finalVisibility = allowedVisibility.includes(visibility)
      ? visibility
      : "private";
    const allowedAccess = ["normal", "premium"];

    const finalAccessLevel = allowedAccess.includes(req.body.accessLevel)
      ? req.body.accessLevel
      : "normal";

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
      visibility: finalVisibility,
      accessLevel: finalAccessLevel,
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
    if (Array.isArray(item.images)) {
      await Promise.all(
        item.images.map(img => deleteFromS3(img))
      );
    }
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
      ...(isOwner
        ? {}
        : {
          visibility: "public",
          accessLevel: { $ne: "premium" },
        }),
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
      ...(isOwner
        ? {}
        : {
          visibility: "public",
          accessLevel: { $ne: "premium" }, // 🔒 hide premium
        }),
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

    const items = await WardrobeItem.find({ wardrobe: wardrobeId }).select("images");

    for (const item of items) {
      await Promise.all(
        item.images.map(img => deleteFromS3(img))
      );
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

    // 2️⃣ Fetch all items & images
    const items = await WardrobeItem.find({
      wardrobe: { $in: validWardrobeIds },
    }).select("images");

    // 3️⃣ Delete images from S3
    for (const item of items) {
      await Promise.all(
        (item.images || []).map(img => deleteFromS3(img))
      );
    }
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
    for (const item of items) {
      await Promise.all(
        (item.images || []).map(img => deleteFromS3(img))
      );
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



const updateWardrobeItem = async (req, res) => {
  try {
    const userId = req.user._id;
    const { itemId } = req.params;

    const {
      category,
      brand,
      description,
      visibility,
      price,
    } = req.body;

    const item = await WardrobeItem.findById(itemId);

    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    if (item.user.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    /* 🔁 IMAGE MERGE (CORRECT LOGIC) */
    let existingImages = [];

    if (req.body.existingImages) {
      try {
        existingImages = JSON.parse(req.body.existingImages);
      } catch (e) {
        return res.status(400).json({ message: "Invalid existingImages format" });
      }
    }

    // New uploaded images
    const newImages = req.files
      ? req.files.map(file => file.key) // ✅ STORE ONLY S3 KEY
      : [];


    // Delete images that user REMOVED
    if (Array.isArray(item.images)) {
      const removedImages = item.images.filter(
        img => !existingImages.includes(img)
      );

      await Promise.all(
        removedImages.map(async img => {
          try {
            await deleteFromS3(img);
          } catch (_) { }
        })
      );
    }

    // Final merged images
    item.images = [...existingImages, ...newImages]; // now ALL are keys



    /* 📝 FIELD UPDATES */
    if (category !== undefined) item.category = category;
    if (brand !== undefined) item.brand = brand;
    if (description !== undefined) item.description = description;
    if (visibility !== undefined) item.visibility = visibility;
    if (price !== undefined) item.price = Number(price);

    await item.save();

    res.json({
      message: "Item updated successfully",
      item,
    });
  } catch (err) {
    console.error("UPDATE ITEM ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const moveWardrobeItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { targetWardrobeId } = req.body;
    const userId = req.user.id;

    // 1. Find item
    const item = await WardrobeItem.findOne({
      _id: itemId,
      user: userId
    });

    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    // 2. Check target wardrobe
    const targetWardrobe = await Wardrobe.findOne({
      _id: targetWardrobeId,
      user: userId
    });

    const sourceWardrobeId = item.wardrobe.toString();

    if (!targetWardrobe) {
      return res.status(404).json({ message: "Target wardrobe not found" });
    }

    // Prevent moving into same wardrobe
    if (sourceWardrobeId === targetWardrobeId) {
      return res.status(400).json({
        message: "Item already belongs to this wardrobe",
      });
    }
    // 3. Move item2
    item.wardrobe = targetWardrobeId;
    await item.save();
    await Promise.all([
      Wardrobe.findByIdAndUpdate(sourceWardrobeId, { $inc: { itemCount: -1 } }),
      Wardrobe.findByIdAndUpdate(targetWardrobeId, { $inc: { itemCount: 1 } }),
    ]);
    res.json({
      message: "Item moved successfully",
      item
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};


const moveWardrobeItemsBulk = async (req, res) => {
  try {
    const { itemIds, targetWardrobeId } = req.body;
    const userId = req.user._id; // ✅ always use _id

    /* ===============================
       1️⃣ VALIDATE INPUT
    =============================== */
    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return res.status(400).json({
        message: "itemIds must be a non-empty array",
      });
    }

    if (!targetWardrobeId) {
      return res.status(400).json({
        message: "targetWardrobeId is required",
      });
    }

    /* ===============================
       2️⃣ VERIFY TARGET WARDROBE
    =============================== */
    const targetWardrobe = await Wardrobe.findOne({
      _id: targetWardrobeId,
      user: userId,
    });

    if (!targetWardrobe) {
      return res.status(404).json({
        message: "Target wardrobe not found",
      });
    }

    /* ===============================
       3️⃣ FETCH ITEMS (IMPORTANT)
    =============================== */
    const items = await WardrobeItem.find({
      _id: { $in: itemIds },
      user: userId,
    }).select("wardrobe");

    if (items.length !== itemIds.length) {
      return res.status(403).json({
        message: "One or more items are invalid or not owned by user",
      });
    }

    /* ===============================
       4️⃣ GROUP SOURCE WARDROBES
    =============================== */
    const sourceWardrobeCount = {};

    items.forEach((item) => {
      const wid = item.wardrobe.toString();
      sourceWardrobeCount[wid] =
        (sourceWardrobeCount[wid] || 0) + 1;
    });

    /* ===============================
       5️⃣ MOVE ITEMS (SKIP SAME)
    =============================== */
    const result = await WardrobeItem.updateMany(
      {
        _id: { $in: itemIds },
        user: userId,
        wardrobe: { $ne: targetWardrobeId }, // ✅ avoid no-op
      },
      {
        $set: { wardrobe: targetWardrobeId },
      }
    );

    /* ===============================
       6️⃣ UPDATE SOURCE COUNTS
    =============================== */
    const sourceUpdates = Object.entries(sourceWardrobeCount).map(
      ([wardrobeId, count]) => {
        if (wardrobeId === targetWardrobeId) return null;

        return Wardrobe.findByIdAndUpdate(wardrobeId, {
          $inc: { itemCount: -count },
        });
      }
    );

    await Promise.all(sourceUpdates.filter(Boolean));

    /* ===============================
       7️⃣ UPDATE TARGET COUNT
    =============================== */
    await Wardrobe.findByIdAndUpdate(targetWardrobeId, {
      $inc: { itemCount: result.modifiedCount },
    });

    /* ===============================
       8️⃣ RESPONSE
    =============================== */
    res.json({
      message: "Items moved successfully",
      movedCount: result.modifiedCount,
    });
  } catch (err) {
    console.error("MOVE ITEMS BULK ERROR:", err);
    res.status(500).json({
      message: "Server error",
    });
  }
};

const updateItemAccessLevel = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { accessLevel } = req.body;
    const userId = req.user._id;

    if (!["normal", "premium"].includes(accessLevel)) {
      return res.status(400).json({ message: "Invalid access level" });
    }

    const item = await WardrobeItem.findById(itemId);

    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    // 🔒 Only owner can change access
    if (String(item.user) !== String(userId)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    item.accessLevel = accessLevel;
    await item.save();

    res.json({
      message: `Item marked as ${accessLevel}`,
      itemId: item._id,
      accessLevel: item.accessLevel,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Something went wrong" });
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
  deleteMultipleWardrobeItems,
  updateWardrobeItem,
  moveWardrobeItem,
  moveWardrobeItemsBulk,
  updateItemAccessLevel
};
