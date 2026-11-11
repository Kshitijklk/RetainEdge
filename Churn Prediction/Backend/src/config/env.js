require('dotenv').config();

const required = ['MONGODB_URI', 'JWT_SECRET'];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`Missing required env vars: ${missing.join(', ')}`);
  process.exit(1);
}

const num = (v, d) => (v !== undefined && v !== '' ? Number(v) : d);

module.exports = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: num(process.env.PORT, 5000),
  CLIENT_URLS: (process.env.CLIENT_URL || 'http://localhost:3000').split(',').map((s) => s.trim()),
  MONGODB_URI: process.env.MONGODB_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  OTP_EXPIRY_MINUTES: num(process.env.OTP_EXPIRY_MINUTES, 5),
  OTP_MAX_ATTEMPTS: num(process.env.OTP_MAX_ATTEMPTS, 5),
  OTP_RESEND_COOLDOWN_SECONDS: num(process.env.OTP_RESEND_COOLDOWN_SECONDS, 60),
  FIREBASE: {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
  },
  SMTP: {
    host: process.env.SMTP_HOST,
    port: num(process.env.SMTP_PORT, 587),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.MAIL_FROM || 'RetainEdge <no-reply@retainedge.com>',
  },
  MAX_UPLOAD_MB: num(process.env.MAX_UPLOAD_MB, 200),
  UPLOAD_DIR: process.env.UPLOAD_DIR || 'uploads',
  ML_MODE: process.env.ML_MODE || 'mock',
  ML_SERVICE_URL: process.env.ML_SERVICE_URL || 'http://localhost:8000',
  ML_SERVICE_API_KEY: process.env.ML_SERVICE_API_KEY || '',
  ML_TIMEOUT_MS: num(process.env.ML_TIMEOUT_MS, 600000),
  RISK_HIGH: num(process.env.RISK_HIGH_THRESHOLD, 0.7),
  RISK_MEDIUM: num(process.env.RISK_MEDIUM_THRESHOLD, 0.4),
};
