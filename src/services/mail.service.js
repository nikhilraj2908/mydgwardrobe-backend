const nodemailer = require("nodemailer");

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
          <p>This code will expire in 5 minutes.</p>
        </div>
      `,
    });

    console.log("📧 OTP sent to", email);
  } catch (error) {
    console.error("❌ Error sending OTP:", error);
  }
};

module.exports = { sendOTP };
