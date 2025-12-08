const User = require("../models/user.model");
const OTP = require("../models/otp.model");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { generateOTP } = require("../services/otp.service");
const { sendOTP } = require("../services/mail.service");

// ------------------ REGISTER ------------------
const register = async (req, res) => {
  try {
    const { username, email, password, gender, mobile, dob } = req.body;

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: "Email already exists" });

    const hashed = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      email,
      password: hashed,
      gender,
      mobile,
      dob,
    });

    const otpCode = generateOTP();
    const expiry = new Date(Date.now() + 5 * 60 * 1000);

    await OTP.create({
      email,
      otp: otpCode,
      expiresAt: expiry,
    });

    await sendOTP(email, otpCode);

    return res.status(201).json({
      message: "Signup successful. OTP sent to email.",
      userId: user._id,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ------------------ VERIFY OTP ------------------
const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const record = await OTP.findOne({ email, otp });
    if (!record) return res.status(400).json({ message: "Invalid OTP" });

    if (record.expiresAt < new Date()) {
      return res.status(400).json({ message: "OTP expired" });
    }

    await User.findOneAndUpdate({ email }, { isVerified: true });
    await OTP.deleteMany({ email });

    return res.json({ message: "Account verified successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};
const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const otpCode = generateOTP();
    const expiry = new Date(Date.now() + 5 * 60 * 1000);

    await OTP.deleteMany({ email });

    await OTP.create({
      email,
      otp: otpCode,
      expiresAt: expiry,
    });

    await sendOTP(email, otpCode);

    return res.json({ message: "New OTP sent successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};



// ------------------ LOGIN ------------------
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password");
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.isVerified)
      return res.status(403).json({ message: "Please verify your email first" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ message: "Invalid password" });

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
        role: user.role,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ------------------ MOBILE LOGIN - SEND OTP TO EMAIL ------------------
const loginWithMobile = async (req, res) => {
  try {
    const { mobile } = req.body;

    if (!mobile)
      return res.status(400).json({ message: "Mobile number is required" });

    const user = await User.findOne({ mobile });

    if (!user)
      return res.status(404).json({ message: "Mobile number not registered" });

    const otpCode = generateOTP();
    const expiry = new Date(Date.now() + 5 * 60 * 1000);

    await OTP.create({
      email: user.email,
      otp: otpCode,
      expiresAt: expiry,
    });

    await sendOTP(user.email, otpCode);

    return res.json({
      message: "OTP sent to your registered email",
      email: user.email,
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
};
// ------------------ VERIFY MOBILE LOGIN OTP ------------------
const verifyMobileLogin = async (req, res) => {
  try {
    const { email, otp } = req.body;

    console.log("🔥 Incoming verify request:", req.body);

    const record = await OTP.findOne({ email, otp });
    console.log("📌 OTP record found:", record);

    if (!record) {
      console.log("❌ No OTP record found");
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (record.expiresAt < new Date()) {
      console.log("⏳ OTP expired");
      return res.status(400).json({ message: "OTP expired" });
    }

    const user = await User.findOne({ email });
    console.log("👤 User record found:", user);

    if (!user) {
      console.log("❌ No user found from email");
      return res.status(404).json({ message: "User not found" });
    }

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

  } catch (error) {
    console.log("🔥 VERIFY LOGIN ERROR:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Export all functions (CommonJS)

module.exports = { register, verifyOTP, login, resendOTP,verifyMobileLogin,loginWithMobile };
