/**
 * ML adapter. The rest of the backend only calls predictChurn(filePath, meta).
 *
 * Expected contract from the Python model service (POST {ML_SERVICE_URL}/predict, multipart field "file"):
 * {
 *   "model_version": "xgb-v1",
 *   "results": [
 *     { "customer_id": "7590-VHVEG",
 *       "churn_probability": 0.81,
 *       "top_factors": [ { "feature": "Contract", "impact": 0.32, "value": "Month-to-month" }, ... ] }
 *   ]
 * }
 * impact = SHAP value (positive = pushes towards churn).
 *
 * ML_MODE=mock generates deterministic fake results so the whole platform can be tested before the model exists.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const { parseCsv, ID_RE, TARGET_RE } = require('./csvService');

const h = (s) => parseInt(crypto.createHash('md5').update(String(s)).digest('hex').slice(0, 8), 16) / 0xffffffff;

async function mockPredict(filePath, meta) {
  const { records, columns } = parseCsv(fs.readFileSync(filePath));
  const idCol = meta.idColumn || columns.find((c) => ID_RE.test(c));
  const feats = columns.filter((c) => c !== idCol && !TARGET_RE.test(c));
  const results = records.map((row, i) => {
    const customer_id = idCol ? row[idCol] : String(i + 1);
    const seed = customer_id + JSON.stringify(row);
    const p = Math.min(0.99, Math.max(0.01, (h(seed + 'a') + h(seed + 'b')) / 2 + (h(seed + 'c') - 0.5) * 0.2));
    const top_factors = [...feats]
      .sort((a, b) => h(seed + a) - h(seed + b))
      .slice(0, 3)
      .map((f) => ({ feature: f, impact: Number(((h(seed + f + 'i') - 0.3) * 0.4).toFixed(4)), value: row[f] }))
      .sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
    return { customer_id, churn_probability: Number(p.toFixed(4)), top_factors };
  });
  return { model_version: 'mock-v0', results };
}

async function httpPredict(filePath) {
  const buf = fs.readFileSync(filePath);
  const form = new FormData();
  form.append('file', new Blob([buf], { type: 'text/csv' }), path.basename(filePath));
  let res;
  try {
    res = await fetch(`${env.ML_SERVICE_URL}/predict`, {
      method: 'POST',
      body: form,
      headers: env.ML_SERVICE_API_KEY ? { 'x-api-key': env.ML_SERVICE_API_KEY } : {},
      signal: AbortSignal.timeout(env.ML_TIMEOUT_MS),
    });
  } catch (e) {
    throw new ApiError(502, `ML service unreachable: ${e.message}`);
  }
  if (!res.ok) throw new ApiError(502, `ML service error (${res.status}): ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  if (!Array.isArray(data.results)) throw new ApiError(502, 'ML service returned an invalid response (missing "results")');
  return data;
}

exports.predictChurn = (filePath, meta = {}) =>
  env.ML_MODE === 'http' ? httpPredict(filePath, meta) : mockPredict(filePath, meta);
