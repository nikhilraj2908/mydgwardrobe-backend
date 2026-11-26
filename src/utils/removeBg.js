const axios = require("axios");
const { uploadBufferToS3 } = require("./s3");

/**
 * Remove background from an image URL and upload transparent PNG to S3.
 * @param {string} imageUrl - Public HTTP/HTTPS URL of the clothing image.
 * @returns {Promise<string|null>} S3 key of the transparent cutout PNG, or null if failed.
 */
async function generateCutout(imageUrl) {
  const apiKey = process.env.REMOVE_BG_API_KEY;
  if (!apiKey) {
    console.warn("⚠️ REMOVE_BG_API_KEY is not configured. Skipping background removal.");
    return null;
  }

  if (!imageUrl || typeof imageUrl !== "string") {
    return null;
  }

  // Ensure full URL
  let fullUrl = imageUrl;
  if (!fullUrl.startsWith("http")) {
    const bucket = process.env.AWS_BUCKET_NAME || "digiwardrobe";
    const region = process.env.AWS_REGION || "ap-south-1";
    fullUrl = `https://${bucket}.s3.${region}.amazonaws.com/${imageUrl.replace(/^\/+/, "")}`;
  }

  try {
    console.log("✂️ Generating background cutout for:", fullUrl);

    const response = await axios.post(
      "https://api.remove.bg/v1.0/removebg",
      {
        image_url: fullUrl,
        size: "regular",
        type: "product", // Optimizes AI detection specifically for apparel/clothing
        format: "png",
      },
      {
        headers: {
          "X-Api-Key": apiKey,
        },
        responseType: "arraybuffer",
        timeout: 25000,
      }
    );

    const pngBuffer = Buffer.from(response.data);
    const cutoutKey = await uploadBufferToS3(pngBuffer, "cutouts", "image/png");

    console.log("✅ Cutout generated and uploaded to S3:", cutoutKey);
    return cutoutKey;
  } catch (err) {
    if (err.response) {
      console.error(
        "❌ Remove.bg API error:",
        err.response.status,
        err.response.data ? err.response.data.toString() : err.message
      );
    } else {
      console.error("❌ Remove.bg request error:", err.message);
    }
    return null;
  }
}

/**
 * Remove background from an image buffer directly and upload transparent PNG to S3.
 * @param {Buffer} imageBuffer - Buffer of the cropped garment image.
 * @returns {Promise<string|null>} S3 key of the transparent cutout PNG, or null if failed.
 */
async function generateCutoutFromBuffer(imageBuffer) {
  const apiKey = process.env.REMOVE_BG_API_KEY;
  if (!apiKey) {
    console.warn("⚠️ REMOVE_BG_API_KEY is not configured. Skipping background removal.");
    return null;
  }

  if (!imageBuffer || !Buffer.isBuffer(imageBuffer)) {
    return null;
  }

  try {
    console.log("✂️ Generating background cutout directly from buffer...");

    const response = await axios.post(
      "https://api.remove.bg/v1.0/removebg",
      {
        image_file_b64: imageBuffer.toString("base64"),
        size: "regular",
        type: "product",
        format: "png",
      },
      {
        headers: {
          "X-Api-Key": apiKey,
        },
        responseType: "arraybuffer",
        timeout: 30000,
      }
    );

    const pngBuffer = Buffer.from(response.data);
    const cutoutKey = await uploadBufferToS3(pngBuffer, "cutouts", "image/png");

    console.log("✅ Buffer cutout generated and uploaded to S3:", cutoutKey);
    return cutoutKey;
  } catch (err) {
    if (err.response) {
      console.error(
        "❌ Remove.bg API buffer error:",
        err.response.status,
        err.response.data ? err.response.data.toString() : err.message
      );
    } else {
      console.error("❌ Remove.bg buffer error:", err.message);
    }
    return null;
  }
}

module.exports = {
  generateCutout,
  generateCutoutFromBuffer,
};

