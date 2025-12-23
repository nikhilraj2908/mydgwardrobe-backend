const express = require("express");
const router = express.Router();

const {
  getPublicFeed,
  getCollectionFeed
} = require("../controllers/feed.controller");

// Public feed (items + wardrobes)
router.get("/public", getPublicFeed);

// ✅ Collection feed (collection cards)
router.get("/collections", getCollectionFeed);

module.exports = router;
