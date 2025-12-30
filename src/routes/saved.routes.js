const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/auth.middleware");

const {
  toggleSaveItem,
  getMySavedItems,
} = require("../controllers/saved.controller");

/* Toggle Save */
router.post("/toggle/:itemId", authMiddleware, toggleSaveItem);

/* Get My Saved Items */
router.get("/me", authMiddleware, getMySavedItems);

module.exports = router;
