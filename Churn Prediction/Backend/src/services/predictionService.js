const Prediction = require('../models/Prediction');
const PredictionRun = require('../models/PredictionRun');
const Dataset = require('../models/Dataset');
const { predictChurn } = require('./mlService');
const { riskLevel } = require('./riskService');
const { generate } = require('./recommendationService');

const CHUNK = 1000;

/** Runs in the background after the API has responded 202. */
exports.processRun = async (runId) => {
  const run = await PredictionRun.findById(runId);
  try {
    const dataset = await Dataset.findById(run.dataset);
    const ml = await predictChurn(dataset.filePath, { idColumn: dataset.idColumn });

    let high = 0, medium = 0, low = 0, sum = 0;
    const drivers = new Map();
    let batch = [];

    const flush = async () => {
      if (batch.length) await Prediction.insertMany(batch, { ordered: false });
      batch = [];
    };

    for (const [i, r] of ml.results.entries()) {
      const p = Math.min(1, Math.max(0, Number(r.churn_probability)));
      const level = riskLevel(p);
      const factors = (r.top_factors || []).slice(0, 5).map((f) => ({ feature: f.feature, impact: Number(f.impact), value: f.value }));
      if (level === 'High') high++; else if (level === 'Medium') medium++; else low++;
      sum += p;
      for (const f of factors) {
        const d = drivers.get(f.feature) || { count: 0, total: 0 };
        d.count++; d.total += Math.abs(f.impact);
        drivers.set(f.feature, d);
      }
      batch.push({
        run: run._id,
        user: run.user,
        customerId: String(r.customer_id ?? i + 1),
        churnProbability: p,
        riskLevel: level,
        topFactors: factors,
        recommendations: generate(level, factors),
      });
      if (batch.length >= CHUNK) await flush();
    }
    await flush();

    const total = ml.results.length;
    run.set({
      status: 'completed',
      modelVersion: ml.model_version || 'unknown',
      totalCustomers: total,
      highRisk: high,
      mediumRisk: medium,
      lowRisk: low,
      avgChurnProbability: total ? Number((sum / total).toFixed(4)) : 0,
      topDrivers: [...drivers.entries()]
        .map(([feature, d]) => ({ feature, count: d.count, avgImpact: Number((d.total / d.count).toFixed(4)) }))
        .sort((a, b) => b.count * b.avgImpact - a.count * a.avgImpact)
        .slice(0, 10),
      completedAt: new Date(),
    });
    await run.save();
  } catch (err) {
    console.error(`Run ${runId} failed:`, err.message);
    await Prediction.deleteMany({ run: runId });
    run.status = 'failed';
    run.error = err.message;
    await run.save();
  }
};
