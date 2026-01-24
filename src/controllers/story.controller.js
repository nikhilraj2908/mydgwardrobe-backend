const Story = require("../models/story.model");
const { deleteFromS3 } = require("../utils/s3");
/* ================= CREATE STORY ================= */
exports.createStory = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthenticated" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "Media file required" });
    }

    const displayDuration = Number(req.body.duration) || 10;

    const mediaType = req.file.mimetype.startsWith("video")
      ? "video"
      : "image";

    const story = await Story.create({
      user: req.user._id,
      media: req.file.key        , // ✅ S3 URL
      mediaType,
      duration: displayDuration,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    res.status(201).json(story);
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
      .sort({ createdAt: 1 })
      .lean();

    const grouped = {};

    stories.forEach((story) => {
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
