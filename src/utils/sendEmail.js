const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendEmail(to, subject, html) {
  try {
    await resend.emails.send({
      from: "YDC App <onboarding@resend.dev>",
      to,
      subject,
      html,
    });

    console.log("📧 Email sent via Resend to:", to);
  } catch (err) {
    console.error("❌ Resend email error:", err);
    throw err;
  }
}

module.exports = { sendEmail };
