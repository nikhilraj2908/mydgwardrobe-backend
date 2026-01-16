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
  getPublicUserItems,
  deleteWardrobe,
  deleteMultipleWardrobes,
} = require("../controllers/wardrobe.controller");

const { getExploreItems } = require("../controllers/explore.controller");

/* ===============================
   ADD ITEM
================================ */
router.post(
  "/add",
  auth,
  upload.array("images", 5),
  addWardrobeItem
);

/* ===============================
   GET MY ITEMS
================================ */
router.get("/my", auth, getMyWardrobeItems);

/* ===============================
   CREATE WARDROBE
================================ */
router.post("/create", auth, createWardrobe);

/* ===============================
   LIST MY WARDROBES
================================ */
router.get("/list", auth, getMyWardrobes);

/* ===============================
   PUBLIC WARDROBE ITEMS
================================ */
router.get("/public/:wardrobeId", getWardrobePublicItems);

/* ===============================
   DELETE ITEM
================================ */
router.delete("/item/:itemId", auth, deleteWardrobeItem);

/* ===============================
   SINGLE ITEM
================================ */
router.get("/item/:id", getSingleWardrobeItem);

/* ===============================
   EXPLORE
================================ */
router.get("/explore", getExploreItems);

/* ===============================
   WARDROBE ITEMS (OWNER / PUBLIC)
================================ */
router.get(
  "/:wardrobeId/items",
  optionalAuth,
  getWardrobeItemsByWardrobe
);

/* ===============================
   USER PUBLIC ITEMS
================================ */
router.get(
  "/user/:userId/items",
  optionalAuth,
  getPublicUserItems
);

/* ===============================
   ✅ BULK DELETE (MUST BE ABOVE :wardrobeId)
================================ */
router.delete(
  "/bulk-delete",
  auth,
  deleteMultipleWardrobes
);

/* ===============================
   ✅ DELETE SINGLE WARDROBE (LAST)
================================ */
router.delete(
  "/:wardrobeId",
  auth,
  deleteWardrobe
);

module.exports = router;
