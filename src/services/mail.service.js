const nodemailer = require("nodemailer");
console.log("EMAIL:", process.env.SMTP_EMAIL);
console.log("PASS:", process.env.SMTP_PASSWORD ? "LOADED" : "EMPTY");

// const transporter = nodemailer.createTransport({
//   service: "gmail",
//   auth: {
//     user: process.env.SMTP_EMAIL,
//     pass: process.env.SMTP_PASSWORD,
//   },
// });
const transporter = nodemailer.createTransport({
  host: "mail.digiwardrobe.com",
  port: 465,
  secure: true,                // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD,
  },
});

// -------------------------
// SEND OTP (4-digit)
// -------------------------
const sendOTP = async (email, otp) => {
  try {
    await transporter.sendMail({
      from: `"DG WARDROBE" <${process.env.SMTP_EMAIL}>`,
      to: email,
      subject: "Your Verification Code",
      html: `
        <div style="font-family:Arial;font-size:16px">
          <p>Your verification code is:</p>
          <h2 style="color:#d633ff">${otp}</h2>
          <p>This code expires in 5 minutes.</p>
        </div>
      `,
    });

    console.log("📧 OTP sent to", email);
  } catch (error) {
    console.error("❌ Error sending OTP:", error);
  }
};



const sendResetMail = async (email, link) => {
  try {
    await transporter.sendMail({
      from: `"DG WARDROBE" <${process.env.SMTP_EMAIL}>`,
      to: email,
      subject: "Reset Your Password",
      html: `
        <div style="font-family:Arial;font-size:16px">
          <p>You requested to reset your password.</p>
          <p>Click the button below to continue:</p>

          <!-- 🔥 BUTTON (clickable on all devices) -->
          <a href="${link}" 
            style="display:inline-block;padding:12px 20px;background:#A855F7;
            color:white;border-radius:6px;text-decoration:none;font-weight:bold;"
            target="_blank">
            Reset Password
          </a>

          <p style="margin-top:25px;">If the button does not work, click or copy this link:</p>

          <!-- 🔥 FALLBACK LINK (makes the deep link clickable even in Gmail) -->
          <p>
            <a href="${link}" style="color:#A855F7;word-break:break-all;">
              ${link}
            </a>
          </p>

          <p style="margin-top:20px;">This link will expire in 15 minutes.</p>
        </div>
      `,
    });

    console.log("📧 RESET LINK sent to", email);
  } catch (err) {
    console.error("❌ Error sending RESET MAIL:", err);
  }
};

module.exports = { sendOTP, sendResetMail };

