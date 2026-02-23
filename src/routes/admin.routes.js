const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/auth.middleware");
const adminAuth = require("../middlewares/adminAuth.middleware");

const {
  getStats,
  getUsers,
  toggleBlock,
  changeRole
} = require("../controllers/admin.controller");

/* Dashboard */
router.get("/stats", authMiddleware, adminAuth, getStats);

/* Users */
router.get("/users", authMiddleware, adminAuth, getUsers);
router.patch("/users/:id/block", authMiddleware, adminAuth, toggleBlock);
router.patch("/users/:id/role", authMiddleware, adminAuth, changeRole);

module.exports = router;