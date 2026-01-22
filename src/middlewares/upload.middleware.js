const multer = require("multer");
const multerS3 = require("multer-s3");
const path = require("path");
const { s3 } = require("../utils/s3"); // ✅ Destructure here

console.log("🔧 Upload middleware loaded");
console.log("S3 instance type:", typeof s3);
console.log("S3 has upload method?", typeof s3.upload === 'function');

const upload = multer({
  storage: multerS3({
    s3: s3, // ✅ Now you're passing the actual AWS.S3 instance
    bucket: process.env.AWS_BUCKET_NAME,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (req, file, cb) => {
      console.log("📁 File upload request:", {
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        url: req.originalUrl
      });
      
      let folder = "others";
      if (req.originalUrl.startsWith("/api/wardrobe")) {
        folder = "wardrobe";
      } else if (req.originalUrl.startsWith("/api/user")) {
        folder = "profile";
      } else if (req.originalUrl.startsWith("/api/story")) {
        folder = "story";
      } else if (req.originalUrl.startsWith("/api/category")) {
        folder = "categories";
      }

      const ext = path.extname(file.originalname);
      const filename = `${folder}/${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
      
      console.log("✅ Generated S3 key:", filename);
      cb(null, filename);
    }
  }),
  limits: { fileSize: 50 * 1024 * 1024 },
});

module.exports = upload;