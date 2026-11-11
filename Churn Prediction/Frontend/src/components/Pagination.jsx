import { IconChevronLeft, IconChevronRight } from './Icons';

export function Pagination({ page, pages, total, limit, onChange }) {
  if (!pages || pages <= 1) return null;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="flex items-center justify-between px-1 py-3 text-sm">
      <span className="text-text-muted">
        <span className="tabular">{from}</span>–<span className="tabular">{to}</span> of{' '}
        <span className="tabular">{total}</span>
      </span>
      <div className="flex items-center gap-1">
        <button
          className="btn-ghost !px-2 !py-1.5"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          aria-label="Previous page"
        >
          <IconChevronLeft />
        </button>
        <span className="text-text-muted px-2 tabular">
          {page} / {pages}
        </span>
        <button
          className="btn-ghost !px-2 !py-1.5"
          disabled={page >= pages}
          onClick={() => onChange(page + 1)}
          aria-label="Next page"
        >
          <IconChevronRight />
        </button>
      </div>
    </div>
  );
}
