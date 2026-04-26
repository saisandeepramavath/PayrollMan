interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-500 mb-4">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-slate-300 mb-1">{title}</h3>
      {description && <p className="text-xs text-slate-500 max-w-xs">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <div
      className={`inline-block rounded-full border-2 border-current border-t-transparent animate-spin ${className ?? 'w-5 h-5'}`}
    />
  );
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <Spinner className="w-8 h-8 text-indigo-500" />
    </div>
  );
}
