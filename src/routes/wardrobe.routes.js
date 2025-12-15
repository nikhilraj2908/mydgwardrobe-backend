const express = require("express");
const router = express.Router();

const upload = require("../middlewares/upload.middleware");
const auth = require("../middlewares/auth.middleware");

const {
  addWardrobeItem,
  getMyWardrobeItems,
} = require("../controllers/wardrobe.controller");

/* Add Item */
router.post(
  "/add",
  protect,
  upload.single("image"),
  addWardrobeItem
);


/* Get My Items */
router.get("/my", auth, getMyWardrobeItems);

module.exports = router;
