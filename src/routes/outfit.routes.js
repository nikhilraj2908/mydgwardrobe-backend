const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth.middleware");
const uploadCategory = require("../middlewares/uploadCategory.middleware");
const {
  createOutfit,
  getMyOutfits,
  updateOutfit,
  deleteOutfit,
  toggleFavoriteOutfit,
  deconstructLook,
} = require("../controllers/outfit.controller");

router.post("/deconstruct", auth, uploadCategory.single("image"), deconstructLook);
router.post("/", auth, createOutfit);
router.get("/my", auth, getMyOutfits);
router.put("/:id", auth, updateOutfit);
router.patch("/:id", auth, updateOutfit);
router.delete("/:id", auth, deleteOutfit);
router.patch("/:id/favorite", auth, toggleFavoriteOutfit);

module.exports = router;

