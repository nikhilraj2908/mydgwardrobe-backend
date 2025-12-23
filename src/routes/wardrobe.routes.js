const express = require("express");
const router = express.Router();

const upload = require("../middlewares/upload.middleware");
const auth = require("../middlewares/auth.middleware");

const {
  addWardrobeItem,
  getMyWardrobeItems,
   createWardrobe,
  getMyWardrobes,
  getPublicWardrobeItems,
} = require("../controllers/wardrobe.controller");

/* Add Item */
router.post(
  "/add",
  auth,
  upload.single("image"),
  addWardrobeItem
);


/* Get My Items */
router.get("/my", auth, getMyWardrobeItems);

/* Create new wardrobe (Mummy's, Work Wear, etc.) */
router.post(
  "/create",
  auth,
  createWardrobe
);

/* Get my wardrobes */
router.get(
  "/list",
  auth,
  getMyWardrobes
);
router.get("/public-items", getPublicWardrobeItems);
router.get(
  "/public/:wardrobeId/items",
  getPublicWardrobeItems
);

module.exports = router;
