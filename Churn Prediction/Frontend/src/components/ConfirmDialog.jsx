import { useEffect } from 'react';

export function ConfirmDialog({ open, title, description, confirmLabel = 'Delete', onConfirm, onCancel, busy }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onCancel();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60" onClick={onCancel} />
      <div className="panel relative w-full max-w-sm p-5">
        <h3 className="text-text font-medium mb-1.5">{title}</h3>
        <p className="text-text-muted text-sm mb-5">{description}</p>
        <div className="flex justify-end gap-2">
          <button className="btn-secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button className="btn bg-risk-high text-ink hover:bg-[#F56474]" onClick={onConfirm} disabled={busy}>
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
