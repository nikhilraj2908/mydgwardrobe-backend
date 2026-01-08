const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const {
  toggleFollow,
  isFollowing,
  getFollowCounts,
  getMyFollowing,
  getFollowers,
  getFollowing
} = require("../controllers/follow.controller");

// Follow / Unfollow
router.post("/toggle", auth, toggleFollow);

// Check if following
router.get("/status/:userId", auth, isFollowing);

// Get followers & following count
router.get("/counts/:userId", getFollowCounts);

router.get("/followers/:userId", auth, getFollowers);
router.get("/following/:userId", auth, getFollowing);


router.get("/my", auth, getMyFollowing);
module.exports = router;
