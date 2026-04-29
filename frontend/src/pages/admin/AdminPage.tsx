import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Shield,
  Users,
  FolderKanban,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  UserCog,
  TrendingUp,
  Activity,
  Plus,
  Trash2,
  Pencil,
  Tag,
} from 'lucide-react';
import {
  getUsers,
  getProjects,
  getAssignments,
  toggleUserActive,
  getRoles,
  createRole,
  updateRole,
  deleteRole,
  assignUserRole,
} from '../../api/endpoints';
import { Card, CardHeader, CardBody, StatCard } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { UserRoleBadge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { PageLoader } from '../../components/ui';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { formatDate } from '../../utils';
import { useAuth } from '../../contexts/AuthContext';
import type { Role, RoleCreate } from '../../types';

// ── Feature toggle row ───────────────────────────────────────────────────────
const PERMISSION_LABELS: { key: keyof Role; label: string; description: string }[] = [
  { key: 'can_create_projects',     label: 'Create Projects',      description: 'Can create and own new projects' },
  { key: 'can_manage_assignments',  label: 'Manage Assignments',   description: 'Can assign users and approve/reject requests' },
  { key: 'can_view_all_timecards',  label: 'View All Timecards',   description: 'Can see timecards for all users' },
  { key: 'can_manage_users',        label: 'Manage Users',         description: 'Can activate / deactivate user accounts' },
];

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${ checked ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-700' }`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${ checked ? 'translate-x-4' : 'translate-x-0' }`}
      />
    </button>
  );
}

// ── Role create/edit modal ───────────────────────────────────────────────────
function RoleModal({
  isOpen,
  onClose,
  editing,
}: {
  isOpen: boolean;
  onClose: () => void;
  editing: Role | null;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(editing?.name ?? '');
  const [displayName, setDisplayName] = useState(editing?.display_name ?? '');
  const [perms, setPerms] = useState({
    can_create_projects:    editing?.can_create_projects    ?? false,
    can_manage_assignments: editing?.can_manage_assignments ?? false,
    can_view_all_timecards: editing?.can_view_all_timecards ?? false,
    can_manage_users:       editing?.can_manage_users       ?? false,
  });

  // Reset when modal opens with a new editing target
  const handleOpen = (open: boolean) => {
    if (open) {
      setName(editing?.name ?? '');
      setDisplayName(editing?.display_name ?? '');
      setPerms({
        can_create_projects:    editing?.can_create_projects    ?? false,
        can_manage_assignments: editing?.can_manage_assignments ?? false,
        can_view_all_timecards: editing?.can_view_all_timecards ?? false,
        can_manage_users:       editing?.can_manage_users       ?? false,
      });
    }
  };
  // sync when editing prop changes
  useState(() => { handleOpen(isOpen); });

  const saveMutation = useMutation({
    mutationFn: () => {
      if (editing) {
        return updateRole(editing.id, { display_name: displayName, ...perms });
      }
      const payload: RoleCreate = { name, display_name: displayName, ...perms };
      return createRole(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      onClose();
    },
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editing ? 'Edit Role' : 'Create Role'}>
      <div className="space-y-4">
        {!editing && (
          <Input
            label="Role ID (unique slug)"
            placeholder="e.g. team_lead"
            value={name}
            onChange={(e) => setName(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
          />
        )}
        <Input
          label="Display Name"
          placeholder="e.g. Team Lead"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />

        <div className="mt-2">
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-3">
            Feature Permissions
          </p>
          <div className="space-y-3">
            {PERMISSION_LABELS.map(({ key, label, description }) => (
              <div key={key} className="flex items-center justify-between gap-4 py-2 border-b border-slate-200 dark:border-slate-800 last:border-0">
                <div>
                  <p className="text-sm text-slate-800 dark:text-slate-200">{label}</p>
                  <p className="text-xs text-slate-500">{description}</p>
                </div>
                <ToggleSwitch
                  checked={perms[key as keyof typeof perms] as boolean}
                  onChange={(v) => setPerms((p) => ({ ...p, [key]: v }))}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button
            size="sm"
            isLoading={saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
            disabled={!displayName || (!editing && !name)}
          >
            {editing ? 'Save Changes' : 'Create Role'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export function AdminPage() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users');
  const [search, setSearch] = useState('');
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: getUsers,
  });
  const { data: roles } = useQuery({
    queryKey: ['roles'],
    queryFn: getRoles,
  });
  const { data: projects } = useQuery({
    queryKey: ['projects', { limit: 200 }],
    queryFn: () => getProjects({ limit: 200 }),
  });
  const { data: assignments } = useQuery({
    queryKey: ['assignments'],
    queryFn: () => getAssignments(),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: toggleUserActive,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  const deleteRoleMutation = useMutation({
    mutationFn: deleteRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const assignRoleMutation = useMutation({
    mutationFn: ({ userId, roleId }: { userId: number; roleId: number | null }) =>
      assignUserRole(userId, roleId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  const filteredUsers = users?.filter(
    (u) =>
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  const activeUsers = users?.filter((u) => u.is_active).length ?? 0;
  const activeProjects = projects?.filter((p) => p.status === 'active').length ?? 0;
  const pendingAssignments = assignments?.filter((a) => a.status === 'pending').length ?? 0;

  if (usersLoading) return <PageLoader />;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Admin Panel</h1>
          <p className="text-sm text-slate-500">Role-based access control & system overview</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Users" value={users?.length ?? 0} icon={<Users className="w-5 h-5" />} accent="text-violet-400" />
        <StatCard label="Active Users" value={activeUsers} icon={<Activity className="w-5 h-5" />} accent="text-emerald-400" />
        <StatCard label="Active Projects" value={activeProjects} icon={<FolderKanban className="w-5 h-5" />} accent="text-indigo-400" />
        <StatCard label="Pending Reviews" value={pendingAssignments} icon={<Clock className="w-5 h-5" />} accent="text-amber-400" />
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-fit">
        {(['users', 'roles'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${ activeTab === tab ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200' }`}
          >
            {tab === 'users' ? <UserCog className="w-4 h-4" /> : <Tag className="w-4 h-4" />}
            {tab === 'users' ? 'Users' : 'Roles & Permissions'}
          </button>
        ))}
      </div>

      {/* ── Users tab ─────────────────────────────────────────────────── */}
      {activeTab === 'users' && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <UserCog className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">User Management</h2>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search users…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-4 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all w-48"
              />
            </div>
          </CardHeader>
          <CardBody className="!p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800">
                    <th className="text-left px-6 py-3 text-[10px] font-semibold text-slate-600 uppercase tracking-wider">User</th>
                    <th className="text-left px-6 py-3 text-[10px] font-semibold text-slate-600 uppercase tracking-wider">Role</th>
                    <th className="text-left px-6 py-3 text-[10px] font-semibold text-slate-600 uppercase tracking-wider">Permissions</th>
                    <th className="text-left px-6 py-3 text-[10px] font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                    <th className="text-left px-6 py-3 text-[10px] font-semibold text-slate-600 uppercase tracking-wider">Joined</th>
                    <th className="text-right px-6 py-3 text-[10px] font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredUsers?.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar name={u.full_name} size="sm" />
                          <div>
                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                              {u.full_name}
                              {u.id === currentUser?.id && (
                                <span className="ml-2 text-[10px] text-indigo-400">(you)</span>
                              )}
                            </p>
                            <p className="text-xs text-slate-500">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {u.is_superuser ? (
                          <UserRoleBadge isAdmin />
                        ) : (
                          <select
                            value={u.role_id ?? ''}
                            onChange={(e) =>
                              assignRoleMutation.mutate({
                                userId: u.id,
                                roleId: e.target.value ? Number(e.target.value) : null,
                              })
                            }
                            className="text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                          >
                            <option value="">No role</option>
                            {roles?.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.display_name}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {u.is_superuser ? (
                          <span className="text-xs text-violet-400">All permissions</span>
                        ) : u.role ? (
                          <div className="flex flex-wrap gap-1">
                            {u.role.can_create_projects    && <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-400/10 text-emerald-400 border border-emerald-400/20">create projects</span>}
                            {u.role.can_manage_assignments && <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-400/10 text-sky-400 border border-sky-400/20">assignments</span>}
                            {u.role.can_view_all_timecards && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-400/10 text-amber-400 border border-amber-400/20">all timecards</span>}
                            {u.role.can_manage_users       && <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-400/10 text-rose-400 border border-rose-400/20">manage users</span>}
                            {!u.role.can_create_projects && !u.role.can_manage_assignments && !u.role.can_view_all_timecards && !u.role.can_manage_users && (
                              <span className="text-xs text-slate-600">No special permissions</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-600">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          {u.is_active ? (
                            <><CheckCircle className="w-3.5 h-3.5 text-emerald-400" /><span className="text-xs text-emerald-400">Active</span></>
                          ) : (
                            <><XCircle className="w-3.5 h-3.5 text-slate-500" /><span className="text-xs text-slate-500">Inactive</span></>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-slate-500">{formatDate(u.created_at)}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {u.id !== currentUser?.id && (
                          <Button
                            variant={u.is_active ? 'danger' : 'outline'}
                            size="sm"
                            isLoading={toggleActiveMutation.isPending}
                            onClick={() => toggleActiveMutation.mutate(u.id)}
                          >
                            {u.is_active ? 'Deactivate' : 'Activate'}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}

      {/* ── Roles tab ─────────────────────────────────────────────────── */}
      {activeTab === 'roles' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Create custom roles and toggle which features each role can access.
            </p>
            <Button
              size="sm"
              onClick={() => { setEditingRole(null); setShowRoleModal(true); }}
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              New Role
            </Button>
          </div>

          {roles?.length === 0 && (
            <Card>
              <CardBody>
                <p className="text-center text-sm text-slate-500 py-8">No roles yet. Create one to start.</p>
              </CardBody>
            </Card>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {roles?.map((role) => {
              const memberCount = users?.filter((u) => u.role_id === role.id).length ?? 0;
              const enabledCount = PERMISSION_LABELS.filter(({ key }) => role[key as keyof Role] as boolean).length;
              return (
                <Card key={role.id}>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-indigo-500/15 flex items-center justify-center">
                        <Tag className="w-3.5 h-3.5 text-indigo-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{role.display_name}</p>
                        <p className="text-[10px] text-slate-600 font-mono">{role.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => { setEditingRole(role); setShowRoleModal(true); }}
                        className="!p-1.5"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteRoleMutation.mutate(role.id)}
                        className="!p-1.5 text-rose-400 hover:text-rose-300"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardBody>
                    <div className="space-y-2 mb-4">
                      {PERMISSION_LABELS.map(({ key, label }) => (
                        <div key={key} className="flex items-center justify-between">
                          <span className="text-xs text-slate-600 dark:text-slate-400">{label}</span>
                          <span className={`text-xs font-medium ${(role[key as keyof Role] as boolean) ? 'text-emerald-400' : 'text-slate-600'}`}>
                            {(role[key as keyof Role] as boolean) ? '✓ allowed' : '✗ denied'}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500">
                      <span>{memberCount} member{memberCount !== 1 ? 's' : ''}</span>
                      <span>{enabledCount}/{PERMISSION_LABELS.length} permissions</span>
                    </div>
                  </CardBody>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Projects overview (always shown below) */}
      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Project Overview</h2>
          </div>
        </CardHeader>
        <CardBody className="!p-0">
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {projects?.slice(0, 10).map((project) => {
              const projectAssignments = assignments?.filter((a) => a.project_id === project.id) ?? [];
              const approved = projectAssignments.filter((a) => a.status === 'approved').length;
              const pending = projectAssignments.filter((a) => a.status === 'pending').length;
              return (
                <div key={project.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                      <FolderKanban className="w-3.5 h-3.5 text-slate-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{project.name}</p>
                      <p className="text-xs text-slate-600 font-mono">{project.code}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xs text-slate-500">{approved} members</p>
                      {pending > 0 && <p className="text-xs text-amber-400">{pending} pending</p>}
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-md border font-medium ${ project.status === 'active' ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' : project.status === 'completed' ? 'text-sky-400 bg-sky-400/10 border-sky-400/20' : 'text-slate-600 dark:text-slate-400 bg-slate-400/10 border-slate-300 dark:border-slate-700' }`}>
                      {project.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardBody>
      </Card>

      {/* Role modal */}
      <RoleModal
        isOpen={showRoleModal}
        onClose={() => setShowRoleModal(false)}
        editing={editingRole}
      />
    </div>
  );
}
