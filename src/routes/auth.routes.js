// const express= require("express");

// import { register, verifyOTP, login } from "../controllers/auth.controller.js";

// const router = express.Router();

// router.post("/register", register);
// router.post("/verify-otp", verifyOTP);
// router.post("/login", login);

// export default router;

const express = require("express");
const { register, verifyOTP, login, resendOTP, loginWithMobile, verifyMobileLogin, resendMobileOTP  } = require("../controllers/auth.controller");

const router = express.Router();

router.post("/register", register);
router.post("/verify-otp", verifyOTP);
router.post("/login", login);
router.post("/resend-otp", resendOTP);
router.post("/login-mobile", loginWithMobile);
router.post("/verify-mobile-login", verifyMobileLogin);
router.post("/resend-mobile-otp", resendMobileOTP);


module.exports = router;
