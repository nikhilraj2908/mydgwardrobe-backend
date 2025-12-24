const mongoose = require("mongoose");
const Wardrobe = require("../models/wardrobe.model");
const WardrobeItem = require("../models/wardrobeItem.model"); // ✅ correct case
const User = require("../models/user.model");

exports.getUserWardrobesWithStats = async (req, res) => {
  try {
    const { userId } = req.params;
    const viewerId = req.user?.id;
    const isOwner = viewerId && viewerId.toString() === userId.toString();

    // Fetch user info
    const user = await User.findById(userId).select("username photo");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Single aggregation query
    const wardrobeStats = await Wardrobe.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(userId)
        }
      },
      {
        $lookup: {
          from: "wardrobeitems",
          let: { wardrobeName: "$name" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$user", new mongoose.Types.ObjectId(userId)] },
                    { $eq: ["$wardrobe", "$$wardrobeName"] },
                    ...(!isOwner ? [{ $eq: ["$visibility", "public"] }] : [])
                  ]
                }
              }
            }
          ],
          as: "items"
        }
      },
      {
        $addFields: {
          totalItems: { $size: "$items" },
          totalWorth: { $sum: "$items.price" },
          hasPrivateItems: isOwner ? {
            $anyElementTrue: {
              $map: {
                input: "$items",
                as: "item",
                in: { $eq: ["$$item.visibility", "private"] }
              }
            }
          } : false,
          coverImage: {
            $cond: {
              if: isOwner,
              then: {
                $arrayElemAt: [
                  {
                    $filter: {
                      input: "$items",
                      cond: { $eq: ["$$this.visibility", "public"] },
                      limit: 1
                    }
                  },
                  0
                ]
              },
              else: { $arrayElemAt: ["$items", 0] }
            }
          }
        }
      },
      {
        $project: {
          _id: 1,
          name: 1,
          color: 1,
          totalItems: 1,
          totalWorth: 1,
          hasPrivateItems: 1,
          coverImage: "$coverImage.imageUrl"
        }
      }
    ]);

    res.json({
      user,
      isOwner,
      wardrobes: wardrobeStats,
    });
  } catch (err) {
    console.error("COLLECTION CONTROLLER ERROR:", err);
    res.status(500).json({ 
      message: "Failed to load collections",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};