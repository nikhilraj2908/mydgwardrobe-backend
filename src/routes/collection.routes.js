const express = require("express");
const router = express.Router();
const {
  getUserCollections,
  getUserWardrobesWithPublicStats
} = require("../controllers/collection.controller");

// GET /api/collections/:userId
router.get("/:userId", getUserCollections);
router.get("/:userId/wardrobes", getUserWardrobesWithPublicStats);

module.exports = router;
