const Category=require("../models/category.model")

exports.getAllCategories=async (req,res)=>{
try{
    const categories=await Category.find({isActive:"true"})
    .sort({name:1})
    .lean();
    res.json(categories);
}
catch(error){
    console.log("server side error:",error);
    res.status(500).json({message:"Failed to fetch categories"});
}
}

exports.createCategory = async (req, res) => {
  try {
    const { name, type, icon } = req.body;

    if (!name || !type) {
      return res.status(400).json({
        message: "Category name and type are required",
      });
    }

    // Prevent duplicates
    const existing = await Category.findOne({
      name: name.trim(),
      type,
    });

    if (existing) {
      return res.status(409).json({
        message: "Category already exists",
      });
    }

    const category = await Category.create({
      name: name.trim(),
      type,
      icon,
    });

    res.status(201).json({
      message: "Category created successfully",
      category,
    });
  } catch (err) {
    console.error("Create category error:", err);
    res.status(500).json({ message: "Failed to create category" });
  }
};

/* =========================
   DELETE CATEGORY (SOFT DELETE)
========================= */
exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    // Soft delete (recommended)
    category.isActive = false;
    await category.save();

    res.json({ message: "Category deleted successfully" });
  } catch (err) {
    console.error("Delete category error:", err);
    res.status(500).json({ message: "Failed to delete category" });
  }
};