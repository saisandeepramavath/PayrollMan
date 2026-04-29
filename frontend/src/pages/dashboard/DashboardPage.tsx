import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FolderKanban,
  Clock,
  ClipboardList,
  TrendingUp,
  ArrowRight,
  Calendar,
  Timer,
  StickyNote,
  Trash2,
  ChevronDown,
  Play,
  Square,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { format as formatDateKey } from 'date-fns';
import {
  getProjects,
  getPunchEntries,
  getTimecards,
  getActivePunch,
  punchIn,
  punchOut,
  deletePunchEntry,
} from '../../api/endpoints';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { ProjectStatusBadge } from '../../components/ui/Badge';
import { PageLoader } from '../../components/ui';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { formatDate, formatTime, minutesToHours, parseDateValue } from '../../utils';
import { useTheme } from '../../contexts/ThemeContext';

/* ── live elapsed timer ─────────────────────────────── */
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

export function DashboardPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [notes, setNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [showAllWeeks, setShowAllWeeks] = useState(false);

  const { theme } = useTheme();

  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => getProjects({ limit: 100 }),
  });

  const { data: punchEntries, isLoading: punchLoading } = useQuery({
    queryKey: ['punch-entries'],
    queryFn: () => getPunchEntries(),
  });

  const { data: timecards, isLoading: timecardsLoading } = useQuery({
    queryKey: ['timecards'],
    queryFn: () => getTimecards(),
  });

  const { data: activePunch } = useQuery({
    queryKey: ['active-punch'],
    queryFn: getActivePunch,
    refetchInterval: 5000,
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

  if (projectsLoading || punchLoading || timecardsLoading) return <PageLoader />;

  const activeProjects = projects?.filter((p) => p.status === 'active').length ?? 0;
  const totalHours = timecards?.reduce((sum, t) => sum + t.hours_worked, 0) ?? 0;

  const todayMinutes = (() => {
    const today = formatDateKey(new Date(), 'yyyy-MM-dd');
    return (
      punchEntries
        ?.filter((e) => e.date === today)
        .reduce((sum, e) => sum + (e.duration_minutes ?? 0), 0) ?? 0
    );
  })();

  const thisWeekPunchMinutes = (() => {
    const now = new Date();
    const day = now.getDay();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
    weekStart.setHours(0, 0, 0, 0);
    const weekStartKey = formatDateKey(weekStart, 'yyyy-MM-dd');
    return (
      punchEntries
        ?.filter((e) => e.date >= weekStartKey)
        .reduce((sum, e) => sum + (e.duration_minutes ?? 0), 0) ?? 0
    );
  })();

  const totalPunchMinutes = punchEntries?.reduce((sum, e) => sum + (e.duration_minutes ?? 0), 0) ?? 0;

  const recentTimecards = [...(timecards ?? [])].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  ).slice(0, 5);

  const recentProjects = [...(projects ?? [])].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  ).slice(0, 4);

  /* ── attendance grouped by ISO week ── */
  const weekGroups = (() => {
    if (!punchEntries?.length) return [];
    const getWeekStart = (d: Date): Date => {
      const day = d.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      const start = new Date(d);
      start.setDate(d.getDate() + diff);
      start.setHours(0, 0, 0, 0);
      return start;
    };
    const fmtDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const getWeekLabel = (start: Date) => {
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      const yr = end.getFullYear() !== new Date().getFullYear() ? `, ${end.getFullYear()}` : '';
      return `${fmtDate(start)} – ${fmtDate(end)}${yr}`;
    };
    const map = new Map<string, typeof punchEntries>();
    for (const e of punchEntries) {
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
          (a, b) => parseDateValue(b.punch_in).getTime() - parseDateValue(a.punch_in).getTime(),
        ),
      }));
  })();

  const visibleWeeks = showAllWeeks ? weekGroups : weekGroups.slice(0, 1);

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* ─── Row 1: Greeting + Clock Strip ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={theme === 'dark' ? "text-xl font-bold text-slate-100" : "text-xl font-bold text-slate-800"}>
            Good {getGreeting()},{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">
              {user?.full_name.split(' ')[0]}
            </span>
          </h1>
          <p className={theme === 'dark' ? "text-xs text-slate-400 mt-0.5" : "text-xs text-slate-500 mt-0.5"}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Clock strip */}
        <div
          className={theme === 'dark' ? `flex items-center gap-3 rounded-xl border px-4 py-2.5 transition-all ${
            activePunch
              ? 'border-emerald-500/30 bg-emerald-500/5'
              : 'border-slate-700/60 bg-slate-800/40'
          }` : `flex items-center gap-3 rounded-xl border px-4 py-2.5 transition-all ${
            activePunch
              ? 'border-emerald-500/30 bg-emerald-500/5'
              : 'border-slate-300 bg-white'
          }`}
        >
          {activePunch ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-sm font-mono font-bold text-emerald-400 tabular-nums w-[72px]">
                {elapsed}
              </span>
              <span className="text-[10px] text-slate-500 hidden sm:inline">
                since {formatTime(activePunch.punch_in)}
              </span>
              <Button
                size="sm"
                variant="danger"
                onClick={() => punchOutMutation.mutate()}
                isLoading={punchOutMutation.isPending}
                className="ml-1"
              >
                <Square className="w-3 h-3 fill-current" /> Out
              </Button>
            </>
          ) : (
            <>
              <Clock className="w-4 h-4 text-slate-600" />
              <span className="text-xs text-slate-500">Not clocked in</span>
              <div className="flex items-center gap-1 ml-1">
                <Button
                  size="sm"
                  onClick={() => punchInMutation.mutate()}
                  isLoading={punchInMutation.isPending}
                >
                  <Play className="w-3 h-3 fill-current" /> In
                </Button>
                <button
                  onClick={() => setShowNotes(!showNotes)}
                  className="p-1.5 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:hover:text-slate-400 dark:hover:bg-slate-700/50 transition-colors"
                  title="Add note"
                >
                  <StickyNote className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Notes input (shows below header when toggled) */}
      {showNotes && !activePunch && (
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional note for this punch…"
          className={theme === 'dark' ? "w-full sm:max-w-sm rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all -mt-3" : "w-full sm:max-w-sm rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all -mt-3"}
        />
      )}

      {/* ─── Row 2: Quick Stats ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MiniStat label="Today" value={minutesToHours(todayMinutes)} accent="text-emerald-400" icon={<Clock className="w-3.5 h-3.5" />} />
        <MiniStat label="This Week" value={minutesToHours(thisWeekPunchMinutes)} accent="text-indigo-400" icon={<Calendar className="w-3.5 h-3.5" />} />
        <MiniStat label="Projects" value={activeProjects} accent="text-violet-400" icon={<FolderKanban className="w-3.5 h-3.5" />} />
        <MiniStat label="Timecards" value={`${totalHours.toFixed(1)}h`} accent="text-sky-400" icon={<TrendingUp className="w-3.5 h-3.5" />} />
      </div>

      {/* ─── Row 3: Two-Column Grid ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* Recent Timecards */}
        <Card className="lg:col-span-3">
          <CardHeader className="py-3.5 px-5">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-3.5 h-3.5 text-slate-500" />
              <h2 className={theme === 'dark' ? "text-xs font-semibold text-slate-400 uppercase tracking-wider" : "text-xs font-semibold text-slate-600 uppercase tracking-wider"}>Recent Timecards</h2>
            </div>
            <Link
              to="/timecards"
              className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5"
            >
              All <ArrowRight className="w-3 h-3" />
            </Link>
          </CardHeader>
          <CardBody className="!p-0">
            {recentTimecards.length === 0 ? (
              <div className="py-8 text-center">
                <ClipboardList className="w-6 h-6 text-slate-700 mx-auto mb-1.5" />
                <p className="text-xs text-slate-600">No timecards yet</p>
              </div>
            ) : (
              <div className={theme === 'dark' ? "divide-y divide-slate-800/60" : "divide-y divide-slate-300/60"}>
                {recentTimecards.map((tc) => (
                  <div
                    key={tc.id}
                    className="px-5 py-3 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <div className="flex flex-col min-w-0">
                      <span className={`text-sm font-medium truncate ${tc.project_code ? (theme === 'dark' ? 'text-slate-200' : 'text-slate-800') : 'text-slate-500'}`}>
                        {tc.description ?? tc.project_code ?? 'No description'}
                      </span>
                      <span className="text-[11px] text-slate-600 mt-0.5">{formatDate(tc.date)}</span>
                    </div>
                    <div className="flex items-center gap-2 ml-3 shrink-0">
                      {tc.project_code && (
                        <span className="text-[10px] text-indigo-400/80 bg-indigo-400/10 px-1.5 py-0.5 rounded border border-indigo-400/15 font-mono">
                          {tc.project_code}
                        </span>
                      )}
                      <span className={theme === 'dark' ? "text-sm font-semibold text-slate-400 tabular-nums" : "text-sm font-semibold text-slate-800 tabular-nums"}>
                        {tc.hours_worked}h
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Projects */}
        <Card className="lg:col-span-2">
          <CardHeader className="py-3.5 px-5">
            <div className="flex items-center gap-2">
              <FolderKanban className="w-3.5 h-3.5 text-slate-500" />
              <h2 className={theme === 'dark' ? "text-xs font-semibold text-slate-400 uppercase tracking-wider" : "text-xs font-semibold text-slate-600 uppercase tracking-wider"}>Projects</h2>
            </div>
            <Link
              to="/projects"
              className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5"
            >
              All <ArrowRight className="w-3 h-3" />
            </Link>
          </CardHeader>
          <CardBody className="!p-0">
            {recentProjects.length === 0 ? (
              <div className="py-8 text-center">
                <FolderKanban className="w-6 h-6 text-slate-700 mx-auto mb-1.5" />
                <p className="text-xs text-slate-600">No projects yet</p>
              </div>
            ) : (
              <div className={theme === 'dark' ? "divide-y divide-slate-800/60" : "divide-y divide-slate-300/60"}>
                {recentProjects.map((project) => (
                  <Link
                    key={project.id}
                    to={`/projects/${project.id}`}
                    className="px-5 py-3 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800/30 transition-colors block"
                  >
                    <div className="flex flex-col min-w-0">
                      <span className={`text-sm font-medium truncate ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>
                        {project.name}
                      </span>
                      <span className="text-[11px] text-slate-600 mt-0.5 font-mono">{project.code}</span>
                    </div>
                    <ProjectStatusBadge status={project.status} />
                  </Link>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* ─── Row 4: Attendance (collapsed by default) ─── */}
      {weekGroups.length > 0 && (
        <Card>
          <CardHeader className="py-3.5 px-5">
            <div className="flex items-center gap-2">
              <Timer className="w-3.5 h-3.5 text-slate-500" />
              <h2 className={theme === 'dark' ? "text-xs font-semibold text-slate-400 uppercase tracking-wider" : "text-xs font-semibold text-slate-600 uppercase tracking-wider"}>Attendance</h2>
              <span className="text-[10px] text-slate-600 font-normal normal-case ml-1">
                {minutesToHours(totalPunchMinutes)} total
              </span>
            </div>
            {weekGroups.length > 1 && (
              <button
                onClick={() => setShowAllWeeks(!showAllWeeks)}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5 transition-colors"
              >
                {showAllWeeks ? 'Current week' : `All weeks (${weekGroups.length})`}
                <ChevronDown className={`w-3 h-3 transition-transform ${showAllWeeks ? 'rotate-180' : ''}`} />
              </button>
            )}
          </CardHeader>
          <CardBody className="!p-0">
            <div className={theme === 'dark' ? "divide-y divide-slate-800/60" : "divide-y divide-slate-200"}>
              {visibleWeeks.map((wg) => (
                <div key={wg.key}>
                  {/* Week header */}
                  <div className={theme === 'dark' ? 'flex items-center justify-between px-5 py-3.5 bg-slate-800/30' : 'flex items-center justify-between px-5 py-3.5 bg-slate-100'}>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-medium text-slate-400">{wg.label}</span>
                      {wg.isCurrent && (
                        <span className="text-[9px] font-semibold text-indigo-400 bg-indigo-400/10 px-1.5 py-px rounded-full border border-indigo-400/20">
                          Current
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-semibold text-slate-500 tabular-nums">
                      {minutesToHours(wg.totalMinutes)}
                    </span>
                  </div>
                  {/* Entries */}
                  {wg.entries.map((entry) => {
                    const dayName = parsePunchDate(entry.date).toLocaleDateString('en-US', { weekday: 'short' });
                    return (
                      <div
                        key={entry.id}
                        className="flex items-center gap-3 px-5 py-2.5 hover:bg-slate-100 dark:hover:bg-slate-800/20 transition-colors group"
                      >
                        <span className="text-[10px] uppercase tracking-wide text-slate-600 font-semibold w-7 shrink-0">
                          {dayName}
                        </span>
                        <div className="flex items-center gap-1 text-xs">
                          <span className="text-emerald-400/80">{formatTime(entry.punch_in)}</span>
                          <span className="text-slate-700">→</span>
                          <span className="text-rose-400/80">
                            {entry.punch_out ? formatTime(entry.punch_out) : '…'}
                          </span>
                        </div>
                        {entry.notes && (
                          <span className="text-[10px] text-slate-600 italic truncate max-w-[120px] hidden sm:inline">
                            {entry.notes}
                          </span>
                        )}
                        <span className="ml-auto text-xs font-semibold text-slate-400 tabular-nums">
                          {entry.duration_minutes ? minutesToHours(entry.duration_minutes) : '--'}
                        </span>
                        <button
                          onClick={() => setDeleteId(entry.id)}
                          className="p-0.5 rounded text-slate-800 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Delete modal */}
      <Modal isOpen={deleteId !== null} onClose={() => setDeleteId(null)} title="Delete Entry">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-slate-400">
            Delete this punch entry? This cannot be undone.
          </p>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" size="sm" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button
              variant="danger"
              size="sm"
              isLoading={deleteMutation.isPending}
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ── Compact stat tile ── */
function MiniStat({
  label,
  value,
  accent,
  icon,
}: {
  label: string;
  value: string | number;
  accent: string;
  icon: React.ReactNode;
}) {
  const { theme } = useTheme();
  return (
    <div className={theme === 'dark' ? 'rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3 flex items-center gap-3 hover:border-slate-700 transition-colors' : 'rounded-xl border border-slate-200 bg-white px-4 py-3 flex items-center gap-3 hover:border-slate-300 transition-colors shadow-sm'}>
      <div className={theme === 'dark' ? `flex items-center justify-center w-8 h-8 rounded-lg bg-slate-800 ${accent}` : `flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 ${accent}`}>
        {icon}
      </div>
      <div>
        <p className={theme === 'dark' ? "text-lg font-bold text-slate-100 leading-tight" : "text-lg font-bold text-slate-800 leading-tight"}>{value}</p>
        <p className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</p>
      </div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
}
