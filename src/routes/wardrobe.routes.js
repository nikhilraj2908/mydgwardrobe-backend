const express = require("express");
const router = express.Router();

const upload = require("../middlewares/upload.middleware");
const auth = require("../middlewares/auth.middleware");
const optionalAuth = require("../middlewares/optionalAuth.middleware");
const {
  addWardrobeItem,
  getMyWardrobeItems,
  createWardrobe,
  getMyWardrobes,
  getWardrobePublicItems,
  deleteWardrobeItem,
  getSingleWardrobeItem,
  getWardrobeItemsByWardrobe,
  getPublicUserItems
} = require("../controllers/wardrobe.controller");
const { getExploreItems } = require("../controllers/explore.controller");
/* Add Item */
router.post(
  "/add",
  auth,
  upload.array("images", 5),
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
router.delete("/item/:itemId", auth, deleteWardrobeItem);
router.get("/explore", getExploreItems);
router.get("/item/:id",getSingleWardrobeItem);
router.get(
  "/:wardrobeId/items",
  optionalAuth,
  getWardrobeItemsByWardrobe
);

router.get(
  "/user/:userId/items",
  optionalAuth,
  getPublicUserItems
);

module.exports = router;
