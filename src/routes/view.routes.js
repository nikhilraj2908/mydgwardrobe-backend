const express = require("express");
const router = express.Router();

const {
  incrementView
} = require("../controllers/view.controller");

// POST /api/view
router.post("/", incrementView);

module.exports = router;
