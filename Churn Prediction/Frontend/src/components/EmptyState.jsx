export function EmptyState({ icon, title, description, action }) {
  return (
    <div className="panel flex flex-col items-center justify-center text-center px-8 py-16">
      {icon && <div className="text-text-faint mb-4">{icon}</div>}
      <h3 className="text-text font-medium mb-1.5">{title}</h3>
      {description && <p className="text-text-muted text-sm max-w-sm mb-5">{description}</p>}
      {action}
    </div>
  );
}
