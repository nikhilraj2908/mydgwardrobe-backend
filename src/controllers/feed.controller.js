const WardrobeItem = require("../models/wardrobeItem.model");
const Wardrobe = require("../models/wardrobe.model");
const User = require("../models/user.model");
const mongoose = require("mongoose");

exports.getPublicFeed = async (req, res) => {
  try {
    const page = parseInt(req.query.page || "1");
    const limit = parseInt(req.query.limit || "6");
    const skip = (page - 1) * limit;

    /* ===============================
       ITEM POSTS (public items)
    =============================== */
    const itemPosts = await WardrobeItem.aggregate([
      { $match: { visibility: "public" } },

      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },

      {
        $project: {
          type: { $literal: "item" },
          imageUrl: 1,
          price: 1,
          createdAt: 1,
          likes: { $ifNull: ["$likes", 0] },
          comments: { $ifNull: ["$comments", 0] },
          user: {
            _id: "$user._id",
            username: "$user.username",
            photo: "$user.photo",
          },
        },
      },
    ]);

    /* ===============================
       WARDROBE POSTS (public wardrobes)
    =============================== */
    const wardrobePosts = await Wardrobe.aggregate([
      {
        $lookup: {
          from: "wardrobeitems",
          localField: "_id",
          foreignField: "wardrobe",
          as: "items",
        },
      },

     {
  $addFields: {
    publicItems: {
      $filter: {
        input: "$items",
        as: "item",
        cond: { $eq: ["$$item.visibility", "public"] }
      }
    }
  }
},
{
  $addFields: {
    totalItems: { $size: "$publicItems" },
    totalWorth: { $sum: "$publicItems.price" }
  }
}
,

      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },

      {
        $project: {
          type: { $literal: "wardrobe" },
          name: 1,
          color: 1,
          totalItems: 1,
          totalWorth: 1,
          createdAt: 1,
          likes: { $ifNull: ["$likes", 0] },
          comments: { $ifNull: ["$comments", 0] },
          user: {
            _id: "$user._id",
            username: "$user.username",
            photo: "$user.photo",
          },
        },
      },
    ]);

    /* ===============================
       MERGE + SORT + PAGINATE
    =============================== */
    const feed = [...itemPosts, ...wardrobePosts]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(skip, skip + limit);

    res.json({
      page,
      limit,
      items: feed,
    });
  } catch (err) {
    console.error("PUBLIC FEED ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getCollectionFeed = async (req, res) => {
  try {
    const collections = await Wardrobe.aggregate([
      {
        $lookup: {
          from: "wardrobeitems",
          let: { wardrobeId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$wardrobe", "$$wardrobeId"] },
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
        $group: {
          _id: "$user",
          totalWardrobes: { $sum: 1 },
          totalItems: { $sum: { $size: "$publicItems" } },
          totalWorth: { $sum: { $sum: "$publicItems.price" } }
        }
      },

      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user"
        }
      },
      { $unwind: "$user" },

      {
        $project: {
          type: { $literal: "collection" },
          user: {
            _id: "$user._id",
            username: "$user.username",
            photo: "$user.photo"
          },
          stats: {
            totalWorth: 1,
            totalWardrobes: 1,
            totalItems: 1
          }
        }
      },

      { $sample: { size: 5 } } // random users
    ]);

    res.json(collections);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

