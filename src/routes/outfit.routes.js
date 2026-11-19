const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth.middleware");
const {
  createOutfit,
  getMyOutfits,
  updateOutfit,
  deleteOutfit,
  toggleFavoriteOutfit,
} = require("../controllers/outfit.controller");

router.post("/", auth, createOutfit);
router.get("/my", auth, getMyOutfits);
router.put("/:id", auth, updateOutfit);
router.patch("/:id", auth, updateOutfit);
router.delete("/:id", auth, deleteOutfit);
router.patch("/:id/favorite", auth, toggleFavoriteOutfit);

module.exports = router;

