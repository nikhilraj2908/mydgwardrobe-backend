const express = require("express");
const router = express.Router();

const {
  getNotifications,
  markAllRead,
  markNotificationRead,
} = require("../controllers/notification.controller");

const auth = require("../middlewares/auth.middleware"); // or requireAuth / protect

// Get all notifications for logged-in user
router.get("/notifications", auth, getNotifications);

// Mark all notifications as read
router.post("/notifications/read-all", auth, markAllRead);

router.post("/notifications/:id/read", auth, markNotificationRead);

module.exports = router;
