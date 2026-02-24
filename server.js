require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { connectDB } = require("./src/config/db");

const authRoutes = require("./src/routes/auth.routes");
const userRoutes = require("./src/routes/user.routes");
const wardrobeRoutes = require("./src/routes/wardrobe.routes");
const feedRoutes = require("./src/routes/feed.routes");
const likeRoutes = require("./src/routes/like.routes");
const commentRoutes = require("./src/routes/comment.routes");
const collectionRoutes = require("./src/routes/collection.routes");
const storyRotes=require("./src/routes/story.routes")
// const viewRoutes = require(".src/routes/view.routes");
const savedRoutes = require("./src/routes/saved.routes");
const getCategory= require('./src/routes/category.routes');
const notificationRoutes = require("./src/routes/notification.routes");
const followRoutes = require("./src/routes/follow.routes");
const premiumRoutes = require("./src/routes/premium.routes");
const adminRoutes = require("./src/routes/admin.routes");
const superadmin = require("./src/routes/setup.routes")
const app = express();

/* ================= CORS ================= */
const corsOptions = {
  origin: "*",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));

/* ✅ SAFE OPTIONS HANDLING (NO CRASH) */
app.use((req, res, next) => {
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

/* ================= BODY PARSERS ================= */
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ extended: true, limit: "100mb" }));


/* ================= DB ================= */
connectDB();

/* ================= ROUTES ================= */
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/wardrobe", wardrobeRoutes);
app.use("/api/feed", feedRoutes);
app.use("/api/like", likeRoutes);
app.use("/api/comment", commentRoutes);
app.use("/uploads", express.static("uploads"));
app.use("/api/collections", collectionRoutes);
// app.use("/api/view", viewRoutes);
app.use("/api/story", storyRotes);
app.use("/api/saved", savedRoutes);
/* ================= START ================= */
app.use("/api/categories",getCategory);
app.use("/api/admin", adminRoutes);
app.use("/api", notificationRoutes);
app.use("/api/follow", followRoutes);
app.use("/api/premium", premiumRoutes);
// app.use("/api/setup", superadmin);  /// that route is removed as it is only for one time superadmin creating 
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
