// Rule-based recommendations: churn factor -> category -> action (SRS section 7.6)
const RULES = [
  {
    category: 'Billing',
    match: /(charge|bill|payment|price|fee|amount|revenue|balance|invoice|discount)/i,
    action: 'Offer a loyalty discount or a flexible/cheaper billing plan',
  },
  {
    category: 'Service',
    match: /(support|complaint|ticket|service|internet|tech|security|backup|protection|streaming|usage|engagement|login|call|latency|outage)/i,
    action: 'Trigger a proactive customer-support intervention',
  },
  {
    category: 'Contract',
    match: /(contract|tenure|plan|subscription|term|renew|paperless|age|duration)/i,
    action: 'Offer a contract upgrade or renewal incentive',
  },
];

const FALLBACK = {
  category: 'Engagement',
  action: 'Run a personalised engagement / check-in campaign',
};

const categorize = (feature) => RULES.find((r) => r.match.test(feature)) || FALLBACK;

/**
 * @param {string} riskLevel High | Medium | Low
 * @param {Array<{feature:string, impact:number}>} factors
 */
exports.generate = (riskLevel, factors = []) => {
  if (riskLevel === 'Low') {
    return [{ category: 'Retention', action: 'No urgent action - keep customer engaged with regular loyalty communication', reason: 'Low churn risk' }];
  }
  const out = [];
  const used = new Set();
  // only factors that push the customer towards churn (impact > 0)
  const drivers = factors.filter((f) => f.impact > 0).sort((a, b) => b.impact - a.impact);
  for (const f of drivers) {
    const rule = categorize(f.feature);
    if (used.has(rule.category)) continue;
    used.add(rule.category);
    out.push({ category: rule.category, action: rule.action, reason: `Driven by "${f.feature}"` });
    if (out.length === 3) break;
  }
  if (!out.length) out.push({ ...FALLBACK, reason: 'No dominant churn driver identified' });
  if (riskLevel === 'High' && !used.has('Service')) {
    out.push({ category: 'Service', action: 'Schedule a personal outreach call from the retention team', reason: 'High churn risk' });
  }
  return out;
};
