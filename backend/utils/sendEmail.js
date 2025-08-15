// utils/sendEmail.js
const nodemailer = require('nodemailer');

const sendEmail = async (to, subject, text) => {
  try {
    /* ①  Use explicit SMTP instead of the generic "gmail" shortcut.
          Works with Google “App Passwords” or any other SMTP account. */
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,     // e.g. "smtp.gmail.com"
      port: 465,                       // 587 for STARTTLS, 465 for SSL
      secure: true,                    // true for port 465
      auth: {
        user: process.env.SMTP_USER,   // full mailbox
        pass: process.env.SMTP_PASS,   // app-password / SMTP password
      },
    });

    const info = await transporter.sendMail({
      from: `"Complaint Tracker" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text,
    });

    /* ②  Log the preview URL in DEV – handy if you can’t receive e-mails. */
    if (process.env.NODE_ENV !== 'production') {
      console.log('Message sent:', info.messageId);
    }
    return true;
  } catch (err) {
    console.error('✉️  Email send error:', err.message);
    return false;
  }
};

module.exports = sendEmail;
