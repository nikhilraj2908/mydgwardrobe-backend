const express = require("express");
const router = express.Router();

const {
  getNotifications,
  markAllRead,
} = require("../controllers/notification.controller");

const auth = require("../middlewares/auth.middleware"); // or requireAuth / protect

// Get all notifications for logged-in user
router.get("/notifications", auth, getNotifications);

// Mark all notifications as read
router.post("/notifications/read-all", auth, markAllRead);

module.exports = router;
