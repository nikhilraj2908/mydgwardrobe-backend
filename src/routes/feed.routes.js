const express = require("express");
const router = express.Router();

const { getPublicFeed } = require("../controllers/feed.controller");

// Public feed
router.get("/public", getPublicFeed);

module.exports = router;
