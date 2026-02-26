const User = require("../models/user.model");
const Item = require("../models/wardrobeItem.model");       // adjust path
const Wardrobe = require("../models/wardrobe.model");
const Follow = require("../models/follow.model");
const Like = require("../models/like.model");
const Notification = require("../models/notification.model");
const SavedItem = require('../models/savedItem.model');
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
        const limit = Number(req.query.limit) || 20;
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

        // 🔥 Attach follower count to each user
        const usersWithFollowers = await Promise.all(
            users.map(async (u) => {
                const followers = await Follow.countDocuments({
                    following: u._id
                });

                return {
                    ...u.toObject(),
                    followers
                };
            })
        );

        res.json({
            users: usersWithFollowers,
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

exports.deleteUser = async (req, res) => {
    try {
        const userId = req.params.id;

        // Prevent deleting yourself
        if (req.user._id.toString() === userId)
            return res.status(400).json({ message: "You cannot delete yourself" });


        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });
        
        await User.findByIdAndDelete(userId);
        // Optional cleanup (recommended)
        await Item.deleteMany({ user: userId });
        await Wardrobe.deleteMany({ user: userId });
        await Follow.deleteMany({ $or: [{ follower: userId }, { following: userId }] });
        await Like.deleteMany({ user: userId }); // likes given by user
        await SavedItem.deleteMany({ user: userId }); // saved items
        await Notification.deleteMany({ $or: [{ user: userId }, { actor: userId }] }); // notifications 
        res.json({ message: "User permanently deleted" });

    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "Delete error" });
    }
};

exports.getUserDetails = async (req, res) => {
    try {
        const userId = req.params.id;

        /* ===============================
           USER PROFILE
        ============================== */
        const user = await User.findById(userId).select("-password");
        if (!user) return res.status(404).json({ message: "User not found" });

        /* ===============================
           ITEMS + WARDROBES
        ============================== */
        const [items, wardrobes] = await Promise.all([
            Item.find({ user: userId }),
            Wardrobe.find({ user: userId }),
        ]);

        /* ===============================
           FOLLOW STATS
        ============================== */
        const [followers, following] = await Promise.all([
            Follow.countDocuments({ following: userId }),
            Follow.countDocuments({ follower: userId }),
        ]);

        /* ===============================
           LIKES RECEIVED ON ITEMS
        ============================== */
        const itemIds = items.map(i => i._id);

        const totalLikesReceived = await Like.countDocuments({
            postType: "item",
            postId: { $in: itemIds }
        });

        /* ===============================
           LIKES GIVEN BY USER
        ============================== */
        const totalLikesGiven = await Like.countDocuments({
            user: userId
        });

        /* ===============================
           NOTIFICATIONS RECEIVED
        ============================== */
        const totalNotifications = await Notification.countDocuments({
            user: userId
        });

        /* ===============================
           FINAL STATS OBJECT
        ============================== */
        const stats = {
            totalItems: items.length,
            totalWardrobes: wardrobes.length,
            followers,
            following,
            totalLikesReceived,
            totalLikesGiven,
            totalNotifications
        };

        res.json({
            user,
            wardrobes,
            items,
            stats
        });

    } catch (err) {
        console.log("ADMIN USER DETAIL ERROR:", err);
        res.status(500).json({ message: "User detail error" });
    }
};

exports.postNotifications = async (req, res) => {
    try {
        const { title, body, recipients } = req.body;
        if (!title || !body) {
            return res.status(400).json({ message: "Title and body are required" });
        }
        let targetUserIds = [];
        if (recipients === "all") {
            const users = await User.find({}, '_id');
            targetUserIds = users.map(u => u._id);
        } else if (Array.isArray(recipients) && recipients.length > 0) {
            const users = await User.find({ _id: { $in: recipients } }, '_id');
            if (users.length !== recipients.length) {
                return res.status(400).json({ mesage: "some user ids are invalid" });
            }
            targetUserIds = recipients;
        } else {
            return res.status(400).json({ message: "Invalid recipient" });
        }

        const notifications = targetUserIds.map(userID => ({
            user: userID,
            type: "system",
            title,
            message: body,
            read: false
        }))

        const chunkSize = 1000;
        for (let i = 0; i < notifications.length; i += chunkSize) {
            const chunk = notifications.slice(i, i + chunkSize);
            await Notification.insertMany(chunk);
        }
        res.status(201).json({ message: `Notification sent to  ${targetUserIds.length} users` })

    } catch (err) {
        console.error(err)
        res.status(500).json({ message: "Failed to send notification" })
    }
}