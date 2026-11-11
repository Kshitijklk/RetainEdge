const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    phoneNumber: { type: String, unique: true, sparse: true, trim: true },
    name: { type: String, trim: true, default: '' },
    photoURL: { type: String, default: '' },
    firebaseUid: { type: String, index: true, sparse: true },
    providers: { type: [String], enum: ['google', 'phone'], default: [] },
    role: { type: String, enum: ['analyst', 'manager', 'admin'], default: 'analyst' },
    isActive: { type: Boolean, default: true },
    lastLoginAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
