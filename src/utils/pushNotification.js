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

/**
 * Sends a push notification to multiple users simultaneously (e.g. admin broadcast)
 *
 * @param {Array<string>} recipientUserIds - Array of MongoDB User IDs
 * @param {Object} options
 * @param {string} options.title - Notification title
 * @param {string} options.body - Notification body
 * @param {Object} [options.data] - Custom payload for deep linking
 */
async function sendPushToMultipleUsers(recipientUserIds, { title = "DigiWardrobe", body, data = {} }) {
  try {
    if (!Array.isArray(recipientUserIds) || recipientUserIds.length === 0 || !body) return;

    // Find all users who have an expoPushToken and haven't disabled notifications
    const users = await User.find({
      _id: { $in: recipientUserIds },
      expoPushToken: { $ne: null },
      notificationsEnabled: { $ne: false },
    })
      .select("expoPushToken username")
      .lean();

    if (!users || users.length === 0) {
      console.log("ℹ️ [Push Broadcast] No registered device push tokens found for recipient users.");
      return;
    }

    const messages = [];
    for (const u of users) {
      if (isExpoPushToken(u.expoPushToken)) {
        messages.push({
          to: u.expoPushToken,
          sound: "default",
          title,
          body,
          data,
          channelId: "default",
          priority: "high",
        });
      }
    }

    if (messages.length === 0) return;

    console.log(`📲 [Push Broadcast] Dispatching push notification to ${messages.length} mobile devices...`);

    // Send in chunks of 100 (Expo API maximum per request)
    const chunkSize = 100;
    for (let i = 0; i < messages.length; i += chunkSize) {
      const chunk = messages.slice(i, i + chunkSize);
      try {
        const res = await axios.post("https://exp.host/--/api/v2/push/send", chunk, {
          headers: {
            Accept: "application/json",
            "Accept-Encoding": "gzip, deflate",
            "Content-Type": "application/json",
          },
          timeout: 15000,
        });
        console.log(`✅ [Push Broadcast] Dispatched chunk of ${chunk.length} notifications:`, res.data);
      } catch (chunkErr) {
        console.error("❌ [Push Broadcast Chunk Error]:", chunkErr?.response?.data || chunkErr.message);
      }
    }
  } catch (err) {
    console.error("❌ [Push Broadcast Error]:", err);
  }
}

module.exports = {
  sendPushNotification,
  sendPushToMultipleUsers,
  isExpoPushToken,
};
