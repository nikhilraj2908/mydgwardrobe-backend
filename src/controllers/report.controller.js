const Report = require("../models/report.model");

/* =====================================================
   CREATE REPORT (UGC GOOGLE PLAY POLICY REQUIREMENT)
   POST /api/reports
===================================================== */
exports.createReport = async (req, res) => {
  try {
    const { targetType, targetId, reason, details } = req.body;

    if (!targetType || !targetId || !reason) {
      return res.status(400).json({
        message: "targetType, targetId, and reason are required",
      });
    }

    const report = await Report.create({
      reportedBy: req.user.id || req.user._id,
      targetType,
      targetId,
      reason,
      details: details || "",
      status: "pending",
    });

    res.status(201).json({
      message: "Report submitted successfully. Our moderation team will review this within 24 hours.",
      reportId: report._id,
    });
  } catch (err) {
    console.error("CREATE REPORT ERROR:", err);
    res.status(500).json({ message: "Server error submitting report" });
  }
};

/* =====================================================
   GET ALL REPORTS (ADMIN ONLY)
   GET /api/reports
===================================================== */
exports.getAllReports = async (req, res) => {
  try {
    const reports = await Report.find()
      .populate("reportedBy", "username email")
      .sort({ createdAt: -1 })
      .lean();

    res.json(reports);
  } catch (err) {
    console.error("GET REPORTS ERROR:", err);
    res.status(500).json({ message: "Server error fetching reports" });
  }
};

