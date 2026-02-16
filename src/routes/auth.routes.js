// const express= require("express");

// import { register, verifyOTP, login } from "../controllers/auth.controller.js";

// const router = express.Router();

// router.post("/register", register);
// router.post("/verify-otp", verifyOTP);
// router.post("/login", login);

// export default router;

const express = require("express");
const protect = require("../middlewares/auth.middleware");
const { register, verifyOTP, login, resendOTP, loginWithMobile, verifyMobileLogin, resendMobileOTP, requestPasswordReset,verifyResetOtp, resetPassword ,getMe,googleAuth,completeProfile ,changePassword} = require("../controllers/auth.controller");

const router = express.Router();

router.post("/register", register);
router.post("/verify-otp", verifyOTP);
router.post("/login", login);
router.post("/resend-otp", resendOTP);
router.post("/login-mobile", loginWithMobile);
router.post("/verify-mobile-login", verifyMobileLogin);
router.post("/resend-mobile-otp", resendMobileOTP);
router.post("/forgot-password", requestPasswordReset);
// router.post("/verify-reset-token", verifyResetToken);
router.post("/verify-reset-otp", verifyResetOtp);
router.post("/reset-password", resetPassword);

// router.post("/verify-reset-otp", verifyResetOtp);
router.get("/me", protect, getMe);
router.post("/google", googleAuth);
router.post("/complete-profile", protect, completeProfile);
router.post("/change-password", protect, changePassword);
module.exports = router;
