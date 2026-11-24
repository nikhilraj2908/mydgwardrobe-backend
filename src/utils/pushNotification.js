const axios = require("axios");
const User = require("../models/user.model");

/**
 * Validates whether a token string is a valid Expo Push Token format
 */
function isExpoPushToken(token) {
  return (
    typeof token === "string" &&
    (token.startsWith("ExponentPushToken[") || token.startsWith("ExpoPushToken[")) &&
    token.endsWith("]")
  );
}

/**
 * Sends a push notification to a user's mobile device via Expo Push API & Firebase Cloud Messaging (FCM).
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
    if (!isExpoPushToken(pushToken)) {
      console.warn(`[Push] Invalid Expo push token for user ${user.username || recipientUserId}: ${pushToken}`);
      return;
    }

    const message = {
      to: pushToken,
      sound: "default",
      title,
      body,
      data,
      channelId: "default",
      priority: "high",
    };

    const res = await axios.post("https://exp.host/--/api/v2/push/send", [message], {
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      timeout: 10000,
    });

    if (res.data?.data?.[0]?.status === "error") {
      console.warn("[Push Warning from Expo API]:", res.data.data[0]);
    }
  } catch (err) {
    console.error("[Push Notification Error]:", err?.response?.data || err.message || err);
  }
}

module.exports = {
  sendPushNotification,
  isExpoPushToken,
};
