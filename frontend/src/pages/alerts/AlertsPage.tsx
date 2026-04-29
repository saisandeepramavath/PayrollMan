import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Bell, CircleCheckBig, ExternalLink, Mail, ShieldAlert } from 'lucide-react';
import { getIssueReports } from '../../api/endpoints';
import { Card, CardBody, CardHeader, StatCard } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { PageLoader } from '../../components/ui';
import { formatDate, formatDateTime, timeAgo } from '../../utils';

const STATUS_STYLES: Record<string, string> = {
  open: 'text-rose-700 dark:text-rose-300 border-rose-500/30 bg-rose-500/10',
  in_review: 'text-sky-700 dark:text-sky-300 border-sky-500/30 bg-sky-500/10',
  resolved: 'text-emerald-700 dark:text-emerald-300 border-emerald-500/30 bg-emerald-500/10',
};

const PRIORITY_STYLES: Record<string, string> = {
  low: 'text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800/60',
  medium: 'text-amber-700 dark:text-amber-300 border-amber-500/30 bg-amber-500/10',
  high: 'text-rose-700 dark:text-rose-300 border-rose-500/30 bg-rose-500/10',
};

const TYPE_LABELS: Record<string, string> = {
  timecard: 'Timecard',
  attendance: 'Attendance',
  project: 'Project',
  other: 'Other',
};

export function AlertsPage() {
  const navigate = useNavigate();
  const { data: issues, isLoading } = useQuery({
    queryKey: ['issues', 'me'],
    queryFn: () => getIssueReports(),
  });

  const activeIssues = useMemo(
    () => (issues ?? []).filter((issue) => issue.status !== 'resolved'),
    [issues],
  );

  if (isLoading) return <PageLoader />;

  const openCount = (issues ?? []).filter((issue) => issue.status === 'open').length;
  const reviewCount = (issues ?? []).filter((issue) => issue.status === 'in_review').length;
  const resolvedCount = (issues ?? []).filter((issue) => issue.status === 'resolved').length;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-rose-600 flex items-center justify-center">
          <Bell className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">My Alerts</h1>
          <p className="text-sm text-slate-500">Track issues raised on your timecards, see manager notices, and jump into the related week to fix them.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Open" value={openCount} icon={<ShieldAlert className="w-5 h-5" />} accent="text-rose-400" />
        <StatCard label="In Review" value={reviewCount} icon={<Bell className="w-5 h-5" />} accent="text-sky-400" />
        <StatCard label="Resolved" value={resolvedCount} icon={<CircleCheckBig className="w-5 h-5" />} accent="text-emerald-400" />
      </div>

      <Card>
        <CardHeader>
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Active Alerts</h2>
            <p className="mt-1 text-sm text-slate-500">Open items stay here until your reviewer resolves them.</p>
          </div>
        </CardHeader>
        <CardBody className="space-y-4">
          {issues?.length ? (
            (activeIssues.length > 0 ? activeIssues : issues).map((issue) => (
              <div key={issue.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{issue.title}</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      {TYPE_LABELS[issue.issue_type] ?? issue.issue_type} • {timeAgo(issue.created_at)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_STYLES[issue.status]}`}>
                      {issue.status.replace('_', ' ')}
                    </span>
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${PRIORITY_STYLES[issue.priority]}`}>
                      {issue.priority}
                    </span>
                  </div>
                </div>

                <p className="mt-3 text-sm leading-6 text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{issue.description}</p>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <Info label="Week Of" value={issue.week_start ? formatDate(issue.week_start) : 'Not linked'} />
                  <Info label="Updated" value={formatDateTime(issue.updated_at ?? issue.created_at)} />
                </div>

                {issue.notice_message && (
                  <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-200">Manager Notice</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{issue.notice_subject ?? 'Alert notice'}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{issue.notice_message}</p>
                  </div>
                )}

                <div className="mt-4 flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      const params = new URLSearchParams();
                      if (issue.week_start) {
                        params.set('week', issue.week_start.slice(0, 10));
                      }
                      params.set('issue', String(issue.id));
                      navigate(`/timecards?${params.toString()}`);
                    }}
                  >
                    <ExternalLink className="w-4 h-4" /> Open Timecard
                  </Button>
                  {issue.notice_subject && issue.notice_message && (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        const subject = issue.notice_subject ?? '';
                        const message = issue.notice_message ?? '';
                        window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
                      }}
                    >
                      <Mail className="w-4 h-4" /> Open Mail Draft
                    </Button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="py-12 text-center text-sm text-slate-500">No alerts yet.</div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/60">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm text-slate-800 dark:text-slate-200">{value}</p>
    </div>
  );
}
