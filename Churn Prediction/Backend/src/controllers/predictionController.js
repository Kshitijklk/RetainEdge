const mongoose = require('mongoose');
const Dataset = require('../models/Dataset');
const PredictionRun = require('../models/PredictionRun');
const Prediction = require('../models/Prediction');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { processRun } = require('../services/predictionService');
const env = require('../config/env');

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function ownRun(req) {
  const run = await PredictionRun.findOne({ _id: req.params.runId, user: req.user._id });
  if (!run) throw new ApiError(404, 'Prediction run not found');
  return run;
}

// Starts a run; processing happens in background. Poll GET /runs/:runId until status != processing.
exports.startRun = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.body.datasetId)) throw new ApiError(400, 'Invalid datasetId');
  const dataset = await Dataset.findOne({ _id: req.body.datasetId, user: req.user._id });
  if (!dataset) throw new ApiError(404, 'Dataset not found');

  const run = await PredictionRun.create({
    user: req.user._id,
    dataset: dataset._id,
    datasetName: dataset.originalName,
    totalCustomers: dataset.rowCount,
    mode: env.ML_MODE,
  });
  setImmediate(() => processRun(run._id));
  res.status(202).json({ success: true, message: 'Prediction started', run });
});

// Prediction history
exports.listRuns = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Number(req.query.limit) || 10);
  const [runs, total] = await Promise.all([
    PredictionRun.find({ user: req.user._id }).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    PredictionRun.countDocuments({ user: req.user._id }),
  ]);
  res.json({ success: true, page, limit, total, runs });
});

exports.getRun = asyncHandler(async (req, res) => {
  res.json({ success: true, run: await ownRun(req) });
});

exports.listCustomers = asyncHandler(async (req, res) => {
  const run = await ownRun(req);
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Number(req.query.limit) || 20);
  const filter = { run: run._id };
  if (['High', 'Medium', 'Low'].includes(req.query.risk)) filter.riskLevel = req.query.risk;
  if (req.query.search) filter.customerId = new RegExp(esc(String(req.query.search)), 'i');
  const sort = req.query.sort === 'asc' ? 1 : -1;

  const [customers, total] = await Promise.all([
    Prediction.find(filter).sort({ churnProbability: sort }).skip((page - 1) * limit).limit(limit).select('-run -user'),
    Prediction.countDocuments(filter),
  ]);
  res.json({ success: true, page, limit, total, pages: Math.ceil(total / limit), customers });
});

exports.getCustomer = asyncHandler(async (req, res) => {
  const run = await ownRun(req);
  const customer = await Prediction.findOne({ run: run._id, customerId: req.params.customerId }).select('-run -user');
  if (!customer) throw new ApiError(404, 'Customer not found in this run');
  res.json({ success: true, customer });
});

exports.exportCsv = asyncHandler(async (req, res) => {
  const run = await ownRun(req);
  const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="retainedge-run-${run._id}.csv"`);
  res.write('customer_id,churn_probability,risk_level,top_factors,recommendations\n');
  for await (const p of Prediction.find({ run: run._id }).sort({ churnProbability: -1 }).cursor()) {
    res.write(
      [
        q(p.customerId),
        p.churnProbability,
        p.riskLevel,
        q(p.topFactors.map((f) => `${f.feature} (${f.impact})`).join('; ')),
        q(p.recommendations.map((r) => r.action).join('; ')),
      ].join(',') + '\n'
    );
  }
  res.end();
});

exports.removeRun = asyncHandler(async (req, res) => {
  const run = await ownRun(req);
  await Prediction.deleteMany({ run: run._id });
  await run.deleteOne();
  res.json({ success: true, message: 'Prediction run deleted' });
});
