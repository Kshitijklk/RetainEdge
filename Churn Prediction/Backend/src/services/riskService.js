const env = require('../config/env');

exports.riskLevel = (p) => (p >= env.RISK_HIGH ? 'High' : p >= env.RISK_MEDIUM ? 'Medium' : 'Low');
