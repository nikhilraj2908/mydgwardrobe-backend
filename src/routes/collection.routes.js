const express = require("express");
const router = express.Router();
const {
  getUserCollections,
//   getUserWardrobesWithPublicStats,
  getUserWardrobesWithStats
} = require("../controllers/collection.controller");

// GET /api/collections/:userId
router.get("/:userId", getUserCollections);
// router.get("/:userId/wardrobes", getUserWardrobesWithPublicStats);
router.get(
  "/:userId/wardrobes",// or auth middleware if needed
  getUserWardrobesWithStats
);

module.exports = router;
