import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PredictionApi } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { PageLoader } from '../components/Spinner';
import { EmptyState } from '../components/EmptyState';
import { Pagination } from '../components/Pagination';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { IconRadar, IconTrash, IconChevronRight, IconSpinner } from '../components/Icons';
import { number, pct, dateTime } from '../lib/format';

const STATUS_STYLE = {
  completed: 'text-risk-low bg-risk-lowSoft',
  processing: 'text-brand bg-brand/10',
  failed: 'text-risk-high bg-risk-highSoft',
};

export function Predictions() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = () => PredictionApi.listRuns({ page, limit: 10 }).then(({ data }) => setResult(data));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // Keep processing runs live without the user refreshing.
  useEffect(() => {
    if (!result?.runs?.some((r) => r.status === 'processing')) return;
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await PredictionApi.removeRun(pendingDelete._id);
      toast.success('Run deleted');
      setPendingDelete(null);
      await load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setDeleting(false);
    }
  };

  if (!result) return <PageLoader label="Loading predictions…" />;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl text-text mb-1">Predictions</h1>
        <p className="text-text-muted text-sm">Every run, its status, and the resulting risk breakdown.</p>
      </div>

      {result.runs.length === 0 ? (
        <EmptyState
          icon={<IconRadar width={32} height={32} />}
          title="No prediction runs yet"
          description="Run a prediction from one of your datasets to see churn risk results here."
          action={
            <Link to="/datasets" className="btn-primary">
              Go to datasets
            </Link>
          }
        />
      ) : (
        <div className="panel overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-text-faint text-xs hairline">
                <th className="text-left font-medium px-5 py-2.5">Dataset</th>
                <th className="text-left font-medium px-5 py-2.5">Status</th>
                <th className="text-left font-medium px-5 py-2.5">Customers</th>
                <th className="text-left font-medium px-5 py-2.5">High risk</th>
                <th className="text-left font-medium px-5 py-2.5">Avg. probability</th>
                <th className="text-left font-medium px-5 py-2.5">Started</th>
                <th className="px-5 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {result.runs.map((r) => (
                <tr key={r._id} className="hairline last:border-0 hover:bg-ink-raised/60 group">
                  <td className="px-5 py-3">
                    <Link to={`/predictions/${r._id}`} className="text-text hover:text-brand font-medium">
                      {r.datasetName}
                    </Link>
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-sm ${STATUS_STYLE[r.status]}`}
                    >
                      {r.status === 'processing' && <IconSpinner width={12} height={12} />}
                      {r.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 tabular text-text-muted">{number(r.totalCustomers)}</td>
                  <td className="px-5 py-3 tabular text-text-muted">{number(r.highRisk)}</td>
                  <td className="px-5 py-3 tabular text-text-muted">
                    {r.status === 'completed' ? pct(r.avgChurnProbability) : '—'}
                  </td>
                  <td className="px-5 py-3 text-text-muted">{dateTime(r.createdAt)}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="btn-ghost !px-2" title="Delete run" onClick={() => setPendingDelete(r)}>
                        <IconTrash />
                      </button>
                      <Link to={`/predictions/${r._id}`} className="btn-ghost !px-2">
                        <IconChevronRight />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4">
            <Pagination page={result.page} pages={Math.ceil(result.total / result.limit)} total={result.total} limit={result.limit} onChange={setPage} />
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete this run?"
        description="This removes the run and every per-customer prediction in it. This can't be undone."
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        busy={deleting}
      />
    </div>
  );
}
