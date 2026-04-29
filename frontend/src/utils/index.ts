import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Parse date strings without shifting plain YYYY-MM-DD values across timezones. */
export function parseDateValue(date: string | Date): Date {
  if (date instanceof Date) return date;
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [year, month, day] = date.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  const hasOffset = date.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(date);
  return new Date(hasOffset ? date : date + 'Z');
}

export function formatDate(date: string | Date) {
  const d = parseDateValue(date);
  return format(d, 'MMM d, yyyy');
}

export function formatDateTime(date: string | Date) {
  const d = parseDateValue(date);
  return format(d, 'MMM d, yyyy HH:mm');
}

export function formatTime(date: string | Date) {
  const d = parseDateValue(date);
  return format(d, 'HH:mm');
}

export function timeAgo(date: string | Date) {
  const d = parseDateValue(date);
  return formatDistanceToNow(d, { addSuffix: true });
}

export function minutesToHours(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export const PROJECT_STATUS_CONFIG = {
  active: { label: 'Active', color: 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border-emerald-500/25' },
  on_hold: { label: 'On Hold', color: 'text-amber-700 dark:text-amber-300 bg-amber-500/10 border-amber-500/25' },
  completed: { label: 'Completed', color: 'text-sky-700 dark:text-sky-300 bg-sky-500/10 border-sky-500/25' },
  cancelled: { label: 'Cancelled', color: 'text-rose-700 dark:text-rose-300 bg-rose-500/10 border-rose-500/25' },
} as const;

export const ASSIGNMENT_STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'text-amber-700 dark:text-amber-300 bg-amber-500/10 border-amber-500/25' },
  approved: { label: 'Approved', color: 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border-emerald-500/25' },
  rejected: { label: 'Rejected', color: 'text-rose-700 dark:text-rose-300 bg-rose-500/10 border-rose-500/25' },
  revoked: { label: 'Revoked', color: 'text-slate-700 dark:text-slate-300 bg-slate-500/10 border-slate-400/30 dark:border-slate-600' },
} as const;
