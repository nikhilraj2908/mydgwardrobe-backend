const Category = require("../models/category.model");
const { uploadToS3, deleteFromS3 } = require("../utils/s3");

/* ============================
   GET ACTIVE CATEGORIES
============================ */
exports.getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true, scope: "explore" })
      .sort({ name: 1 })
      .lean();

    res.json(categories);
  } catch (err) {
    console.error("GET CATEGORIES ERROR:", err);
    res.status(500).json({ message: "Failed to fetch categories" });
  }
};

/* ============================
   CREATE CATEGORY (ADMIN / USER)
============================ */
exports.createCategory = async (req, res) => {
  try {
    const { name, type } = req.body;

    if (!name || !type) {
      return res.status(400).json({
        message: "Category name and type are required",
      });
    }

    const trimmedName = name.trim();
    const escapedName = trimmedName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    // Check if category already exists in user's categories or explore categories (case-insensitive)
    const exists = await Category.findOne({
      name: { $regex: new RegExp(`^${escapedName}$`, "i") },
      isActive: true,
      $or: [{ createdBy: req.user._id }, { scope: "explore" }],
    });

    if (exists) {
      return res.status(200).json({
        message: "Category already exists",
        category: exists,
        alreadyExists: true,
      });
    }

    const category = await Category.create({
      name: trimmedName,
      type,
      createdBy: req.user._id,
      scope: "user", // 🔒 never explore
    });

    res.status(201).json({
      message: "Category created successfully",
      category,
    });
  } catch (err) {
    if (err.code === 11000) {
      try {
        const trimmedName = (req.body.name || "").trim();
        const escapedName = trimmedName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const existing = await Category.findOne({
          name: { $regex: new RegExp(`^${escapedName}$`, "i") },
          isActive: true,
        });
        if (existing) {
          return res.status(200).json({
            message: "Category already exists",
            category: existing,
            alreadyExists: true,
          });
        }
      } catch (_) {}
    }
    console.error("CREATE CATEGORY ERROR:", err);
    res.status(500).json({ message: "Failed to create category" });
  }
};

/* ============================
   UPLOAD ICON / COVER IMAGE
============================ */
exports.uploadCategoryImages = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    if (req.files?.icon?.[0]) {
      if (category.icon) await deleteFromS3(category.icon);

      category.icon = await uploadToS3(
        req.files.icon[0],
        `categories/icons/${category.type}`
      );
    }

    if (req.files?.coverImage?.[0]) {
      if (category.coverImage) await deleteFromS3(category.coverImage);

      category.coverImage = await uploadToS3(
        req.files.coverImage[0],
        `categories/covers/${category.type}`
      );
    }

    await category.save();

    res.json({
      message: "Category images updated successfully",
      category,
    });
  } catch (err) {
    console.error("UPLOAD CATEGORY IMAGE ERROR:", err);
    res.status(500).json({ message: "Failed to upload images" });
  }
};

/* =========================
   DELETE CATEGORY (SOFT)
========================= */
exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }
    if (!category.createdBy.equals(req.user._id)) {
      return res.status(403).json({ message: "Not allowed to delete this category" });
    }
    category.isActive = false;
    await category.save();

    res.json({ message: "Category deleted successfully" });
  } catch (err) {
    console.error("DELETE CATEGORY ERROR:", err);
    res.status(500).json({ message: "Failed to delete category" });
  }
};
exports.getUserCategories = async (req, res) => {
  try {
    const categories = await Category.find({
      isActive: true,
      scope: "user",
      createdBy: req.user._id,
    })
      .sort({ createdAt: -1 })
      .lean();

    res.json(categories);
  } catch (err) {
    console.error("GET USER CATEGORIES ERROR:", err);
    res.status(500).json({ message: "Failed to fetch user categories" });
  }
};