const express = require("express");
const router = express.Router();
const {
  getUserCollections
} = require("../controllers/collection.controller");

// GET /api/collections/:userId
router.get("/:userId", getUserCollections);

module.exports = router;
