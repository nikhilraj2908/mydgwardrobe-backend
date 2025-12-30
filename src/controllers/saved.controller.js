const SavedItem = require("../models/savedItem.model");

/* ======================================================
   SAVE / UNSAVE ITEM (TOGGLE)
====================================================== */
const toggleSaveItem = async (req, res) => {
  try {
    const userId = req.user.id;
    const { itemId } = req.params;

    const existing = await SavedItem.findOne({
      user: userId,
      item: itemId,
    });

    if (existing) {
      await existing.deleteOne();
      return res.json({ saved: false, message: "Item unsaved" });
    }

    await SavedItem.create({
      user: userId,
      item: itemId,
    });

    res.status(201).json({ saved: true, message: "Item saved" });
  } catch (err) {
    if (err.code === 11000) {
      return res.json({ saved: true });
    }

    console.error("SAVE ITEM ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ======================================================
   GET MY SAVED ITEMS
====================================================== */
const getMySavedItems = async (req, res) => {
  try {
    const userId = req.user.id;

    const savedItems = await SavedItem.find({ user: userId })
      .populate({
        path: "item",
        populate: { path: "user", select: "username photo" },
      })
      .sort({ createdAt: -1 });

    res.json(savedItems);
  } catch (err) {
    console.error("GET SAVED ITEMS ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  toggleSaveItem,
  getMySavedItems,
};
