const User = require("../models/user.model");

/**
 * Normalizes a username by trimming whitespace, stripping leading '@',
 * and converting to lowercase.
 */
const normalizeUsername = (raw) => {
  if (!raw || typeof raw !== "string") return "";
  return raw.trim().replace(/^@+/, "").trim().toLowerCase();
};

/**
 * Validates a username format.
 * Returns { valid: boolean, message?: string }
 */
const validateUsername = (username) => {
  const normalized = normalizeUsername(username);

  if (!normalized) {
    return { valid: false, message: "Username cannot be empty." };
  }

  if (normalized.length < 3 || normalized.length > 30) {
    return { valid: false, message: "Username must be between 3 and 30 characters." };
  }

  // Alphanumeric, underscores, and periods
  if (!/^[a-z0-9_.]+$/.test(normalized)) {
    return {
      valid: false,
      message: "Username can only contain letters, numbers, underscores, and periods.",
    };
  }

  return { valid: true, username: normalized };
};

/**
 * Checks if a normalized username is available (excluding an optional userId).
 */
const isUsernameAvailable = async (normalizedUsername, excludeUserId = null) => {
  const query = { username: normalizedUsername };
  if (excludeUserId) {
    query._id = { $ne: excludeUserId };
  }
  const existing = await User.findOne(query);
  return !existing;
};

/**
 * Generates a unique default username from an email address (or preferred name).
 * E.g. nikhil@gmail.com -> "nikhil" (or "nikhil1" if "nikhil" is taken).
 */
const generateDefaultUsername = async (email, preferredName = null) => {
  let base = "";

  if (preferredName && typeof preferredName === "string" && preferredName.trim()) {
    base = preferredName
      .trim()
      .replace(/^@+/, "")
      .toLowerCase()
      .replace(/[^a-z0-9_.]/g, "");
  }

  if (!base && email && typeof email === "string") {
    const localPart = email.split("@")[0] || "";
    base = localPart.trim().toLowerCase().replace(/[^a-z0-9_.]/g, "");
  }

  if (!base || base.length < 2) {
    base = "user";
  }

  // Ensure base length is within 3-25 characters
  if (base.length < 3) {
    base = `${base}_${Math.floor(10 + Math.random() * 90)}`;
  } else if (base.length > 25) {
    base = base.substring(0, 25);
  }

  // Check uniqueness and append counter if collision occurs
  let candidate = base;
  let counter = 1;
  while (!(await isUsernameAvailable(candidate))) {
    candidate = `${base}${counter}`;
    counter++;
  }

  return candidate;
};

/**
 * Scans for any existing users without a valid username and automatically
 * generates and saves a unique default username for each of them.
 */
const ensureUsernamesForExistingUsers = async () => {
  try {
    const usersWithoutUsername = await User.find({
      $or: [
        { username: null },
        { username: { $exists: false } },
        { username: "" },
      ],
    });

    if (usersWithoutUsername.length > 0) {
      console.log(`Found ${usersWithoutUsername.length} user(s) without username. Generating default usernames...`);
      for (const u of usersWithoutUsername) {
        if (u.email) {
          const generated = await generateDefaultUsername(u.email);
          u.username = generated;
          await u.save();
          console.log(`✅ Assigned default username '@${generated}' to ${u.email}`);
        }
      }
    }
  } catch (err) {
    console.error("Error in ensureUsernamesForExistingUsers:", err);
  }
};

module.exports = {
  normalizeUsername,
  validateUsername,
  isUsernameAvailable,
  generateDefaultUsername,
  ensureUsernamesForExistingUsers,
};

