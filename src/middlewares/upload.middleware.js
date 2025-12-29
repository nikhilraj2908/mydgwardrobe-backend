const multer = require("multer");
const path = require("path");
const fs = require("fs");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = "uploads/others";

    // 🔹 Profile DP upload
    if (req.originalUrl.includes("/user")) {
      uploadPath = "uploads/profile";
    }

    // 🔹 Wardrobe item upload
    if (req.originalUrl.includes("/wardrobe")) {
      uploadPath = "uploads/wardrobe";
    }
  if (req.originalUrl.includes("/story")) {
    uploadPath = "uploads/story";
  }
    // Ensure folder exists
    fs.mkdirSync(uploadPath, { recursive: true });

    cb(null, uploadPath);
  },

  filename: (req, file, cb) => {
    const unique =
      Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = /jpg|jpeg|png|webp/;
  const ext = allowed.test(
    path.extname(file.originalname).toLowerCase()
  );
  const mime = allowed.test(file.mimetype);

  if (ext && mime) cb(null, true);
  else cb(new Error("Only images allowed"));
};

module.exports = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter,
});
