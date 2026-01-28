const PremiumAccessRequest = require("../models/PremiumAccessRequest.model");
const WardrobeItem = require("../models/wardrobeItem.model");

exports.requestPremiumAccess = async (req, res) => {
    try {
        const { itemId } = req.body;
        const requesterId = req.user._id;

        const item = await WardrobeItem.findById(itemId).populate("user");

        if (!item) {
            return res.status(404).json({ message: "Item not found" });
        }

        if (String(item.user._id) === String(requesterId)) {
            return res.status(400).json({ message: "Cannot request your own item" });
        }

        if (item.accessLevel !== "premium") {
            return res.status(400).json({ message: "Item is not premium" });
        }

        const existing = await PremiumAccessRequest.findOne({
            requester: requesterId,
            owner: item.user._id,
            status: { $in: ["pending", "approved"] },
        });

        if (existing) {
            return res.json({ message: "Request already sent" });
        }

        await PremiumAccessRequest.create({
            requester: requesterId,
            owner: item.user._id,
            item: itemId,
        });

        res.json({ message: "Access request sent" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Something went wrong" });
    }
};

exports.getMyPremiumRequests = async (req, res) => {
    const ownerId = req.user._id;

    const requests = await PremiumAccessRequest.find({
        owner: ownerId,
        status: "pending",
    })
        .populate("requester", "username photo")
        .populate("item");

    res.json(requests);
};


exports.respondToPremiumRequest = async (req, res) => {
  const { requestId, action } = req.body;

  if (!["approve", "reject"].includes(action)) {
    return res.status(400).json({ message: "Invalid action" });
  }

  const request = await PremiumAccessRequest.findById(requestId);

  if (!request) {
    return res.status(404).json({ message: "Request not found" });
  }

  // 🔐 OWNER CHECK (CRITICAL)
  if (String(request.owner) !== String(req.user._id)) {
    return res.status(403).json({ message: "Not authorized" });
  }

  request.status = action === "approve" ? "approved" : "rejected";
  await request.save();

  res.json({ message: `Request ${action}d successfully` });
};

exports.checkPremiumAccess = async (req, res) => {
    const { itemId } = req.query;
    const userId = req.user._id;

    const item = await WardrobeItem.findById(itemId);

    if (!item) return res.status(404).json({ hasAccess: false });

    // Owner always has access
    if (String(item.user) === String(userId)) {
        return res.json({ hasAccess: true });
    }

    if (item.accessLevel !== "premium") {
        return res.json({ hasAccess: true });
    }

    const approved = await PremiumAccessRequest.findOne({
        requester: userId,
        owner: item.user,
        status: "approved",
    });


    res.json({ hasAccess: !!approved });
};

exports.getUserPremiumItems = async (req, res) => {
  try {
    const { userId } = req.params;
    const viewerId = req.user._id;

    // Owner always allowed
    if (viewerId.toString() === userId.toString()) {
      const items = await WardrobeItem.find({
        user: userId,
        accessLevel: "premium",
      });
      return res.json({ items });
    }

    // Check approval
    const approved = await PremiumAccessRequest.findOne({
      requester: viewerId,
      owner: userId,
      status: "approved",
    });

    if (!approved) {
      return res.status(403).json({ message: "Premium access denied" });
    }

    // Fetch ONLY public + premium items
    const items = await WardrobeItem.find({
      user: userId,
      visibility: "public",
      accessLevel: "premium",
    }).populate("wardrobe", "name color");

    res.json({ items });
  } catch (err) {
    console.error("GET PREMIUM ITEMS ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};


exports.hasPremiumCollection = async (req, res) => {
  try {
    const { userId } = req.params;

    // Fetch ALL public premium items (light query)
    const premiumItems = await WardrobeItem.find(
      {
        user: userId,
        accessLevel: "premium",
        visibility: "public",
      },
      {
        price: 1,
        images: 1,
      }
    ).sort({ createdAt: -1 }); // newest first (optional)

    if (!premiumItems.length) {
      return res.json({
        hasPremium: false,
        sampleItemId: null,
        count: 0,
        totalWorth: 0,
        coverImage: null,
      });
    }

    const count = premiumItems.length;

    const totalWorth = premiumItems.reduce(
      (sum, item) => sum + (item.price || 0),
      0
    );

    const sampleItem = premiumItems[0];

    res.json({
      hasPremium: true,
      sampleItemId: sampleItem._id,
      count,
      totalWorth,
      coverImage:
        sampleItem.images && sampleItem.images.length > 0
          ? sampleItem.images[0]
          : null,
    });
  } catch (err) {
    console.error("HAS PREMIUM COLLECTION ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// GET /api/premium/status?itemId=
exports.getPremiumRequestStatus = async (req, res) => {
  const { itemId } = req.query;
  const userId = req.user._id;

  const request = await PremiumAccessRequest.findOne({
    requester: userId,
    item: itemId,
  });

  if (!request) {
    return res.json({ status: "none" });
  }

  res.json({ status: request.status }); // pending | approved | rejected
};
