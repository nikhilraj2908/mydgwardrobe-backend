const express = require("express");
const router = express.Router();

const upload = require("../middlewares/upload.middleware");
const auth = require("../middlewares/auth.middleware");

const {
  addWardrobeItem,
  getMyWardrobeItems,
   createWardrobe,
  getMyWardrobes,
  getWardrobePublicItems,
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

/* Get public items of a wardrobe (for other users) */
router.get(
  "/public/:wardrobeId",
  getWardrobePublicItems
);

module.exports = router;
