const { Expo } = require("expo-server-sdk");
const expo = new Expo();
const User = require("../models/user.model");

/**
 * Sends a push notification to a user's mobile device via Expo & Firebase Cloud Messaging (FCM).
 *
 * @param {string} recipientUserId - MongoDB User ID of recipient
 * @param {Object} options
 * @param {string} options.title - Notification title
 * @param {string} options.body - Notification body
 * @param {Object} [options.data] - Custom payload for deep linking (e.g. { type: 'like', itemId: '...' })
 */
async function sendPushNotification(recipientUserId, { title = "DigiWardrobe", body, data = {} }) {
  try {
    if (!recipientUserId || !body) return;

    const user = await User.findById(recipientUserId)
      .select("expoPushToken notificationsEnabled username")
      .lean();

    if (!user) return;

    // Check if user disabled notifications in settings
    if (user.notificationsEnabled === false) {
      return;
    }

    const pushToken = user.expoPushToken;
    if (!pushToken) {
      return;
    }

    // Verify token validity
    if (!Expo.isExpoPushToken(pushToken)) {
      console.warn(`[Push] Invalid Expo push token for user ${user.username || recipientUserId}: ${pushToken}`);
      return;
    }

    const messages = [
      {
        to: pushToken,
        sound: "default",
        title,
        body,
        data,
        channelId: "default",
        priority: "high",
      },
    ];

    const chunks = expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      await expo.sendPushNotificationsAsync(chunk);
    }
  } catch (err) {
    console.error("[Push Notification Error]:", err);
  }
}

module.exports = {
  sendPushNotification,
};
