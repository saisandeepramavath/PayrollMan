import { cn } from '../../utils';
import type { ProjectStatus, AssignmentStatus } from '../../types';
import { PROJECT_STATUS_CONFIG, ASSIGNMENT_STATUS_CONFIG } from '../../utils';
import { useTheme } from '../../contexts/ThemeContext';

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
}

export function Badge({ children, className }: BadgeProps) {
  const { colors } = useTheme();

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium border',
        colors.pill.neutral,
        className
      )}
    >
      {children}
    </span>
  );
}

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const config = PROJECT_STATUS_CONFIG[status];
  return <Badge className={config.color}>{config.label}</Badge>;
}

export function AssignmentStatusBadge({ status }: { status: AssignmentStatus }) {
  const config = ASSIGNMENT_STATUS_CONFIG[status];
  return <Badge className={config.color}>{config.label}</Badge>;
}

export function UserRoleBadge({ isAdmin }: { isAdmin: boolean }) {
  return (
    <Badge
      className={
        isAdmin
          ? 'text-violet-700 dark:text-violet-300 bg-violet-500/10 border-violet-500/25'
          : 'text-slate-700 dark:text-slate-300 bg-slate-500/10 border-slate-400/30 dark:border-slate-600'
      }
    >
      {isAdmin ? 'Admin' : 'Member'}
    </Badge>
  );
}
