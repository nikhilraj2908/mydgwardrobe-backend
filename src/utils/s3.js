const { S3Client, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { Upload } = require("@aws-sdk/lib-storage");
const path = require("path");
const fs = require("fs");

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
  },
});

/* ============================
   UPLOAD FILE TO S3
============================ */
const uploadToS3 = async (file, folder) => {
  const fileStream = fs.createReadStream(file.path);

  const upload = new Upload({
    client: s3,
    params: {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: `${folder}/${Date.now()}-${file.originalname}`,
      Body: fileStream,
      ContentType: file.mimetype,
    },
  });

  const result = await upload.done();

  // 🔥 IMPORTANT: remove temp file from server
  fs.unlinkSync(file.path);

  return result.Location; // full S3 URL
};

/* ============================
   DELETE FILE FROM S3
============================ */
const deleteFromS3 = async (fileUrl) => {
  if (!fileUrl) return;

  const key = fileUrl.replace(
    `${process.env.AWS_S3_BASE_URL}/`,
    ""
  );

  await s3.send(
    new DeleteObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
    })
  );
};

module.exports = {
  uploadToS3,
  deleteFromS3,
};
