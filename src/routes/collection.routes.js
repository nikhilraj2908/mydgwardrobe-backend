const express = require("express");
const router = express.Router();

const authOptional = require("../middlewares/optionalAuth.middleware");
// const optionalAuth = require("../middlewares/optionalAuth.middleware");
const auth = require("../middlewares/auth.middleware");

const {
  getUserCollections,
//   getUserWardrobesWithPublicStats, 
  getUserWardrobesWithStats,
  getCollectionLikeCount,
    trackCollectionView,
  getCollectionViewCount,
} = require("../controllers/collection.controller");

// GET /api/collections/:userId
// router.get("/:userId", getUserCollections);
// router.get("/:userId/wardrobes", getUserWardrobesWithPublicStats);
router.get(
  "/:userId/wardrobes",// or auth middleware if needed
  auth,   
  getUserWardrobesWithStats
);

router.get(
  "/:userId/likes",
  authOptional,
  getCollectionLikeCount
);
router.post("/:userId/view", authOptional, trackCollectionView);
router.get("/:userId/view", getCollectionViewCount);

module.exports = router;
