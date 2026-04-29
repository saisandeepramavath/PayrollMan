import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, FolderKanban, UserCheck, UserX, Trash2 } from 'lucide-react';
import { getAssignments, approveAssignment, deleteAssignment, getProjects, getUsers } from '../../api/endpoints';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { AssignmentStatusBadge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { EmptyState, PageLoader } from '../../components/ui';
import { timeAgo } from '../../utils';
import { useAuth } from '../../contexts/AuthContext';

const STATUS_TABS = ['all', 'pending', 'approved', 'rejected', 'revoked'] as const;

export function AssignmentsPage() {
  const queryClient = useQueryClient();
  const { canManageAssignments } = useAuth();
  const [activeTab, setActiveTab] = useState<(typeof STATUS_TABS)[number]>('all');
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: assignments, isLoading } = useQuery({
    queryKey: ['assignments'],
    queryFn: () => getAssignments(),
  });

  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => getProjects({ limit: 200 }),
  });

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: getUsers,
  });

  const userMap = Object.fromEntries((users ?? []).map((u) => [u.id, u]));

  const approveMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => approveAssignment(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['assignments'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAssignment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      setDeleteId(null);
    },
  });

  const projectMap = Object.fromEntries((projects ?? []).map((p) => [p.id, p]));

  const filtered =
    activeTab === 'all'
      ? assignments
      : assignments?.filter((a) => a.status === activeTab);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Assignments</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {assignments?.length ?? 0} total assignments
          </p>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 dark:bg-slate-900 rounded-xl p-1 w-fit border border-slate-200 dark:border-slate-800">
        {STATUS_TABS.map((tab) => {
          const count = tab === 'all' ? assignments?.length : assignments?.filter((a) => a.status === tab).length;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition-all capitalize ${ activeTab === tab ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800' }`}
            >
              {tab} {count !== undefined && (
                <span className={`ml-1 text-[10px] ${activeTab === tab ? 'text-indigo-200' : 'text-slate-600'}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <PageLoader />
      ) : !filtered?.length ? (
        <EmptyState
          icon={<Users className="w-6 h-6" />}
          title="No assignments"
          description={activeTab === 'all' ? 'Assign users to projects from the project detail page' : `No ${activeTab} assignments`}
        />
      ) : (
        <Card>
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {filtered.map((assignment) => {
              const project = projectMap[assignment.project_id];
              return (
                <div
                  key={assignment.id}
                  className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                      <FolderKanban className="w-4 h-4 text-slate-500" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                          {project?.name ?? `Project #${assignment.project_id}`}
                        </p>
                        {project?.code && (
                          <span className="text-[10px] font-mono text-indigo-400 bg-indigo-400/10 px-1.5 py-0.5 rounded border border-indigo-400/20">
                            {project.code}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                          {userMap[assignment.user_id]?.full_name ?? `User #${assignment.user_id}`}
                        </span>
                        <span className="text-slate-700">·</span>
                        <span className="text-xs text-slate-500">{userMap[assignment.user_id]?.email ?? ''}</span>
                        {assignment.role && (
                          <>
                            <span className="text-slate-700">·</span>
                            <span className="text-xs text-slate-500 capitalize">{assignment.role}</span>
                          </>
                        )}
                        <span className="text-slate-700">·</span>
                        <span className="text-xs text-slate-600">{timeAgo(assignment.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <AssignmentStatusBadge status={assignment.status} />
                    {canManageAssignments && (
                      <div className="flex gap-1">
                        {assignment.status === 'pending' && (
                          <>
                            <button
                              onClick={() => approveMutation.mutate({ id: assignment.id, status: 'approved' })}
                              className="p-1.5 rounded-lg text-emerald-500 hover:bg-emerald-500/10 transition-colors"
                              title="Approve"
                            >
                              <UserCheck className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => approveMutation.mutate({ id: assignment.id, status: 'rejected' })}
                              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors"
                              title="Reject"
                            >
                              <UserX className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => setDeleteId(assignment.id)}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Remove"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Delete confirm */}
      <Modal isOpen={deleteId !== null} onClose={() => setDeleteId(null)} title="Remove Assignment">
        <div className="flex flex-col gap-5">
          <p className="text-sm text-slate-600 dark:text-slate-400">Remove this assignment? This cannot be undone.</p>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button
              variant="danger"
              isLoading={deleteMutation.isPending}
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              <Trash2 className="w-4 h-4" /> Remove
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
