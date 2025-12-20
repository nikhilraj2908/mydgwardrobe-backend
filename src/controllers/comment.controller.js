const Comment = require("../models/comment.model");

/* ======================================================
   ADD COMMENT
====================================================== */
exports.addComment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { postType, postId, text } = req.body;

    if (!postType || !postId || !text) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const comment = await Comment.create({
      user: userId,
      postType,
      postId,
      text,
    });

    res.status(201).json({ comment });
  } catch (err) {
    console.error("ADD COMMENT ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ======================================================
   GET COMMENTS
====================================================== */
exports.getComments = async (req, res) => {
  try {
    const { postType, postId } = req.params;

    const comments = await Comment.find({ postType, postId })
      .populate("user", "username photo")
      .sort({ createdAt: 1 });

    res.json({ comments });
  } catch (err) {
    console.error("GET COMMENTS ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};
