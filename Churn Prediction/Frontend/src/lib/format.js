export function pct(value, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return `${(value * 100).toFixed(digits)}%`;
}

export function pctFromWhole(value, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return `${Number(value).toFixed(digits)}%`;
}

export function number(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('en-US').format(value);
}

export function bytes(value) {
  if (!value && value !== 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let v = value;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

export function dateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function relativeTime(value) {
  if (!value) return '—';
  const diff = Date.now() - new Date(value).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return dateTime(value);
}

export const RISK_COLORS = {
  High: { text: 'text-risk-high', bg: 'bg-risk-highSoft', dot: 'bg-risk-high' },
  Medium: { text: 'text-risk-medium', bg: 'bg-risk-mediumSoft', dot: 'bg-risk-medium' },
  Low: { text: 'text-risk-low', bg: 'bg-risk-lowSoft', dot: 'bg-risk-low' },
};
