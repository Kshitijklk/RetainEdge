import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { DatasetApi, PredictionApi } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { PageLoader } from '../components/Spinner';
import { IconRun, IconSpinner } from '../components/Icons';
import { bytes, number, dateTime } from '../lib/format';

export function DatasetDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [dataset, setDataset] = useState(null);
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    DatasetApi.get(id)
      .then(({ data }) => setDataset(data.dataset))
      .catch((e) => setError(e.message));
  }, [id]);

  const runPrediction = async () => {
    setStarting(true);
    try {
      const { data } = await PredictionApi.start(id);
      toast.success('Prediction started');
      navigate(`/predictions/${data.run._id}`);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setStarting(false);
    }
  };

  if (error) return <p className="text-risk-high text-sm">{error}</p>;
  if (!dataset) return <PageLoader label="Loading dataset…" />;

  const previewCols = dataset.preview?.[0] ? Object.keys(dataset.preview[0]) : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-text-faint text-xs mb-1">
            <Link to="/datasets" className="hover:text-text-muted">
              Datasets
            </Link>{' '}
            / {dataset.originalName}
          </p>
          <h1 className="font-display text-2xl text-text">{dataset.originalName}</h1>
          <p className="text-text-muted text-sm mt-1">
            Uploaded {dateTime(dataset.createdAt)} · {bytes(dataset.sizeBytes)}
          </p>
        </div>
        <button className="btn-primary" onClick={runPrediction} disabled={starting}>
          {starting ? <IconSpinner /> : <IconRun />}
          {starting ? 'Starting…' : 'Run prediction'}
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Rows" value={number(dataset.rowCount)} />
        <Stat label="Columns" value={number(dataset.columnCount)} />
        <Stat label="Duplicate rows" value={number(dataset.duplicateRows)} />
        <Stat
          label="Detected ID / target"
          value={
            <span className="text-base">
              {dataset.idColumn || '—'} <span className="text-text-faint">/</span> {dataset.targetColumn || '—'}
            </span>
          }
        />
      </div>

      <div className="panel">
        <div className="hairline px-5 py-4">
          <h2 className="text-text text-sm font-medium">Columns</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-text-faint text-xs">
              <th className="text-left font-medium px-5 py-2.5">Name</th>
              <th className="text-left font-medium px-5 py-2.5">Type</th>
              <th className="text-left font-medium px-5 py-2.5">Missing</th>
              <th className="text-left font-medium px-5 py-2.5">Unique values</th>
            </tr>
          </thead>
          <tbody>
            {dataset.columns?.map((c) => (
              <tr key={c.name} className="hairline last:border-0">
                <td className="px-5 py-2.5 text-text font-medium">{c.name}</td>
                <td className="px-5 py-2.5">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-sm ${
                      c.type === 'numeric' ? 'bg-brand/10 text-brand' : 'bg-ink-raised text-text-muted'
                    }`}
                  >
                    {c.type}
                  </span>
                </td>
                <td className="px-5 py-2.5 tabular text-text-muted">{number(c.missing)}</td>
                <td className="px-5 py-2.5 tabular text-text-muted">{number(c.unique)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="panel overflow-hidden">
        <div className="hairline px-5 py-4">
          <h2 className="text-text text-sm font-medium">Preview</h2>
          <p className="text-text-faint text-xs mt-0.5">First {dataset.preview?.length || 0} rows</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm whitespace-nowrap">
            <thead>
              <tr className="text-text-faint text-xs">
                {previewCols.map((c) => (
                  <th key={c} className="text-left font-medium px-4 py-2.5">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dataset.preview?.map((row, i) => (
                <tr key={i} className="hairline last:border-0">
                  {previewCols.map((c) => (
                    <td key={c} className="px-4 py-2 tabular text-text-muted">
                      {String(row[c] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="panel px-5 py-4 flex flex-col gap-1.5">
      <span className="text-xs text-text-muted">{label}</span>
      <span className="font-display text-2xl tabular text-text">{value}</span>
    </div>
  );
}
