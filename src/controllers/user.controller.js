const User = require("../models/user.model");

// GET PROFILE
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.json(user);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
};

// UPDATE PROFILE
// exports.updateProfile = async (req, res) => {
//   try {
//     const updated = await User.findByIdAndUpdate(
//       req.user.id,
//       req.body,
//       { new: true }
//     ).select("-password");

//     res.json(updated);
//   } catch {
//     res.status(500).json({ message: "Server error" });
//   }
// };
exports.updateProfile = async (req, res) => {
  try {
    const { username, bio, mobile } = req.body;

    const updateData = {};

    if (username) updateData.username = username;
    if (bio) updateData.bio = bio;
    if (mobile) updateData.mobile = mobile;

    // If profile image uploaded
    if (req.file) {
      updateData.photo = `/uploads/profile/${req.file.filename}`;
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true }
    ).select("-password");

    res.json({
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (err) {
    console.error("UPDATE PROFILE ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};
