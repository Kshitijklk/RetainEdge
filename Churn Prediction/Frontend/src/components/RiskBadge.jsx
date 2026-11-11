import { RISK_COLORS } from '../lib/format';

export function RiskBadge({ level, size = 'md' }) {
  const c = RISK_COLORS[level] || RISK_COLORS.Low;
  const pad = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-sm font-medium ${c.bg} ${c.text} ${pad}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {level}
    </span>
  );
}

export function RiskDot({ level }) {
  const c = RISK_COLORS[level] || RISK_COLORS.Low;
  return <span className={`inline-block w-2 h-2 rounded-full ${c.dot}`} />;
}
