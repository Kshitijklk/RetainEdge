import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DatasetApi } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { DropzoneUpload } from '../components/DropzoneUpload';
import { PageLoader } from '../components/Spinner';
import { EmptyState } from '../components/EmptyState';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { IconDatabase, IconTrash, IconChevronRight } from '../components/Icons';
import { bytes, number, relativeTime } from '../lib/format';

export function Datasets() {
  const toast = useToast();
  const [datasets, setDatasets] = useState(null);
  const [progress, setProgress] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = () => DatasetApi.list().then(({ data }) => setDatasets(data.datasets));

  useEffect(() => {
    load();
  }, []);

  const handleFile = async (file, err) => {
    if (err) {
      setUploadError(err);
      return;
    }
    setUploadError('');
    setUploading(true);
    setProgress(0);
    try {
      const { data } = await DatasetApi.upload(file, setProgress);
      toast.success(`${data.dataset.originalName} uploaded — ${number(data.dataset.rowCount)} rows`);
      await load();
    } catch (e) {
      setUploadError(e.message);
    } finally {
      setUploading(false);
      setProgress(null);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await DatasetApi.remove(pendingDelete._id);
      toast.success(`${pendingDelete.originalName} deleted`);
      setPendingDelete(null);
      await load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setDeleting(false);
    }
  };

  if (!datasets) return <PageLoader label="Loading datasets…" />;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl text-text mb-1">Datasets</h1>
        <p className="text-text-muted text-sm">Upload a customer CSV to profile it and run churn predictions.</p>
      </div>

      <DropzoneUpload onFile={handleFile} disabled={uploading} progress={progress} />
      {uploadError && <p className="text-risk-high text-sm -mt-3">{uploadError}</p>}

      {datasets.length === 0 ? (
        <EmptyState
          icon={<IconDatabase width={32} height={32} />}
          title="No datasets yet"
          description="Drop a CSV above to get started. One row per customer, with a churn/exited column if you have historical labels."
        />
      ) : (
        <div className="panel overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-text-faint text-xs hairline">
                <th className="text-left font-medium px-5 py-2.5">File</th>
                <th className="text-left font-medium px-5 py-2.5">Rows</th>
                <th className="text-left font-medium px-5 py-2.5">Columns</th>
                <th className="text-left font-medium px-5 py-2.5">Duplicates</th>
                <th className="text-left font-medium px-5 py-2.5">Size</th>
                <th className="text-left font-medium px-5 py-2.5">Uploaded</th>
                <th className="px-5 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {datasets.map((d) => (
                <tr key={d._id} className="hairline last:border-0 hover:bg-ink-raised/60 group">
                  <td className="px-5 py-3">
                    <Link to={`/datasets/${d._id}`} className="text-text hover:text-brand font-medium">
                      {d.originalName}
                    </Link>
                  </td>
                  <td className="px-5 py-3 tabular text-text-muted">{number(d.rowCount)}</td>
                  <td className="px-5 py-3 tabular text-text-muted">{number(d.columnCount)}</td>
                  <td className="px-5 py-3 tabular text-text-muted">{number(d.duplicateRows)}</td>
                  <td className="px-5 py-3 tabular text-text-muted">{bytes(d.sizeBytes)}</td>
                  <td className="px-5 py-3 text-text-muted">{relativeTime(d.createdAt)}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        className="btn-ghost !px-2"
                        title="Delete dataset"
                        onClick={() => setPendingDelete(d)}
                      >
                        <IconTrash />
                      </button>
                      <Link to={`/datasets/${d._id}`} className="btn-ghost !px-2">
                        <IconChevronRight />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete dataset?"
        description={`This removes "${pendingDelete?.originalName}" and every prediction run made from it. This can't be undone.`}
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        busy={deleting}
      />
    </div>
  );
}
