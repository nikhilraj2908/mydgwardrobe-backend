const WardrobeItem = require("../models/wardrobeItem.model");

/* ======================================================
   ADD ITEM TO WARDROBE
====================================================== */
const addWardrobeItem = async (req, res) => {
  try {
    const userId = req.user.id;

    const {
      category,
      wardrobe,
      price,
      brand,
      visibility,
    } = req.body;
console.log("REQ BODY:", req.body);
console.log("REQ FILE:", req.file);

    if (!req.file) {
      return res.status(400).json({ message: "Image required" });
    }

    if (!category || !wardrobe) {
      return res
        .status(400)
        .json({ message: "Category and wardrobe required" });
    }

    const item = await WardrobeItem.create({
      user: userId,
      imageUrl: `/uploads/wardrobe/${req.file.filename}`,
      category,
      wardrobe,
      price,
      brand,
      visibility,
    });

    res.status(201).json({
      message: "Item added to wardrobe",
      item,
    });
  } catch (err) {
    console.error("ADD WARDROBE ERROR:", err);
    res.status(500).json({ message: "Server error" });
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

module.exports = {
  addWardrobeItem,
  getMyWardrobeItems,
};
