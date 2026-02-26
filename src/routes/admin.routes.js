const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/auth.middleware");
const adminAuth = require("../middlewares/adminAuth.middleware");

const {
  getStats,
  getUsers,
  toggleBlock,
  changeRole,
  deleteUser,
  getUserDetails,
  postNotifications
} = require("../controllers/admin.controller");

/* Dashboard */
router.get("/stats", authMiddleware, adminAuth, getStats);

router.post("/notifications",authMiddleware,adminAuth,postNotifications)
/* Users */
router.get("/users", authMiddleware, adminAuth, getUsers);
router.patch("/users/:id/block", authMiddleware, adminAuth, toggleBlock);
router.patch("/users/:id/role", authMiddleware, adminAuth, changeRole);
router.delete("/users/:id", authMiddleware, adminAuth, deleteUser);
router.get("/users/:id", authMiddleware, adminAuth, getUserDetails);
module.exports = router;