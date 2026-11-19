const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/auth.middleware");
const { createReport, getAllReports } = require("../controllers/report.controller");

/* Create a new report (Authenticated users) */
router.post("/", authMiddleware, createReport);

/* Get all reports (Admin) */
router.get("/", authMiddleware, getAllReports);

module.exports = router;

