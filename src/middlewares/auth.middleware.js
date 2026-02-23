const jwt = require("jsonwebtoken");
const User = require("../models/user.model");

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Not authorized, token missing" });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 🔐 Load full user
    const user = await User.findById(decoded.id || decoded._id)
      .select("-password");

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // 🚨 If you added status field earlier
    if (user.status === "blocked") {
      return res.status(403).json({ message: "Account blocked by admin" });
    }

    req.user = user;   // full mongoose user
    req.userId = user._id; // convenience
    next();

  } catch (error) {
    console.log("Auth error:", error.message);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

module.exports = authMiddleware;