let deleteFromS3 = async () => {
  // default no-op
};

try {
  if (
    process.env.AWS_ACCESS_KEY &&
    process.env.AWS_SECRET_KEY &&
    process.env.AWS_BUCKET_NAME &&
    process.env.AWS_REGION
  ) {
    const { S3Client, DeleteObjectCommand } = require("@aws-sdk/client-s3");

    const s3 = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY,
        secretAccessKey: process.env.AWS_SECRET_KEY,
      },
    });

    deleteFromS3 = async (fileUrl) => {
      if (!fileUrl) return;

      const key = fileUrl.split(".amazonaws.com/")[1];
      if (!key) return;

      await s3.send(
        new DeleteObjectCommand({
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: key,
        })
      );
    };
  } else {
    console.warn("⚠️ AWS credentials not found — S3 delete skipped");
  }
} catch (err) {
  console.warn("⚠️ AWS SDK not available — S3 delete skipped");
}

module.exports = { deleteFromS3 };
