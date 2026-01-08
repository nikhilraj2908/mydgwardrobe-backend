const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const {
  toggleFollow,
  isFollowing,
  getFollowCounts,
  getMyFollowing
} = require("../controllers/follow.controller");

// Follow / Unfollow
router.post("/toggle", auth, toggleFollow);

// Check if following
router.get("/status/:userId", auth, isFollowing);

// Get followers & following count
router.get("/counts/:userId", getFollowCounts);


router.get("/my", auth, getMyFollowing);
module.exports = router;
