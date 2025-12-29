const Story = require("../models/story.model");

/* ================= CREATE STORY ================= */
exports.createStory = async (req, res) => {
  try {
    const { duration } = req.body;

    const expiresInSeconds = Number(duration) || 10;

    const story = await Story.create({
      user: req.user._id,
      media: req.file?.path || req.body.media,
      mediaType: req.body.mediaType || "image",
      duration: expiresInSeconds,
      expiresAt: new Date(Date.now() + expiresInSeconds * 1000),
    });

    res.status(201).json(story);
  } catch (err) {
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
      .sort({ createdAt: -1 });

    // group stories by user
    const grouped = {};
    stories.forEach(story => {
      const uid = story.user._id;
      if (!grouped[uid]) grouped[uid] = {
        user: story.user,
        stories: [],
      };
      grouped[uid].stories.push(story);
    });

    res.json(Object.values(grouped));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ================= DELETE STORY ================= */
exports.deleteStory = async (req, res) => {
  const story = await Story.findById(req.params.id);

  if (!story) return res.status(404).json({ message: "Story not found" });
  if (story.user.toString() !== req.user._id.toString())
    return res.status(403).json({ message: "Not allowed" });

  await story.deleteOne();
  res.json({ success: true });
};
