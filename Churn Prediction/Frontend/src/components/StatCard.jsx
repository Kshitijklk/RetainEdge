export function StatCard({ label, value, sub, accent }) {
  return (
    <div className="panel px-5 py-4 flex flex-col gap-1.5">
      <span className="text-xs text-text-muted">{label}</span>
      <span className={`font-display text-3xl tabular ${accent || 'text-text'}`}>{value}</span>
      {sub && <span className="text-xs text-text-faint">{sub}</span>}
    </div>
  );
}
