const nodemailer = require("nodemailer");
console.log("EMAIL:", process.env.SMTP_EMAIL);
console.log("PASS:", process.env.SMTP_PASSWORD ? "LOADED" : "EMPTY");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD,
  },
});
const sendOTP = async (email, otp) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: `"Your DG Closet" <${process.env.SMTP_EMAIL}>`,
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
  } catch (err) {
    console.error("❌ Error sending OTP:", err);
  }
};


const sendResetMail = async (email, link) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: `"Your DG Closet" <${process.env.SMTP_EMAIL}>`,
      to: email,
      subject: "Reset Your Password",
      html: `
        <div style="font-family:Arial;font-size:16px">
          <p>You requested to reset your password.</p>
          <p>Click the button below:</p>

          <a href="${link}" 
            style="display:inline-block;padding:12px 20px;background:#A855F7;
            color:white;border-radius:6px;text-decoration:none;font-weight:bold;">
            Reset Password
          </a>

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

