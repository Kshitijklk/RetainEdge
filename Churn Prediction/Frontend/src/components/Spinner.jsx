import { IconSpinner } from './Icons';

export function Spinner({ label }) {
  return (
    <div className="flex items-center gap-2 text-text-muted text-sm">
      <IconSpinner />
      {label && <span>{label}</span>}
    </div>
  );
}

export function PageLoader({ label = 'Loading…' }) {
  return (
    <div className="flex items-center justify-center py-24">
      <Spinner label={label} />
    </div>
  );
}
