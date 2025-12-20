require("dotenv").config(); 
const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const { connectDB } = require("./src/config/db");
const authRoutes = require("./src/routes/auth.routes");
const userRoutes = require("./src/routes/user.routes");
const wardrobeRoutes = require("./src/routes/wardrobe.routes");
const feedroute=require("./src/routes/feed.routes")
// dotenv.config();
const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // REQUIRED

// Connect DB
connectDB();
// Routes
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/wardrobe", wardrobeRoutes);
app.use("/uploads", express.static("uploads"));
app.use("/api/feed", feedroute);

// Start server
app.listen(process.env.PORT || 5000, () => {
  console.log(`🚀 Server running on port ${process.env.PORT}`);
});
