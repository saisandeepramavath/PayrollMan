import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Bell, CircleCheckBig, ExternalLink, Mail, ShieldAlert } from 'lucide-react';
import { getIssueReports, sendIssueNotice, updateIssueReport } from '../../api/endpoints';
import { Card, CardBody, CardHeader, StatCard } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input, Select, Textarea } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { PageLoader } from '../../components/ui';
import { formatDate, formatDateTime, timeAgo } from '../../utils';
import type { IssueReportStatus } from '../../types';

const STATUS_OPTIONS: Array<{ value: 'all' | IssueReportStatus; label: string }> = [
  { value: 'all', label: 'All statuses' },
  { value: 'open', label: 'Open' },
  { value: 'in_review', label: 'In review' },
  { value: 'resolved', label: 'Resolved' },
];

const TYPE_LABELS: Record<string, string> = {
  timecard: 'Timecard',
  attendance: 'Attendance',
  project: 'Project',
  other: 'Other',
};

const PRIORITY_STYLES: Record<string, string> = {
  low: 'text-slate-300 border-slate-600 bg-slate-800/60',
  medium: 'text-amber-300 border-amber-500/30 bg-amber-500/10',
  high: 'text-rose-300 border-rose-500/30 bg-rose-500/10',
};

const STATUS_STYLES: Record<string, string> = {
  open: 'text-rose-300 border-rose-500/30 bg-rose-500/10',
  in_review: 'text-sky-300 border-sky-500/30 bg-sky-500/10',
  resolved: 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10',
};

export function ReviewQueuePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<'all' | IssueReportStatus>('open');
  const [search, setSearch] = useState('');
  const [selectedIssueId, setSelectedIssueId] = useState<number | null>(null);
  const [showNotice, setShowNotice] = useState(false);
  const [noticeSubject, setNoticeSubject] = useState('');
  const [noticeMessage, setNoticeMessage] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');

  const { data: issues, isLoading } = useQuery({
    queryKey: ['issues', statusFilter],
    queryFn: () => getIssueReports(statusFilter === 'all' ? undefined : { status: statusFilter }),
  });

  const selectedIssue = useMemo(
    () => issues?.find((issue) => issue.id === selectedIssueId) ?? issues?.[0] ?? null,
    [issues, selectedIssueId]
  );

  const filteredIssues = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return issues ?? [];
    return (issues ?? []).filter((issue) =>
      [
        issue.title,
        issue.description,
        issue.user_name,
        issue.user_email,
        issue.project_name,
        issue.project_code,
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(term))
    );
  }, [issues, search]);

  const updateMutation = useMutation({
    mutationFn: ({ id, status, notes }: { id: number; status: IssueReportStatus; notes?: string }) =>
      updateIssueReport(id, { status, resolution_notes: notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      setResolutionNotes('');
    },
  });

  const noticeMutation = useMutation({
    mutationFn: ({ id, subject, message }: { id: number; subject: string; message: string }) =>
      sendIssueNotice(id, { notice_subject: subject, notice_message: message }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      setShowNotice(false);
    },
  });

  if (isLoading) return <PageLoader />;

  const openCount = (issues ?? []).filter((issue) => issue.status === 'open').length;
  const reviewCount = (issues ?? []).filter((issue) => issue.status === 'in_review').length;
  const resolvedCount = (issues ?? []).filter((issue) => issue.status === 'resolved').length;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-rose-600 flex items-center justify-center">
          <ShieldAlert className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Alerts</h1>
          <p className="text-sm text-slate-500">Review held or flagged submissions, open the related week, and resolve the blockers before approval.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Open" value={openCount} icon={<ShieldAlert className="w-5 h-5" />} accent="text-rose-400" />
        <StatCard label="In Review" value={reviewCount} icon={<Bell className="w-5 h-5" />} accent="text-sky-400" />
        <StatCard label="Resolved" value={resolvedCount} icon={<CircleCheckBig className="w-5 h-5" />} accent="text-emerald-400" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[420px_minmax(0,1fr)] gap-6 items-start">
        <Card>
          <CardHeader className="flex-col items-stretch gap-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-slate-200">Active Alerts</h2>
              <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'all' | IssueReportStatus)} className="max-w-[180px]">
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </Select>
            </div>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search user, project, or message"
            />
          </CardHeader>
          <CardBody className="!p-0">
            {filteredIssues.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-slate-500">No alerts match the current filter.</div>
            ) : (
              <div className="divide-y divide-slate-800">
                {filteredIssues.map((issue) => (
                  <button
                    key={issue.id}
                    type="button"
                    onClick={() => setSelectedIssueId(issue.id)}
                    className={`w-full px-6 py-4 text-left transition-colors ${selectedIssue?.id === issue.id ? 'bg-slate-800/70' : 'hover:bg-slate-800/40'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-100 truncate">{issue.title}</p>
                        <p className="mt-1 text-xs text-slate-400 truncate">{issue.user_name ?? issue.user_email ?? `User #${issue.user_id}`}</p>
                        <p className="mt-1 text-xs text-slate-500 line-clamp-2">{issue.description}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_STYLES[issue.status]}`}>{issue.status.replace('_', ' ')}</span>
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${PRIORITY_STYLES[issue.priority]}`}>{issue.priority}</span>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-500">
                      <span>{TYPE_LABELS[issue.issue_type] ?? issue.issue_type}</span>
                      <span>•</span>
                      <span>{timeAgo(issue.created_at)}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          {!selectedIssue ? (
            <CardBody className="py-16 text-center text-slate-500">Select an alert to review.</CardBody>
          ) : (
            <>
              <CardHeader>
                <div>
                  <h2 className="text-lg font-semibold text-slate-100">{selectedIssue.title}</h2>
                  <p className="mt-1 text-sm text-slate-500">Reported by {selectedIssue.reporter_name ?? selectedIssue.reporter_email ?? `User #${selectedIssue.reporter_id}`} for {selectedIssue.user_name ?? selectedIssue.user_email ?? `User #${selectedIssue.user_id}`}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="primary" size="sm" onClick={() => setShowNotice(true)}>
                    <Mail className="w-4 h-4" /> Notice User
                  </Button>
                </div>
              </CardHeader>
              <CardBody className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Info label="Status" value={selectedIssue.status.replace('_', ' ')} />
                  <Info label="Priority" value={selectedIssue.priority} />
                  <Info label="Issue Type" value={TYPE_LABELS[selectedIssue.issue_type] ?? selectedIssue.issue_type} />
                  <Info label="Created" value={formatDateTime(selectedIssue.created_at)} />
                  <Info label="Week Of" value={selectedIssue.week_start ? formatDate(selectedIssue.week_start) : 'Not linked to a week'} />
                  <Info label="Project" value={selectedIssue.project_name ?? selectedIssue.project_code ?? 'Not linked'} />
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Issue details</p>
                  <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-sm leading-6 text-slate-300 whitespace-pre-wrap">
                    {selectedIssue.description}
                  </div>
                </div>

                {selectedIssue.notice_message && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Last notice</p>
                    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                      <p className="text-sm font-semibold text-slate-200">{selectedIssue.notice_subject}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-400 whitespace-pre-wrap">{selectedIssue.notice_message}</p>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      const params = new URLSearchParams();
                      params.set('user', String(selectedIssue.user_id));
                      if (selectedIssue.week_start) {
                        params.set('week', selectedIssue.week_start.slice(0, 10));
                      }
                      params.set('issue', String(selectedIssue.id));
                      navigate(`/timecards?${params.toString()}`);
                    }}
                  >
                    <ExternalLink className="w-4 h-4" /> Open Related Screen
                  </Button>
                  {selectedIssue.user_email && selectedIssue.notice_subject && selectedIssue.notice_message && (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        const subject = selectedIssue.notice_subject ?? '';
                        const message = selectedIssue.notice_message ?? '';
                        window.location.href = `mailto:${selectedIssue.user_email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
                      }}
                    >
                      <Mail className="w-4 h-4" /> Open Mail App
                    </Button>
                  )}
                </div>

                <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Resolution</p>
                  <Textarea
                    label="Resolution notes"
                    rows={5}
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    placeholder="Describe the fix, follow-up required, or what changed in the timecard."
                  />
                  <div className="flex justify-end">
                    <Button
                      variant="primary"
                      onClick={() => updateMutation.mutate({ id: selectedIssue.id, status: 'resolved', notes: resolutionNotes.trim() || undefined })}
                      isLoading={updateMutation.isPending}
                    >
                      <CircleCheckBig className="w-4 h-4" /> Mark Resolved
                    </Button>
                  </div>
                </div>
              </CardBody>
            </>
          )}
        </Card>
      </div>

      <Modal isOpen={showNotice && !!selectedIssue} onClose={() => setShowNotice(false)} title="Send Notice To User">
        <div className="space-y-4">
          <Input
            label="Subject"
            value={noticeSubject}
            onChange={(e) => setNoticeSubject(e.target.value)}
            placeholder="Timecard update required"
          />
          <Textarea
            label="Message"
            rows={6}
            value={noticeMessage}
            onChange={(e) => setNoticeMessage(e.target.value)}
            placeholder="Explain what the user needs to correct or confirm."
          />
          <p className="text-xs text-slate-500">This stores the notice in the issue and can then open your default mail app for the selected user.</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowNotice(false)}>Cancel</Button>
            <Button
              onClick={async () => {
                if (!selectedIssue) return;
                await noticeMutation.mutateAsync({ id: selectedIssue.id, subject: noticeSubject, message: noticeMessage });
                if (selectedIssue.user_email) {
                  window.location.href = `mailto:${selectedIssue.user_email}?subject=${encodeURIComponent(noticeSubject)}&body=${encodeURIComponent(noticeMessage)}`;
                }
                setNoticeSubject('');
                setNoticeMessage('');
              }}
              isLoading={noticeMutation.isPending}
              disabled={!noticeSubject.trim() || !noticeMessage.trim()}
            >
              Save Notice
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-medium text-slate-200">{value}</p>
    </div>
  );
}