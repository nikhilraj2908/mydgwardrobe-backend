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
  updateWardrobe,
  deleteMultipleWardrobeItems,
  updateWardrobeItem,
  moveWardrobeItem,
  moveWardrobeItemsBulk,
  updateItemAccessLevel,
  getItemsByCategory 
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

router.put(
  "/item/:itemId",
  auth,
  upload.array("images", 5),
  updateWardrobeItem
);

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

router.delete(
  "/:wardrobeId",
  auth,
  deleteWardrobe
);


/* ===============================
   BULK DELETE ITEMS
================================ */
router.delete(
  "/items/bulk-delete",
  auth,
  deleteMultipleWardrobeItems
);

router.put(
  "/move-bulk",
   auth,
  moveWardrobeItemsBulk
);


router.put(
  "/:itemId/move",
  auth,
  moveWardrobeItem
);

router.put(
  "/:wardrobeId",
  auth,
  updateWardrobe
);

router.patch(
  "/:itemId/access",
  auth,
  updateItemAccessLevel
);
router.get("/category/:categoryId", getItemsByCategory);


module.exports = router;
