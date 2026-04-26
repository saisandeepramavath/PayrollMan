import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Timer, LogIn, LogOut, Clock, Trash2, StickyNote, Calendar } from 'lucide-react';
import { format as formatDateKey } from 'date-fns';
import { punchIn, punchOut, getActivePunch, getPunchEntries, deletePunchEntry } from '../../api/endpoints';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { EmptyState, PageLoader } from '../../components/ui';
import { formatDate, formatTime, minutesToHours, parseDateValue } from '../../utils';
import { Modal } from '../../components/ui/Modal';

function useLiveDuration(punchInTime: string | undefined) {
  const [elapsed, setElapsed] = useState('');
  useEffect(() => {
    if (!punchInTime) { setElapsed(''); return; }
    const update = () => {
      const diff = Math.floor((Date.now() - parseDateValue(punchInTime).getTime()) / 1000);
      const h = Math.floor(diff / 3600);
      const m = Math.floor((diff % 3600) / 60);
      const s = diff % 60;
      setElapsed(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [punchInTime]);
  return elapsed;
}

function parsePunchDate(dateValue: string): Date {
  return new Date(`${dateValue}T00:00:00`);
}

export function TimeTrackingPage() {
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState('');
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [showNotes, setShowNotes] = useState(false);

  const { data: activePunch, isLoading: activeLoading } = useQuery({
    queryKey: ['active-punch'],
    queryFn: getActivePunch,
    refetchInterval: 5000,
  });

  const { data: entries, isLoading: entriesLoading } = useQuery({
    queryKey: ['punch-entries'],
    queryFn: () => getPunchEntries(),
  });

  const elapsed = useLiveDuration(activePunch?.punch_in);

  const punchInMutation = useMutation({
    mutationFn: () => punchIn({ notes: notes || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-punch'] });
      queryClient.invalidateQueries({ queryKey: ['punch-entries'] });
      setNotes('');
      setShowNotes(false);
    },
  });

  const punchOutMutation = useMutation({
    mutationFn: () => punchOut({ notes: notes || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-punch'] });
      queryClient.invalidateQueries({ queryKey: ['punch-entries'] });
      setNotes('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deletePunchEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['punch-entries'] });
      setDeleteId(null);
    },
  });

  const totalMinutes = entries?.reduce((sum, e) => sum + (e.duration_minutes ?? 0), 0) ?? 0;
  const todayMinutes = (() => {
    const today = formatDateKey(new Date(), 'yyyy-MM-dd');
    return (
      entries
        ?.filter((e) => e.date === today)
        .reduce((sum, e) => sum + (e.duration_minutes ?? 0), 0) ?? 0
    );
  })();

  const thisWeekMinutes = (() => {
    const now = new Date();
    const day = now.getDay();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
    weekStart.setHours(0, 0, 0, 0);
    const weekStartKey = formatDateKey(weekStart, 'yyyy-MM-dd');
    return (
      entries
        ?.filter((e) => e.date >= weekStartKey)
        .reduce((sum, e) => sum + (e.duration_minutes ?? 0), 0) ?? 0
    );
  })();

  // Group entries by ISO week (Mon–Sun) for the weekly view
  const weekGroups = (() => {
    if (!entries?.length) return [];
    const getWeekStart = (d: Date): Date => {
      const day = d.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      const start = new Date(d);
      start.setDate(d.getDate() + diff);
      start.setHours(0, 0, 0, 0);
      return start;
    };
    const fmtDate = (d: Date) =>
      d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const getWeekLabel = (start: Date) => {
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      const yr = end.getFullYear() !== new Date().getFullYear() ? `, ${end.getFullYear()}` : '';
      return `${fmtDate(start)} – ${fmtDate(end)}${yr}`;
    };
    const map = new Map<string, typeof entries>();
    for (const e of entries) {
      const ws = getWeekStart(parsePunchDate(e.date));
      const key = formatDateKey(ws, 'yyyy-MM-dd');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    const currentWeekKey = formatDateKey(getWeekStart(new Date()), 'yyyy-MM-dd');
    return Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, wEntries]) => ({
        key,
        label: getWeekLabel(new Date(key + 'T00:00:00')),
        isCurrent: key === currentWeekKey,
        totalMinutes: wEntries.reduce((s, e) => s + (e.duration_minutes ?? 0), 0),
        entries: [...wEntries].sort(
          (a, b) => parseDateValue(b.punch_in).getTime() - parseDateValue(a.punch_in).getTime()
        ),
      }));
  })();

  if (activeLoading) return <PageLoader />;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-100">Time Tracking</h1>
        <p className="text-sm text-slate-500 mt-0.5">Track your attendance in real-time</p>
      </div>

      {/* Main punch card */}
      <Card className="mb-6">
        <CardBody>
          <div className="flex flex-col items-center py-6">
            {/* Clock circle */}
            <div
              className={`w-36 h-36 rounded-full flex flex-col items-center justify-center mb-6 border-2 transition-all duration-500 ${
                activePunch
                  ? 'border-emerald-500/50 bg-emerald-500/5 shadow-lg shadow-emerald-500/10'
                  : 'border-slate-700 bg-slate-800/50'
              }`}
            >
              {activePunch ? (
                <>
                  <span className="text-2xl font-mono font-bold text-emerald-400 tabular-nums">
                    {elapsed}
                  </span>
                  <span className="text-xs text-emerald-600 mt-1">Live</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 mt-1 animate-pulse" />
                </>
              ) : (
                <>
                  <Clock className="w-10 h-10 text-slate-600 mb-1" />
                  <span className="text-xs text-slate-600">Not clocked in</span>
                </>
              )}
            </div>

            {/* Punch in/out details */}
            {activePunch && (
              <div className="flex items-center gap-6 mb-6 text-sm">
                <div className="text-center">
                  <p className="text-xs text-slate-600 mb-1">Clocked In</p>
                  <p className="font-semibold text-emerald-400">{formatTime(activePunch.punch_in)}</p>
                </div>
                <div className="text-slate-700">·</div>
                <div className="text-center">
                  <p className="text-xs text-slate-600 mb-1">Date</p>
                  <p className="font-semibold text-slate-300">{formatDate(activePunch.date ?? activePunch.punch_in)}</p>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-3">
              {!activePunch ? (
                <>
                  <Button
                    size="lg"
                    onClick={() => punchInMutation.mutate()}
                    isLoading={punchInMutation.isPending}
                    className="min-w-[140px] justify-center"
                  >
                    <LogIn className="w-4 h-4" />
                    Clock In
                  </Button>
                  <Button
                    variant="ghost"
                    size="lg"
                    onClick={() => setShowNotes(!showNotes)}
                    className="px-3"
                    title="Add note"
                  >
                    <StickyNote className="w-4 h-4" />
                  </Button>
                </>
              ) : (
                <Button
                  size="lg"
                  variant="danger"
                  onClick={() => punchOutMutation.mutate()}
                  isLoading={punchOutMutation.isPending}
                  className="min-w-[140px] justify-center border-transparent bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white"
                >
                  <LogOut className="w-4 h-4" />
                  Clock Out
                </Button>
              )}
            </div>

            {/* Notes input */}
            {showNotes && !activePunch && (
              <div className="mt-4 w-full max-w-sm">
                <input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional note…"
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                />
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card>
          <CardBody className="!py-4">
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Today</p>
            <p className="text-2xl font-bold text-slate-100">{minutesToHours(todayMinutes)}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="!py-4">
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">This Week</p>
            <p className="text-2xl font-bold text-indigo-400">{minutesToHours(thisWeekMinutes)}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="!py-4">
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">All Time</p>
            <p className="text-2xl font-bold text-slate-100">{minutesToHours(totalMinutes)}</p>
          </CardBody>
        </Card>
      </div>

      {/* History */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-200">Attendance History</h2>
          </div>
          <span className="text-xs text-slate-600">{entries?.length ?? 0} records</span>
        </CardHeader>
        <CardBody className="!p-0">
          {entriesLoading ? (
            <PageLoader />
          ) : !entries?.length ? (
            <EmptyState
              icon={<Timer className="w-6 h-6" />}
              title="No attendance records"
              description="Your punch history will appear here"
            />
          ) : (
            <div>
              {weekGroups.map((week) => (
                <div key={week.key}>
                  {/* Week header */}
                  <div className="flex items-center justify-between px-6 py-3 bg-slate-800/60 border-b border-slate-800 sticky top-0 z-10">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-300">{week.label}</span>
                      {week.isCurrent && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                          This week
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-bold text-indigo-400 tabular-nums">
                      {minutesToHours(week.totalMinutes)}
                    </span>
                  </div>

                  {/* Punch set rows for this week */}
                  <div className="divide-y divide-slate-800/60">
                    {week.entries.map((entry) => (
                      <div
                        key={entry.id}
                        className="px-6 py-3.5 flex items-center justify-between hover:bg-slate-800/30 transition-colors"
                      >
                        {/* Left: date + punch set */}
                        <div className="flex items-center gap-4 min-w-0">
                          {/* Date badge */}
                          <div className="flex-shrink-0 w-10 text-center">
                            <p className="text-[10px] text-slate-500 leading-none uppercase">
                              {parsePunchDate(entry.date).toLocaleDateString('en-US', { weekday: 'short' })}
                            </p>
                            <p className="text-base font-bold text-slate-300 leading-tight mt-0.5">
                              {parsePunchDate(entry.date).getDate()}
                            </p>
                          </div>

                          {/* Set line: IN ──► OUT */}
                          <div className="flex items-center gap-2 text-sm">
                            <div className="flex flex-col items-center">
                              <span className="text-[10px] text-slate-600 uppercase leading-none">In</span>
                              <span className="font-semibold text-emerald-400 tabular-nums">
                                {formatTime(entry.punch_in)}
                              </span>
                            </div>
                            <span className="text-slate-700 text-xs select-none">──►</span>
                            <div className="flex flex-col items-center">
                              <span className="text-[10px] text-slate-600 uppercase leading-none">Out</span>
                              {entry.punch_out ? (
                                <span className="font-semibold text-rose-400 tabular-nums">
                                  {formatTime(entry.punch_out)}
                                </span>
                              ) : (
                                <span className="font-semibold text-emerald-400 tabular-nums text-xs animate-pulse">
                                  {elapsed || 'Active'}
                                </span>
                              )}
                            </div>
                            {entry.notes && (
                              <>
                                <span className="text-slate-700 text-xs">·</span>
                                <span className="text-xs text-slate-600 italic truncate max-w-[120px]">
                                  {entry.notes}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Right: duration + delete */}
                        <div className="flex items-center gap-4 flex-shrink-0">
                          {entry.duration_display ? (
                            <span className="text-sm font-semibold text-slate-200 tabular-nums bg-slate-800/60 px-2.5 py-1 rounded-lg">
                              {entry.duration_display}
                            </span>
                          ) : entry.duration_minutes ? (
                            <span className="text-sm font-semibold text-slate-200 tabular-nums bg-slate-800/60 px-2.5 py-1 rounded-lg">
                              {minutesToHours(entry.duration_minutes)}
                            </span>
                          ) : (
                            <span className="text-xs px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              Active
                            </span>
                          )}
                          <button
                            onClick={() => setDeleteId(entry.id)}
                            className="p-1.5 rounded-lg text-slate-700 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Delete confirm */}
      <Modal isOpen={deleteId !== null} onClose={() => setDeleteId(null)} title="Delete Entry">
        <div className="flex flex-col gap-5">
          <p className="text-sm text-slate-400">Remove this punch entry? This cannot be undone.</p>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button
              variant="danger"
              isLoading={deleteMutation.isPending}
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              <Trash2 className="w-4 h-4" /> Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
