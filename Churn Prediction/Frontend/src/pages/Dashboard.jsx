import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { DashboardApi, PredictionApi } from '../lib/api';
import { PageLoader } from '../components/Spinner';
import { EmptyState } from '../components/EmptyState';
import { StatCard } from '../components/StatCard';
import { RiskBadge } from '../components/RiskBadge';
import { IconDatabase, IconLightbulb, IconChevronRight } from '../components/Icons';
import { pct, number, dateTime } from '../lib/format';

const RISK_HEX = { High: '#F0475C', Medium: '#F2B84B', Low: '#34C795' };

export function Dashboard() {
  const [runs, setRuns] = useState([]);
  const [selectedRunId, setSelectedRunId] = useState('');
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    PredictionApi.listRuns({ limit: 50 })
      .then(({ data }) => setRuns(data.runs.filter((r) => r.status === 'completed')))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    setError('');
    DashboardApi.summary(selectedRunId || undefined)
      .then(({ data }) => setSummary(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [selectedRunId]);

  const donutData = useMemo(
    () => summary?.riskDistribution?.map((r) => ({ name: r.level, value: r.count })) || [],
    [summary]
  );

  if (loading) return <PageLoader label="Loading dashboard…" />;

  if (error) {
    return (
      <EmptyState
        title="Couldn't load the dashboard"
        description={error}
        action={
          <button className="btn-secondary" onClick={() => setSelectedRunId((v) => v)}>
            Try again
          </button>
        }
      />
    );
  }

  if (!summary?.hasData) {
    return (
      <EmptyState
        icon={<IconDatabase width={32} height={32} />}
        title="No predictions yet"
        description="Upload a customer CSV and run a prediction to see churn risk here."
        action={
          <Link to="/datasets" className="btn-primary">
            Upload a dataset
          </Link>
        }
      />
    );
  }

  const { kpis, run } = summary;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl text-text mb-1">Dashboard</h1>
          <p className="text-text-muted text-sm">
            {run.datasetName} · run completed {dateTime(run.createdAt)}
            {run.modelVersion ? ` · model ${run.modelVersion}` : ''}
          </p>
        </div>
        {runs.length > 1 && (
          <select
            className="input w-auto"
            value={selectedRunId || runs.find((r) => r._id === run.id)?._id || run.id}
            onChange={(e) => setSelectedRunId(e.target.value)}
          >
            {runs.map((r) => (
              <option key={r._id} value={r._id}>
                {r.datasetName} — {dateTime(r.createdAt)}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="Total customers" value={number(kpis.totalCustomers)} />
        <StatCard label="High risk" value={number(kpis.highRisk)} accent="text-risk-high" sub={`${kpis.predictedChurnRatePct}% of base`} />
        <StatCard label="Medium risk" value={number(kpis.mediumRisk)} accent="text-risk-medium" />
        <StatCard label="Low risk" value={number(kpis.lowRisk)} accent="text-risk-low" />
        <StatCard label="Avg. churn probability" value={pct(kpis.avgChurnProbability)} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="panel p-5">
          <h2 className="text-text text-sm font-medium mb-4">Risk distribution</h2>
          <div className="flex items-center gap-6">
            <div className="w-40 h-40 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={48}
                    outerRadius={70}
                    paddingAngle={2}
                    stroke="none"
                  >
                    {donutData.map((d) => (
                      <Cell key={d.name} fill={RISK_HEX[d.name]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#1F2635', border: '1px solid #2A3244', borderRadius: 6, fontSize: 12 }}
                    formatter={(value, name) => [number(value), name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 flex flex-col gap-2.5">
              {summary.riskDistribution.map((r) => (
                <div key={r.level} className="flex items-center justify-between text-sm">
                  <RiskBadge level={r.level} size="sm" />
                  <span className="tabular text-text-muted">
                    {number(r.count)} <span className="text-text-faint">({r.pct}%)</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="panel p-5">
          <h2 className="text-text text-sm font-medium mb-4">Churn probability distribution</h2>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary.probabilityHistogram} margin={{ left: -20 }}>
                <CartesianGrid vertical={false} stroke="#2A3244" />
                <XAxis
                  dataKey="from"
                  tickFormatter={(v) => `${Math.round(v * 100)}`}
                  tick={{ fill: '#8D96AA', fontSize: 11 }}
                  axisLine={{ stroke: '#2A3244' }}
                  tickLine={false}
                />
                <YAxis tick={{ fill: '#8D96AA', fontSize: 11 }} axisLine={false} tickLine={false} width={30} />
                <Tooltip
                  contentStyle={{ background: '#1F2635', border: '1px solid #2A3244', borderRadius: 6, fontSize: 12 }}
                  labelFormatter={(v) => `${Math.round(v * 100)}–${Math.round((v + 0.1) * 100)}% probability`}
                  formatter={(value) => [number(value), 'Customers']}
                />
                <Bar dataKey="count" fill="#FF6B47" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="panel p-5">
          <h2 className="text-text text-sm font-medium mb-4">Top churn drivers</h2>
          {summary.topChurnDrivers?.length ? (
            <div className="flex flex-col gap-3">
              {summary.topChurnDrivers.map((d) => {
                const max = Math.max(...summary.topChurnDrivers.map((x) => x.count), 1);
                return (
                  <div key={d.feature}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-text">{d.feature}</span>
                      <span className="text-text-muted tabular">{number(d.count)} customers</span>
                    </div>
                    <div className="h-1.5 bg-ink-raised rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand rounded-full"
                        style={{ width: `${(d.count / max) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-text-muted text-sm">No driver data for this run.</p>
          )}
        </div>

        <div className="panel p-5">
          <h2 className="text-text text-sm font-medium mb-4 flex items-center gap-2">
            <IconLightbulb className="text-brand" />
            Recommended actions
          </h2>
          {summary.recommendationSummary?.length ? (
            <div className="flex flex-col gap-3">
              {summary.recommendationSummary.map((r) => (
                <div key={r.category} className="hairline pb-3 last:border-0 last:pb-0">
                  <div className="flex justify-between text-sm mb-0.5">
                    <span className="text-text font-medium">{r.category}</span>
                    <span className="text-text-muted tabular">{number(r.customers)}</span>
                  </div>
                  <p className="text-text-faint text-xs">{r.sampleAction}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-text-muted text-sm">No recommendations for this run.</p>
          )}
        </div>
      </div>

      <div className="panel">
        <div className="flex items-center justify-between px-5 py-4 hairline">
          <h2 className="text-text text-sm font-medium">Highest-risk customers</h2>
          <Link
            to={`/predictions/${run.id}`}
            className="text-brand text-sm hover:underline flex items-center gap-1"
          >
            View full run <IconChevronRight />
          </Link>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-text-faint text-xs">
              <th className="text-left font-medium px-5 py-2.5">Customer</th>
              <th className="text-left font-medium px-5 py-2.5">Risk</th>
              <th className="text-left font-medium px-5 py-2.5">Probability</th>
              <th className="text-left font-medium px-5 py-2.5">Top factor</th>
            </tr>
          </thead>
          <tbody>
            {summary.highRiskCustomers.map((c) => (
              <tr key={c._id} className="hairline last:border-0 hover:bg-ink-raised/60">
                <td className="px-5 py-2.5">
                  <Link to={`/predictions/${run.id}/customers/${c.customerId}`} className="text-text hover:text-brand">
                    {c.customerId}
                  </Link>
                </td>
                <td className="px-5 py-2.5">
                  <RiskBadge level={c.riskLevel} size="sm" />
                </td>
                <td className="px-5 py-2.5 tabular text-text-muted">{pct(c.churnProbability)}</td>
                <td className="px-5 py-2.5 text-text-muted">{c.topFactors?.[0]?.feature || '—'}</td>
              </tr>
            ))}
            {!summary.highRiskCustomers.length && (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-text-muted">
                  No high-risk customers in this run.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
