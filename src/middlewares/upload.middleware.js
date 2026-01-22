const multer = require("multer");
const multerS3 = require("multer-s3");
const path = require("path");
const s3 = require("../utils/s3");

const upload = multer({
  storage: multerS3({
    s3,
    bucket: process.env.AWS_BUCKET_NAME,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: (req, file, cb) => {
      cb(null, { fieldName: file.fieldname });
    },
    key: (req, file, cb) => {
      let folder = "others";

      // 🔹 Decide folder based on API
      if (req.originalUrl.startsWith("/api/story")) {
        folder = "story";
      } else if (req.originalUrl.startsWith("/api/wardrobe")) {
        folder = "wardrobe";
      } else if (req.originalUrl.startsWith("/api/user")) {
        folder = "profile";
      } else if (req.originalUrl.startsWith("/api/category")) {
        folder = "categories";
      }

      const ext = path.extname(file.originalname);
      const filename = `${folder}/${Date.now()}-${Math.round(
        Math.random() * 1e9
      )}${ext}`;

      cb(null, filename);
    },
  }),

  fileFilter: (req, file, cb) => {
    if (
      file.mimetype.startsWith("image/") ||
      file.mimetype.startsWith("video/")
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only image or video files are allowed"), false);
    }
  },

  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

module.exports = upload;
