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
  active: { label: 'Active', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
  on_hold: { label: 'On Hold', color: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
  completed: { label: 'Completed', color: 'text-sky-400 bg-sky-400/10 border-sky-400/20' },
  cancelled: { label: 'Cancelled', color: 'text-rose-400 bg-rose-400/10 border-rose-400/20' },
} as const;

export const ASSIGNMENT_STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
  approved: { label: 'Approved', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
  rejected: { label: 'Rejected', color: 'text-rose-400 bg-rose-400/10 border-rose-400/20' },
  revoked: { label: 'Revoked', color: 'text-slate-400 bg-slate-400/10 border-slate-400/20' },
} as const;
