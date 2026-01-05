const Notification = require("../models/notification.model");

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

