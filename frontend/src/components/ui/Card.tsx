import { type ReactNode } from 'react';
import { cn } from '../../utils';
import { useTheme } from '../../contexts/ThemeContext';

interface CardProps {
  className?: string;
  children: ReactNode;
}

export function Card({ className, children }: CardProps) {
  const { colors } = useTheme();
  
  return (
    <div
      className={cn(
        `rounded-xl border backdrop-blur-sm transition-colors duration-200`,
        colors.card.bg,
        colors.card.border,
        colors.card.hover,
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children }: CardProps) {
  const { theme } = useTheme();
  
  return (
    <div className={cn(
      `flex items-center justify-between px-6 py-5 border-b transition-colors duration-200`,
      theme === 'dark' ? 'border-slate-700' : 'border-slate-200',
      className
    )}>
      {children}
    </div>
  );
}

export function CardBody({ className, children }: CardProps) {
  return <div className={cn('p-6', className)}>{children}</div>;
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  trend?: { value: string; positive: boolean };
  accent?: string;
  className?: string;
}

export function StatCard({ label, value, icon, trend, accent = 'text-indigo-400', className }: StatCardProps) {
  const { colors } = useTheme();
  
  return (
    <Card className={cn('group transition-colors duration-200', colors.card.hover, className)}>
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <span className={`text-xs font-medium uppercase tracking-wider ${colors.text.tertiary}`}>{label}</span>
            <span className={`text-2xl font-bold ${colors.text.primary}`}>{value}</span>
            {trend && (
              <span
                className={cn(
                  'text-xs font-medium',
                  trend.positive ? 'text-emerald-400' : 'text-rose-400'
                )}
              >
                {trend.positive ? '↑' : '↓'} {trend.value}
              </span>
            )}
          </div>
          <div
            className={cn(
              'flex items-center justify-center w-11 h-11 rounded-xl group-hover:scale-105 transition-transform duration-200',
              colors.bg.secondary,
              accent
            )}
          >
            {icon}
          </div>
        </div>
      </div>
    </Card>
  );
}
