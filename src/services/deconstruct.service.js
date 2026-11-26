const axios = require("axios");
const { uploadBufferToS3 } = require("../utils/s3");
const { generateCutoutFromBuffer } = require("../utils/removeBg");
const WardrobeItem = require("../models/wardrobeItem.model");
const Wardrobe = require("../models/wardrobe.model");
const Category = require("../models/category.model");

// Lazy-load sharp to prevent crashing on older Node versions (<20.9.0)
let sharp;
try {
  sharp = require("sharp");
} catch (err) {
  console.warn("⚠️ Sharp image module could not be loaded at startup:", err.message);
}

/**
 * Detect clothing items and accessories using Gemini 2.0 Flash / Vision API.
 * Gracefully falls back to smart anatomical slots if API key is not present or API call fails.
 */
async function detectClothingItems(imageBuffer) {
  const geminiKey = process.env.GEMINI_API_KEY;

  if (geminiKey) {
    try {
      console.log("🤖 Querying Gemini Vision to detect outfit items & accessories...");
      const base64Data = imageBuffer.toString("base64");

      const prompt = `
You are an expert AI fashion stylist and computer vision model.
Analyze this person's outfit image and detect all distinct wearable items:
- Tops (Shirt, T-Shirt, Jacket, Hoodie, Blazer, Top, Sweater)
- Bottoms (Pants, Jeans, Trousers, Shorts, Skirt)
- Footwear (Shoes, Sneakers, Boots, Loafers, Heels, Sandals)
- Accessories (Watch, Sunglasses, Glasses, Hat, Cap, Belt, Bag, Handbag)

Return ONLY a JSON array. Each element must follow this exact schema:
[
  {
    "category": "Shirts" | "Pants" | "Shoes" | "Jackets" | "Accessories",
    "slot": "top" | "bottom" | "footwear" | "accessory",
    "title": "Short descriptive name (e.g. Black Linen Shirt)",
    "box_2d": [ymin, xmin, ymax, xmax]
  }
]
Important: box_2d coordinates must be normalized integers between 0 and 1000 representing [ymin, xmin, ymax, xmax].
Do not output markdown code blocks or explanations, just raw JSON array.
`;

      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
        {
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inline_data: {
                    mime_type: "image/jpeg",
                    data: base64Data,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            response_mime_type: "application/json",
            temperature: 0.1,
          },
        },
        {
          timeout: 25000,
          headers: { "Content-Type": "application/json" },
        }
      );

      const candidate = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (candidate) {
        const cleaned = candidate.replace(/```json|```/gi, "").trim();
        const parsed = JSON.parse(cleaned);
        if (Array.isArray(parsed) && parsed.length > 0) {
          console.log(`✅ Gemini detected ${parsed.length} items:`, parsed.map((p) => p.title));
          return parsed;
        }
      }
    } catch (geminiErr) {
      console.warn("⚠️ Gemini API detection error or timeout:", geminiErr.response?.data || geminiErr.message);
      console.log("ℹ️ Switching to Smart Anatomical golden-ratio segmentation fallback.");
    }
  } else {
    console.log("ℹ️ No GEMINI_API_KEY found in .env; using Smart Anatomical segmentation.");
  }

  // Fallback: Smart Anatomical Golden-Ratio Segments (Top, Bottom, Footwear)
  return [
    {
      category: "Shirts",
      slot: "top",
      title: "Extracted Top Wear",
      box_2d: [140, 160, 520, 840],
    },
    {
      category: "Pants",
      slot: "bottom",
      title: "Extracted Bottom Wear",
      box_2d: [480, 220, 860, 780],
    },
    {
      category: "Shoes",
      slot: "footwear",
      title: "Extracted Footwear",
      box_2d: [820, 250, 990, 750],
    },
  ];
}

/**
 * Match or create a category in MongoDB for the given category name.
 */
async function resolveCategory(categoryName, userId) {
  const normalized = (categoryName || "Shirts").trim();
  let cat = await Category.findOne({
    name: new RegExp(`^${normalized}$`, "i"),
  });

  if (!cat) {
    // Check general categories
    cat = await Category.findOne({
      name: new RegExp(normalized, "i"),
    });
  }

  if (!cat) {
    cat = await Category.create({
      name: normalized.charAt(0).toUpperCase() + normalized.slice(1),
      type: "unisex",
      createdBy: userId,
      scope: "user",
      isActive: true,
    });
  }

  return cat;
}

/**
 * Process image: detect clothes, crop each item, generate cutout, save to DB, and calculate canvas coordinates.
 */
async function deconstructLookAndPair(imageBuffer, userId) {
  if (!sharp) {
    try {
      sharp = require("sharp");
    } catch (e) {
      throw new Error("Image processing engine (sharp) is not available on this server: " + e.message);
    }
  }

  if (!imageBuffer || !Buffer.isBuffer(imageBuffer)) {
    throw new Error("Invalid image buffer provided");
  }

  // 1. Get original image metadata (width, height)
  const metadata = await sharp(imageBuffer).metadata();
  const imgWidth = metadata.width || 800;
  const imgHeight = metadata.height || 1200;

  console.log(`📸 Image dimensions: ${imgWidth} x ${imgHeight}`);

  // 2. Detect items & bounding boxes
  const detectedItems = await detectClothingItems(imageBuffer);

  // 3. Find or create default wardrobe for user
  let wardrobeDoc = await Wardrobe.findOne({ user: userId });
  if (!wardrobeDoc) {
    wardrobeDoc = await Wardrobe.create({
      name: "My Wardrobe",
      user: userId,
      color: "#4F46E5",
      itemCount: 0,
      isDefault: true,
    });
  }

  const createdItems = [];
  const canvasGarments = [];

  let accessoryCount = 0;

  // 4. Crop, cutout, and save each detected garment
  for (let i = 0; i < detectedItems.length; i++) {
    const itemData = detectedItems[i];
    const [ymin, xmin, ymax, xmax] = itemData.box_2d || [0, 0, 1000, 1000];

    // Convert normalized 0-1000 to pixels with a 3% padding safety margin
    const padY = Math.round(((ymax - ymin) * 0.03));
    const padX = Math.round(((xmax - xmin) * 0.03));

    const top = Math.max(0, Math.floor(((ymin - padY) / 1000) * imgHeight));
    const left = Math.max(0, Math.floor(((xmin - padX) / 1000) * imgWidth));
    const bottom = Math.min(imgHeight, Math.ceil(((ymax + padY) / 1000) * imgHeight));
    const right = Math.min(imgWidth, Math.ceil(((xmax + padX) / 1000) * imgWidth));

    const cropW = Math.max(10, right - left);
    const cropH = Math.max(10, bottom - top);

    try {
      console.log(`✂️ Cropping ${itemData.title || itemData.category}: [${left}, ${top}, ${cropW}, ${cropH}]`);

      // Crop to PNG buffer
      const croppedBuffer = await sharp(imageBuffer)
        .extract({ left, top, width: cropW, height: cropH })
        .png()
        .toBuffer();

      // Upload original crop to S3
      const originalKey = await uploadBufferToS3(croppedBuffer, "wardrobe", "image/png");

      // Generate transparent cutout
      let cutoutKey = await generateCutoutFromBuffer(croppedBuffer);

      // Resolve category
      const categoryDoc = await resolveCategory(itemData.category, userId);

      // Create Wardrobe Item in MongoDB
      const newItem = await WardrobeItem.create({
        user: userId,
        wardrobe: wardrobeDoc._id,
        category: categoryDoc._id,
        categoryType: categoryDoc.type || "unisex",
        images: [originalKey],
        cutoutImage: cutoutKey || "",
        brand: "Auto Extracted",
        color: "",
        price: 0,
        visibility: "private",
      });

      // Populate category for client rendering
      const populatedItem = await WardrobeItem.findById(newItem._id).populate("category", "name icon");
      createdItems.push(populatedItem);

      // 5. Calculate Canvas Slot & Coordinates
      let canvasX = 90;
      let canvasY = 30;
      let canvasWidth = 180;
      let canvasHeight = 180;
      let canvasScale = 1.0;
      let zIndex = 2;

      const slot = (itemData.slot || "").toLowerCase();
      if (slot === "top" || itemData.category.toLowerCase().includes("shirt") || itemData.category.toLowerCase().includes("jacket")) {
        canvasX = 90;
        canvasY = 25;
        canvasWidth = 180;
        canvasHeight = 180;
        canvasScale = 1.0;
        zIndex = 2;
      } else if (slot === "bottom" || itemData.category.toLowerCase().includes("pant") || itemData.category.toLowerCase().includes("jean")) {
        canvasX = 95;
        canvasY = 195;
        canvasWidth = 170;
        canvasHeight = 190;
        canvasScale = 1.0;
        zIndex = 1;
      } else if (slot === "footwear" || itemData.category.toLowerCase().includes("shoe")) {
        canvasX = 105;
        canvasY = 380;
        canvasWidth = 150;
        canvasHeight = 95;
        canvasScale = 0.95;
        zIndex = 3;
      } else {
        // Accessory slot (pinned on side slots)
        accessoryCount++;
        canvasX = 15;
        canvasY = 35 + (accessoryCount - 1) * 85;
        canvasWidth = 75;
        canvasHeight = 75;
        canvasScale = 0.85;
        zIndex = 4;
      }

      canvasGarments.push({
        instanceId: `auto_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
        item: populatedItem,
        x: canvasX,
        y: canvasY,
        width: canvasWidth,
        height: canvasHeight,
        scale: canvasScale,
        zIndex,
      });
    } catch (cropErr) {
      console.error(`❌ Error processing item ${itemData.title}:`, cropErr.message);
    }
  }

  // Increment wardrobe itemCount
  if (createdItems.length > 0) {
    await Wardrobe.findByIdAndUpdate(wardrobeDoc._id, {
      $inc: { itemCount: createdItems.length },
    });
  }

  return {
    success: true,
    totalExtracted: createdItems.length,
    items: createdItems,
    canvasGarments,
  };
}

module.exports = {
  detectClothingItems,
  deconstructLookAndPair,
};
