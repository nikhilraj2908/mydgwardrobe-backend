const View = require("../models/view.model");

exports.incrementView = async (req, res) => {
  try {
    const { postType, postId } = req.body;

    if (!postType || !postId) {
      return res.status(400).json({ message: "postType & postId required" });
    }

    await View.create({ postType, postId });
    res.json({ viewed: true });
  } catch (err) {
    console.error("VIEW ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};
