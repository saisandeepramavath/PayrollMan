import { type ReactNode } from 'react';
import { cn } from '../../utils';

interface CardProps {
  className?: string;
  children: ReactNode;
}

export function Card({ className, children }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm',
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children }: CardProps) {
  return (
    <div className={cn('flex items-center justify-between px-6 py-5 border-b border-slate-800', className)}>
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
  return (
    <Card className={cn('group hover:border-slate-700 transition-colors duration-200', className)}>
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</span>
            <span className="text-2xl font-bold text-slate-100">{value}</span>
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
              'flex items-center justify-center w-11 h-11 rounded-xl bg-slate-800 group-hover:scale-105 transition-transform duration-200',
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
