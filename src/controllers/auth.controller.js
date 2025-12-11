const User = require("../models/user.model");
const OTP = require("../models/otp.model");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { generateOTP } = require("../services/otp.service");
const { sendOTP, sendResetMail } = require("../services/mail.service");
const PasswordReset = require("../models/passwordResetToken.model");
const crypto = require("crypto");
// --------------------------------------------------------
//  Helper: Delete old OTP + throttle OTP requests
// --------------------------------------------------------

// ------------------------
// OTP Throttle System (60 sec rule)
// ------------------------
const throttleOTP = async (email) => {
  const last = await OTP.findOne({ email }).sort({ createdAt: -1 });

  if (!last) return true;               // No previous OTP → allowed
  if (!last.createdAt) return true;     // Safety

  const now = Date.now();
  const lastTime = last.createdAt.getTime();

  if (now - lastTime < 60000) {         // less than 60 sec
    return false;
  }

  return true;
};

// --------------------------------------------------------
//  REGISTER — SEND OTP TO VERIFY EMAIL
// --------------------------------------------------------
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

    // Throttle OTP
    const allowed = await throttleOTP(email);
    if (!allowed) {
      return res.status(429).json({ message: "Wait 60 seconds before requesting another OTP" });
    }

    const otpCode = generateOTP();
    const expiry = new Date(Date.now() + 5 * 60 * 1000);

    // Hash OTP
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

// --------------------------------------------------------
//  VERIFY EMAIL OTP
// --------------------------------------------------------
const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const record = await OTP.findOne({ email });
    if (!record) return res.status(400).json({ message: "Invalid OTP" });

    // Compare hashed OTP
    const isMatch = await bcrypt.compare(otp, record.otp);
    if (!isMatch) {
      record.attempts += 1;
      await record.save();

      if (record.attempts >= 5) {
        await OTP.deleteMany({ email });
        return res.status(429).json({
          message: "Too many incorrect attempts. Try again later.",
        });
      }

      return res.status(400).json({ message: "Incorrect OTP" });
    }

    if (record.expiresAt < new Date()) {
      return res.status(400).json({ message: "OTP expired" });
    }

    await User.findOneAndUpdate({ email }, { isVerified: true });
    await OTP.deleteMany({ email });

    return res.json({ message: "Account verified successfully" });

  } catch (err) {
    console.error("VERIFY OTP ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// --------------------------------------------------------
//  RESEND OTP
// --------------------------------------------------------
const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    // Throttle protection
    const allowed = await throttleOTP(email);
    if (!allowed) {
      return res.status(429).json({
        message: "Wait 60 seconds before requesting new OTP",
      });
    }

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

    return res.json({ message: "New OTP sent successfully" });

  } catch (err) {
    console.error("RESEND OTP ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};


const login =async(req,res)=>{
try{
    const {username,password}=req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required" });
    }
    const user=await User.findOne({username}).select("+password");

    if(!user){
        return(res.status(404).json({message:"Invalid username"}));
    }
    // Check if email is verified (optional)
    if(!user.isVerified){
        return res.status(403).json({mesasge:"Please verify your email first"})
    }
    const valid=await bcrypt.compare(password,user.password);
    if(!valid){
        return res.status(400).json({message:"Incorrect password"});
    }
    const token=jwt.sign(
        { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    return res.json(
        {
            message: "Login successful",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
      },
        }
    )
}
    catch(err){
        console.error("login error:",err);
        res.status(500).json({message:"server error"});
    }
}
// --------------------------------------------------------
//  NORMAL LOGIN (Email + Password)
// --------------------------------------------------------
// const loginn = async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     const user = await User.findOne({ email }).select("+password");
//     if (!user)
//       return res.status(404).json({ message: "User not found" });

//     if (!user.isVerified)
//       return res.status(403).json({ message: "Please verify your email first" });

//     const valid = await bcrypt.compare(password, user.password);
//     if (!valid) return res.status(400).json({ message: "Invalid password" });

//     const token = jwt.sign(
//       { id: user._id, role: user.role },
//       process.env.JWT_SECRET,
//       { expiresIn: "7d" }
//     );

//     return res.json({
//       message: "Login successful",
//       token,
//       user: {
//         id: user._id,
//         username: user.username,
//         email: user.email,
//         role: user.role,
//       },
//     });

//   } catch (err) {
//     console.error("LOGIN ERROR:", err);
//     res.status(500).json({ message: "Server error" });
//   }
// };

// --------------------------------------------------------
//  MOBILE LOGIN — SEND OTP TO EMAIL
// --------------------------------------------------------
// --------------------------------------------------------
//  MOBILE LOGIN — SEND OTP TO EMAIL
// --------------------------------------------------------
const loginWithMobile = async (req, res) => {
  try {
    const { mobile } = req.body;

    if (!mobile) {
      return res.status(400).json({ message: "Mobile number is required" });
    }

    const user = await User.findOne({ mobile });
    if (!user) {
      return res.status(404).json({ message: "Mobile number not registered" });
    }

    const email = user.email;

    // Throttle protection (60 sec rule)
    const allowed = await throttleOTP(email);
    if (!allowed) {
      return res.status(429).json({
        message: "Wait 60 seconds before requesting another OTP",
      });
    }

    // Remove previous OTPs
    await OTP.deleteMany({ email });

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
    return res.status(500).json({ message: "Server error" });
  }
};


// --------------------------------------------------------
//  VERIFY MOBILE LOGIN OTP
// --------------------------------------------------------
// --------------------------------------------------------
//  VERIFY MOBILE LOGIN OTP
// --------------------------------------------------------
const verifyMobileLogin = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP required" });
    }

    const record = await OTP.findOne({ email });
    if (!record) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    const isMatch = await bcrypt.compare(otp, record.otp);
    if (!isMatch) {
      record.attempts += 1;
      await record.save();

      if (record.attempts >= 5) {
        await OTP.deleteMany({ email });
        return res.status(429).json({ message: "Too many attempts" });
      }

      return res.status(400).json({ message: "Incorrect OTP" });
    }

    if (record.expiresAt < new Date()) {
      await OTP.deleteMany({ email });
      return res.status(400).json({ message: "OTP expired" });
    }

    const user = await User.findOne({ email });
    if (!user) {
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

  } catch (err) {
    console.error("VERIFY MOBILE LOGIN ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// --------------------------------------------------------
//  RESEND MOBILE OTP
// --------------------------------------------------------
const resendMobileOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const allowed = await throttleOTP(email);
    if (!allowed) {
      return res.status(429).json({ message: "Wait 60 seconds before next OTP" });
    }

    await OTP.deleteMany({ email });

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
      message: "OTP resent successfully",
      email,
    });

  } catch (err) {
    console.error("RESEND MOBILE OTP ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};




const requestPasswordReset = async (req, res) => {
  try {
    const { identifier } = req.body; // email OR mobile number

    if (!identifier) {
      return res.status(400).json({ message: "Email or mobile number is required" });
    }

    // Find user by email or mobile
    const user = await User.findOne({
      $or: [{ email: identifier }, { mobile: identifier }],
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const email = user.email; // Always send link to registered email

    // Create unique reset token
    const token = crypto.randomBytes(32).toString("hex");
    const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Remove existing tokens
    await PasswordReset.deleteMany({ email });

    // Save token
    await PasswordReset.create({
      email,
      token,
      expiresAt: expiry,
    });

    // Password reset link
    // const resetLink = `http://localhost:8081/reset-password?token=${token}`;
    const resetLink = `mydgwardrobe://reset-password?token=${token}`;

    // Send Email
    await sendResetMail(email, resetLink);

    return res.json({ message: "Password reset link sent to your email" });
  } catch (err) {
    console.error("FORGOT PASSWORD ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};


const verifyResetToken = async (req, res) => {
  try {
    const { token } = req.body;

    const record = await PasswordReset.findOne({ token });

    if (!record) {
      return res.status(400).json({ message: "Invalid or expired reset token" });
    }

    if (record.expiresAt < new Date()) {
      await PasswordReset.deleteMany({ token });
      return res.status(400).json({ message: "Reset link expired" });
    }

    return res.json({ message: "Valid token", email: record.email });
  } catch (err) {
    console.error("TOKEN VERIFY ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};



const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ message: "Token & password required" });
    }

    const record = await PasswordReset.findOne({ token });
    if (!record) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    if (record.expiresAt < new Date()) {
      await PasswordReset.deleteOne({ token });
      return res.status(400).json({ message: "Reset link expired" });
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    await User.findOneAndUpdate({ email: record.email }, { password: hashed });

    await PasswordReset.deleteMany({ email: record.email });

    return res.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("RESET PASSWORD ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};


// --------------------------------------------------------

module.exports = {
    
  register,
  verifyOTP,
  login,
  resendOTP,
  loginWithMobile,
  verifyMobileLogin,
  resendMobileOTP,
  requestPasswordReset,
  resetPassword,
  verifyResetToken

};
