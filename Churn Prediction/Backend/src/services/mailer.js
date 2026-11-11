const nodemailer = require('nodemailer');
const env = require('../config/env');

let transporter = null;
if (env.SMTP.host && env.SMTP.user) {
  transporter = nodemailer.createTransport({
    host: env.SMTP.host,
    port: env.SMTP.port,
    secure: env.SMTP.port === 465,
    auth: { user: env.SMTP.user, pass: env.SMTP.pass },
  });
}

exports.sendOtpEmail = async (email, otp) => {
  if (!transporter) {
    if (env.NODE_ENV === 'production') throw new Error('SMTP is not configured');
    console.log(`\n[DEV] OTP for ${email}: ${otp}\n`);
    return;
  }
  await transporter.sendMail({
    from: env.SMTP.from,
    to: email,
    subject: 'Your RetainEdge login code',
    text: `Your RetainEdge verification code is ${otp}. It expires in ${env.OTP_EXPIRY_MINUTES} minutes.`,
    html: `<div style="font-family:Arial,sans-serif"><h2>RetainEdge</h2><p>Your verification code is</p>
      <p style="font-size:28px;font-weight:bold;letter-spacing:6px">${otp}</p>
      <p>It expires in ${env.OTP_EXPIRY_MINUTES} minutes. If you didn't request it, ignore this email.</p></div>`,
  });
};
