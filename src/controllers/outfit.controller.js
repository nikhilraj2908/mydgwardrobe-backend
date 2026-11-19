const Outfit = require("../models/outfit.model");

/* ======================================================
   CREATE / SAVE MATCHED PAIR
====================================================== */
exports.createOutfit = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, items, description } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "At least one item is required in the pair" });
    }

    const formattedItems = items.map((it, idx) => ({
      item: it.item || it.itemId || it._id,
      x: typeof it.x === "number" ? it.x : 0,
      y: typeof it.y === "number" ? it.y : 0,
      scale: typeof it.scale === "number" ? it.scale : 1,
      width: typeof it.width === "number" ? it.width : 180,
      height: typeof it.height === "number" ? it.height : 180,
      zIndex: typeof it.zIndex === "number" ? it.zIndex : idx + 1,
    }));

    const outfit = new Outfit({
      user: userId,
      name: name && name.trim() ? name.trim() : "My Matched Pair",
      items: formattedItems,
      description: description ? description.trim() : "",
    });

    await outfit.save();

    const populated = await Outfit.findById(outfit._id).populate({
      path: "items.item",
      select: "images imageUrl brand price category categoryType wardrobe",
      populate: { path: "category", select: "name type" },
    });

    res.status(201).json({
      message: "Matched pair saved successfully",
      outfit: populated,
    });
  } catch (err) {
    console.error("CREATE OUTFIT ERROR:", err);
    res.status(500).json({ message: err.message || "Failed to save matched pair" });
  }
};

/* ======================================================
   GET MY MATCHED PAIRS (OUTFITS)
====================================================== */
exports.getMyOutfits = async (req, res) => {
  try {
    const userId = req.user.id;

    const outfits = await Outfit.find({ user: userId })
      .sort({ createdAt: -1 })
      .populate({
        path: "items.item",
        select: "images imageUrl brand price category categoryType wardrobe",
        populate: { path: "category", select: "name type" },
      })
      .lean();

    res.json({ outfits });
  } catch (err) {
    console.error("GET OUTFITS ERROR:", err);
    res.status(500).json({ message: "Failed to fetch matched pairs" });
  }
};

/* ======================================================
   DELETE MATCHED PAIR
====================================================== */
exports.deleteOutfit = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const outfit = await Outfit.findOneAndDelete({ _id: id, user: userId });
    if (!outfit) {
      return res.status(404).json({ message: "Outfit not found or unauthorized" });
    }

    res.json({ message: "Matched pair deleted successfully", id });
  } catch (err) {
    console.error("DELETE OUTFIT ERROR:", err);
    res.status(500).json({ message: "Failed to delete matched pair" });
  }
};

/* ======================================================
   TOGGLE FAVORITE
====================================================== */
exports.toggleFavoriteOutfit = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const outfit = await Outfit.findOne({ _id: id, user: userId });
    if (!outfit) {
      return res.status(404).json({ message: "Outfit not found" });
    }

    outfit.isFavorite = !outfit.isFavorite;
    await outfit.save();

    res.json({ message: "Favorite toggled", isFavorite: outfit.isFavorite });
  } catch (err) {
    console.error("TOGGLE FAVORITE ERROR:", err);
    res.status(500).json({ message: "Failed to update favorite" });
  }
};

