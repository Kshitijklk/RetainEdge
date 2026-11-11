const env = require('../config/env');

exports.notFound = (req, res) => res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });

exports.errorHandler = (err, _req, res, _next) => {
  let status = err.status || 500;
  let message = err.message || 'Internal server error';

  if (err.name === 'MulterError') {
    status = 400;
    message = err.code === 'LIMIT_FILE_SIZE' ? `File too large (max ${env.MAX_UPLOAD_MB} MB)` : err.message;
  } else if (err.name === 'CastError') {
    status = 400;
    message = 'Invalid ID format';
  } else if (err.name === 'ValidationError') {
    status = 400;
  } else if (err.code === 11000) {
    status = 409;
    message = 'Duplicate record';
  }

  if (status >= 500) console.error(err);
  res.status(status).json({
    success: false,
    message: status >= 500 && env.NODE_ENV === 'production' ? 'Internal server error' : message,
    ...(err.details ? { details: err.details } : {}),
  });
};
