const Notification = require("../models/notification.model");
const User = require("../models/user.model");

exports.getNotifications = async (req, res) => {
  const notifications = await Notification.find({ user: req.user.id })
    .populate("actor", "username photo")
    .sort({ createdAt: -1 });

  const unreadCount = await Notification.countDocuments({
    user: req.user.id,
    read: false,
  });

  res.json({ notifications, unreadCount });
};

exports.markAllRead = async (req, res) => {
  await Notification.updateMany(
    { user: req.user.id, read: false },
    { $set: { read: true } }
  );
  res.json({ success: true });
};

exports.markNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const notification = await Notification.findOne({
      _id: id,
      user: userId, // ensure ownership
    });

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    if (!notification.read) {
      notification.read = true;
      await notification.save();
    }

    res.json({ success: true });
  } catch (err) {
    console.error("MARK NOTIFICATION READ ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* =====================================================
   SAVE / UPDATE PUSH TOKEN
===================================================== */
exports.savePushToken = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { pushToken } = req.body;

    console.log(`📱 [Push Token Request] User ${userId}: ${pushToken}`);

    if (!pushToken) {
      return res.status(400).json({ message: "pushToken is required" });
    }

    await User.findByIdAndUpdate(userId, {
      $set: { expoPushToken: pushToken },
    });

    console.log(`✅ [Push Token Saved Successfully] User ${userId}`);
    res.json({ success: true, message: "Push token registered successfully" });
  } catch (err) {
    console.error("SAVE PUSH TOKEN ERROR:", err);
    res.status(500).json({ message: "Server error saving push token" });
  }
};

/* =====================================================
   NOTIFICATION PREFERENCES (ENABLE / DISABLE)
===================================================== */
exports.getPreference = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const user = await User.findById(userId).select("notificationsEnabled").lean();
    res.json({ notificationsEnabled: user?.notificationsEnabled !== false });
  } catch (err) {
    console.error("GET NOTIFICATION PREFERENCE ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.updatePreference = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { enabled } = req.body;

    await User.findByIdAndUpdate(userId, {
      $set: { notificationsEnabled: Boolean(enabled) },
    });

    res.json({ success: true, notificationsEnabled: Boolean(enabled) });
  } catch (err) {
    console.error("UPDATE NOTIFICATION PREFERENCE ERROR:", err);
    res.status(500).json({ message: "Server error updating preference" });
  }
};

