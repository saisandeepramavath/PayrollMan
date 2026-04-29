import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Clock, Users } from 'lucide-react';
import { format } from 'date-fns';
import { getUsers, listTimecardSubmissions } from '../../api/endpoints';
import type { TimecardSubmission } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';
import { WeekPicker } from '../../components/ui/WeekPicker';

const statusConfig: Record<TimecardSubmission['status'], { label: string; cls: string; dot: string }> = {
  draft: { label: 'Draft', cls: 'text-slate-600 dark:text-slate-400 bg-slate-500/10 border-slate-500/30', dot: 'bg-slate-400' },
  submitted: { label: 'Submitted', cls: 'text-amber-700 dark:text-amber-300 bg-amber-500/10 border-amber-500/30', dot: 'bg-amber-400' },
  on_hold: { label: 'On Hold', cls: 'text-rose-700 dark:text-rose-300 bg-rose-500/10 border-rose-500/30', dot: 'bg-rose-400' },
  approved: { label: 'Approved', cls: 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border-emerald-500/30', dot: 'bg-emerald-400' },
};

type StatusFilter = 'all' | TimecardSubmission['status'] | 'needs_review';

interface ManagerTimecardGridProps {
  weekStart: Date;
  onWeekStartChange: (weekStart: Date) => void;
  onSelectUser: (userId: number, weekStart?: Date) => void;
}

export function ManagerTimecardGrid({ weekStart, onWeekStartChange, onSelectUser }: ManagerTimecardGridProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const { theme } = useTheme();

  const startStr = format(weekStart, 'yyyy-MM-dd');

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: getUsers,
  });

  const { data: submissions } = useQuery({
    queryKey: ['timecard-submissions'],
    queryFn: () => listTimecardSubmissions(),
  });

  // Map: userId -> submission for the selected week
  const submissionsByUser = useMemo(() => {
    const map = new Map<number, TimecardSubmission>();
    for (const sub of submissions ?? []) {
      const subWeek = sub.week_start.slice(0, 10);
      if (subWeek === startStr) {
        map.set(sub.user_id, sub);
      }
    }
    return map;
  }, [submissions, startStr]);

  // Status counts
  const statusCounts = useMemo(() => {
    const counts = { all: 0, draft: 0, submitted: 0, on_hold: 0, approved: 0, needs_review: 0 };
    for (const u of users ?? []) {
      if (!u.is_active) continue;
      counts.all++;
      const sub = submissionsByUser.get(u.id);
      const status = sub?.status ?? 'draft';
      counts[status]++;
      if (status === 'submitted' || status === 'on_hold') counts.needs_review++;
    }
    return counts;
  }, [users, submissionsByUser]);

  // Filtered + searched users
  const filteredUsers = useMemo(() => {
    let list = (users ?? []).filter((u) => u.is_active);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (u) =>
          u.full_name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q),
      );
    }

    if (statusFilter !== 'all') {
      list = list.filter((u) => {
        const sub = submissionsByUser.get(u.id);
        const status = sub?.status ?? 'draft';
        if (statusFilter === 'needs_review') {
          return status === 'submitted' || status === 'on_hold';
        }
        return status === statusFilter;
      });
    }

    // Sort: needs_review first, then by name
    list.sort((a, b) => {
      const sa = submissionsByUser.get(a.id)?.status ?? 'draft';
      const sb = submissionsByUser.get(b.id)?.status ?? 'draft';
      const priority: Record<string, number> = { on_hold: 0, submitted: 1, draft: 2, approved: 3 };
      const diff = (priority[sa] ?? 4) - (priority[sb] ?? 4);
      if (diff !== 0) return diff;
      return a.full_name.localeCompare(b.full_name);
    });

    return list;
  }, [users, searchQuery, statusFilter, submissionsByUser]);

  const filterTabs: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'needs_review', label: 'Needs Review' },
    { key: 'submitted', label: 'Submitted' },
    { key: 'on_hold', label: 'On Hold' },
    { key: 'draft', label: 'Draft' },
    { key: 'approved', label: 'Approved' },
  ];

  if (usersLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-600 border-t-indigo-400" />
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-indigo-400" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Team Timecards</h1>
        </div>
        <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">
          Review and manage employee timecards. Click on an employee to view their detailed timecard.
        </p>
      </div>

      {/* Week picker + search */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <WeekPicker weekStart={weekStart} onWeekStartChange={onWeekStartChange} />

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search employees..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-800 placeholder-slate-400 outline-none transition-colors focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:placeholder-slate-500 sm:w-64"
          />
        </div>
      </div>

      {/* Filter tabs */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {filterTabs.map((tab) => {
          const count = statusCounts[tab.key];
          const active = statusFilter === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${ active ? 'border-indigo-500/40 bg-indigo-500/15 text-indigo-700 dark:text-indigo-300' : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-300' }`}
            >
              {tab.label}
              {count > 0 && (
                <span className={`ml-1.5 ${active ? 'text-indigo-400' : 'text-slate-500'}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Employee grid */}
      {filteredUsers.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white py-16 text-center dark:border-slate-700/60 dark:bg-slate-900">
          <p className="text-sm text-slate-500">
            {searchQuery || statusFilter !== 'all'
              ? 'No employees match your filters.'
              : 'No active employees found.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredUsers.map((employee) => {
            const sub = submissionsByUser.get(employee.id);
            const status = sub?.status ?? 'draft';
            const cfg = statusConfig[status];
            return (
              <button
                key={employee.id}
                type="button"
                onClick={() => onSelectUser(employee.id, weekStart)}
                className={theme === 'dark' ? "group rounded-xl border border-slate-700/60 bg-slate-900 p-4 text-left transition-all hover:border-slate-600 hover:bg-slate-800/80 hover:shadow-lg hover:shadow-indigo-500/5" : "group rounded-xl border border-slate-200 bg-white p-4 text-left transition-all hover:border-slate-300 hover:bg-slate-50 hover:shadow-lg hover:shadow-slate-200/60"}
              >
                {/* Name + email */}
                <div className="mb-3 min-w-0">
                  <p className={theme === 'dark' ? "truncate text-sm font-semibold text-slate-500 group-hover:text-slate-300 dark:group-hover:text-slate-100" : "truncate text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-slate-100"}>
                    {employee.full_name}
                  </p>
                  <p className={theme === 'dark' ? "mt-0.5 truncate text-xs text-slate-500" : "mt-0.5 truncate text-xs text-slate-500"}>
                    {employee.email}
                  </p>
                </div>

                {/* Status badge */}
                <div className="mb-3">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${cfg.cls}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                    {cfg.label}
                  </span>
                </div>

                {/* Submission details */}
                <div className="space-y-1.5 text-[11px] text-slate-500">
                  {sub?.submitted_at && (
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3 w-3 flex-shrink-0" />
                      <span>Submitted {format(new Date(sub.submitted_at), 'MMM d, h:mm a')}</span>
                    </div>
                  )}
                  {(sub?.unresolved_issue_count ?? 0) > 0 && (
                    <p className="text-rose-400">
                      {sub!.unresolved_issue_count} open issue{sub!.unresolved_issue_count === 1 ? '' : 's'}
                    </p>
                  )}
                  {!sub && (
                    <p className="text-slate-600 italic">No submission for this week</p>
                  )}
                </div>

                {/* Hover hint */}
                <p className="mt-3 text-[10px] text-slate-600 transition-colors group-hover:text-indigo-400">
                  Click to view timecard →
                </p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
