const Story = require("../models/story.model");
const { deleteFromS3 } = require("../utils/s3");
/* ================= CREATE STORY ================= */
exports.createStory = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthenticated" });
    }

    const media = req.file ? req.file.key : (req.body.media || req.body.imageUrl);

    if (!media) {
      return res.status(400).json({ message: "Media file or image URL required" });
    }

    const displayDuration = Number(req.body.duration) || 7;

    const mediaType = req.file
      ? (req.file.mimetype && req.file.mimetype.startsWith("video") ? "video" : "image")
      : (req.body.mediaType || "image");

    const story = await Story.create({
      user: req.user._id || req.user.id,
      media,
      mediaType,
      duration: displayDuration,
      storyType: req.body.storyType || "standard",
      item: req.body.itemId || req.body.item || undefined,
      outfit: req.body.outfitId || req.body.outfit || undefined,
      caption: req.body.caption || "",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    const populatedStory = await Story.findById(story._id)
      .populate("user", "username photo")
      .populate("item", "name brand price images imageUrl cutoutImage")
      .populate({
        path: "outfit",
        select: "name items",
        populate: {
          path: "items.item",
          select: "cutoutImage images imageUrl",
        },
      });

    res.status(201).json(populatedStory || story);
  } catch (err) {
    console.error("CREATE STORY ERROR:", err);
    res.status(500).json({ message: err.message });
  }
};


/* ================= GET ACTIVE STORIES ================= */
exports.getActiveStories = async (req, res) => {
  try {
    const stories = await Story.find({
      expiresAt: { $gt: new Date() },
    })
      .populate("user", "username photo")
      .populate("item", "name brand price images imageUrl cutoutImage")
      .populate({
        path: "outfit",
        select: "name items",
        populate: {
          path: "items.item",
          select: "cutoutImage images imageUrl",
        },
      })
      .sort({ createdAt: 1 })
      .lean();

    const grouped = {};

    stories.forEach((story) => {
      if (!story.user || !story.user._id) return;
      const uid = story.user._id.toString();
      if (!grouped[uid]) {
        grouped[uid] = {
          user: story.user,
          stories: [],
        };
      }
      grouped[uid].stories.push(story);
    });

    res.json(Object.values(grouped));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// /* ================= DELETE STORY ================= */
// exports.deleteStory = async (req, res) => {
//   try {
//     const story = await Story.findById(req.params.id);

//     if (!story) {
//       return res.status(404).json({ message: "Story not found" });
//     }

//     if (story.user.toString() !== req.user._id.toString()) {
//       return res.status(403).json({ message: "Not allowed" });
//     }

//     // 🔥 Delete media from S3
//     await deleteFromS3(story.media);

//     await story.deleteOne();

//     res.json({ success: true });
//   } catch (err) {
//     console.error("DELETE STORY ERROR:", err);
//     res.status(500).json({ message: "Server error" });
//   }
// };


/* ================= DELETE STORY ================= */
exports.deleteStory = async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);

    if (!story) {
      return res.status(404).json({ message: "Story not found" });
    }
    if (story.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not allowed" });
    }
    // Check if the story was created within the last 24 hours
    const timeDifference = new Date() - new Date(story.createdAt);

    const oneDay = 24 * 60 * 60 * 1000;
    if (timeDifference > oneDay) {
      return res.status(400).json({ message: "You can only delete stories within 24 hours" });
    }

    // 🔥 Delete media from S3
    await deleteFromS3(story.media);

    await story.deleteOne();

    res.json({ success: true });
  } catch (err) {
    console.error("DELETE STORY ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ================= MARK STORY VIEWED ================= */

exports.markStoryViewed = async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);

    if (!story) return res.sendStatus(404);

    if (!story.viewers.includes(req.user._id)) {
      story.viewers.push(req.user._id);
      await story.save();
    }

    res.json({ views: story.viewers.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// ===== GET STORY VIEWERS (OWNER ONLY) =====
exports.getStoryViewers = async (req, res) => {
  try {
    const story = await Story.findById(req.params.id)
      .populate("viewers", "username photo"); // only fields you need

    if (!story) {
      return res.status(404).json({ message: "Story not found" });
    }

    // ✅ Only the owner can see the viewer list
    if (story.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Forbidden" });
    }

    res.json(story.viewers);
  } catch (err) {
    console.error("GET VIEWERS ERROR:", err);
    res.status(500).json({ message: err.message });
  }
};