const User = require("../models/user.model");
const OTP = require("../models/otp.model");
const PasswordReset = require("../models/passwordResetToken.model");

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const Wardrobe = require("../models/wardrobe.model");
const { generateOTP } = require("../services/otp.service");
const { sendOTP, sendResetMail } = require("../services/mail.service");
const { OAuth2Client } = require("google-auth-library");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
/* =========================================================
   OTP THROTTLE (60 seconds)
========================================================= */
const throttleOTP = async (email) => {
  const last = await OTP.findOne({ email }).sort({ createdAt: -1 });
  if (!last) return true;

  const now = Date.now();
  const lastTime = last.createdAt.getTime();

  return now - lastTime >= 60000; // true if 60 sec passed
};

/* =========================================================
   REGISTER USER → SEND OTP
========================================================= */
const register = async (req, res) => {
  try {
    const { username, email, password, gender, mobile, dob } = req.body;

    const exists = await User.findOne({ email });
    if (exists)
      return res.status(400).json({ message: "Email already exists" });

    const hashed = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      email,
      password: hashed,
      gender,
      mobile,
      dob,
    });

    // Delete previous OTPs
    await OTP.deleteMany({ email });

    // Throttle OTP
    const allowed = await throttleOTP(email);
    if (!allowed)
      return res
        .status(429)
        .json({ message: "Wait 60 seconds before requesting another OTP" });

    const otpCode = generateOTP();
    const expiry = new Date(Date.now() + 5 * 60 * 1000);
    const hashedOtp = await bcrypt.hash(otpCode, 10);

    await OTP.create({
      email,
      otp: hashedOtp,
      expiresAt: expiry,
      attempts: 0,
    });

    await sendOTP(email, otpCode);

    return res.status(201).json({
      message: "Signup successful. OTP sent to email.",
      userId: user._id,
    });
  } catch (err) {
    console.error("REGISTER ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* =========================================================
   VERIFY EMAIL OTP
========================================================= */
const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Latest OTP
    const record = await OTP.findOne({ email }).sort({ createdAt: -1 });
    if (!record)
      return res.status(400).json({ message: "Invalid or expired OTP" });

    // Expired?
    if (record.expiresAt < new Date()) {
      await OTP.deleteMany({ email });
      return res.status(400).json({ message: "OTP expired" });
    }

    // Compare
    const isMatch = await bcrypt.compare(otp, record.otp);
    if (!isMatch) {
      record.attempts += 1;
      await record.save();

      if (record.attempts >= 5) {
        await OTP.deleteMany({ email });
        return res
          .status(429)
          .json({ message: "Too many incorrect attempts. Try again later." });
      }

      return res.status(400).json({ message: "Incorrect OTP" });
    }

    // SUCCESS — verify user
    await User.findOneAndUpdate({ email }, { isVerified: true });
    await OTP.deleteMany({ email });

    return res.json({ message: "Account verified successfully" });
  } catch (err) {
    console.error("VERIFY OTP ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* =========================================================
   RESEND OTP
========================================================= */
const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    // Delete old OTPs
    await OTP.deleteMany({ email });

    // Throttle
    const allowed = await throttleOTP(email);
    if (!allowed)
      return res
        .status(429)
        .json({ message: "Wait 60 seconds before requesting new OTP" });

    const otpCode = generateOTP();
    const expiry = new Date(Date.now() + 5 * 60 * 1000);
    const hashedOtp = await bcrypt.hash(otpCode, 10);

    await OTP.create({
      email,
      otp: hashedOtp,
      expiresAt: expiry,
      attempts: 0,
    });

    await sendOTP(email, otpCode);

    return res.json({ message: "OTP sent successfully" });
  } catch (err) {
    console.error("RESEND OTP ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* =========================================================
   LOGIN (USERNAME + PASSWORD)
========================================================= */
const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password)
      return res
        .status(400)
        .json({ message: "Username and password are required" });

    const user = await User.findOne({ username }).select("+password");
    if (!user)
      return res.status(404).json({ message: "Invalid username" });

    if (!user.isVerified)
      return res
        .status(403)
        .json({ message: "Please verify your email first" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid)
      return res.status(400).json({ message: "Incorrect password" });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* =========================================================
   MOBILE LOGIN → SEND OTP TO EMAIL
========================================================= */
const loginWithMobile = async (req, res) => {
  try {
    const { mobile } = req.body;

    if (!mobile)
      return res.status(400).json({ message: "Mobile number required" });

    const user = await User.findOne({ mobile });
    if (!user)
      return res.status(404).json({ message: "Mobile number not registered" });

    const email = user.email;

    // Delete old OTPs
    await OTP.deleteMany({ email });

    // Throttle
    const allowed = await throttleOTP(email);
    if (!allowed)
      return res
        .status(429)
        .json({ message: "Wait 60 seconds before requesting another OTP" });

    const otpCode = generateOTP();
    const expiry = new Date(Date.now() + 5 * 60 * 1000);
    const hashedOtp = await bcrypt.hash(otpCode, 10);

    await OTP.create({
      email,
      otp: hashedOtp,
      expiresAt: expiry,
      attempts: 0,
    });

    await sendOTP(email, otpCode);

    return res.json({
      message: "OTP sent to your registered email",
      email,
      mobile,
    });
  } catch (err) {
    console.error("MOBILE LOGIN ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* =========================================================
   VERIFY MOBILE LOGIN OTP
========================================================= */
const verifyMobileLogin = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp)
      return res
        .status(400)
        .json({ message: "Email and OTP required" });

    const record = await OTP.findOne({ email }).sort({ createdAt: -1 });
    if (!record)
      return res.status(400).json({ message: "Invalid or expired OTP" });

    if (record.expiresAt < new Date()) {
      await OTP.deleteMany({ email });
      return res.status(400).json({ message: "OTP expired" });
    }

    const isMatch = await bcrypt.compare(otp, record.otp);
    if (!isMatch) {
      record.attempts++;
      await record.save();

      if (record.attempts >= 5) {
        await OTP.deleteMany({ email });
        return res.status(429).json({ message: "Too many attempts" });
      }

      return res.status(400).json({ message: "Incorrect OTP" });
    }

    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ message: "User not found" });

    await OTP.deleteMany({ email });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("VERIFY MOBILE LOGIN ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* =========================================================
   RESEND MOBILE OTP
========================================================= */
const resendMobileOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email)
      return res.status(400).json({ message: "Email required" });

    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ message: "User not found" });

    await OTP.deleteMany({ email });

    const allowed = await throttleOTP(email);
    if (!allowed)
      return res
        .status(429)
        .json({ message: "Wait 60 seconds before requesting next OTP" });

    const otpCode = generateOTP();
    const expiry = new Date(Date.now() + 5 * 60 * 1000);
    const hashedOtp = await bcrypt.hash(otpCode, 10);

    await OTP.create({
      email,
      otp: hashedOtp,
      expiresAt: expiry,
      attempts: 0,
    });

    await sendOTP(email, otpCode);

    return res.json({ message: "OTP resent successfully" });
  } catch (err) {
    console.error("RESEND MOBILE OTP ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* =========================================================
   PASSWORD RESET REQUEST
========================================================= */
/* =========================================================
   PASSWORD RESET REQUEST (OTP)
========================================================= */
const requestPasswordReset = async (req, res) => {
  try {
    const { identifier } = req.body;

    if (!identifier)
      return res.status(400).json({ message: "Email or mobile required" });

    const user = await User.findOne({
      $or: [{ email: identifier }, { mobile: identifier }],
    });

    if (!user)
      return res.status(404).json({ message: "User not found" });

    const email = user.email;

    // Throttle (reuse logic if you want)
    await PasswordReset.deleteMany({ email });

    const otpCode = generateOTP();
    const hashedOtp = await bcrypt.hash(otpCode, 10);
    const expiry = new Date(Date.now() + 10 * 60 * 1000);

    await PasswordReset.create({
      email,
      otp: hashedOtp,
      expiresAt: expiry,
      verified: false,
    });

    // ✅ USE EXISTING sendOTP
    await sendOTP(email, otpCode);

    return res.json({
      message: "OTP sent to registered email",
      email,
    });
  } catch (err) {
    console.error("FORGOT PASSWORD ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* =========================================================
   VERIFY RESET OTP
========================================================= */
const verifyResetOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const record = await PasswordReset.findOne({ email });

    if (!record)
      return res.status(400).json({ message: "Invalid OTP" });

    if (record.expiresAt < new Date()) {
      await PasswordReset.deleteMany({ email });
      return res.status(400).json({ message: "OTP expired" });
    }

    const isMatch = await bcrypt.compare(otp, record.otp);
    if (!isMatch)
      return res.status(400).json({ message: "Incorrect OTP" });

    // ✅ Mark verified
    record.verified = true;
    await record.save();

    return res.json({ message: "OTP verified successfully" });
  } catch (err) {
    console.error("VERIFY RESET OTP ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};


/* =========================================================
   VERIFY RESET TOKEN
========================================================= */

/* =========================================================
   RESET PASSWORD
========================================================= */
/* =========================================================
   RESET PASSWORD (AFTER OTP)
========================================================= */
const resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword)
      return res.status(400).json({ message: "Invalid request" });

    const record = await PasswordReset.findOne({ email });

    if (!record)
      return res.status(400).json({ message: "OTP verification required" });

    if (record.expiresAt < new Date()) {
      await PasswordReset.deleteMany({ email });
      return res.status(400).json({ message: "OTP expired" });
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    await User.findOneAndUpdate(
      { email },
      { password: hashed }
    );

    await PasswordReset.deleteMany({ email });

    return res.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("RESET PASSWORD ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};




/* =========================================================
   GOOGLE SIGNUP / LOGIN
========================================================= */
/* =========================================================
   GOOGLE SIGNUP / LOGIN (SECURE)
========================================================= */
const googleAuth = async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ message: "ID token required" });
    }

    // 🔐 Verify token with Google
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: [
        process.env.GOOGLE_WEB_CLIENT_ID,
        process.env.GOOGLE_ANDROID_CLIENT_ID,
        // process.env.GOOGLE_IOS_CLIENT_ID, // optional
      ],
    });


    const payload = ticket.getPayload();

    const {
      email,
      name,
      picture,
      sub: googleId,
      email_verified,
    } = payload;

    if (!email_verified) {
      return res.status(400).json({ message: "Google email not verified" });
    }

    let user = await User.findOne({ email });

    // -----------------------------
    // EXISTING USER
    // -----------------------------
    if (user) {
      if (user.authProvider && user.authProvider !== "google") {
        return res.status(400).json({
          message: "This email is registered using password login",
        });
      }
    }

    // -----------------------------
    // NEW USER → AUTO CREATE
    // -----------------------------
    if (!user) {
      const baseUsername = name.replace(/\s+/g, "").toLowerCase();
      const uniqueUsername = `${baseUsername}_${Math.floor(Math.random() * 10000)}`;

      user = await User.create({
        username: uniqueUsername,
        email,
        googleId,
        photo: picture,
        authProvider: "google",
        isVerified: true,
        profileCompleted: false,
      });


      // OPTIONAL: create wardrobe
      await Wardrobe.create({
        user: user._id,
        name: `${name}'s Wardrobe`,
      });
    }

    // -----------------------------
    // JWT TOKEN
    // -----------------------------
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      message: "Google login successful",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        photo: user.photo,
        profileCompleted: user.profileCompleted,
      },
    });
  } catch (err) {
    console.error("GOOGLE AUTH ERROR:", err);
    res.status(401).json({ message: "Invalid Google token" });
  }
};


const getMe = async (req, res) => {
  try {
    // your other controllers already use req.user.id (same as comment delete)
    const user = await User.findById(req.user.id).select("_id username photo");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ user });
  } catch (err) {
    console.error("GET ME ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const completeProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { mobile, gender, dob, username } = req.body;

    if (!mobile || !gender || !dob) {
      return res
        .status(400)
        .json({ message: "All fields are required" });
    }

    if (username) {
      const exists = await User.findOne({
        username,
        _id: { $ne: userId },
      });
      if (exists) {
        return res.status(400).json({ message: "Username already taken" });
      }
    }

    const updateData = {
      mobile,
      gender,
      dob,
      profileCompleted: true,
    };

    // Only update username IF user actually provided it
    if (username && username.trim() !== "") {
      updateData.username = username;
    }

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true }
    );


    res.json({
      message: "Profile completed successfully",
      user,
    });
  } catch (err) {
    console.error("COMPLETE PROFILE ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};
/* ========================================================= */

module.exports = {
  register,
  verifyOTP,
  resendOTP,
  login,
  loginWithMobile,
  verifyMobileLogin,
  resendMobileOTP,
  requestPasswordReset,
  resetPassword,
  verifyResetOtp,
  googleAuth,
  completeProfile,
  getMe,
};
