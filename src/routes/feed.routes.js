const express = require("express");
const router = express.Router();
const optionalAuth = require("../middlewares/optionalAuth.middleware");

const {
  getPublicFeed,
  getCollectionFeed
} = require("../controllers/feed.controller");

// Public feed (items + wardrobes)
router.get("/public", optionalAuth, getPublicFeed);

// ✅ Collection feed (collection cards)
router.get("/collections", optionalAuth, getCollectionFeed);

module.exports = router;
