const mongoose = require("mongoose");
const Wardrobe = require("../models/wardrobe.model");
const WardrobeItem= require("../models/wardrobeItem.model")
const User = require("../models/user.model");

exports.getUserCollections = async (req, res) => {
  try {
    const { userId } = req.params;

    const wardrobes = await Wardrobe.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(userId)
        }
      },
      {
        $lookup: {
          from: "wardrobeitems",
          let: {
            wardrobeId: "$_id",
            wardrobeName: "$name"
            } ,
          pipeline: [
            {
              $match: {
                $expr: {
                    $and: [
                    {
                        $or: [
                        { $eq: ["$wardrobe", "$$wardrobeId"] },
                        { $eq: ["$wardrobe", "$$wardrobeName"] }
                        ]
                    },
                    { $eq: ["$visibility", "public"] }
                    ]
                }
                }

            }
          ],
          as: "publicItems"
        }
      },
      {
        $project: {
          name: 1,
          coverImage: 1,
          totalItems: { $size: "$publicItems" },
          totalWorth: { $sum: "$publicItems.price" }
        }
      }
    ]);

    const user = await User.findById(userId).select("username photo");

    res.json({ user, wardrobes });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



exports.getUserWardrobesWithPublicStats = async (req, res) => {
  try {
    const { userId } = req.params;

    // 1️⃣ Get ALL wardrobes of the user
    const wardrobes = await Wardrobe.find({ user: userId }).lean();

    // 2️⃣ For each wardrobe, calculate PUBLIC item stats
    const result = await Promise.all(
      wardrobes.map(async (wardrobe) => {
        const publicItems = await WardrobeItem.find({
          user: userId,
          wardrobe: wardrobe.name, // 🔑 IMPORTANT: name match
          visibility: "public",
        }).lean();

        const totalItems = publicItems.length;

        const totalWorth = publicItems.reduce(
          (sum, item) => sum + (item.price || 0),
          0
        );

        const coverImage = publicItems[0]?.imageUrl || null;

        return {
          _id: wardrobe._id,
          name: wardrobe.name,
          color: wardrobe.color,
          totalItems,
          totalWorth,
          coverImage,
        };
      })
    );

    res.json({ wardrobes: result });
  } catch (err) {
    console.error("Collection wardrobes error:", err);
    res.status(500).json({ message: "Failed to load wardrobes" });
  }
};
