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
    if (!req.file) {
      return res.status(400).json({ message: "Image file is required" });
    }

    const { category, wardrobe, brand, visibility } = req.body;
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
      wardrobe: wardrobeDoc._id, // ✅ ObjectId
      imageUrl: req.file.path,
      category,
      price,
      brand,
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
    const userId = req.user.id;

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
    const userId = req.user.id;
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
    const userId = req.user.id;

    // 1️⃣ Fetch wardrobes
    const wardrobes = await Wardrobe.find({ user: userId })
      .sort({ createdAt: -1 })
      .lean();

    // 2️⃣ Fetch all items once
    const items = await WardrobeItem.find({ user: userId }).lean();

    // 3️⃣ Attach itemCount & totalWorth
    const enrichedWardrobes = wardrobes.map((wardrobe) => {
      const wardrobeItems = items.filter(
        (item) =>
          item.wardrobe &&
          item.wardrobe.toLowerCase() === wardrobe.name.toLowerCase()
      );

      const totalWorth = wardrobeItems.reduce(
        (sum, item) => sum + (Number(item.price) || 0),
        0
      );

      return {
        ...wardrobe,
        itemCount: wardrobeItems.length,
        totalWorth, // 🔥 THIS IS WHAT YOU NEED
      };
    });

    res.json({ wardrobes: enrichedWardrobes });
  } catch (err) {
    console.error("GET WARDROBES ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};


const getWardrobePublicItems = async (req, res) => {
  const { wardrobeId } = req.params;

  const wardrobe = await Wardrobe.findById(wardrobeId).select("name");

if (!wardrobe) {
  return res.status(404).json({ message: "Wardrobe not found" });
}

const items = await WardrobeItem.find({
  wardrobe: wardrobe.name, // ✅ STRING MATCH
  visibility: "public"
});


  res.json({ wardrobe, items });
};
/* ======================================================
   DELETE WARDROBE ITEM
====================================================== */
const deleteWardrobeItem = async (req, res) => {
  try {
    const userId = req.user.id;
    const { itemId } = req.params;

    // 1️⃣ Find item
    const item = await WardrobeItem.findById(itemId);

    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    // 2️⃣ Ownership check
    if (item.user.toString() !== userId) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // 3️⃣ Find wardrobe (by name + user)
    const wardrobe = await Wardrobe.findOne({
      user: userId,
      name: item.wardrobe,
    });

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


const getSingleWardrobeItem= async(req,res)=>{
  try{
    const { id }=req.params;
    const item= await WardrobeItem.findById(id)
    .populate("user","username photo")
    .lean();
    if(!item){
      return res.status(404).json({message:"Item not found"});
    }
    res.json(item);
  }
  catch(err){
    consol.error("Get single item error:",err);
    res.status(500).json({message:"server error"});
  }
}

module.exports = {
  addWardrobeItem,
  getMyWardrobeItems,
   createWardrobe,
  getMyWardrobes,
  getWardrobePublicItems,
  deleteWardrobeItem,
  getSingleWardrobeItem,
};
