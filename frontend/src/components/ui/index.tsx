import { cn } from '../../utils';
import { useTheme } from '../../contexts/ThemeContext';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  const { colors } = useTheme();

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center mb-4', colors.bg.tertiary, colors.text.tertiary)}>
        {icon}
      </div>
      <h3 className={cn('text-sm font-semibold mb-1', colors.text.primary)}>{title}</h3>
      {description && <p className={cn('text-xs max-w-xs', colors.text.tertiary)}>{description}</p>}
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
