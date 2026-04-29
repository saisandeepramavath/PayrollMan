import { addDays, format } from 'date-fns';
import { Calendar, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { cn } from '../../utils';

interface WeekPickerProps {
  weekStart: Date;
  onWeekStartChange: (weekStart: Date) => void;
  className?: string;
  compact?: boolean;
}

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function parseDateInput(value: string): Date | null {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function WeekPicker({ weekStart, onWeekStartChange, className, compact = false }: WeekPickerProps) {
  const weekEnd = addDays(weekStart, 6);
  const isCurrentWeek = format(getMonday(new Date()), 'yyyy-MM-dd') === format(weekStart, 'yyyy-MM-dd');

  const moveWeek = (amount: number) => {
    onWeekStartChange(addDays(weekStart, amount * 7));
  };

  const handleDateChange = (value: string) => {
    const selectedDate = parseDateInput(value);
    if (!selectedDate) return;
    onWeekStartChange(getMonday(selectedDate));
  };

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-1 rounded-lg border border-slate-300 bg-white p-1 dark:border-slate-700 dark:bg-slate-900',
        className
      )}
    >
      <button
        type="button"
        onClick={() => moveWeek(-1)}
        className="rounded-md p-1.5 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
        aria-label="Previous week"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <label className="relative flex min-w-0 items-center gap-2 rounded-md px-2 py-1 text-slate-700 transition-shadow focus-within:ring-2 focus-within:ring-indigo-500/40 dark:text-slate-300">
        <Calendar className="h-4 w-4 shrink-0 text-slate-500" />
        <span className={cn('font-medium whitespace-nowrap', compact ? 'text-xs' : 'text-sm')}>
          {compact ? format(weekStart, 'MMM d') : `Week of ${format(weekStart, 'MMM d')}`} - {format(weekEnd, 'MMM d, yyyy')}
        </span>
        <input
          type="date"
          value={format(weekStart, 'yyyy-MM-dd')}
          onChange={(event) => handleDateChange(event.target.value)}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          aria-label="Select week"
        />
      </label>

      <button
        type="button"
        onClick={() => moveWeek(1)}
        className="rounded-md p-1.5 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
        aria-label="Next week"
      >
        <ChevronRight className="h-4 w-4" />
      </button>

      {!isCurrentWeek && (
        <button
          type="button"
          onClick={() => onWeekStartChange(getMonday(new Date()))}
          className="ml-1 inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          This week
        </button>
      )}
    </div>
  );
}
