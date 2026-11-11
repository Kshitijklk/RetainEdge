const mongoose = require('mongoose');

const columnSchema = new mongoose.Schema(
  { name: String, type: { type: String, enum: ['numeric', 'text'] }, missing: Number, unique: Number },
  { _id: false }
);

const datasetSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    originalName: String,
    filePath: String,
    sizeBytes: Number,
    rowCount: Number,
    columnCount: Number,
    duplicateRows: Number,
    columns: [columnSchema],
    preview: [mongoose.Schema.Types.Mixed],
    idColumn: String,
    targetColumn: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model('Dataset', datasetSchema);
