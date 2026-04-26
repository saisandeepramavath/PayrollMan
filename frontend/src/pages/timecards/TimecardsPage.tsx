import { Fragment, useState, useEffect, useMemo, type FocusEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Clock, Calendar, Plus, ShieldAlert, ArrowLeft } from 'lucide-react';
import { ManagerTimecardGrid } from './ManagerTimecardGrid';
import {
  createPunchEntry,
  deletePunchEntry,
  getPunchEntries,
  getTimecards,
  createTimecard,
  deleteTimecard,
  updatePunchEntry,
  updateTimecard,
  getTrackingCategories,
  getUsers,
  getEffectiveUserWorkRule,
  createIssueReport,
  getWeekTimecardSubmission,
  submitWeekTimecard,
  reviewTimecardSubmission,
} from '../../api/endpoints';
import type { PunchEntry, Timecard, TimecardCreate, TimecardSubmission, TrackingCategory, User } from '../../types';
import { Button } from '../../components/ui/Button';
import { PageLoader } from '../../components/ui';
import { Modal } from '../../components/ui/Modal';
import { Input, Select, Textarea } from '../../components/ui/Input';
import { formatTime, minutesToHours } from '../../utils';
import { format, addDays } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';

type PunchDraft = {
  id?: number;
  punchIn: string;
  punchOut: string;
  notes?: string;
};

type AllocationBucket = {
  key: string;
  label: string;
  subtitle?: string;
  groupKey: string;
  groupTitle: string;
  groupDescription: string;
  projectId?: number;
  costCenter?: string;
  entryType?: string;
  laborCategory?: string;
  defaultWorkLocation?: string;
  source: 'category' | 'legacy';
};

type BucketGroup = {
  key: string;
  title: string;
  description: string;
  buckets: AllocationBucket[];
};

function getApiErrorMessage(error: unknown, fallback: string): string {
  const detail = (error as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;

  if (typeof detail === 'string' && detail.trim()) {
    return detail;
  }

  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => {
        if (typeof item === 'string') {
          return item;
        }
        if (item && typeof item === 'object' && 'msg' in item && typeof item.msg === 'string') {
          return item.msg;
        }
        return null;
      })
      .filter((message): message is string => Boolean(message));

    if (messages.length > 0) {
      return messages.join(' ');
    }
  }

  return fallback;
}

function getTimecardBucketKey(timecard: Timecard): string | null {
  if (timecard.cost_center) {
    return `cost:${timecard.cost_center}`;
  }
  if (timecard.project_id) {
    return `project:${timecard.project_id}`;
  }
  return null; // No bucket for unassigned entries
}

function getLegacyGroupMeta(timecard: Timecard): { key: string; title: string; description: string } {
  if (timecard.entry_type === 'leave') {
    return {
      key: 'legacy-leave',
      title: 'Leave And Exceptions',
      description: 'Saved leave and non-project entries that are not mapped to a category yet.',
    };
  }

  if (timecard.project_name || timecard.project_code || timecard.project_id) {
    return {
      key: 'legacy-projects',
      title: 'Project Tracking',
      description: 'Saved project-linked entries that do not yet belong to a configured category.',
    };
  }

  return {
    key: 'legacy-general',
    title: 'Legacy Tracking',
    description: 'Existing entries preserved until they are mapped into configured tracking categories.',
  };
}

function toCategoryBuckets(categories: TrackingCategory[] | undefined): AllocationBucket[] {
  if (!categories) {
    return [];
  }

  return categories.flatMap((category) =>
    (category.codes ?? [])
      .filter((code) => code.is_active !== false)
      .sort((left, right) => (left.sort_order ?? 0) - (right.sort_order ?? 0))
      .map((code) => ({
        key: `cost:${code.code}`,
        label: code.label,
        subtitle: code.code,
        groupKey: `category:${category.id}`,
        groupTitle: category.name,
        groupDescription:
          category.description ??
          (category.project_id
            ? 'Project-linked tracking codes grouped under this category.'
            : 'Standalone tracking category configured by managers.'),
        projectId: category.project_id,
        costCenter: code.code,
        entryType: code.entry_type,
        laborCategory: code.extra_fields?.labor_category ?? code.labor_category,
        defaultWorkLocation: code.default_work_location,
        source: 'category',
      }))
  );
}


function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function buildUtcIsoFromLocalTime(dateStr: string, timeValue: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = timeValue.split(':').map(Number);
  return new Date(year, month - 1, day, hours, minutes, 0, 0).toISOString();
}

export function TimecardsPage() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const { user, canViewAllTimecards } = useAuth();
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [localHours, setLocalHours] = useState<Record<string, string>>({});
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issueTitle, setIssueTitle] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [issuePriority, setIssuePriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [manualEditMode, setManualEditMode] = useState(false);
  const [isSavingManualEdit, setIsSavingManualEdit] = useState(false);
  const [extraPunchRows, setExtraPunchRows] = useState(0);
  const [punchDrafts, setPunchDrafts] = useState<Record<string, PunchDraft>>({});
  // Manager starts on the employee grid unless a ?user= param is provided
  const [managerGridView, setManagerGridView] = useState(() =>
    canViewAllTimecards && !searchParams.get('user'),
  );

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );
  const weekEnd = weekDays[6];
  const startStr = format(weekStart, 'yyyy-MM-dd');
  const endStr = format(weekEnd, 'yyyy-MM-dd');
  const requestedUserId = searchParams.get('user');
  const requestedWeek = searchParams.get('week');
  const requestedIssueId = searchParams.get('issue');
  const viewedUserId = canViewAllTimecards ? (selectedUserId ?? user?.id ?? null) : (user?.id ?? null);
  const isViewingOtherUser = !!user && !!viewedUserId && viewedUserId !== user.id;

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: getUsers,
    enabled: canViewAllTimecards,
  });

  useEffect(() => {
    if (canViewAllTimecards && requestedUserId) {
      const parsedUserId = Number(requestedUserId);
      if (Number.isFinite(parsedUserId)) {
        setSelectedUserId(parsedUserId);
        return;
      }
    }
    if (user && selectedUserId === null) {
      setSelectedUserId(user.id);
    }
  }, [user, selectedUserId, canViewAllTimecards, requestedUserId]);

  useEffect(() => {
    if (!requestedWeek) {
      return;
    }
    const parsedDate = new Date(`${requestedWeek}T00:00:00`);
    if (!Number.isNaN(parsedDate.getTime())) {
      setWeekStart(getMonday(parsedDate));
    }
  }, [requestedWeek]);

  const { data: punches, isLoading: punchLoading } = useQuery({
    queryKey: ['punch-entries', startStr, endStr, viewedUserId],
    queryFn: () => getPunchEntries({ start_date: startStr, end_date: endStr, user_id: viewedUserId ?? undefined }),
    enabled: viewedUserId !== null,
  });

  const { data: timecards, isLoading: tcLoading } = useQuery({
    queryKey: ['timecards', startStr, endStr, viewedUserId],
    queryFn: () => getTimecards({ start_date: startStr, end_date: endStr, user_id: viewedUserId ?? undefined }),
    enabled: viewedUserId !== null,
  });

  const { data: trackingCategories } = useQuery({
    queryKey: ['tracking-categories', 'assigned', viewedUserId],
    queryFn: () => getTrackingCategories({ assigned_only: true, user_id: viewedUserId ?? undefined }),
    enabled: viewedUserId !== null,
  });

  const { data: effectiveRule } = useQuery({
    queryKey: ['effective-work-rule', viewedUserId],
    queryFn: () => getEffectiveUserWorkRule(viewedUserId!),
    enabled: viewedUserId !== null,
  });

  const { data: weekSubmission } = useQuery({
    queryKey: ['timecard-submission', viewedUserId, startStr],
    queryFn: () => getWeekTimecardSubmission({ week_start: `${startStr}T00:00:00`, user_id: viewedUserId ?? undefined }),
    enabled: viewedUserId !== null,
  });

  // Punch lookup: dateStr -> PunchEntry[] sorted by punch_in
  const punchByDay = useMemo(() => {
    const toLocal = (s: string) => {
      const hasOffset = s.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(s);
      return new Date(hasOffset ? s : s + 'Z');
    };
    const map = new Map<string, PunchEntry[]>();
    for (const p of punches ?? []) {
      const key = format(toLocal(p.punch_in), 'yyyy-MM-dd');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    }
    map.forEach((list) =>
      list.sort((a, b) => toLocal(a.punch_in).getTime() - toLocal(b.punch_in).getTime())
    );
    return map;
  }, [punches]);

  const dayWorkLocations = useMemo(() => {
    const map = new Map<string, string>();
    for (const day of weekDays) {
      const dateStr = format(day, 'yyyy-MM-dd');
      const entries = punchByDay.get(dateStr) ?? [];
      if (entries.length === 0) {
        continue;
      }
      const hasRemoteNote = entries.some((entry) => /wfh|off-site|offsite|remote/i.test(entry.notes ?? ''));
      map.set(dateStr, hasRemoteNote ? 'off_site' : 'on_site');
    }
    return map;
  }, [punchByDay, weekDays]);

  // Day punch totals (minutes)
  const dayTotals = useMemo(() => {
    const map = new Map<string, number>();
    for (const day of weekDays) {
      const key = format(day, 'yyyy-MM-dd');
      const total = (punchByDay.get(key) ?? []).reduce(
        (s, p) => s + (p.duration_minutes ?? 0),
        0
      );
      map.set(key, total);
    }
    return map;
  }, [punchByDay, weekDays]);

  const weekTotalMins = useMemo(
    () => Array.from(dayTotals.values()).reduce((s, m) => s + m, 0),
    [dayTotals]
  );

  const basePunchPairCount = useMemo(() => {
    let max = 1;
    punchByDay.forEach((list) => {
      if (list.length > max) max = list.length;
    });
    return max;
  }, [punchByDay]);

  // Dynamic row count — as many pairs as the busiest day this week (minimum 1)
  const maxPairs = useMemo(() => {
    return basePunchPairCount + extraPunchRows;
  }, [basePunchPairCount, extraPunchRows]);

  // Timecard lookup: `${projectId}_${dateStr}` -> Timecard
  const tcByKey = useMemo(() => {
    const map = new Map<string, Timecard>();
    for (const tc of timecards ?? []) {
      map.set(`${getTimecardBucketKey(tc)}_${tc.date.slice(0, 10)}`, tc);
    }
    return map;
  }, [timecards]);

  const allocationBuckets = useMemo(() => {
    const categoryBuckets = toCategoryBuckets(trackingCategories);
    const seen = new Set(categoryBuckets.map((bucket) => bucket.key));
    const buckets = [...categoryBuckets];

    for (const tc of timecards ?? []) {
      const key = getTimecardBucketKey(tc);
      if (!key || seen.has(key)) {
        continue;
      }
      const meta = getLegacyGroupMeta(tc);
      buckets.push({
        key,
        label: tc.cost_center ?? tc.project_name ?? tc.project_code ?? 'Unassigned Entry',
        subtitle: tc.cost_center ? (tc.entry_type === 'leave' ? 'Legacy leave code' : 'Legacy cost center') : tc.project_code ?? 'Legacy project',
        groupKey: meta.key,
        groupTitle: meta.title,
        groupDescription: meta.description,
        projectId: tc.project_id,
        costCenter: tc.cost_center,
        entryType: tc.entry_type,
        laborCategory: tc.labor_category,
        defaultWorkLocation: tc.work_location,
        source: 'legacy',
      });
      seen.add(key);
    }

    return buckets;
  }, [timecards, trackingCategories]);

  const groupedBuckets = useMemo(() => {
    const groups = new Map<string, BucketGroup>();

    for (const bucket of allocationBuckets) {
      const existing = groups.get(bucket.groupKey);
      if (existing) {
        existing.buckets.push(bucket);
      } else {
        groups.set(bucket.groupKey, {
          key: bucket.groupKey,
          title: bucket.groupTitle,
          description: bucket.groupDescription,
          buckets: [bucket],
        });
      }
    }

    return Array.from(groups.values());
  }, [allocationBuckets]);

  useEffect(() => {
    setCollapsedGroups((prev) => {
      const next = { ...prev };
      for (const group of groupedBuckets) {
        if (!(group.key in next)) {
          next[group.key] = !group.key.startsWith('category:');
        }
      }
      return next;
    });
  }, [groupedBuckets]);

  // Sync local hours state from loaded timecards whenever week or data changes
  useEffect(() => {
    const init: Record<string, string> = {};
    for (const tc of timecards ?? []) {
      init[`${getTimecardBucketKey(tc)}_${tc.date.slice(0, 10)}`] = String(tc.hours_worked);
    }
    setLocalHours(init);
  }, [timecards]);

  useEffect(() => {
    const init: Record<string, PunchDraft> = {};
    for (const day of weekDays) {
      const dateStr = format(day, 'yyyy-MM-dd');
      const entries = punchByDay.get(dateStr) ?? [];
      entries.forEach((entry, index) => {
        init[`${dateStr}_${index}`] = {
          id: entry.id,
          punchIn: formatTime(entry.punch_in),
          punchOut: entry.punch_out ? formatTime(entry.punch_out) : '',
          notes: entry.notes,
        };
      });
    }
    setPunchDrafts(init);
  }, [punchByDay, weekDays]);

  const createMutation = useMutation({
    mutationFn: ({ data, userId }: { data: TimecardCreate; userId?: number }) =>
      createTimecard(data, userId ? { user_id: userId } : undefined),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<TimecardCreate> }) =>
      updateTimecard(id, data, isViewingOtherUser && viewedUserId ? { user_id: viewedUserId } : undefined),
  });
  const createIssueMutation = useMutation({
    mutationFn: createIssueReport,
    onSuccess: () => {
      setShowIssueModal(false);
      setIssueTitle('');
      setIssueDescription('');
      setIssuePriority('medium');
      queryClient.invalidateQueries({ queryKey: ['issues'] });
    },
  });
  const submitWeekMutation = useMutation({
    mutationFn: submitWeekTimecard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timecard-submission'] });
      queryClient.invalidateQueries({ queryKey: ['timecard-submissions'] });
      queryClient.invalidateQueries({ queryKey: ['issues'] });
    },
  });
  const reviewSubmissionMutation = useMutation({
    mutationFn: ({ id, action, reviewNotes }: { id: number; action: 'approve' | 'hold'; reviewNotes?: string }) =>
      reviewTimecardSubmission(id, { action, review_notes: reviewNotes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timecard-submission'] });
      queryClient.invalidateQueries({ queryKey: ['timecard-submissions'] });
      queryClient.invalidateQueries({ queryKey: ['issues'] });
    },
  });
  const createPunchMutation = useMutation({
    mutationFn: createPunchEntry,
  });
  const updatePunchMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { date?: string; punch_in?: string; punch_out?: string; notes?: string } }) =>
      updatePunchEntry(id, data),
  });
  const deletePunchMutation = useMutation({
    mutationFn: deletePunchEntry,
  });

  const currentWorkflowStatus = weekSubmission?.status ?? 'draft';
  const showPunchInputs = !isViewingOtherUser && manualEditMode;
  const canEditViewedWeek =
    viewedUserId !== null &&
    !isViewingOtherUser &&
    currentWorkflowStatus !== 'approved' &&
    manualEditMode;
  const canReviewViewedWeek =
    isViewingOtherUser &&
    canViewAllTimecards &&
    !!weekSubmission?.id &&
    (currentWorkflowStatus === 'submitted' || currentWorkflowStatus === 'on_hold');

  useEffect(() => {
    if (manualEditMode) return;
    setExtraPunchRows(0);
  }, [manualEditMode]);

  useEffect(() => {
    setManualEditMode(false);
    setExtraPunchRows(0);
  }, [startStr, viewedUserId]);

  const handleHoursBlur = async (bucket: AllocationBucket, dateStr: string) => {
    if (!canEditViewedWeek) return;
    setSaveError(null);
    const key = `${bucket.key}_${dateStr}`;
    const raw = localHours[key] ?? '';
    const existing = tcByKey.get(key);
    if (raw === '') {
      if (!existing) return;
      try {
        await deleteTimecard(existing.id);
        queryClient.invalidateQueries({ queryKey: ['timecards', startStr, endStr, viewedUserId] });
        queryClient.invalidateQueries({ queryKey: ['timecard-submission', viewedUserId, startStr] });
        queryClient.invalidateQueries({ queryKey: ['timecard-submissions'] });
      } catch (error) {
        setSaveError(getApiErrorMessage(error, 'Unable to clear hours for this day.'));
      }
      return;
    }
    const val = parseFloat(raw);
    if (isNaN(val) || val < 0) return;
    const payload = {
      hours_worked: val,
      project_id: bucket.projectId,
      cost_center: bucket.costCenter,
      entry_type: bucket.entryType,
      labor_category: bucket.laborCategory,
      work_location: existing?.work_location ?? bucket.defaultWorkLocation ?? dayWorkLocations.get(dateStr),
    };
    try {
      if (existing) {
        await updateMutation.mutateAsync({ id: existing.id, data: payload });
      } else if (val > 0) {
        await createMutation.mutateAsync({
          data: {
            date: `${dateStr}T00:00:00`,
            ...payload,
          },
          userId: isViewingOtherUser && viewedUserId ? viewedUserId : undefined,
        });
      }
      queryClient.invalidateQueries({ queryKey: ['timecards', startStr, endStr, viewedUserId] });
      queryClient.invalidateQueries({ queryKey: ['timecard-submission', viewedUserId, startStr] });
      queryClient.invalidateQueries({ queryKey: ['timecard-submissions'] });
    } catch (error) {
      setSaveError(getApiErrorMessage(error, 'Unable to save hours for this day.'));
    }
  };

  const handlePunchDraftChange = (
    dateStr: string,
    index: number,
    field: 'punchIn' | 'punchOut',
    value: string,
  ) => {
    setPunchDrafts((prev) => ({
      ...prev,
      [`${dateStr}_${index}`]: {
        ...(prev[`${dateStr}_${index}`] ?? { punchIn: '', punchOut: '' }),
        [field]: value,
      },
    }));
  };

  const persistPunchDraft = async (dateStr: string, index: number) => {
    setSaveError(null);
    const key = `${dateStr}_${index}`;
    const draft = punchDrafts[key];
    const existing = (punchByDay.get(dateStr) ?? [])[index];
    if (!draft) {
      return;
    }

    const punchIn = draft.punchIn.trim();
    const punchOut = draft.punchOut.trim();
    if (!punchIn && !punchOut) {
      if (!existing && !draft.id) {
        return;
      }
      await deletePunchMutation.mutateAsync(draft.id ?? existing!.id);
      return;
    }

    if (!punchIn) {
      throw new Error('Punch in time is required when editing punches.');
    }

    const payload = {
      date: dateStr,
      punch_in: buildUtcIsoFromLocalTime(dateStr, punchIn),
      punch_out: punchOut ? buildUtcIsoFromLocalTime(dateStr, punchOut) : undefined,
      notes: draft.notes,
    };

    if (draft.id ?? existing?.id) {
      await updatePunchMutation.mutateAsync({
        id: draft.id ?? existing!.id,
        data: payload,
      });
      return;
    }

    const created = await createPunchMutation.mutateAsync(payload);
    // Store the new ID so persistAllPunchDrafts won't re-create it
    setPunchDrafts((prev) => ({
      ...prev,
      [key]: { ...prev[key], id: (created as { id: number }).id },
    }));
  };

  const refreshPunchState = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['punch-entries', startStr, endStr, viewedUserId] }),
      queryClient.invalidateQueries({ queryKey: ['timecard-submission', viewedUserId, startStr] }),
      queryClient.invalidateQueries({ queryKey: ['timecard-submissions'] }),
    ]);
  };

  const persistAllPunchDrafts = async () => {
    for (const day of weekDays) {
      const dateStr = format(day, 'yyyy-MM-dd');
      for (let index = 0; index < maxPairs; index += 1) {
        await persistPunchDraft(dateStr, index);
      }
    }
    await refreshPunchState();
  };

  const handlePunchBlur = async (
    event: FocusEvent<HTMLInputElement>,
    dateStr: string,
    index: number,
  ) => {
    if (isViewingOtherUser) {
      return;
    }
    if (!manualEditMode) {
      return;
    }

    const nextFocusedElement = event.relatedTarget as HTMLElement | null;
    if (nextFocusedElement?.dataset.punchRow === `${dateStr}_${index}`) {
      return;
    }

    try {
      await persistPunchDraft(dateStr, index);
      await refreshPunchState();
    } catch (error) {
      setSaveError(getApiErrorMessage(error, 'Unable to save punch entry.'));
    }
  };

  const handleManualEditToggle = async () => {
    if (!manualEditMode) {
      setManualEditMode(true);
      return;
    }

    setIsSavingManualEdit(true);
    try {
      await persistAllPunchDrafts();
      setManualEditMode(false);
    } catch (error) {
      setSaveError(getApiErrorMessage(error, 'Unable to save your punch edits.'));
    } finally {
      setIsSavingManualEdit(false);
    }
  };

  // Project hour totals per day (from local state)
  const projectDayTotals = useMemo(() => {
    const result: Record<string, number> = {};
    for (const day of weekDays) {
      const dateStr = format(day, 'yyyy-MM-dd');
      result[dateStr] =
        allocationBuckets.reduce(
          (s, bucket) => s + (parseFloat(localHours[`${bucket.key}_${dateStr}`] ?? '0') || 0),
          0
        );
    }
    return result;
  }, [allocationBuckets, localHours, weekDays]);

  const toggleGroup = (groupKey: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  };

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const isLoading = punchLoading || tcLoading;
  const viewedUser = (users ?? []).find((u: User) => u.id === viewedUserId) ?? user ?? null;
  const weekTotalHours = Number((weekTotalMins / 60).toFixed(2));
  const weeklyLimit = effectiveRule?.max_weekly_hours ?? effectiveRule?.target_weekly_hours ?? null;
  const remainingWeeklyHours = weeklyLimit != null ? Math.max(weeklyLimit - weekTotalHours, 0) : null;
  const weeklyOverage = weeklyLimit != null ? Math.max(weekTotalHours - weeklyLimit, 0) : 0;
  const workflowConfig: Record<TimecardSubmission['status'], { label: string; cls: string }> = {
    draft: { label: 'Draft', cls: 'text-slate-300 bg-slate-500/10 border-slate-500/30' },
    submitted: { label: 'Submitted', cls: 'text-amber-300 bg-amber-500/10 border-amber-500/30' },
    on_hold: { label: 'On Hold', cls: 'text-rose-300 bg-rose-500/10 border-rose-500/30' },
    approved: { label: 'Approved', cls: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30' },
  };
  const helperText = isViewingOtherUser
    ? 'Managers and accountants review submitted or held weeks here and approve them once issues are cleared.'
    : currentWorkflowStatus === 'submitted'
      ? 'This week has been submitted. Use Manual Edit if you need to change anything before it auto-approves.'
      : currentWorkflowStatus === 'on_hold'
        ? 'This week is on hold because issues are still open. Use Manual Edit to fix the entries, then resubmit.'
        : currentWorkflowStatus === 'approved'
          ? 'This week has been approved and is read-only.'
          : 'Your entries save when you leave a field. Submit the week once it is ready for approval.';

  // Manager grid view handler
  const handleGridSelectUser = (userId: number, gridWeek?: Date) => {
    setSelectedUserId(userId);
    if (gridWeek) setWeekStart(gridWeek);
    setManagerGridView(false);
  };

  if (canViewAllTimecards && managerGridView) {
    return <ManagerTimecardGrid onSelectUser={handleGridSelectUser} />;
  }

  return (
    <div className="w-full">
      {/* Page header */}
      <div className="mb-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            {canViewAllTimecards && (
              <button
                onClick={() => setManagerGridView(true)}
                className="rounded-lg border border-slate-700 bg-slate-800/60 p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100"
                title="Back to team view"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <h1 className="text-2xl font-bold text-slate-100">Weekly Timecard</h1>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${workflowConfig[currentWorkflowStatus].cls}`}
            >
              Workflow: {workflowConfig[currentWorkflowStatus].label}
            </span>
            <span className="inline-flex rounded-full border border-slate-700 bg-slate-800/50 px-2.5 py-0.5 text-xs font-medium text-slate-300">
              Week: {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
            </span>
            {viewedUser && (
              <span className="inline-flex rounded-full border border-slate-700 bg-slate-800/50 px-2.5 py-0.5 text-xs font-medium text-slate-300">
                Viewing: {viewedUser.full_name}
              </span>
            )}
            {isViewingOtherUser && (
              <span className="inline-flex rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-0.5 text-xs font-medium text-sky-300">
                Read-only reviewer access
              </span>
            )}
          </div>

          <div className="mt-3 max-w-3xl space-y-2.5">
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2.5 text-sm text-slate-300">
              {helperText}
            </div>
            {requestedIssueId && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-200">
                Reviewing issue #{requestedIssueId}. Inspect this user&apos;s entries here, then finish the resolution from Alerts.
              </div>
            )}
            {weekSubmission?.auto_approve_at && currentWorkflowStatus === 'submitted' && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-200">
                Auto-approval scheduled for {format(new Date(weekSubmission.auto_approve_at), 'MMM d, yyyy p')} if no issues are opened before then.
              </div>
            )}
            {(weekSubmission?.unresolved_issue_count ?? 0) > 0 && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-sm text-rose-200">
                {weekSubmission?.unresolved_issue_count} linked issue{weekSubmission?.unresolved_issue_count === 1 ? '' : 's'} must be resolved before approval.
              </div>
            )}
            {!isViewingOtherUser && (currentWorkflowStatus === 'submitted' || currentWorkflowStatus === 'on_hold') && (
              <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-2.5 text-sm text-sky-200">
                {manualEditMode
                  ? 'Manual edit mode is on. Saving any change will move this week back to draft so you can resubmit it.'
                  : 'This week is locked for review. Use Manual Edit to make changes and resubmit it afterward.'}
              </div>
            )}
            {saveError && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-sm text-rose-300">
                {saveError}
              </div>
            )}
          </div>
        </div>
        <div className="relative z-[120] flex flex-wrap items-start justify-end gap-2 xl:items-start">
          <div className="flex items-center gap-0.5 rounded-lg border border-slate-700 bg-slate-800/60 px-1">
            <button
              onClick={() => setWeekStart((d) => addDays(d, -7))}
              className="rounded p-1.5 text-slate-400 transition-colors hover:text-slate-100"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 text-xs font-medium whitespace-nowrap text-slate-300">
              {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
            </span>
            <button
              onClick={() => setWeekStart((d) => addDays(d, 7))}
              className="rounded p-1.5 text-slate-400 transition-colors hover:text-slate-100"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <Button variant="secondary" onClick={() => setShowIssueModal(true)}>
            <ShieldAlert className="w-4 h-4" />
            Report Issue
          </Button>
          {!isViewingOtherUser && viewedUserId !== null && currentWorkflowStatus !== 'approved' && (
            <Button
              variant={manualEditMode ? 'secondary' : 'outline'}
              onClick={handleManualEditToggle}
              isLoading={isSavingManualEdit}
            >
              {manualEditMode
                ? 'Done Editing'
                : currentWorkflowStatus === 'draft'
                  ? 'Edit'
                  : 'Manual Edit'}
            </Button>
          )}
          {!isViewingOtherUser && showPunchInputs && (
            <Button variant="outline" onClick={() => setExtraPunchRows((current) => current + 1)}>
              <Plus className="w-4 h-4" /> Add Punch Row
            </Button>
          )}
          {!isViewingOtherUser && viewedUserId !== null && currentWorkflowStatus !== 'approved' && (
            <Button
              onClick={() => {
                // Validate that punch hours are allocated to projects
                const totalPunchHours = weekTotalMins / 60;
                const totalAllocatedHours = Object.values(projectDayTotals).reduce((s, v) => s + v, 0);
                if (totalPunchHours > 0 && totalAllocatedHours === 0) {
                  setSaveError('Please allocate your hours to projects before submitting. Enter hours in the Allocation Buckets section below the punch entries.');
                  return;
                }
                if (totalPunchHours > 0 && totalAllocatedHours < totalPunchHours * 0.5) {
                  const proceed = window.confirm(
                    `Only ${totalAllocatedHours.toFixed(1)}h of ${totalPunchHours.toFixed(1)}h punch hours are allocated to projects. Do you want to submit anyway?`
                  );
                  if (!proceed) return;
                }
                setSaveError(null);
                submitWeekMutation.mutate({ week_start: `${startStr}T00:00:00` });
              }}
              isLoading={submitWeekMutation.isPending}
              disabled={currentWorkflowStatus === 'submitted' && !manualEditMode}
            >
              {currentWorkflowStatus === 'on_hold'
                ? 'Resubmit For Approval'
                : currentWorkflowStatus === 'submitted'
                  ? (manualEditMode ? 'Submit After Edit' : 'Submitted')
                  : 'Review & Submit'}
            </Button>
          )}
          {canReviewViewedWeek && weekSubmission?.id && (
            <>
              <Button
                onClick={() => reviewSubmissionMutation.mutate({ id: weekSubmission.id!, action: 'approve' })}
                isLoading={reviewSubmissionMutation.isPending}
                disabled={(weekSubmission?.unresolved_issue_count ?? 0) > 0}
              >
                Approve Week
              </Button>
              <Button
                variant="secondary"
                onClick={() => reviewSubmissionMutation.mutate({ id: weekSubmission.id!, action: 'hold', reviewNotes: 'Held for manager review.' })}
                isLoading={reviewSubmissionMutation.isPending}
              >
                Keep On Hold
              </Button>
            </>
          )}
        </div>
      </div>

      {isLoading ? (
        <PageLoader />
      ) : (
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
          {/* ── Main grid ── */}
          <div className="min-w-0 rounded-xl border border-slate-700/60 bg-slate-900 overflow-auto max-h-[calc(100vh-180px)] xl:flex-1">
            <table className="min-w-[860px] w-full border-collapse text-sm">
              <colgroup>
                <col style={{ width: '112px' }} />
                {weekDays.map((d) => (
                  <col key={d.toISOString()} />
                ))}
              </colgroup>

              {/* Day header row */}
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="sticky top-0 left-0 z-40 px-4 py-3 bg-slate-800" />
                  {weekDays.map((day) => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const isToday = dateStr === todayStr;
                    return (
                      <th
                        key={day.toISOString()}
                        className={`sticky top-0 z-30 px-3 py-3 text-center border-l border-slate-700/60 ${
                          isToday ? 'bg-[#1e2040]' : 'bg-slate-800'
                        }`}
                      >
                        <p
                          className={`text-[10px] uppercase tracking-wide font-semibold ${
                            isToday ? 'text-indigo-400' : 'text-slate-500'
                          }`}
                        >
                          {format(day, 'EEE')}
                        </p>
                        <p
                          className={`text-base font-bold mt-0.5 leading-none ${
                            isToday ? 'text-indigo-300' : 'text-slate-300'
                          }`}
                        >
                          {format(day, 'd')}
                        </p>
                        <p className="text-[9px] text-slate-600 mt-0.5">
                          {format(day, 'MMM')}
                        </p>
                        <p className="mt-1 text-[9px] font-medium uppercase tracking-wide text-slate-500">
                          {dayWorkLocations.get(dateStr) === 'off_site' ? 'Off-site' : dayWorkLocations.get(dateStr) === 'on_site' ? 'On-site' : '—'}
                        </p>
                      </th>
                    );
                  })}
                </tr>

                <tr className="border-t-2 border-slate-700">
                  <th className="sticky top-[84px] left-0 z-40 px-4 py-3 bg-slate-800 border-r border-slate-700/60 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span className="text-xs font-bold text-slate-300 uppercase tracking-wide">
                        Total Hours
                      </span>
                    </div>
                  </th>
                  {weekDays.map((day) => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const mins = dayTotals.get(dateStr) ?? 0;
                    const isToday = dateStr === todayStr;
                    return (
                      <th
                        key={`punch-total-${day.toISOString()}`}
                        className={`sticky top-[84px] z-20 px-3 py-3 text-center border-l border-slate-700/60 ${
                          isToday ? 'bg-[#1e2040]' : 'bg-slate-800'
                        }`}
                      >
                        <span
                          className={`text-sm font-bold tabular-nums ${
                            mins > 0 ? 'text-slate-100' : 'text-slate-700'
                          }`}
                        >
                          {mins > 0 ? minutesToHours(mins) : '—'}
                        </span>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody>
                {/* ── Punch pairs ── */}
                {Array.from({ length: maxPairs }, (_, i) => (
                  <Fragment key={`punch-pair-${i}`}>
                    {/* Punch In row */}
                    <tr
                      key={`in-${i}`}
                      className={i > 0 ? 'border-t border-slate-800/60' : ''}
                    >
                      <td className="sticky left-0 z-10 px-4 py-2.5 bg-slate-800 border-r border-slate-700/60 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                          <span className="text-xs font-medium text-slate-400">
                            Punch in{maxPairs > 1 ? ` ${i + 1}` : ''}
                          </span>
                          {showPunchInputs && i >= basePunchPairCount && (
                            <span className="text-[10px] text-sky-400">new row</span>
                          )}
                        </div>
                      </td>
                      {weekDays.map((day) => {
                        const dateStr = format(day, 'yyyy-MM-dd');
                        const entry = (punchByDay.get(dateStr) ?? [])[i];
                        const isToday = dateStr === todayStr;
                        return (
                          <td
                            key={day.toISOString()}
                            className={`px-3 py-2.5 text-center border-l border-slate-700/60 ${
                              isToday ? 'bg-indigo-500/5' : ''
                            }`}
                          >
                            {showPunchInputs ? (
                              <input
                                type="time"
                                value={punchDrafts[`${dateStr}_${i}`]?.punchIn ?? ''}
                                onChange={(e) => handlePunchDraftChange(dateStr, i, 'punchIn', e.target.value)}
                                onBlur={(e) => handlePunchBlur(e, dateStr, i)}
                                data-punch-row={`${dateStr}_${i}`}
                                className="w-full rounded bg-transparent px-1 py-1 text-center text-xs text-emerald-300 outline-none ring-0 transition-colors focus:bg-emerald-500/10"
                              />
                            ) : entry ? (
                              <span className="text-xs font-semibold text-emerald-400 tabular-nums">
                                {formatTime(entry.punch_in)}
                              </span>
                            ) : (
                              <span className="text-slate-700 text-xs">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>

                    {/* Punch Out row */}
                    <tr key={`out-${i}`} className="border-t border-slate-800/40">
                      <td className="sticky left-0 z-10 px-4 py-2.5 bg-slate-800 border-r border-slate-700/60 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 flex-shrink-0" />
                          <span className="text-xs font-medium text-slate-400">
                            Punch out{maxPairs > 1 ? ` ${i + 1}` : ''}
                          </span>
                          {showPunchInputs && i >= basePunchPairCount && (
                            <span className="text-[10px] text-sky-400">new row</span>
                          )}
                        </div>
                      </td>
                      {weekDays.map((day) => {
                        const dateStr = format(day, 'yyyy-MM-dd');
                        const entry = (punchByDay.get(dateStr) ?? [])[i];
                        const isToday = dateStr === todayStr;
                        return (
                          <td
                            key={day.toISOString()}
                            className={`px-3 py-2.5 text-center border-l border-slate-700/60 ${
                              isToday ? 'bg-indigo-500/5' : ''
                            }`}
                          >
                            {showPunchInputs ? (
                              <input
                                type="time"
                                value={punchDrafts[`${dateStr}_${i}`]?.punchOut ?? ''}
                                onChange={(e) => handlePunchDraftChange(dateStr, i, 'punchOut', e.target.value)}
                                onBlur={(e) => handlePunchBlur(e, dateStr, i)}
                                data-punch-row={`${dateStr}_${i}`}
                                className="w-full rounded bg-transparent px-1 py-1 text-center text-xs text-rose-300 outline-none ring-0 transition-colors focus:bg-rose-500/10"
                              />
                            ) : entry?.punch_out ? (
                              <span className="text-xs font-semibold text-rose-400 tabular-nums">
                                {formatTime(entry.punch_out)}
                              </span>
                            ) : entry ? (
                              <span className="text-[10px] font-medium text-emerald-400 animate-pulse">
                                Active
                              </span>
                            ) : (
                              <span className="text-slate-700 text-xs">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  </Fragment>
                ))}

                {/* ── Spacer + section label ── */}
                <tr className="border-t border-slate-700/40">
                  <td colSpan={8} className="py-1.5 bg-slate-800/20" />
                </tr>
                <tr className="border-t border-slate-700/60">
                  <td
                    colSpan={8}
                    className="px-4 py-2 bg-slate-800/60"
                  >
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3 h-3 text-slate-500" />
                      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
                        Allocation Buckets
                      </span>
                    </div>
                  </td>
                </tr>

                {/* ── Project rows ── */}
                {allocationBuckets.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-6 text-center text-xs text-slate-600"
                    >
                      No active projects
                    </td>
                  </tr>
                ) : (
                  groupedBuckets.flatMap((group, groupIndex) => {
                    const isCollapsed = collapsedGroups[group.key] ?? false;
                    const rows = [
                      <tr key={`group-${group.key}`} className={`border-t ${groupIndex === 0 ? 'border-slate-700/60' : 'border-slate-700/40'}`}>
                        <td className="sticky left-0 z-10 px-4 py-3 bg-slate-800 border-r border-slate-700/60">
                          <button
                            type="button"
                            onClick={() => toggleGroup(group.key)}
                            className="flex w-full items-start justify-between gap-2 text-left"
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-semibold uppercase tracking-wider text-slate-300">{group.title}</p>
                              <p className="mt-1 text-[10px] leading-4 text-slate-500">{group.description}</p>
                            </div>
                            {isCollapsed ? (
                              <ChevronDown className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-500" />
                            ) : (
                              <ChevronUp className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-500" />
                            )}
                          </button>
                        </td>
                        {weekDays.map((day) => {
                          const dateStr = format(day, 'yyyy-MM-dd');
                          const isToday = dateStr === todayStr;
                          const total = group.buckets.reduce(
                            (sum, bucket) => sum + (parseFloat(localHours[`${bucket.key}_${dateStr}`] ?? '0') || 0),
                            0
                          );
                          return (
                            <td
                              key={`${group.key}-${dateStr}`}
                              className={`px-3 py-3 text-center border-l border-slate-700/60 ${
                                isToday ? 'bg-indigo-500/10' : 'bg-slate-800/20'
                              }`}
                            >
                              <span className={`text-xs font-semibold tabular-nums ${total > 0 ? 'text-slate-100' : 'text-slate-600'}`}>
                                {total > 0 ? `${total}h` : '—'}
                              </span>
                            </td>
                          );
                        })}
                      </tr>,
                    ];

                    if (!isCollapsed) {
                      rows.push(
                        ...group.buckets.map((bucket, idx) => (
                          <tr
                            key={bucket.key}
                            className={`border-t border-slate-800/60 ${idx % 2 !== 0 ? 'bg-slate-800/10' : ''}`}
                          >
                            <td className="sticky left-0 z-10 px-4 py-2.5 bg-slate-800 border-r border-slate-700/60">
                              <p
                                className="text-xs font-medium text-slate-300 truncate max-w-[160px]"
                                title={bucket.label}
                              >
                                {bucket.label}
                              </p>
                              <p className="text-[9px] text-slate-600 mt-0.5">{bucket.subtitle ?? (bucket.source === 'category' ? 'Configured tracking code' : 'Legacy entry')}</p>
                            </td>
                            {weekDays.map((day) => {
                              const dateStr = format(day, 'yyyy-MM-dd');
                              const key = `${bucket.key}_${dateStr}`;
                              const isToday = dateStr === todayStr;
                              return (
                                <td
                                  key={day.toISOString()}
                                  className={`px-2 py-2 border-l border-slate-700/60 ${
                                    isToday ? 'bg-indigo-500/5' : ''
                                  }`}
                                >
                                  <input
                                    type="number"
                                    min="0"
                                    max="24"
                                    step="0.5"
                                    value={localHours[key] ?? ''}
                                    placeholder="—"
                                    readOnly={!canEditViewedWeek}
                                    onChange={(e) =>
                                      setLocalHours((prev) => ({
                                        ...prev,
                                        [key]: e.target.value,
                                      }))
                                    }
                                    onBlur={() => handleHoursBlur(bucket, dateStr)}
                                    className={`w-full text-xs text-center bg-transparent text-slate-300 placeholder-slate-700 rounded px-1 py-1 tabular-nums transition-colors ${
                                      !canEditViewedWeek
                                        ? 'cursor-not-allowed text-slate-500'
                                        : 'focus:outline-none focus:bg-indigo-500/10 focus:ring-1 focus:ring-indigo-500/40'
                                    }`}
                                  />
                                </td>
                              );
                            })}
                          </tr>
                        ))
                      );
                    }

                    return rows;
                  })
                )}

                {/* ── Project totals row ── */}
                <tr className="border-t-2 border-slate-700">
                  <td className="sticky left-0 z-10 px-4 py-3 bg-slate-800 border-r border-slate-700/60 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span className="text-xs font-bold text-slate-300 uppercase tracking-wide">
                        Total Hours
                      </span>
                    </div>
                  </td>
                  {weekDays.map((day) => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const total = projectDayTotals[dateStr] ?? 0;
                    const isToday = dateStr === todayStr;
                    return (
                      <td
                        key={day.toISOString()}
                        className={`px-3 py-3 text-center border-l border-slate-700/60 ${
                          isToday ? 'bg-indigo-500/10' : 'bg-slate-800/40'
                        }`}
                      >
                        <span
                          className={`text-sm font-bold tabular-nums ${
                            total > 0 ? 'text-slate-100' : 'text-slate-700'
                          }`}
                        >
                          {total > 0 ? `${total}h` : '—'}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>

          {/* ── Right: weekly summary / rule progress ── */}
          <div className="w-full flex-shrink-0 flex flex-col gap-3 xl:w-48">
            <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-3 text-left">
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-2">
                Approval Flow
              </p>
              <p className="text-xs text-slate-300">Current status</p>
              <p className="mt-1 text-[11px] leading-5 text-slate-500">
                {workflowConfig[currentWorkflowStatus].label}
              </p>
              {weekSubmission?.submitted_at && (
                <>
                  <p className="mt-3 text-xs text-slate-300">Submitted</p>
                  <p className="mt-1 text-[11px] leading-5 text-slate-500">{format(new Date(weekSubmission.submitted_at), 'MMM d, yyyy p')}</p>
                </>
              )}
              {weekSubmission?.approved_at && (
                <>
                  <p className="mt-3 text-xs text-slate-300">Approved</p>
                  <p className="mt-1 text-[11px] leading-5 text-slate-500">{format(new Date(weekSubmission.approved_at), 'MMM d, yyyy p')}</p>
                </>
              )}
              {(weekSubmission?.unresolved_issue_count ?? 0) > 0 && (
                <>
                  <p className="mt-3 text-xs text-slate-300">Open issues</p>
                  <p className="mt-1 text-[11px] leading-5 text-slate-500">{weekSubmission?.unresolved_issue_count}</p>
                </>
              )}
            </div>
            <div className={`rounded-xl p-4 ${weeklyLimit != null ? 'border border-amber-500/30 bg-amber-500/10' : 'border border-indigo-500/30 bg-indigo-500/10'} text-center`}>
              <p className={`text-[10px] uppercase tracking-widest font-semibold leading-relaxed mb-3 ${weeklyLimit != null ? 'text-amber-300/90' : 'text-indigo-400/80'}`}>
                {weeklyLimit != null ? 'Weekly Progress' : 'Total Hours'}<br />for Week
              </p>
              <p className={`text-3xl font-bold tabular-nums ${weeklyLimit != null ? 'text-amber-200' : 'text-indigo-300'}`}>
                {minutesToHours(weekTotalMins)}
              </p>
              {weeklyLimit != null ? (
                <div className="mt-3 space-y-2 text-left">
                  <div className="flex items-center justify-between text-[11px] text-amber-100/80">
                    <span>Rule cap</span>
                    <span className="font-semibold">{weeklyLimit}h</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-900/60">
                    <div
                      className={`h-full rounded-full ${weeklyOverage > 0 ? 'bg-rose-400' : 'bg-amber-300'}`}
                      style={{ width: `${Math.min((weekTotalHours / weeklyLimit) * 100, 100)}%` }}
                    />
                  </div>
                  <p className={`text-[10px] ${weeklyOverage > 0 ? 'text-rose-300' : 'text-amber-200/80'}`}>
                    {weeklyOverage > 0
                      ? `${weeklyOverage.toFixed(1)}h over the rule cap`
                      : `${remainingWeeklyHours?.toFixed(1)}h remaining this week`}
                  </p>
                  {!!effectiveRule?.applied_rule_names?.length && (
                    <div className="rounded-lg border border-amber-500/20 bg-slate-950/40 px-2 py-2 text-[10px] text-amber-100/75">
                      <div className="mb-1 flex items-center gap-1">
                        <ShieldAlert className="w-3 h-3" />
                        <span>Applied rules</span>
                      </div>
                      <p>{effectiveRule.applied_rule_names.join(', ')}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-[10px] text-indigo-500 mt-2">
                  {weekTotalMins > 0
                    ? `${(weekTotalMins / 60).toFixed(1)}h total`
                    : 'No entries yet'}
                </p>
              )}
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-3 text-center">
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-2">
                Days Active
              </p>
              <p className="text-2xl font-bold text-slate-200">
                {
                  weekDays.filter(
                    (d) => (dayTotals.get(format(d, 'yyyy-MM-dd')) ?? 0) > 0
                  ).length
                }
                <span className="text-sm text-slate-500 font-normal">/7</span>
              </p>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-3 text-left">
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-2">
                Tracking Setup
              </p>
              <p className="text-xs text-slate-300">Configured categories</p>
              <p className="mt-1 text-[11px] leading-5 text-slate-500">
                {trackingCategories?.length ?? 0}
              </p>
              <p className="mt-3 text-xs text-slate-300">Active tracking codes</p>
              <p className="mt-1 text-[11px] leading-5 text-slate-500">
                {allocationBuckets.filter((bucket) => bucket.source === 'category').length}
              </p>
            </div>
          </div>
        </div>
      )}

      <Modal isOpen={showIssueModal} onClose={() => setShowIssueModal(false)} title="Report Timecard Issue">
        <div className="space-y-4">
          <Input
            label="Title"
            value={issueTitle}
            onChange={(e) => setIssueTitle(e.target.value)}
            placeholder="Missing hours for Monday shift"
          />
          <Select label="Priority" value={issuePriority} onChange={(e) => setIssuePriority(e.target.value as 'low' | 'medium' | 'high')}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </Select>
          <Textarea
            label="Description"
            rows={6}
            value={issueDescription}
            onChange={(e) => setIssueDescription(e.target.value)}
            placeholder="Describe what is wrong in the timesheet and what needs to be corrected."
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowIssueModal(false)}>Cancel</Button>
            <Button
              onClick={() =>
                createIssueMutation.mutate({
                  user_id: viewedUserId ?? undefined,
                  issue_type: 'timecard',
                  priority: issuePriority,
                  title: issueTitle,
                  description: issueDescription,
                  week_start: `${startStr}T00:00:00`,
                })
              }
              isLoading={createIssueMutation.isPending}
              disabled={!issueTitle.trim() || !issueDescription.trim()}
            >
              Submit Issue
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
