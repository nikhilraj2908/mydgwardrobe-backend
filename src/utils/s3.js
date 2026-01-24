const AWS = require("aws-sdk");

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const s3 = new AWS.S3();

/* ===============================
   DELETE FROM S3
================================ */
const deleteFromS3 = async (filePath) => {
  if (!filePath) return;

  // If full URL → extract key
  let key = filePath;

  if (filePath.startsWith("http")) {
    const parts = filePath.split(".amazonaws.com/");
    if (parts.length > 1) {
      key = parts[1];
    }
  }

  await s3.deleteObject({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: key,
  }).promise();
};


module.exports = {
  s3,           // ✅ keeps multer-s3 working
  deleteFromS3, // ✅ fixes story delete
};
