import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-ink px-6 text-center">
      <span className="font-display text-6xl text-text-faint">404</span>
      <p className="text-text-muted text-sm max-w-xs">
        This page doesn&rsquo;t exist. It may have been moved or the link is out of date.
      </p>
      <Link to="/dashboard" className="btn-primary mt-3">
        Back to dashboard
      </Link>
    </div>
  );
}
