import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PredictionApi } from '../lib/api';
import { PageLoader } from '../components/Spinner';
import { RiskBadge } from '../components/RiskBadge';
import { IconLightbulb } from '../components/Icons';
import { pct, number } from '../lib/format';

export function CustomerDetail() {
  const { runId, customerId } = useParams();
  const [customer, setCustomer] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    PredictionApi.getCustomer(runId, customerId)
      .then(({ data }) => setCustomer(data.customer))
      .catch((e) => setError(e.message));
  }, [runId, customerId]);

  if (error) return <p className="text-risk-high text-sm">{error}</p>;
  if (!customer) return <PageLoader label="Loading customer…" />;

  const maxImpact = Math.max(...customer.topFactors.map((f) => Math.abs(f.impact)), 0.0001);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-text-faint text-xs mb-1">
          <Link to="/predictions" className="hover:text-text-muted">
            Predictions
          </Link>{' '}
          /{' '}
          <Link to={`/predictions/${runId}`} className="hover:text-text-muted">
            Run
          </Link>{' '}
          / {customer.customerId}
        </p>
        <h1 className="font-display text-2xl text-text">{customer.customerId}</h1>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="panel px-5 py-5 flex items-center justify-between">
          <div>
            <span className="text-xs text-text-muted block mb-1">Churn probability</span>
            <span className="font-display text-4xl tabular text-text">{pct(customer.churnProbability)}</span>
          </div>
          <RiskBadge level={customer.riskLevel} />
        </div>
        <div className="panel px-5 py-5">
          <span className="text-xs text-text-muted block mb-2">Probability</span>
          <div className="h-2.5 bg-ink-raised rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${
                customer.riskLevel === 'High'
                  ? 'bg-risk-high'
                  : customer.riskLevel === 'Medium'
                  ? 'bg-risk-medium'
                  : 'bg-risk-low'
              }`}
              style={{ width: `${Math.min(100, customer.churnProbability * 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-text-faint text-xs mt-2 tabular">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>
      </div>

      <div className="panel p-5">
        <h2 className="text-text text-sm font-medium mb-1">What's driving this score</h2>
        <p className="text-text-faint text-xs mb-5">
          Factors pushing toward churn extend right in red; protective factors extend left in green.
        </p>
        <div className="flex flex-col gap-3">
          {customer.topFactors.map((f) => {
            const positive = f.impact >= 0;
            const widthPct = (Math.abs(f.impact) / maxImpact) * 50;
            return (
              <div key={f.feature} className="grid grid-cols-[1fr,2fr] gap-4 items-center">
                <div className="text-right">
                  <span className="text-text text-sm">{f.feature}</span>
                  {f.value !== undefined && f.value !== null && f.value !== '' && (
                    <span className="text-text-faint text-xs block">{String(f.value)}</span>
                  )}
                </div>
                <div className="relative h-6">
                  <div className="absolute left-1/2 top-0 bottom-0 w-px bg-ink-line" />
                  <div
                    className={`absolute top-1 bottom-1 rounded-sm ${positive ? 'bg-risk-high' : 'bg-risk-low'}`}
                    style={
                      positive
                        ? { left: '50%', width: `${widthPct}%` }
                        : { right: '50%', width: `${widthPct}%` }
                    }
                  />
                  <span
                    className={`absolute top-1/2 -translate-y-1/2 text-xs tabular ${positive ? 'text-risk-high' : 'text-risk-low'}`}
                    style={
                      positive
                        ? { left: `calc(50% + ${widthPct}% + 6px)` }
                        : { right: `calc(50% + ${widthPct}% + 6px)` }
                    }
                  >
                    {f.impact > 0 ? '+' : ''}
                    {number(Math.round(f.impact * 1000) / 1000)}
                  </span>
                </div>
              </div>
            );
          })}
          {!customer.topFactors.length && <p className="text-text-muted text-sm">No factor data for this customer.</p>}
        </div>
      </div>

      <div className="panel p-5">
        <h2 className="text-text text-sm font-medium mb-4 flex items-center gap-2">
          <IconLightbulb className="text-brand" />
          Recommended actions
        </h2>
        {customer.recommendations?.length ? (
          <div className="flex flex-col gap-4">
            {customer.recommendations.map((r, i) => (
              <div key={i} className="hairline pb-4 last:border-0 last:pb-0">
                <span className="inline-block text-xs px-2 py-0.5 rounded-sm bg-brand/10 text-brand mb-1.5">
                  {r.category}
                </span>
                <p className="text-text text-sm font-medium mb-0.5">{r.action}</p>
                <p className="text-text-muted text-sm">{r.reason}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-text-muted text-sm">No recommendations for this customer.</p>
        )}
      </div>
    </div>
  );
}
