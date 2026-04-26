import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, FolderKanban, MoreVertical, Eye, Pencil, Trash2, UserPlus, Clock, CheckCircle2, XCircle, Users, Shield, User, LockOpen, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getProjects, createProject, deleteProject, getAssignments, createAssignment, getPendingApprovals, approveAssignment, rejectAssignment } from '../../api/endpoints';
import type { ProjectCreate, ProjectStatus, TrackingCategoryCreate, TrackingCode, TrackingRule, Project, ProjectAssignment } from '../../types';
import { Button } from '../../components/ui/Button';
import { Input, Select, Textarea } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { ProjectStatusBadge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { EmptyState, PageLoader } from '../../components/ui';
import { formatDate } from '../../utils';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../contexts/AuthContext';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export function ProjectsPage() {
  const queryClient = useQueryClient();
  const { canCreateProjects, canManageAssignments, user } = useAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'projects' | 'pending'>('projects');
  const [projectFilter, setProjectFilter] = useState<'all' | 'assigned' | 'open' | 'approval_required'>('all');

  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects', { search, status: statusFilter }],
    queryFn: () =>
      getProjects({
        search: search.length >= 2 ? search : undefined,
        status: statusFilter || undefined,
        limit: 200,
      }),
  });

  // Fetch user's current assignments to show status on cards
  const { data: myAssignments } = useQuery({
    queryKey: ['assignments', 'mine'],
    queryFn: () => getAssignments(),
  });

  // For managers: fetch pending approvals
  const { data: pendingApprovals } = useQuery({
    queryKey: ['assignments', 'pending'],
    queryFn: () => getPendingApprovals(),
    enabled: canManageAssignments,
  });

  // Build a map: project_id -> assignment for the current user
  const myAssignmentMap = new Map<number, ProjectAssignment>();
  myAssignments?.forEach((a) => myAssignmentMap.set(a.project_id, a));

  // Apply project filter
  const filteredProjects = projects?.filter((p) => {
    if (projectFilter === 'assigned') {
      const a = myAssignmentMap.get(p.id);
      return a?.status === 'approved';
    }
    if (projectFilter === 'open') {
      return !p.requires_approval;
    }
    if (projectFilter === 'approval_required') {
      return p.requires_approval;
    }
    return true;
  });

  const requestMutation = useMutation({
    mutationFn: (projectId: number) =>
      createAssignment({ project_id: projectId, user_id: user!.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: number) => approveAssignment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: number) => rejectAssignment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setDeleteId(null);
    },
  });

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Projects</h1>
          <p className="text-sm text-slate-500 mt-0.5">{projects?.length ?? 0} total</p>
        </div>
        {canCreateProjects && (
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4" />
            New Project
          </Button>
        )}
      </div>

      {/* Tabs for managers */}
      {canManageAssignments && (
        <div className="flex gap-1 mb-5 bg-slate-900 rounded-lg p-1 border border-slate-800 w-fit">
          <button
            onClick={() => setActiveTab('projects')}
            className={`px-4 py-2 text-sm rounded-md transition-all ${
              activeTab === 'projects'
                ? 'bg-indigo-500/20 text-indigo-300 font-medium'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Projects
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 text-sm rounded-md transition-all flex items-center gap-2 ${
              activeTab === 'pending'
                ? 'bg-amber-500/20 text-amber-300 font-medium'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Pending Approvals
            {(pendingApprovals?.length ?? 0) > 0 && (
              <span className="bg-amber-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {pendingApprovals!.length}
              </span>
            )}
          </button>
        </div>
      )}

      {activeTab === 'pending' && canManageAssignments ? (
        /* ── Pending Approvals Tab ── */
        <div className="space-y-3">
          {!pendingApprovals?.length ? (
            <EmptyState
              icon={<CheckCircle2 className="w-6 h-6" />}
              title="No pending approvals"
              description="All assignment requests have been handled"
            />
          ) : (
            pendingApprovals.map((assignment) => (
              <Card key={assignment.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                      <UserPlus className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-100">
                        {assignment.user_name || assignment.user_email || `User #${assignment.user_id}`}
                      </p>
                      <p className="text-xs text-slate-500">
                        Wants to join <span className="text-indigo-400 font-medium">{assignment.project_name || `Project #${assignment.project_id}`}</span>
                        {assignment.project_code && (
                          <span className="ml-1 text-slate-600">({assignment.project_code})</span>
                        )}
                      </p>
                      {assignment.notes && (
                        <p className="text-xs text-slate-600 mt-0.5 italic">"{assignment.notes}"</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => rejectMutation.mutate(assignment.id)}
                      isLoading={rejectMutation.isPending}
                    >
                      <XCircle className="w-3.5 h-3.5" /> Reject
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => approveMutation.mutate(assignment.id)}
                      isLoading={approveMutation.isPending}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      ) : (
        /* ── Projects Tab ── */
        <>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search projects…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-slate-700 bg-slate-900 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all hover:border-slate-600"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all cursor-pointer min-w-[160px]"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Project filter pills */}
          <div className="flex flex-wrap gap-2 mb-6">
            {([
              { key: 'all', label: 'All Projects' },
              { key: 'assigned', label: 'Assigned to Me' },
              { key: 'open', label: 'Open to Join' },
              { key: 'approval_required', label: 'Approval Required' },
            ] as const).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setProjectFilter(key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
                  projectFilter === key
                    ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Content */}
          {isLoading ? (
            <PageLoader />
          ) : filteredProjects?.length === 0 ? (
            <EmptyState
              icon={<FolderKanban className="w-6 h-6" />}
              title="No projects found"
              description={projectFilter !== 'all' ? 'Try a different filter' : 'Create your first project to get started'}
              action={
                canCreateProjects && projectFilter === 'all' ? (
                  <Button onClick={() => setShowCreate(true)}>
                    <Plus className="w-4 h-4" /> New Project
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredProjects?.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  assignment={myAssignmentMap.get(project.id)}
                  onDelete={() => setDeleteId(project.id)}
                  onRequestJoin={() => requestMutation.mutate(project.id)}
                  isRequesting={requestMutation.isPending}
                  isCreator={project.creator_id === user?.id}
                  isSupervisor={project.supervisor_id === user?.id}
                  canManageAssignments={canManageAssignments}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Create modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="New Project">
        <CreateProjectForm
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            setShowCreate(false);
          }}
          onCancel={() => setShowCreate(false)}
        />
      </Modal>

      {/* Delete confirmation */}
      <Modal isOpen={deleteId !== null} onClose={() => setDeleteId(null)} title="Delete Project">
        <div className="flex flex-col gap-5">
          <p className="text-sm text-slate-400">
            This action cannot be undone. All data associated with this project will be permanently
            removed.
          </p>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
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

function ProjectCard({
  project,
  assignment,
  onDelete,
  onRequestJoin,
  isRequesting,
  isCreator,
  isSupervisor,
  canManageAssignments,
}: {
  project: Project;
  assignment?: ProjectAssignment;
  onDelete: () => void;
  onRequestJoin: () => void;
  isRequesting: boolean;
  isCreator: boolean;
  isSupervisor: boolean;
  canManageAssignments: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  const assignmentStatusLabel: Record<string, { text: string; color: string; icon: React.ReactNode }> = {
    approved: { text: 'Assigned', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20', icon: <CheckCircle2 className="w-3 h-3" /> },
    pending: { text: 'Pending Approval', color: 'text-amber-400 bg-amber-400/10 border-amber-400/20', icon: <Clock className="w-3 h-3" /> },
    rejected: { text: 'Rejected', color: 'text-rose-400 bg-rose-400/10 border-rose-400/20', icon: <XCircle className="w-3 h-3" /> },
    revoked: { text: 'Revoked', color: 'text-slate-400 bg-slate-400/10 border-slate-400/20', icon: <XCircle className="w-3 h-3" /> },
  };

  const canRequestJoin =
    !assignment &&
    !isCreator &&
    project.status === 'active';

  const canReRequest =
    assignment &&
    (assignment.status === 'rejected' || assignment.status === 'revoked') &&
    project.status === 'active';

  return (
    <Card className="group hover:border-slate-700 transition-all duration-200">
      <div className="p-5 flex flex-col h-full">
        <div className="flex items-start justify-between mb-3">
          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-indigo-400 bg-indigo-400/10 px-2 py-0.5 rounded-md border border-indigo-400/20">
                {project.code}
              </span>
              {project.requires_approval ? (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border flex items-center gap-1 text-amber-400 bg-amber-400/10 border-amber-400/20">
                  <Lock className="w-2.5 h-2.5" /> Approval
                </span>
              ) : (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border flex items-center gap-1 text-emerald-400 bg-emerald-400/10 border-emerald-400/20">
                  <LockOpen className="w-2.5 h-2.5" /> Open
                </span>
              )}
              {assignment && (
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border flex items-center gap-1 ${assignmentStatusLabel[assignment.status]?.color}`}>
                  {assignmentStatusLabel[assignment.status]?.icon}
                  {assignmentStatusLabel[assignment.status]?.text}
                </span>
              )}
            </div>
            <h3 className="text-sm font-semibold text-slate-100 truncate">{project.name}</h3>
          </div>
          <div className="relative ml-2">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-300 hover:bg-slate-800 transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-8 z-10 min-w-[140px] rounded-xl border border-slate-800 bg-slate-950 shadow-xl py-1">
                <Link
                  to={`/projects/${project.id}`}
                  className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  <Eye className="w-3.5 h-3.5" /> View details
                </Link>
                {(isCreator || canManageAssignments) && (
                  <>
                    <Link
                      to={`/projects/${project.id}/edit`}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                      onClick={() => setMenuOpen(false)}
                    >
                      <Pencil className="w-3.5 h-3.5" /> Edit
                    </Link>
                    <button
                      className="flex w-full items-center gap-2.5 px-4 py-2 text-xs text-rose-400 hover:bg-rose-500/10 transition-colors"
                      onClick={() => { setMenuOpen(false); onDelete(); }}
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {project.description && (
          <p className="text-xs text-slate-500 mb-3 line-clamp-2 leading-relaxed">
            {project.description}
          </p>
        )}

        {/* Creator / Supervisor / Members info */}
        <div className="space-y-1.5 mb-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <User className="w-3 h-3 text-slate-600" />
            <span className="text-slate-600">Created by</span>
            <span className="text-slate-300 font-medium">{project.creator_name ?? 'Unknown'}</span>
            {isCreator && <span className="text-indigo-400 text-[10px]">(you)</span>}
          </div>
          {(project.supervisor_name || project.supervisor_id) && (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Shield className="w-3 h-3 text-slate-600" />
              <span className="text-slate-600">Supervisor</span>
              <span className="text-slate-300 font-medium">{project.supervisor_name ?? 'Unknown'}</span>
              {isSupervisor && <span className="text-indigo-400 text-[10px]">(you)</span>}
            </div>
          )}
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Users className="w-3 h-3 text-slate-600" />
            <span className="text-slate-600">Members</span>
            <span className="text-slate-300 font-medium">{project.assigned_users_count ?? 0}</span>
          </div>
        </div>

        <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-800">
          <div className="flex flex-col gap-0.5">
            {project.department && (
              <span className="text-[10px] text-slate-600 uppercase tracking-wide">
                {project.department}
              </span>
            )}
            <span className="text-[10px] text-slate-700">{formatDate(project.created_at)}</span>
          </div>
          <div className="flex items-center gap-2">
            {(canRequestJoin || canReRequest) && (
              <Button
                size="sm"
                variant="secondary"
                onClick={onRequestJoin}
                isLoading={isRequesting}
              >
                <UserPlus className="w-3.5 h-3.5" />
                {canReRequest ? 'Re-request' : project.requires_approval ? 'Request to Join' : 'Join'}
              </Button>
            )}
            <ProjectStatusBadge status={project.status as ProjectStatus} />
          </div>
        </div>
      </div>
    </Card>
  );
}

interface CreateProjectFormValues {
  name: string;
  code: string;
  description?: string;
  department?: string;
  company?: string;
  status: ProjectStatus;
}

type TrackingCodeDraft = Omit<TrackingCode, 'id'> & {
  id: string;
};

type TrackingCodeExtraFieldDraft = {
  id: string;
  key: string;
  value: string;
};

type TrackingRuleDraft = Omit<TrackingRule, 'id'> & {
  id: string;
};

function slugifyCode(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 24);
}

function createCodeDraft(index: number): TrackingCodeDraft {
  return {
    id: `code-${Date.now()}-${index}`,
    label: '',
    code: '',
    entry_type: 'work',
    labor_category: '',
    extra_fields: {},
    default_work_location: '',
    description: '',
    is_active: true,
    sort_order: index,
  };
}

function createExtraFieldDraft(index: number): TrackingCodeExtraFieldDraft {
  return {
    id: `extra-${Date.now()}-${index}`,
    key: '',
    value: '',
  };
}

function createRuleDraft(index: number): TrackingRuleDraft {
  return {
    id: `rule-${Date.now()}-${index}`,
    name: '',
    scope_type: 'all_users',
    scope_value: '',
    condition_type: 'user_role',
    condition_value: '',
    action_type: 'default_location',
    action_value: '',
    priority: index,
    is_active: true,
  };
}

function CreateProjectForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const {
    register,
    handleSubmit,
    watch,
    trigger,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<CreateProjectFormValues>({ defaultValues: { status: 'active' } });
  const [step, setStep] = useState(0);
  const [requiresApproval, setRequiresApproval] = useState(true);
  const [setupTracking, setSetupTracking] = useState(true);
  const [categoryName, setCategoryName] = useState('');
  const [categoryDescription, setCategoryDescription] = useState('');
  const [trackingCodes, setTrackingCodes] = useState<TrackingCodeDraft[]>([createCodeDraft(0)]);
  const [trackingCodeExtras, setTrackingCodeExtras] = useState<Record<string, TrackingCodeExtraFieldDraft[]>>({});
  const [trackingRules, setTrackingRules] = useState<TrackingRuleDraft[]>([]);

  const createMutation = useMutation({ mutationFn: createProject });

  const projectName = watch('name');
  const projectCode = watch('code');
  const projectCompany = watch('company');

  const nextStep = async () => {
    if (step === 0) {
      const valid = await trigger(['name', 'code', 'status']);
      if (!valid) {
        return;
      }
      if (!categoryName && projectName) {
        setCategoryName(`${projectName} Tracking`);
      }
      if (!categoryDescription && projectName) {
        setCategoryDescription(`Grouped time tracking for ${projectName}`);
      }
    }
    setStep((current) => Math.min(current + 1, 2));
  };

  const prevStep = () => setStep((current) => Math.max(current - 1, 0));

  const updateCode = (id: string, key: keyof TrackingCodeDraft, value: string | number | boolean) => {
    setTrackingCodes((current) =>
      current.map((code) => (code.id === id ? { ...code, [key]: value } : code))
    );
  };

  const updateRule = (id: string, key: keyof TrackingRuleDraft, value: string | number | boolean) => {
    setTrackingRules((current) =>
      current.map((rule) => (rule.id === id ? { ...rule, [key]: value } : rule))
    );
  };

  const addCodeExtraField = (codeId: string) => {
    setTrackingCodeExtras((current) => ({
      ...current,
      [codeId]: [...(current[codeId] ?? []), createExtraFieldDraft((current[codeId] ?? []).length)],
    }));
  };

  const updateCodeExtraField = (codeId: string, fieldId: string, key: keyof TrackingCodeExtraFieldDraft, value: string) => {
    setTrackingCodeExtras((current) => ({
      ...current,
      [codeId]: (current[codeId] ?? []).map((field) => (field.id === fieldId ? { ...field, [key]: value } : field)),
    }));
  };

  const removeCodeExtraField = (codeId: string, fieldId: string) => {
    setTrackingCodeExtras((current) => ({
      ...current,
      [codeId]: (current[codeId] ?? []).filter((field) => field.id !== fieldId),
    }));
  };

  const onSubmit = async (data: CreateProjectFormValues) => {
    try {
      const filteredCodes = trackingCodes
        .filter((code) => code.label.trim())
        .map(({ id, labor_category, ...code }, index) => ({
          ...code,
          code: slugifyCode(code.code || code.label),
          labor_category: undefined,
          extra_fields: Object.fromEntries(
            [
              ...(trackingCodeExtras[id] ?? []).map((field) => [field.key.trim(), field.value.trim()] as const),
            ].filter(([fieldKey, fieldValue]) => fieldKey && fieldValue)
          ),
          default_work_location: code.default_work_location || undefined,
          description: code.description || undefined,
          sort_order: index,
        }));

      const filteredRules = trackingRules
        .filter((rule) => rule.name.trim() && rule.action_value.trim())
        .map(({ id, ...rule }, index) => ({
          ...rule,
          scope_value: rule.scope_value || undefined,
          priority: index,
        }));

      const payload: ProjectCreate = {
        ...data,
        requires_approval: requiresApproval,
        tracking_setup: setupTracking
          ? {
              name: categoryName.trim() || `${data.name} Tracking`,
              description: categoryDescription.trim() || `Grouped time tracking for ${data.name}`,
              company: data.company,
              codes:
                filteredCodes.length > 0
                  ? filteredCodes
                  : [
                      {
                        label: data.name,
                        code: slugifyCode(data.code),
                        entry_type: 'work',
                        labor_category: undefined,
                        default_work_location: undefined,
                        description: undefined,
                        is_active: true,
                        sort_order: 0,
                      },
                    ],
              rules: filteredRules,
            } satisfies TrackingCategoryCreate
          : undefined,
      };

      await createMutation.mutateAsync(payload);
      onSuccess();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        'Failed to create project';
      setError('root', { message: msg });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="mb-1 flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Setup Flow</p>
          <p className="mt-1 text-sm text-slate-300">
            {step === 0 ? 'Create project' : step === 1 ? 'Attach category and grouped codes' : 'Define starter rules'}
          </p>
        </div>
        <div className="text-xs text-slate-500">Step {step + 1} of 3</div>
      </div>

      {step === 0 && (
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Input
              label="Project name"
              placeholder="e.g. Q4 Engineering Sprint"
              error={errors.name?.message}
              {...register('name', { required: 'Project name is required' })}
            />
          </div>
          <Input
            label="Code"
            placeholder="e.g. Q4SPN"
            error={errors.code?.message}
            {...register('code', {
              required: 'Code is required',
              minLength: { value: 2, message: 'At least 2 characters' },
            })}
          />
          <Select label="Status" {...register('status')}>
            <option value="active">Active</option>
            <option value="on_hold">On Hold</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </Select>
          <Input
            label="Department"
            placeholder="e.g. Engineering"
            {...register('department')}
          />
          <Input
            label="Company"
            placeholder="e.g. Acme Corp"
            {...register('company')}
          />
          <div className="col-span-2">
            <Input
              label="Description"
              placeholder="Brief project description…"
              {...register('description')}
            />
          </div>
          <div className="col-span-2">
            <label className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
              <input
                type="checkbox"
                checked={requiresApproval}
                onChange={(e) => setRequiresApproval(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-700 bg-slate-900 text-indigo-500"
              />
              <div>
                <p className="text-sm font-medium text-slate-200">Require approval to join</p>
                <p className="mt-1 text-xs text-slate-500">
                  {requiresApproval
                    ? 'Users must request access and wait for manager approval before joining this project.'
                    : 'Users can join this project instantly without manager approval.'}
                </p>
              </div>
            </label>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <label className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
            <input
              type="checkbox"
              checked={setupTracking}
              onChange={(e) => setSetupTracking(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-700 bg-slate-900 text-indigo-500"
            />
            <div>
              <p className="text-sm font-medium text-slate-200">Create tracking category after project creation</p>
              <p className="mt-1 text-xs text-slate-500">
                This creates the parent group users will see first, then the child tracking codes underneath it.
              </p>
            </div>
          </label>

          {setupTracking && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Category name"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder={projectName ? `${projectName} Tracking` : 'e.g. AT&T Delivery'}
                />
                <Input
                  label="Linked company"
                  value={projectCompany ?? ''}
                  readOnly
                  helperText="Inherited from the project form"
                />
                <div className="col-span-2">
                  <Textarea
                    label="Category description"
                    rows={3}
                    value={categoryDescription}
                    onChange={(e) => setCategoryDescription(e.target.value)}
                    placeholder="Explain how the grouped tracking should appear in timecards"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-200">Tracking codes</p>
                    <p className="text-xs text-slate-500">These will be grouped automatically under the category above.</p>
                  </div>
                  <Button type="button" variant="secondary" size="sm" onClick={() => setTrackingCodes((current) => [...current, createCodeDraft(current.length)])}>
                    <Plus className="w-4 h-4" /> Add code
                  </Button>
                </div>

                <div className="space-y-3">
                  {trackingCodes.map((code, index) => (
                    <div key={code.id} className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Code {index + 1}</p>
                        {trackingCodes.length > 1 && (
                          <button
                            type="button"
                            className="text-xs text-rose-400"
                            onClick={() => setTrackingCodes((current) => current.filter((item) => item.id !== code.id))}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          label="Label"
                          value={code.label}
                          onChange={(e) => updateCode(code.id, 'label', e.target.value)}
                          placeholder="e.g. AT&T Project Management and Reporting"
                        />
                        <Input
                          label="Code"
                          value={code.code}
                          onChange={(e) => updateCode(code.id, 'code', slugifyCode(e.target.value))}
                          placeholder={projectCode ? slugifyCode(projectCode) : 'AUTO_CODE'}
                        />
                        <Select label="Entry type" value={code.entry_type} onChange={(e) => updateCode(code.id, 'entry_type', e.target.value)}>
                          <option value="work">Work</option>
                          <option value="leave">Leave</option>
                          <option value="admin">Admin</option>
                        </Select>
                        <Select label="Default location" value={code.default_work_location || ''} onChange={(e) => updateCode(code.id, 'default_work_location', e.target.value)}>
                          <option value="">No default</option>
                          <option value="on_site">On-site</option>
                          <option value="off_site">Off-site</option>
                        </Select>
                        <Input
                          label="Description"
                          value={code.description || ''}
                          onChange={(e) => updateCode(code.id, 'description', e.target.value)}
                          placeholder="Optional helper text"
                        />
                        <div className="col-span-2 rounded-lg border border-slate-800 bg-slate-900/50 p-3">
                          <div className="mb-3 flex items-center justify-between">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Additional fields</p>
                              <p className="text-[11px] text-slate-500">Add any extra metadata you want to attach to this code.</p>
                            </div>
                            <Button type="button" variant="secondary" size="sm" onClick={() => addCodeExtraField(code.id)}>
                              <Plus className="w-4 h-4" /> Add field
                            </Button>
                          </div>
                          {(trackingCodeExtras[code.id] ?? []).length === 0 ? (
                            <p className="text-xs text-slate-500">No extra fields yet.</p>
                          ) : (
                            <div className="space-y-2">
                              {(trackingCodeExtras[code.id] ?? []).map((field) => (
                                <div key={field.id} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                                  <Input
                                    label="Field name"
                                    value={field.key}
                                    onChange={(e) => updateCodeExtraField(code.id, field.id, 'key', e.target.value)}
                                    placeholder="e.g. billing_class, team, client_phase"
                                  />
                                  <Input
                                    label="Field value"
                                    value={field.value}
                                    onChange={(e) => updateCodeExtraField(code.id, field.id, 'value', e.target.value)}
                                    placeholder="e.g. Intern, Phase 2, West Region"
                                  />
                                  <div className="flex items-end">
                                    <button
                                      type="button"
                                      className="mb-1 rounded-lg border border-rose-500/30 px-3 py-2 text-xs text-rose-300"
                                      onClick={() => removeCodeExtraField(code.id, field.id)}
                                    >
                                      Remove
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-200">Starter rules</p>
                <p className="text-xs text-slate-500">Optional defaults and automation the manager can refine later.</p>
              </div>
              <Button type="button" variant="secondary" size="sm" onClick={() => setTrackingRules((current) => [...current, createRuleDraft(current.length)])}>
                <Plus className="w-4 h-4" /> Add rule
              </Button>
            </div>

            {trackingRules.length === 0 ? (
              <p className="text-sm text-slate-500">No rules yet. You can still create the project and add rules later.</p>
            ) : (
              <div className="space-y-3">
                {trackingRules.map((rule, index) => (
                  <div key={rule.id} className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Rule {index + 1}</p>
                      <button
                        type="button"
                        className="text-xs text-rose-400"
                        onClick={() => setTrackingRules((current) => current.filter((item) => item.id !== rule.id))}
                      >
                        Remove
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        label="Rule name"
                        value={rule.name}
                        onChange={(e) => updateRule(rule.id, 'name', e.target.value)}
                        placeholder="e.g. Default field work location"
                      />
                      <Select label="Scope" value={rule.scope_type} onChange={(e) => updateRule(rule.id, 'scope_type', e.target.value)}>
                        <option value="all_users">All users</option>
                        <option value="role">Role</option>
                        <option value="department">Department</option>
                        <option value="user">Specific user</option>
                      </Select>
                      <Input
                        label="Scope value"
                        value={rule.scope_value || ''}
                        onChange={(e) => updateRule(rule.id, 'scope_value', e.target.value)}
                        placeholder="e.g. intern, engineering, user id"
                      />
                      <Select label="Condition" value={rule.condition_type} onChange={(e) => updateRule(rule.id, 'condition_type', e.target.value)}>
                        <option value="user_role">User role</option>
                        <option value="department">Department</option>
                        <option value="selected_code">Selected code</option>
                        <option value="hours_threshold">Hours threshold</option>
                      </Select>
                      <Input
                        label="Condition value"
                        value={rule.condition_value}
                        onChange={(e) => updateRule(rule.id, 'condition_value', e.target.value)}
                        placeholder="e.g. Intern, PON_4000, 480"
                      />
                      <Select label="Action" value={rule.action_type} onChange={(e) => updateRule(rule.id, 'action_type', e.target.value)}>
                        <option value="default_location">Default location</option>
                        <option value="default_labor_category">Default labor category</option>
                        <option value="require_note">Require note</option>
                        <option value="show_group">Show group</option>
                      </Select>
                      <div className="col-span-2">
                        <Input
                          label="Action value"
                          value={rule.action_value}
                          onChange={(e) => updateRule(rule.id, 'action_value', e.target.value)}
                          placeholder="e.g. on_site, Intern after 480 hours, true"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
            <p className="text-sm font-semibold text-slate-200">Preview</p>
            <p className="mt-1 text-xs text-slate-500">
              {setupTracking
                ? `${categoryName || `${projectName || 'Project'} Tracking`} will be created with ${trackingCodes.filter((code) => code.label.trim()).length || 1} grouped code${trackingCodes.filter((code) => code.label.trim()).length === 1 ? '' : 's'} and ${trackingRules.filter((rule) => rule.name.trim() && rule.action_value.trim()).length} starter rule${trackingRules.filter((rule) => rule.name.trim() && rule.action_value.trim()).length === 1 ? '' : 's'}.`
                : 'This project will be created without tracking setup.'}
            </p>
          </div>
        </div>
      )}

      {errors.root && (
        <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-3">
          <p className="text-xs text-rose-400">{errors.root.message}</p>
        </div>
      )}

      <div className="flex justify-between gap-3 border-t border-slate-800 pt-4">
        <div>
          {step > 0 && (
            <Button type="button" variant="secondary" onClick={prevStep}>
              Back
            </Button>
          )}
        </div>
        <div className="flex gap-3">
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          {step < 2 ? (
            <Button type="button" onClick={nextStep}>
              Next
            </Button>
          ) : (
            <Button type="submit" isLoading={isSubmitting || createMutation.isPending}>
              Create Project Flow
            </Button>
          )}
        </div>
      </div>

    </form>
  );
}
