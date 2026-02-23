const User = require("../models/user.model");
const Item = require("../models/wardrobeItem.model");       // adjust path
const Wardrobe = require("../models/wardrobe.model");

/* ===============================
   DASHBOARD STATS
================================ */
exports.getStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      newUsersToday,
      totalItems,
      totalWardrobes,
      activeToday
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ createdAt: { $gte: today } }),
      Item.countDocuments(),
      Wardrobe.countDocuments(),
      User.countDocuments({ lastLoginAt: { $gte: today } })
    ]);

    res.json({
      totalUsers,
      newUsersToday,
      totalItems,
      totalWardrobes,
      activeToday
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Stats fetch error" });
  }
};


/* ===============================
   USERS LIST WITH SEARCH + PAGINATION
================================ */
exports.getUsers = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const search = req.query.search || "";

    const query = {
      $or: [
        { email: { $regex: search, $options: "i" } },
        { username: { $regex: search, $options: "i" } }
      ]
    };

    const [users, total] = await Promise.all([
      User.find(query)
        .select("-password")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),

      User.countDocuments(query)
    ]);

    res.json({
      users,
      total,
      page,
      pages: Math.ceil(total / limit)
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Users fetch error" });
  }
};


/* ===============================
   BLOCK / UNBLOCK USER
================================ */
exports.toggleBlock = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.status = user.status === "blocked" ? "active" : "blocked";
    await user.save();

    res.json({ message: `User ${user.status}` });

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Block toggle error" });
  }
};


/* ===============================
   CHANGE ROLE
================================ */
exports.changeRole = async (req, res) => {
  try {
    const { role } = req.body;

    if (!["user", "admin", "superadmin"].includes(role))
      return res.status(400).json({ message: "Invalid role" });

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    );

    res.json({ message: "Role updated", user });

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Role update error" });
  }
};