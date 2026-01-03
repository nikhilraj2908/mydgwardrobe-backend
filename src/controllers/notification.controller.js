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
