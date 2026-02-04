require("dotenv").config();
const mongoose = require("mongoose");
const Category = require("../src/models/category.model");

// ✅ your admin user id
const ADMIN_ID = "69415872a7f26228fe1d1e6f";

async function migrateCategories() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    // Update ONLY old categories (no scope yet)
    const result = await Category.updateMany(
      { scope: { $exists: false } },
      {
        $set: {
          scope: "explore",
          createdBy: ADMIN_ID,
        },
      }
    );

    console.log(`✅ Migrated ${result.modifiedCount} categories`);

    process.exit(0);
  } catch (err) {
    console.error("❌ Migration failed:", err);
    process.exit(1);
  }
}

migrateCategories();
