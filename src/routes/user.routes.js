const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/auth.middleware");
const upload = require("../middlewares/upload.middleware");

const {
  getProfile,
  updateProfile,
  checkUsernameAvailability,
  getUserById,
  searchUsers,
  deleteAccount,
  blockUser,
  unblockUser,
  getBlockedUsers,
} = require("../controllers/user.controller");

/* ======================================================
   USER PROFILE
====================================================== */

/* Get my profile (prefill Edit Profile screen) */
router.get("/me", authMiddleware, getProfile);

/* Check username availability */
router.get("/check-username", authMiddleware, checkUsernameAvailability);

/* Update my profile (text + optional profile image) */
router.put(
  "/me",
  authMiddleware,
  upload.single("photo"), // 👈 profile image field name
  updateProfile
);

/* Delete my account (Google Play Store compliance) */
router.delete("/me", authMiddleware, deleteAccount);

/* Block / Unblock user (UGC moderation) */
router.post("/block/:targetUserId", authMiddleware, blockUser);
router.post("/unblock/:targetUserId", authMiddleware, unblockUser);
router.get("/blocked/list", authMiddleware, getBlockedUsers);

router.get("/search", searchUsers);

router.get("/:userId", getUserById);
module.exports = router;
