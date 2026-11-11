const mongoose = require('mongoose');

const predictionSchema = new mongoose.Schema({
  run: { type: mongoose.Schema.Types.ObjectId, ref: 'PredictionRun', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  customerId: { type: String, required: true },
  churnProbability: { type: Number, required: true },
  riskLevel: { type: String, enum: ['High', 'Medium', 'Low'], required: true },
  topFactors: [{ _id: false, feature: String, impact: Number, value: mongoose.Schema.Types.Mixed }],
  recommendations: [{ _id: false, category: String, action: String, reason: String }],
});
predictionSchema.index({ run: 1, riskLevel: 1, churnProbability: -1 });
predictionSchema.index({ run: 1, customerId: 1 });

module.exports = mongoose.model('Prediction', predictionSchema);
