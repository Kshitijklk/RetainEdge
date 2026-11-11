import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PredictionApi } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { PageLoader } from '../components/Spinner';
import { RiskBadge } from '../components/RiskBadge';
import { Pagination } from '../components/Pagination';
import { ConfirmDialog } from '../components/ConfirmDialog';
import {
  IconSearch,
  IconDownload,
  IconTrash,
  IconAlert,
  IconSpinner,
  IconArrowUp,
  IconArrowDown,
} from '../components/Icons';
import { number, pct, dateTime } from '../lib/format';

const RISK_FILTERS = ['All', 'High', 'Medium', 'Low'];

export function PredictionRun() {
  const { runId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [run, setRun] = useState(null);
  const [runError, setRunError] = useState('');

  const [customers, setCustomers] = useState(null);
  const [risk, setRisk] = useState('All');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('desc');
  const [page, setPage] = useState(1);

  const [exporting, setExporting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const pollRef = useRef(null);

  const loadRun = useCallback(async () => {
    try {
      const { data } = await PredictionApi.getRun(runId);
      setRun(data.run);
      return data.run;
    } catch (e) {
      setRunError(e.message);
      return null;
    }
  }, [runId]);

  useEffect(() => {
    loadRun();
  }, [loadRun]);

  useEffect(() => {
    if (run?.status !== 'processing') return;
    pollRef.current = setInterval(async () => {
      const r = await loadRun();
      if (r && r.status !== 'processing') clearInterval(pollRef.current);
    }, 2000);
    return () => clearInterval(pollRef.current);
  }, [run?.status, loadRun]);

  const loadCustomers = useCallback(() => {
    if (run?.status !== 'completed') return;
    const params = { page, limit: 20, sort };
    if (risk !== 'All') params.risk = risk;
    if (search) params.search = search;
    PredictionApi.listCustomers(runId, params).then(({ data }) => setCustomers(data));
  }, [runId, run?.status, page, sort, risk, search]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  // Reset to page 1 whenever a filter changes.
  useEffect(() => {
    setPage(1);
  }, [risk, search, sort]);

  const handleExport = async () => {
    setExporting(true);
    try {
      await PredictionApi.exportCsv(runId, `retainedge-${run.datasetName}.csv`);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await PredictionApi.removeRun(runId);
      toast.success('Run deleted');
      navigate('/predictions');
    } catch (e) {
      toast.error(e.message);
      setDeleting(false);
    }
  };

  if (runError) return <p className="text-risk-high text-sm">{runError}</p>;
  if (!run) return <PageLoader label="Loading run…" />;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-text-faint text-xs mb-1">
            <Link to="/predictions" className="hover:text-text-muted">
              Predictions
            </Link>{' '}
            / {run.datasetName}
          </p>
          <h1 className="font-display text-2xl text-text">{run.datasetName}</h1>
          <p className="text-text-muted text-sm mt-1">
            Started {dateTime(run.createdAt)}
            {run.completedAt ? ` · completed ${dateTime(run.completedAt)}` : ''}
            {run.modelVersion ? ` · model ${run.modelVersion}` : ''}
          </p>
        </div>
        {run.status === 'completed' && (
          <div className="flex items-center gap-2">
            <button className="btn-secondary" onClick={handleExport} disabled={exporting}>
              {exporting ? <IconSpinner /> : <IconDownload />}
              Export CSV
            </button>
            <button className="btn-danger" onClick={() => setConfirmingDelete(true)}>
              <IconTrash />
              Delete run
            </button>
          </div>
        )}
      </div>

      {run.status === 'processing' && (
        <div className="panel flex items-center gap-3 px-5 py-6">
          <IconSpinner className="text-brand" width={22} height={22} />
          <div>
            <p className="text-text text-sm font-medium">Running the model on {number(run.totalCustomers)} customers…</p>
            <p className="text-text-muted text-xs mt-0.5">This updates automatically — no need to refresh.</p>
          </div>
        </div>
      )}

      {run.status === 'failed' && (
        <div className="panel flex items-center gap-3 px-5 py-6 border-risk-high/30">
          <span className="text-risk-high">
            <IconAlert width={22} height={22} />
          </span>
          <div>
            <p className="text-text text-sm font-medium">This run failed</p>
            <p className="text-text-muted text-xs mt-0.5">{run.error || 'An unexpected error occurred.'}</p>
          </div>
        </div>
      )}

      {run.status === 'completed' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <Stat label="Total customers" value={number(run.totalCustomers)} />
            <Stat label="High risk" value={number(run.highRisk)} accent="text-risk-high" />
            <Stat label="Medium risk" value={number(run.mediumRisk)} accent="text-risk-medium" />
            <Stat label="Low risk" value={number(run.lowRisk)} accent="text-risk-low" />
            <Stat label="Avg. probability" value={pct(run.avgChurnProbability)} />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 panel !rounded-sm p-1">
              {RISK_FILTERS.map((r) => (
                <button
                  key={r}
                  onClick={() => setRisk(r)}
                  className={`px-3 py-1.5 text-sm rounded-sm transition-colors ${
                    risk === r ? 'bg-ink-raised text-text' : 'text-text-muted hover:text-text'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint">
                <IconSearch />
              </span>
              <input
                className="input !pl-9"
                placeholder="Search customer ID…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button
              className="btn-ghost"
              onClick={() => setSort((s) => (s === 'desc' ? 'asc' : 'desc'))}
              title="Toggle sort order"
            >
              {sort === 'desc' ? <IconArrowDown /> : <IconArrowUp />}
              Probability
            </button>
          </div>

          <div className="panel overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-text-faint text-xs hairline">
                  <th className="text-left font-medium px-5 py-2.5">Customer</th>
                  <th className="text-left font-medium px-5 py-2.5">Risk</th>
                  <th className="text-left font-medium px-5 py-2.5">Probability</th>
                  <th className="text-left font-medium px-5 py-2.5">Top factor</th>
                  <th className="text-left font-medium px-5 py-2.5">Recommendation</th>
                </tr>
              </thead>
              <tbody>
                {customers?.customers.map((c) => (
                  <tr key={c._id} className="hairline last:border-0 hover:bg-ink-raised/60">
                    <td className="px-5 py-3">
                      <Link to={`/predictions/${runId}/customers/${c.customerId}`} className="text-text hover:text-brand font-medium">
                        {c.customerId}
                      </Link>
                    </td>
                    <td className="px-5 py-3">
                      <RiskBadge level={c.riskLevel} size="sm" />
                    </td>
                    <td className="px-5 py-3 tabular text-text-muted">{pct(c.churnProbability)}</td>
                    <td className="px-5 py-3 text-text-muted">{c.topFactors?.[0]?.feature || '—'}</td>
                    <td className="px-5 py-3 text-text-muted truncate max-w-[220px]">
                      {c.recommendations?.[0]?.action || '—'}
                    </td>
                  </tr>
                ))}
                {customers && !customers.customers.length && (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-text-muted">
                      No customers match these filters.
                    </td>
                  </tr>
                )}
                {!customers && (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center">
                      <PageLoader label="Loading customers…" />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            {customers && (
              <div className="px-4">
                <Pagination page={customers.page} pages={customers.pages} total={customers.total} limit={customers.limit} onChange={setPage} />
              </div>
            )}
          </div>
        </>
      )}

      <ConfirmDialog
        open={confirmingDelete}
        title="Delete this run?"
        description="This removes the run and every per-customer prediction in it. This can't be undone."
        onCancel={() => setConfirmingDelete(false)}
        onConfirm={handleDelete}
        busy={deleting}
      />
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div className="panel px-5 py-4 flex flex-col gap-1.5">
      <span className="text-xs text-text-muted">{label}</span>
      <span className={`font-display text-2xl tabular ${accent || 'text-text'}`}>{value}</span>
    </div>
  );
}
