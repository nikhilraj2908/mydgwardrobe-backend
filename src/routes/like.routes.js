const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const { toggleLike, getLikeCount } = require("../controllers/like.controller");

router.post("/toggle", auth, toggleLike);
router.get("/:postType/:postId/count", getLikeCount);

module.exports = router;
