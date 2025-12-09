const express = require("express");
// const { authMiddleware } = require("../middleware/auth.middleware");
const authMiddleware = require("../middlewares/auth.middleware");

const { getProfile, updateProfile } = require("../controllers/user.controller");

const router = express.Router();

router.get("/me", authMiddleware, getProfile);
router.put("/update", authMiddleware, updateProfile);

module.exports = router;
