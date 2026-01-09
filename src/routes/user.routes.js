const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/auth.middleware");
const upload = require("../middlewares/upload.middleware");

const {
  getProfile,
  updateProfile,
  getUserById,
  searchUsers
} = require("../controllers/user.controller");

/* ======================================================
   USER PROFILE
====================================================== */

/* Get my profile (prefill Edit Profile screen) */
router.get("/me", authMiddleware, getProfile);

/* Update my profile (text + optional profile image) */
router.put(
  "/me",
  authMiddleware,
  upload.single("photo"), // 👈 profile image field name
  updateProfile
);

router.get("/search", searchUsers);

router.get("/:userId", getUserById);
module.exports = router;
