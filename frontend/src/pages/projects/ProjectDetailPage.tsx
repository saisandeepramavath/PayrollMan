import { useEffect, useMemo, useState } from 'react';
import { useLocation, useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Building2,
  Calendar,
  Users,
  Pencil,
  Trash2,
  Plus,
  UserCheck,
  UserX,
  Layers3,
  Save,
} from 'lucide-react';
import {
  getProject,
  updateProject,
  deleteProject,
  getProjectAssignments,
  createAssignment,
  approveAssignment,
  deleteAssignment,
  getUsers,
  getTrackingCategories,
  createTrackingCategory,
  updateTrackingCategory,
} from '../../api/endpoints';
import type { ProjectUpdate, TrackingCategoryCreate, TrackingCode, TrackingCategoryUpdate } from '../../types';
import { Button } from '../../components/ui/Button';
import { Input, Select, Textarea } from '../../components/ui/Input';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { ProjectStatusBadge, AssignmentStatusBadge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Avatar } from '../../components/ui/Avatar';
import { PageLoader } from '../../components/ui';
import { formatDate, timeAgo } from '../../utils';
import { useAuth } from '../../contexts/AuthContext';
import { useForm } from 'react-hook-form';
import type { ProjectStatus } from '../../types';

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { canCreateProjects, canManageAssignments, user } = useAuth();

  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showAssign, setShowAssign] = useState(false);

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => getProject(projectId),
  });

  const isCreator = project?.creator_id === user?.id;
  const isSupervisor = project?.supervisor_id === user?.id;
  const canEditProject = canCreateProjects || canManageAssignments || isCreator || isSupervisor;

  const { data: assignments } = useQuery({
    queryKey: ['assignments', { project_id: projectId }],
    queryFn: () => getProjectAssignments(projectId),
  });

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: getUsers,
  });

  const { data: trackingCategories } = useQuery({
    queryKey: ['tracking-categories', { projectId }],
    queryFn: () => getTrackingCategories({ project_id: projectId }),
    enabled: Number.isFinite(projectId),
  });

  useEffect(() => {
    if (location.pathname.endsWith('/edit')) {
      setShowEdit(true);
    }
  }, [location.pathname]);

  const deleteMutation = useMutation({
    mutationFn: () => deleteProject(projectId),
    onSuccess: () => navigate('/projects'),
  });

  const approveMutation = useMutation({
    mutationFn: ({ aid, status }: { aid: number; status: string }) =>
      approveAssignment(aid, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['assignments'] }),
  });

  const removeAssignmentMutation = useMutation({
    mutationFn: deleteAssignment,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['assignments'] }),
  });

  if (isLoading) return <PageLoader />;
  if (!project) return <div className="text-slate-600 dark:text-slate-400 p-8">Project not found.</div>;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Back + header */}
      <div className="mb-6">
        <Link
          to="/projects"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 mb-4 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to projects
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xs font-mono text-indigo-400 bg-indigo-400/10 px-2.5 py-1 rounded-lg border border-indigo-400/20">
                {project.code}
              </span>
              <ProjectStatusBadge status={project.status as ProjectStatus} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{project.name}</h1>
            {project.description && (
              <p className="text-sm text-slate-500 mt-2 max-w-2xl leading-relaxed">
                {project.description}
              </p>
            )}
          </div>
          {canEditProject && (
            <div className="flex gap-2 flex-shrink-0">
              <Button variant="outline" size="sm" onClick={() => setShowEdit(true)}>
                <Pencil className="w-3.5 h-3.5" /> Edit
              </Button>
              <Button variant="danger" size="sm" onClick={() => setShowDelete(true)}>
                <Trash2 className="w-3.5 h-3.5" /> Archive
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-6 items-start">
        <div className="space-y-6 min-w-0">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardBody className="!py-4">
                <div className="flex items-center gap-3">
                  <Building2 className="w-4 h-4 text-slate-500" />
                  <div>
                    <p className="text-[10px] text-slate-600 uppercase tracking-wide">Department</p>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 mt-0.5">
                      {project.department ?? '—'}
                    </p>
                  </div>
                </div>
              </CardBody>
            </Card>
            <Card>
              <CardBody className="!py-4">
                <div className="flex items-center gap-3">
                  <Building2 className="w-4 h-4 text-slate-500" />
                  <div>
                    <p className="text-[10px] text-slate-600 uppercase tracking-wide">Company</p>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 mt-0.5">
                      {project.company ?? '—'}
                    </p>
                  </div>
                </div>
              </CardBody>
            </Card>
            <Card>
              <CardBody className="!py-4">
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-slate-500" />
                  <div>
                    <p className="text-[10px] text-slate-600 uppercase tracking-wide">Created</p>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 mt-0.5">
                      {formatDate(project.created_at)}
                    </p>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Team Assignments ({assignments?.length ?? 0})
                </h2>
              </div>
              {canManageAssignments && (
                <Button size="sm" onClick={() => setShowAssign(true)}>
                  <Plus className="w-3.5 h-3.5" /> Assign
                </Button>
              )}
            </CardHeader>
            <CardBody className="!p-0">
              {!assignments?.length ? (
                <div className="py-10 text-center">
                  <Users className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                  <p className="text-xs text-slate-500">No assignments yet</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-200 dark:divide-slate-800">
                  {assignments.map((a) => (
                    <div key={a.id} className="px-6 py-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar name={(users ?? []).find(u => u.id === a.user_id)?.full_name ?? `User ${a.user_id}`} size="sm" />
                        <div>
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                            {(users ?? []).find(u => u.id === a.user_id)?.full_name ?? `User #${a.user_id}`}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {a.role && (
                              <span className="text-xs text-slate-500 capitalize">{a.role}</span>
                            )}
                            <span className="text-xs text-slate-700">·</span>
                            <span className="text-xs text-slate-600">{timeAgo(a.created_at)}</span>
                            {typeof a.total_project_hours_since_assigned === 'number' && (
                              <>
                                <span className="text-xs text-slate-700">·</span>
                                <span className="text-xs text-indigo-700 dark:text-indigo-300">
                                  {a.total_project_hours_since_assigned.toFixed(1)}h since assignment
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <AssignmentStatusBadge status={a.status} />
                        {canManageAssignments && (
                          <div className="flex gap-1">
                            {a.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => approveMutation.mutate({ aid: a.id, status: 'approved' })}
                                  className="p-1.5 rounded-lg text-emerald-500 hover:bg-emerald-500/10 transition-colors"
                                  title="Approve"
                                >
                                  <UserCheck className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => approveMutation.mutate({ aid: a.id, status: 'rejected' })}
                                  className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors"
                                  title="Reject"
                                >
                                  <UserX className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => removeAssignmentMutation.mutate(a.id)}
                              className="p-1.5 rounded-lg text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                              title="Remove"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        <ProjectTrackingSidebar
          projectId={projectId}
          projectName={project.name}
          projectCompany={project.company}
          canEdit={canCreateProjects}
          categories={trackingCategories ?? []}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ['tracking-categories', { projectId }] })}
        />
      </div>

      {/* Edit modal */}
      <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title="Edit Project">
        <EditProjectForm
          project={project}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['project', projectId] });
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            setShowEdit(false);
          }}
          onCancel={() => setShowEdit(false)}
        />
      </Modal>

      {/* Archive confirmation */}
      <Modal isOpen={showDelete} onClose={() => setShowDelete(false)} title="Archive Project">
        <div className="flex flex-col gap-5">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Archive <span className="text-slate-800 dark:text-slate-200 font-semibold">{project.name}</span>? Existing timecards, allocations, and assignment history will be preserved, but the project will be marked as cancelled.
          </p>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setShowDelete(false)}>Cancel</Button>
            <Button variant="danger" isLoading={deleteMutation.isPending} onClick={() => deleteMutation.mutate()}>
              <Trash2 className="w-4 h-4" /> Archive
            </Button>
          </div>
        </div>
      </Modal>

      {/* Assign user modal */}
      <Modal isOpen={showAssign} onClose={() => setShowAssign(false)} title="Assign User">
        <AssignUserForm
          projectId={projectId}
          users={users ?? []}
          assignments={assignments ?? []}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['assignments'] });
            setShowAssign(false);
          }}
          onCancel={() => setShowAssign(false)}
        />
      </Modal>
    </div>
  );
}

type TrackingCodeDraft = Omit<TrackingCode, 'id'> & { id: string };

function createTrackingCodeDraft(index: number, seed?: Partial<TrackingCode>): TrackingCodeDraft {
  return {
    id: `tracking-code-${Date.now()}-${index}`,
    label: seed?.label ?? '',
    code: seed?.code ?? '',
    description: seed?.description ?? '',
    entry_type: seed?.entry_type ?? 'work',
    labor_category: seed?.labor_category,
    extra_fields: seed?.extra_fields ?? {},
    default_work_location: seed?.default_work_location ?? '',
    is_active: seed?.is_active ?? true,
    sort_order: seed?.sort_order ?? index,
  };
}

function ProjectTrackingSidebar({
  projectId,
  projectName,
  projectCompany,
  canEdit,
  categories,
  onSaved,
}: {
  projectId: number;
  projectName: string;
  projectCompany?: string;
  canEdit: boolean;
  categories: Awaited<ReturnType<typeof getTrackingCategories>>;
  onSaved: () => void;
}) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | 'new'>(categories[0]?.id ?? 'new');
  const [categoryName, setCategoryName] = useState('');
  const [categoryDescription, setCategoryDescription] = useState('');
  const [codes, setCodes] = useState<TrackingCodeDraft[]>([]);

  useEffect(() => {
    if (selectedCategoryId !== 'new' && !categories.some((category) => category.id === selectedCategoryId)) {
      setSelectedCategoryId(categories[0]?.id ?? 'new');
    }
  }, [categories, selectedCategoryId]);

  const selectedCategory = useMemo(
    () => (selectedCategoryId === 'new' ? null : categories.find((category) => category.id === selectedCategoryId) ?? null),
    [categories, selectedCategoryId]
  );

  useEffect(() => {
    if (!selectedCategory) {
      setCategoryName(`${projectName} Tracking`);
      setCategoryDescription(`Grouped tracking for ${projectName}`);
      setCodes([createTrackingCodeDraft(0, { label: projectName, code: projectName.toUpperCase().replace(/[^A-Z0-9]+/g, '_').slice(0, 24) })]);
      return;
    }

    setCategoryName(selectedCategory.name);
    setCategoryDescription(selectedCategory.description ?? '');
    setCodes((selectedCategory.codes ?? []).map((code, index) => createTrackingCodeDraft(index, code)));
  }, [projectName, selectedCategory]);

  const createMutation = useMutation({
    mutationFn: createTrackingCategory,
    onSuccess: (savedCategory) => {
      setSelectedCategoryId(savedCategory.id);
      onSaved();
    },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: TrackingCategoryUpdate }) => updateTrackingCategory(id, data),
    onSuccess: (savedCategory) => {
      setSelectedCategoryId(savedCategory.id);
      onSaved();
    },
  });

  const updateCode = (id: string, key: keyof TrackingCodeDraft, value: string | boolean | Record<string, string>) => {
    setCodes((current) => current.map((code) => (code.id === id ? { ...code, [key]: value } : code)));
  };

  const handleSave = async () => {
    const payload: TrackingCategoryCreate = {
      name: categoryName.trim() || `${projectName} Tracking`,
      description: categoryDescription.trim() || undefined,
      company: projectCompany,
      project_id: projectId,
      codes: codes
        .filter((code) => code.label.trim() && code.code.trim())
        .map(({ id, ...code }, index) => ({ ...code, sort_order: index })),
      rules: selectedCategory?.rules ?? [],
    };

    if (selectedCategory) {
      await updateMutation.mutateAsync({ id: selectedCategory.id, data: payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
  };

  return (
    <Card className="xl:sticky xl:top-6">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Layers3 className="w-4 h-4 text-slate-600 dark:text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Tracking Setup</h2>
        </div>
        <Select value={String(selectedCategoryId)} onChange={(e) => setSelectedCategoryId(e.target.value === 'new' ? 'new' : Number(e.target.value))}>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>{category.name}</option>
          ))}
          <option value="new">Create new category</option>
        </Select>
      </CardHeader>
      <CardBody className="space-y-4">
        <Input label="Category name" value={categoryName} onChange={(e) => setCategoryName(e.target.value)} readOnly={!canEdit} />
        <Textarea label="Description" rows={3} value={categoryDescription} onChange={(e) => setCategoryDescription(e.target.value)} readOnly={!canEdit} />

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Codes</p>
            {canEdit && (
              <Button type="button" size="sm" variant="secondary" onClick={() => setCodes((current) => [...current, createTrackingCodeDraft(current.length)])}>
                <Plus className="w-3.5 h-3.5" /> Add code
              </Button>
            )}
          </div>
          {codes.map((code, index) => (
            <div key={code.id} className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/50 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Code {index + 1}</p>
                {canEdit && codes.length > 1 && (
                  <button type="button" className="text-xs text-rose-400" onClick={() => setCodes((current) => current.filter((item) => item.id !== code.id))}>Remove</button>
                )}
              </div>
              <Input label="Label" value={code.label} onChange={(e) => updateCode(code.id, 'label', e.target.value)} readOnly={!canEdit} />
              <Input label="Code" value={code.code} onChange={(e) => updateCode(code.id, 'code', e.target.value.toUpperCase().replace(/[^A-Z0-9_]+/g, '_'))} readOnly={!canEdit} />
              <Select label="Entry type" value={code.entry_type} onChange={(e) => updateCode(code.id, 'entry_type', e.target.value)} disabled={!canEdit}>
                <option value="work">Work</option>
                <option value="leave">Leave</option>
                <option value="admin">Admin</option>
              </Select>
            </div>
          ))}
        </div>

        {canEdit && (
          <Button type="button" onClick={handleSave} isLoading={createMutation.isPending || updateMutation.isPending}>
            <Save className="w-4 h-4" /> Save Tracking Setup
          </Button>
        )}
      </CardBody>
    </Card>
  );
}

function EditProjectForm({
  project,
  onSuccess,
  onCancel,
}: {
  project: NonNullable<Awaited<ReturnType<typeof getProject>>>;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const updateMutation = useMutation({ mutationFn: (data: ProjectUpdate) => updateProject(project.id, data) });

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ProjectUpdate>({
    defaultValues: {
      name: project.name,
      code: project.code,
      description: project.description ?? '',
      department: project.department ?? '',
      company: project.company ?? '',
      status: project.status as ProjectStatus,
    },
  });

  const onSubmit = async (data: ProjectUpdate) => {
    await updateMutation.mutateAsync(data);
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Input label="Project name" error={errors.name?.message} {...register('name', { required: 'Required' })} />
        </div>
        <Input label="Code" error={errors.code?.message} {...register('code', { required: 'Required' })} />
        <Select label="Status" {...register('status')}>
          <option value="active">Active</option>
          <option value="on_hold">On Hold</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </Select>
        <Input label="Department" {...register('department')} />
        <Input label="Company" {...register('company')} />
        <div className="col-span-2">
          <Input label="Description" {...register('description')} />
        </div>
      </div>
      <div className="flex gap-3 justify-end pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" isLoading={isSubmitting}>Save Changes</Button>
      </div>
    </form>
  );
}

function AssignUserForm({
  projectId,
  users,
  assignments,
  onSuccess,
  onCancel,
}: {
  projectId: number;
  users: Awaited<ReturnType<typeof getUsers>>;
  assignments: any[];
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<{ user_id: string; role: string; notes: string }>();
  const createAssignmentMutation = useMutation({ mutationFn: createAssignment });

  // Filter out users who already have an active (approved/pending) assignment
  const assignedUserIds = new Set(
    assignments
      .filter((a) => a.status === 'approved' || a.status === 'pending')
      .map((a) => a.user_id)
  );
  const availableUsers = users.filter((u) => !assignedUserIds.has(u.id));

  const onSubmit = async (data: { user_id: string; role: string; notes: string }) => {
    await createAssignmentMutation.mutateAsync({
      project_id: projectId,
      user_id: Number(data.user_id),
      role: data.role || undefined,
      notes: data.notes || undefined,
    });
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      {createAssignmentMutation.isError && (
        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
          {(createAssignmentMutation.error as any)?.response?.data?.detail ?? 'Failed to assign user'}
        </div>
      )}
      <Select label="User" {...register('user_id', { required: 'Select a user' })}>
        <option value="">Select a user…</option>
        {availableUsers.map((u) => (
          <option key={u.id} value={u.id}>{u.full_name} ({u.email})</option>
        ))}
      </Select>
      {availableUsers.length === 0 && (
        <p className="text-sm text-slate-600 dark:text-slate-400">All users are already assigned to this project.</p>
      )}
      <Input label="Role" placeholder="e.g. Developer, Designer…" {...register('role')} />
      <div className="flex gap-3 justify-end pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" isLoading={isSubmitting} disabled={availableUsers.length === 0}>Assign</Button>
      </div>
    </form>
  );
}
