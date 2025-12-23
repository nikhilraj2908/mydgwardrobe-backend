const mongoose = require("mongoose");
const Wardrobe = require("../models/wardrobe.model");
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
