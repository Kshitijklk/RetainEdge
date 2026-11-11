const multer = require('multer');
const path = require('path');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');

module.exports = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.MAX_UPLOAD_MB * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const ok = path.extname(file.originalname).toLowerCase() === '.csv';
    cb(ok ? null : new ApiError(400, 'Only .csv files are allowed'), ok);
  },
}).single('file');
