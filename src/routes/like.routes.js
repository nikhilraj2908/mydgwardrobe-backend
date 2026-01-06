const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const { toggleLike, getLikeCount , getMyLikeStatus} = require("../controllers/like.controller");

router.post("/toggle", auth, toggleLike);
router.get("/:postType/:postId/count", getLikeCount);
router.get("/:postType/:postId/me", auth, getMyLikeStatus);

module.exports = router;
