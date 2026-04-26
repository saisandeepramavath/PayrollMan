import { cn } from '../../utils';
import type { ProjectStatus, AssignmentStatus } from '../../types';
import { PROJECT_STATUS_CONFIG, ASSIGNMENT_STATUS_CONFIG } from '../../utils';

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
}

export function Badge({ children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium border',
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
          ? 'text-violet-400 bg-violet-400/10 border-violet-400/20'
          : 'text-slate-400 bg-slate-400/10 border-slate-700'
      }
    >
      {isAdmin ? 'Admin' : 'Member'}
    </Badge>
  );
}
