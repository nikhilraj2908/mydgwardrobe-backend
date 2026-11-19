const WardrobeItem = require("../models/wardrobeItem.model");
const Wardrobe = require("../models/wardrobe.model");
const User = require("../models/user.model");
const Follow = require("../models/follow.model");
const Like = require("../models/like.model");
const SavedItem = require("../models/savedItem.model");
const mongoose = require("mongoose");

/* ==========================================================================
   INSTAGRAM-STYLE ALGORITHMIC FEED
   Ranking signals:
   1. Engagement: (Likes * 2) + (Comments * 3) + (Saves * 4) + (Views * 0.2)
   2. Time Decay: (Age in Hours + 2)^1.4  [Gravity factor for fresh content]
   3. Base Vitality: +10 honeymoon boost for new uploads
   4. Follow Graph: 2.5x multiplier for creators the user follows
   5. Category Affinity: 1.4x multiplier for categories user has engaged with
   6. Controlled Exploration Jitter: 0.85 - 1.15x to keep feed fresh on refresh
   ========================================================================== */

exports.getPublicFeed = async (req, res) => {
  try {
    const page = parseInt(req.query.page || "1", 10);
    const limit = parseInt(req.query.limit || "6", 10);
    const skip = (page - 1) * limit;

    let currentUserId = req.user?.id ? req.user.id.toString() : null;
    let blockedIds = [];
    let followingSet = new Set();
    let preferredCategories = new Set();

    if (currentUserId) {
      try {
        const [currentUser, follows, userLikes, userSaves] = await Promise.all([
          User.findById(currentUserId).select("blockedUsers").lean(),
          Follow.find({ follower: currentUserId }).distinct("following"),
          Like.find({ user: currentUserId, postType: "item" }).sort({ createdAt: -1 }).limit(30).lean(),
          SavedItem.find({ user: currentUserId }).sort({ createdAt: -1 }).limit(30).populate("item", "category categoryType").lean(),
        ]);

        if (currentUser?.blockedUsers?.length) {
          blockedIds = currentUser.blockedUsers.map(id => new mongoose.Types.ObjectId(id));
        }

        if (follows?.length) {
          followingSet = new Set(follows.map(id => id.toString()));
        }

        if (userSaves?.length) {
          userSaves.forEach(s => {
            if (s.item?.categoryType) preferredCategories.add(s.item.categoryType);
            if (s.item?.category) preferredCategories.add(s.item.category.toString());
          });
        }
      } catch (userErr) {
        console.error("Error loading user context for feed:", userErr);
      }
    }

    const blockedObjectIds = blockedIds.length > 0 ? blockedIds : [];

    /* =====================================================
       1. CANDIDATE ITEM POSTS WITH REAL ENGAGEMENT SIGNALS
    ===================================================== */
    const itemMatch = {
      visibility: "public",
      accessLevel: "normal",
      ...(blockedObjectIds.length > 0 ? { user: { $nin: blockedObjectIds } } : {}),
    };

    const itemPosts = await WardrobeItem.aggregate([
      { $match: itemMatch },
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
        $match: {
          "user.status": { $ne: "blocked" },
        },
      },
      // Real Likes count
      {
        $lookup: {
          from: "likes",
          let: { itemId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$postId", "$$itemId"] },
                    { $eq: ["$postType", "item"] },
                  ],
                },
              },
            },
            { $count: "count" },
          ],
          as: "likesMeta",
        },
      },
      // Real Comments count
      {
        $lookup: {
          from: "comments",
          localField: "_id",
          foreignField: "post",
          as: "commentsMeta",
        },
      },
      // Real Saves count
      {
        $lookup: {
          from: "saveditems",
          localField: "_id",
          foreignField: "item",
          as: "savesMeta",
        },
      },
      // Real Views count
      {
        $lookup: {
          from: "views",
          let: { itemId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$postId", "$$itemId"] },
                    { $eq: ["$postType", "item"] },
                  ],
                },
              },
            },
            { $count: "count" },
          ],
          as: "viewsMeta",
        },
      },
      {
        $project: {
          type: { $literal: "item" },
          images: 1,
          imageUrl: {
            $cond: [
              { $gt: [{ $size: { $ifNull: ["$images", []] } }, 0] },
              { $arrayElemAt: ["$images", 0] },
              "$imageUrl",
            ],
          },
          price: 1,
          createdAt: 1,
          brand: 1,
          category: 1,
          categoryType: 1,
          gender: 1,
          likes: {
            $ifNull: [{ $arrayElemAt: ["$likesMeta.count", 0] }, 0],
          },
          comments: { $size: "$commentsMeta" },
          saves: { $size: "$savesMeta" },
          views: {
            $ifNull: [{ $arrayElemAt: ["$viewsMeta.count", 0] }, 0],
          },
          user: {
            _id: "$user._id",
            username: "$user.username",
            photo: "$user.photo",
          },
        },
      },
      { $limit: 200 },
    ]);

    /* =====================================================
       2. CANDIDATE WARDROBE POSTS WITH REAL ENGAGEMENT
    ===================================================== */
    const wardrobeMatch = {
      ...(blockedObjectIds.length > 0 ? { user: { $nin: blockedObjectIds } } : {}),
    };

    const wardrobePosts = await Wardrobe.aggregate([
      { $match: wardrobeMatch },
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
              cond: {
                $and: [
                  { $eq: ["$$item.visibility", "public"] },
                  { $eq: ["$$item.accessLevel", "normal"] },
                ],
              },
            },
          },
        },
      },
      {
        $match: {
          "publicItems.0": { $exists: true }, // Must contain at least 1 public item
        },
      },
      {
        $addFields: {
          totalItems: { $size: "$publicItems" },
          totalWorth: { $sum: "$publicItems.price" },
        },
      },
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
        $match: {
          "user.status": { $ne: "blocked" },
        },
      },
      {
        $lookup: {
          from: "likes",
          let: { wId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$postId", "$$wId"] },
                    { $eq: ["$postType", "wardrobe"] },
                  ],
                },
              },
            },
            { $count: "count" },
          ],
          as: "likesMeta",
        },
      },
      {
        $project: {
          type: { $literal: "wardrobe" },
          name: 1,
          color: 1,
          totalItems: 1,
          totalWorth: 1,
          createdAt: 1,
          likes: {
            $ifNull: [{ $arrayElemAt: ["$likesMeta.count", 0] }, 0],
          },
          comments: { $literal: 0 },
          saves: { $literal: 0 },
          views: { $literal: 0 },
          user: {
            _id: "$user._id",
            username: "$user.username",
            photo: "$user.photo",
          },
        },
      },
      { $limit: 60 },
    ]);

    /* =====================================================
       3. COMPUTE INSTAGRAM-STYLE RANKING SCORE PER POST
    ===================================================== */
    const now = Date.now();
    const allCandidates = [...itemPosts, ...wardrobePosts];

    const scoredFeed = allCandidates.map((post) => {
      const postTime = new Date(post.createdAt || now).getTime();
      const ageHours = Math.max(0, (now - postTime) / (1000 * 60 * 60));

      const likes = post.likes || 0;
      const comments = post.comments || 0;
      const saves = post.saves || 0;
      const views = post.views || 0;

      // Engagement formula: (Likes * 2) + (Comments * 3) + (Saves * 4) + (Views * 0.2)
      const engagement = (likes * 2) + (comments * 3) + (saves * 4) + (views * 0.2);

      // Time decay gravity factor: (Age in Hours + 2)^1.4
      const decay = Math.pow(ageHours + 2, 1.4);

      // Base vitality: +10 honeymoon boost for new uploads
      let score = ((engagement * 10) + 10) / decay;

      // Follow Relationship Boost: 2.5x multiplier for creators the user follows
      const authorId = post.user?._id ? post.user._id.toString() : null;
      if (authorId && followingSet.has(authorId)) {
        score *= 2.5;
      }

      // Category Affinity Boost: 1.4x multiplier if matching user's recent interactions
      if (
        (post.categoryType && preferredCategories.has(post.categoryType)) ||
        (post.category && preferredCategories.has(post.category.toString()))
      ) {
        score *= 1.4;
      }

      // Controlled Exploration Jitter: 0.85 - 1.15x for serendipity on pull-to-refresh
      const jitter = 0.85 + (Math.random() * 0.30);
      const finalScore = score * jitter;

      return {
        ...post,
        rankingScore: Number(finalScore.toFixed(3)),
      };
    });

    // 4. Sort candidates by final ranking score descending
    scoredFeed.sort((a, b) => b.rankingScore - a.rankingScore);

    // 5. Slice page
    const paginatedItems = scoredFeed.slice(skip, skip + limit);

    res.json({
      page,
      limit,
      totalCandidates: scoredFeed.length,
      items: paginatedItems,
    });
  } catch (err) {
    console.error("PUBLIC FEED ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getCollectionFeed = async (req, res) => {
  try {
    let blockedIds = [];
    let followingSet = new Set();

    if (req.user?.id) {
      const [currentUser, follows] = await Promise.all([
        User.findById(req.user.id).select("blockedUsers").lean(),
        Follow.find({ follower: req.user.id }).distinct("following"),
      ]);

      if (currentUser?.blockedUsers?.length) {
        blockedIds = currentUser.blockedUsers.map(id => new mongoose.Types.ObjectId(id));
      }

      if (follows?.length) {
        followingSet = new Set(follows.map(id => id.toString()));
      }
    }

    const collections = await Wardrobe.aggregate([
      ...(blockedIds.length > 0
        ? [
            {
              $match: {
                user: { $nin: blockedIds },
              },
            },
          ]
        : []),
      /* ===============================
         Join public items correctly
      =============================== */
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
              cond: {
                $and: [
                  { $eq: ["$$item.visibility", "public"] },
                  { $eq: ["$$item.accessLevel", "normal"] },
                ],
              },
            },
          },
        },
      },
      {
        $addFields: {
          totalItems: { $size: "$publicItems" },
          totalWorth: { $sum: "$publicItems.price" },
        },
      },
      /* ===============================
         Group by USER = COLLECTION
      =============================== */
      {
        $group: {
          _id: "$user",
          totalWardrobes: { $sum: 1 },
          totalItems: { $sum: "$totalItems" },
          totalWorth: { $sum: "$totalWorth" },
        },
      },
      /* ===============================
         Join user info
      =============================== */
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $match: {
          "user.status": { $ne: "blocked" },
        },
      },
      /* ===============================
         Final shape (frontend-ready)
      =============================== */
      {
        $project: {
          _id: "$_id",
          type: { $literal: "collection" },
          user: {
            _id: "$user._id",
            username: "$user.username",
            photo: "$user.photo",
          },
          stats: {
            totalWorth: "$totalWorth",
            totalWardrobes: "$totalWardrobes",
            totalItems: "$totalItems",
          },
        },
      },
      { $limit: 30 },
    ]);

    // Rank collections: Prioritize followed creators, then closet worth
    collections.sort((a, b) => {
      const aFollow = followingSet.has(a.user?._id?.toString() || "") ? 1 : 0;
      const bFollow = followingSet.has(b.user?._id?.toString() || "") ? 1 : 0;

      if (aFollow !== bFollow) {
        return bFollow - aFollow;
      }

      const aWorth = a.stats?.totalWorth || 0;
      const bWorth = b.stats?.totalWorth || 0;
      return bWorth - aWorth;
    });

    // Return top 5 collections
    res.json(collections.slice(0, 5));
  } catch (err) {
    console.error("COLLECTION FEED ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

