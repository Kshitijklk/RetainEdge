const mongoose = require('mongoose');

const runSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    dataset: { type: mongoose.Schema.Types.ObjectId, ref: 'Dataset', required: true },
    datasetName: String,
    status: { type: String, enum: ['processing', 'completed', 'failed'], default: 'processing' },
    error: String,
    mode: { type: String, default: 'mock' }, // mock | http
    modelVersion: String,
    totalCustomers: { type: Number, default: 0 },
    highRisk: { type: Number, default: 0 },
    mediumRisk: { type: Number, default: 0 },
    lowRisk: { type: Number, default: 0 },
    avgChurnProbability: { type: Number, default: 0 },
    topDrivers: [{ _id: false, feature: String, count: Number, avgImpact: Number }],
    completedAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model('PredictionRun', runSchema);
