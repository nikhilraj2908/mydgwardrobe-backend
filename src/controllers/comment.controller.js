const Comment = require("../models/comment.model");

/**
 * POST /api/comment/:postId
 * Add comment to a post
 */
exports.addComment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { postId } = req.params;
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ message: "Comment text is required" });
    }

    const comment = await Comment.create({
      user: userId,
      post: postId,
      text: text.trim(),
    });

    const populated = await Comment.findById(comment._id).populate(
      "user",
      "username photo"
    );

    res.status(201).json({ message: "Comment added", comment: populated });
  } catch (err) {
    console.error("ADD COMMENT ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * GET /api/comment/:postId
 * Get comments for a post
 */
exports.getComments = async (req, res) => {
  try {
    const { postId } = req.params;

    const comments = await Comment.find({ post: postId })
      .populate("user", "username photo")
      .sort({ createdAt: -1 });

    res.json({ comments });
  } catch (err) {
    console.error("GET COMMENTS ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * DELETE /api/comment/:commentId
 * Delete comment (only owner)
 */
exports.deleteComment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { commentId } = req.params;

    const comment = await Comment.findById(commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    if (comment.user.toString() !== userId) {
      return res.status(403).json({ message: "Not allowed" });
    }

    await Comment.deleteOne({ _id: commentId });

    res.json({ message: "Comment deleted" });
  } catch (err) {
    console.error("DELETE COMMENT ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};
