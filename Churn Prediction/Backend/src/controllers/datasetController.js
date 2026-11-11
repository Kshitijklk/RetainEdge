const fs = require('fs');
const path = require('path');
const env = require('../config/env');
const Dataset = require('../models/Dataset');
const PredictionRun = require('../models/PredictionRun');
const Prediction = require('../models/Prediction');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { parseCsv, profile } = require('../services/csvService');

exports.upload = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'Attach a CSV file in the "file" field');

  const { records, columns } = parseCsv(req.file.buffer);
  const info = profile(records, columns);

  const dir = path.join(env.UPLOAD_DIR, String(req.user._id));
  fs.mkdirSync(dir, { recursive: true });
  const safe = path.basename(req.file.originalname).replace(/[^\w.\-]/g, '_');
  const filePath = path.join(dir, `${Date.now()}-${safe}`);
  fs.writeFileSync(filePath, req.file.buffer);

  const dataset = await Dataset.create({
    user: req.user._id,
    originalName: req.file.originalname,
    filePath,
    sizeBytes: req.file.size,
    rowCount: records.length,
    columnCount: columns.length,
    duplicateRows: info.duplicateRows,
    columns: info.columns,
    preview: records.slice(0, 10),
    idColumn: info.idColumn,
    targetColumn: info.targetColumn,
  });

  res.status(201).json({ success: true, dataset });
});

exports.list = asyncHandler(async (req, res) => {
  const datasets = await Dataset.find({ user: req.user._id }).select('-preview -columns').sort({ createdAt: -1 });
  res.json({ success: true, datasets });
});

exports.get = asyncHandler(async (req, res) => {
  const dataset = await Dataset.findOne({ _id: req.params.id, user: req.user._id });
  if (!dataset) throw new ApiError(404, 'Dataset not found');
  res.json({ success: true, dataset });
});

exports.remove = asyncHandler(async (req, res) => {
  const dataset = await Dataset.findOne({ _id: req.params.id, user: req.user._id });
  if (!dataset) throw new ApiError(404, 'Dataset not found');
  const runs = await PredictionRun.find({ dataset: dataset._id }).select('_id');
  await Prediction.deleteMany({ run: { $in: runs.map((r) => r._id) } });
  await PredictionRun.deleteMany({ dataset: dataset._id });
  fs.rm(dataset.filePath, { force: true }, () => {});
  await dataset.deleteOne();
  res.json({ success: true, message: 'Dataset and related predictions deleted' });
});
