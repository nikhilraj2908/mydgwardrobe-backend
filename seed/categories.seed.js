require("dotenv").config();
const mongoose = require("mongoose");
const Category = require("../src/models/category.model");

const ALL_CATEGORIES = {
  mens: [
    "T-Shirts","Shirts","Jeans","Trousers","Shorts","Jackets","Blazers",
    "Sweaters","Hoodies","Suits","Formal Wear","Casual Wear","Sportswear",
    "Underwear","Socks","Pajamas","Swimwear","Coats","Raincoats","Vests",
    "Polo Shirts","Tank Tops","Cardigans","Joggers","Cargos","Chinos",
    "Denim Jackets","Leather Jackets","Track Pants","Thermals","Kurtas",
    "Sherwanis","Dhotis","Traditional Wear","Accessories"
  ],
  womens: [
    "Tops","Blouses","T-Shirts","Shirts","Jeans","Trousers","Leggings",
    "Skirts","Dresses","Gowns","Jackets","Blazers","Sweaters","Cardigans",
    "Hoodies","Suits","Formal Wear","Casual Wear","Sportswear","Lingerie",
    "Bras","Panties","Socks","Stockings","Pajamas","Nightwear","Swimwear",
    "Bikinis","Coats","Raincoats","Vests","Tank Tops","Jumpsuits","Rompers",
    "Palazzos","Capris","Shorts","Sarees","Lehengas","Salwar Suits",
    "Kurtis","Anarkalis","Blouse","Traditional Wear","Accessories"
  ],
};

async function seedCategories() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    for (const type of Object.keys(ALL_CATEGORIES)) {
      for (const name of ALL_CATEGORIES[type]) {
        await Category.updateOne(
          { name, type },
          {
            $setOnInsert: {
              name,
              type,
              isActive: true,
            },
          },
          { upsert: true }
        );
      }
    }

    console.log("✅ Categories seeded safely");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seed failed:", err.message);
    process.exit(1);
  }
}

seedCategories();
