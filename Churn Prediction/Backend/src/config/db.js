const mongoose = require('mongoose');
const env = require('./env');
const User = require('../models/User');

module.exports = async function connectDB() {
  try {
    await mongoose.connect(env.MONGODB_URI);
    // Existing installations may still have the old non-sparse email index.
    await User.collection.dropIndex('email_1').catch(() => {});
    await User.syncIndexes();
    console.log('MongoDB Atlas connected');
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  }
};
