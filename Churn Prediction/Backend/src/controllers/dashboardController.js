const mongoose = require('mongoose');
const PredictionRun = require('../models/PredictionRun');
const Prediction = require('../models/Prediction');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/dashboard/summary?runId=<optional>  (defaults to the latest completed run)
exports.summary = asyncHandler(async (req, res) => {
  const filter = { user: req.user._id, status: 'completed' };
  if (req.query.runId) {
    if (!mongoose.isValidObjectId(req.query.runId)) throw new ApiError(400, 'Invalid runId');
    filter._id = req.query.runId;
  }
  const run = await PredictionRun.findOne(filter).sort({ createdAt: -1 });
  if (!run) return res.json({ success: true, hasData: false, message: 'No completed predictions yet. Upload a dataset and run a prediction.' });

  const [highRiskCustomers, recommendationCounts, histogram] = await Promise.all([
    Prediction.find({ run: run._id, riskLevel: 'High' }).sort({ churnProbability: -1 }).limit(10).select('-run -user'),
    Prediction.aggregate([
      { $match: { run: run._id, riskLevel: { $in: ['High', 'Medium'] } } },
      { $unwind: '$recommendations' },
      { $group: { _id: '$recommendations.category', count: { $sum: 1 }, action: { $first: '$recommendations.action' } } },
      { $sort: { count: -1 } },
    ]),
    Prediction.aggregate([
      { $match: { run: run._id } },
      { $bucket: { groupBy: '$churnProbability', boundaries: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0001], default: 'other', output: { count: { $sum: 1 } } } },
    ]),
  ]);

  const pct = (n) => (run.totalCustomers ? Number(((n / run.totalCustomers) * 100).toFixed(1)) : 0);
  res.json({
    success: true,
    hasData: true,
    run: { id: run._id, datasetName: run.datasetName, createdAt: run.createdAt, modelVersion: run.modelVersion, mode: run.mode },
    kpis: {
      totalCustomers: run.totalCustomers,
      highRisk: run.highRisk,
      mediumRisk: run.mediumRisk,
      lowRisk: run.lowRisk,
      avgChurnProbability: run.avgChurnProbability,
      predictedChurnRatePct: pct(run.highRisk),
    },
    riskDistribution: [
      { level: 'High', count: run.highRisk, pct: pct(run.highRisk) },
      { level: 'Medium', count: run.mediumRisk, pct: pct(run.mediumRisk) },
      { level: 'Low', count: run.lowRisk, pct: pct(run.lowRisk) },
    ],
    probabilityHistogram: histogram.map((b) => ({ from: b._id, to: Math.min(1, Number((b._id + 0.1).toFixed(1))), count: b.count })),
    topChurnDrivers: run.topDrivers,
    recommendationSummary: recommendationCounts.map((r) => ({ category: r._id, customers: r.count, sampleAction: r.action })),
    highRiskCustomers,
  });
});
