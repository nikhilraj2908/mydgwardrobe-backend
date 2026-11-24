const express = require("express");
const router = express.Router();

const {
  getNotifications,
  markAllRead,
  markNotificationRead,
  savePushToken,
  getPreference,
  updatePreference,
} = require("../controllers/notification.controller");

const auth = require("../middlewares/auth.middleware"); // or requireAuth / protect

// Get all notifications for logged-in user
router.get("/notifications", auth, getNotifications);

// Mark all notifications as read
router.post("/notifications/read-all", auth, markAllRead);

router.post("/notifications/:id/read", auth, markNotificationRead);

// Push token registration & preference
router.post("/notifications/push-token", auth, savePushToken);
router.get("/notifications/preference", auth, getPreference);
router.patch("/notifications/preference", auth, updatePreference);

module.exports = router;
