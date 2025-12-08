const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const { connectDB } = require("./src/config/db");
const authRoutes = require("./src/routes/auth.routes");

dotenv.config();
const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // REQUIRED

// Connect DB
connectDB();
// Routes
app.use("/api/auth", authRoutes);

// Start server
app.listen(process.env.PORT || 5000, () => {
  console.log(`🚀 Server running on port ${process.env.PORT}`);
});
