const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { getFirebaseAdmin } = require('../config/firebase');

const signToken = (user) => jwt.sign({ id: user._id }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
const publicUser = (u) => ({ id: u._id, email: u.email, phoneNumber: u.phoneNumber, name: u.name, photoURL: u.photoURL, role: u.role, providers: u.providers });

// Firebase sends and verifies the SMS OTP; the API only verifies the resulting token.
exports.phoneLogin = asyncHandler(async (req, res) => {
  const fb = getFirebaseAdmin();
  if (!fb) throw new ApiError(503, 'Firebase is not configured on the server');

  let decoded;
  try {
    decoded = await fb.auth().verifyIdToken(req.body.idToken);
  } catch {
    throw new ApiError(401, 'Invalid Firebase token');
  }
  if (!decoded.phone_number) throw new ApiError(400, 'Firebase token has no phone number');

  const phoneNumber = decoded.phone_number;
  let user = await User.findOne({ phoneNumber });
  if (!user) user = new User({ phoneNumber, name: req.body.name || '' });
  if (!user.isActive) throw new ApiError(403, 'Account disabled');
  user.firebaseUid = decoded.uid;
  user.name = user.name || req.body.name || '';
  if (!user.providers.includes('phone')) user.providers.push('phone');
  user.lastLoginAt = new Date();
  await user.save();

  res.json({ success: true, token: signToken(user), user: publicUser(user) });
});

// ---------- FIREBASE GOOGLE LOGIN ----------
// Frontend signs in with Firebase (Google), then sends the Firebase ID token here.
exports.googleLogin = asyncHandler(async (req, res) => {
  const fb = getFirebaseAdmin();
  if (!fb) throw new ApiError(503, 'Firebase is not configured on the server');

  let decoded;
  try {
    decoded = await fb.auth().verifyIdToken(req.body.idToken);
  } catch {
    throw new ApiError(401, 'Invalid Firebase token');
  }
  if (!decoded.email) throw new ApiError(400, 'Google account has no email');
  if (decoded.email_verified === false) throw new ApiError(400, 'Google email is not verified');

  const email = decoded.email.toLowerCase();
  let user = await User.findOne({ email });
  if (!user) user = new User({ email });
  if (!user.isActive) throw new ApiError(403, 'Account disabled');
  user.firebaseUid = decoded.uid;
  user.name = user.name || decoded.name || email.split('@')[0];
  user.photoURL = decoded.picture || user.photoURL;
  if (!user.providers.includes('google')) user.providers.push('google');
  user.lastLoginAt = new Date();
  await user.save();

  res.json({ success: true, token: signToken(user), user: publicUser(user) });
});

exports.me = (req, res) => res.json({ success: true, user: publicUser(req.user) });

// JWT is stateless: the client deletes the token. Endpoint exists for the "Logout" use case.
exports.logout = (_req, res) => res.json({ success: true, message: 'Logged out. Please discard the token on the client.' });
