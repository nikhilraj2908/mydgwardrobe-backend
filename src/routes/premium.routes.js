const express = require("express");
const router = express.Router();

const {
  requestPremiumAccess,
  getMyPremiumRequests,
  respondToPremiumRequest,
  checkPremiumAccess,
  getUserPremiumItems,
  hasPremiumCollection,
  getPremiumRequestStatus,
  getApprovedByMe,
  getPendingPremiumCount,
  revokePremiumAccess
} = require("../controllers/premiumController");

const auth = require("../middlewares/auth.middleware"); // or auth / protect

// 🔐 User requests access to premium item
router.post("/request", auth, requestPremiumAccess);

// 🔔 Owner fetches pending premium requests
router.get("/requests", auth, getMyPremiumRequests);

// ✅ Owner approves / rejects request
router.post("/respond", auth, respondToPremiumRequest);

// 🔍 Check if user has access to premium item
router.get("/check", auth, checkPremiumAccess);
router.get(
  "/user/:userId/premium-items",
  auth,
  getUserPremiumItems
);

router.get(
  "/user/:userId/has-premium",
  auth,
  hasPremiumCollection
);

router.get("/status", auth, getPremiumRequestStatus);

router.get(
  "/approved-by-me",
  auth,
  getApprovedByMe
);
router.get("/pending-count", auth, getPendingPremiumCount);

router.post("/revoke", auth, revokePremiumAccess);

module.exports = router;
