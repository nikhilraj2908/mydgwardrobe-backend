const multer = require("multer");
const path = require("path");
const fs = require("fs");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = "uploads/others"; // default (safe)

    // ✅ Story uploads
    if (req.originalUrl.startsWith("/api/story")) {
      uploadPath = "uploads/story";
    }

    // ✅ Wardrobe uploads (if you want separation)
    else if (req.originalUrl.startsWith("/api/wardrobe")) {
      uploadPath = "uploads/wardrobe";
    }

    // ✅ Profile uploads
    else if (req.originalUrl.startsWith("/api/user")) {
      uploadPath = "uploads/profile";
    }

    // Ensure folder exists
    fs.mkdirSync(uploadPath, { recursive: true });

    cb(null, uploadPath);
  },

  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() +
      "-" +
      Math.round(Math.random() * 1e9) +
      path.extname(file.originalname);

    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  // Allow images & videos everywhere
  if (
    file.mimetype.startsWith("image/") ||
    file.mimetype.startsWith("video/")
  ) {
    cb(null, true);
  } else {
    cb(new Error("Only image or video files are allowed"), false);
  }
};

module.exports = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});
