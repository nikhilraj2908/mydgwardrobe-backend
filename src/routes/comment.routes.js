const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/auth.middleware");

const {
  addComment,
  getComments,
  deleteComment,
} = require("../controllers/comment.controller");

// Add a comment to a post
router.post("/:postId", authMiddleware, addComment);

// Get comments for a post (public)
router.get("/:postId", getComments);

// Delete a comment (only owner can delete)
router.delete("/:commentId", authMiddleware, deleteComment);

module.exports = router;
