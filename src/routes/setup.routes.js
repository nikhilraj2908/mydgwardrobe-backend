const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const User = require("../models/user.model");

/* ============================
   PAGE TO CREATE SUPERADMIN
============================ */
router.get("/create-superadmin", async (req, res) => {

  // ❗ Prevent if already exists
  const existing = await User.findOne({ role: "superadmin" });
  if (existing) {
    return res.send("<h2>Superadmin already exists</h2>");
  }

  res.send(`
    <html>
      <body style="font-family:sans-serif;padding:40px">
        <h2>Create Super Admin</h2>
        <form method="POST" action="/api/setup/create-superadmin">
          <input name="username" placeholder="Username" required /><br/><br/>
          <input name="email" placeholder="Email" required /><br/><br/>
          <input name="password" type="password" placeholder="Password" required /><br/><br/>
          <input name="secret" placeholder="Setup Secret" required /><br/><br/>
          <button type="submit">Create Superadmin</button>
        </form>
      </body>
    </html>
  `);
});


/* ============================
   CREATE SUPERADMIN
============================ */
router.post("/create-superadmin", async (req, res) => {
  try {
    const { username, email, password, secret } = req.body;

    // 🔐 verify secret
    if (secret !== process.env.ADMIN_SETUP_SECRET) {
      return res.send("<h3>Invalid setup secret</h3>");
    }

    // ❗ prevent multiple superadmins
    const existing = await User.findOne({ role: "superadmin" });
    if (existing) {
      return res.send("<h3>Superadmin already exists</h3>");
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      email,
      password: hashed,
      role: "superadmin",
      isVerified: true,
      profileCompleted: true
    });

    res.send(`
      <h2>Superadmin Created Successfully</h2>
      <p>Email: ${user.email}</p>
      <p>You can now login normally.</p>
    `);

  } catch (err) {
    console.log(err);
    res.send("<h3>Error creating superadmin</h3>");
  }
});

module.exports = router;