const adminAuth = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    // allow both admin & superadmin
    if (!["admin", "superadmin"].includes(req.user.role)) {
      return res.status(403).json({
        message: "Admin access required",
      });
    }

    next();
  } catch (error) {
    console.log("Admin auth error:", error);
    res.status(500).json({ message: "Admin middleware error" });
  }
};

module.exports = adminAuth;