import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Clock,
  Code2,
  FolderKanban,
  GripVertical,
  Layers,
  Pencil,
  Plus,
  Search,
  Settings2,
  ShieldAlert,
  Tag,
  Trash2,
  Users,
} from 'lucide-react';
import {
  createTrackingCategory,
  createUserWorkRule,
  deleteUserWorkRule,
  getEffectiveUserWorkRule,
  getProjects,
  getTrackingCategories,
  getUserWorkRules,
  getUsers,
  reorderUserWorkRules,
  updateTrackingCategory,
  updateUserWorkRule,
} from '../../api/endpoints';
import type { TrackingCategory, TrackingCategoryCreate, TrackingCategoryUpdate, TrackingCode, TrackingRule, User, UserWorkRuleCreate } from '../../types';
import { Button } from '../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Input, Select, Textarea } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { PageLoader } from '../../components/ui';

type Tab = 'work-rules' | 'tracking';

export function RulesPage() {
  const [activeTab, setActiveTab] = useState<Tab>('work-rules');

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'work-rules', label: 'Work Rules', icon: <Clock className="w-4 h-4" /> },
    { key: 'tracking', label: 'Tracking Config', icon: <Settings2 className="w-4 h-4" /> },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Rules Board</h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage work-hour policies per user and configure project tracking categories &amp; codes.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-slate-800 bg-slate-900/60 p-1 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-indigo-500/15 text-indigo-300 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'work-rules' && <WorkRulesTab />}
      {activeTab === 'tracking' && <TrackingConfigTab />}
    </div>
  );
}

/* ================================================================
   TAB 1 — WORK RULES (per-user hour policies)
   ================================================================ */

function WorkRulesTab() {
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    effective_from: new Date().toISOString().slice(0, 10),
    target_weekly_hours: '',
    max_weekly_hours: '',
    max_daily_hours: '',
    notes: '',
  });

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: getUsers,
  });

  useEffect(() => {
    if (!selectedUserId && users?.length) setSelectedUserId(users[0].id);
  }, [users, selectedUserId]);

  const { data: rules, isLoading: rulesLoading } = useQuery({
    queryKey: ['work-rules', selectedUserId],
    queryFn: () => getUserWorkRules(selectedUserId!),
    enabled: selectedUserId !== null,
  });

  const { data: effectiveRule } = useQuery({
    queryKey: ['effective-work-rule', selectedUserId],
    queryFn: () => getEffectiveUserWorkRule(selectedUserId!),
    enabled: selectedUserId !== null,
  });

  const selectedUser = useMemo(
    () => (users ?? []).find((u: User) => u.id === selectedUserId) ?? null,
    [users, selectedUserId],
  );

  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return users ?? [];
    const q = userSearch.toLowerCase();
    return (users ?? []).filter(
      (u) => u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
    );
  }, [users, userSearch]);

  const invalidateRules = () => {
    queryClient.invalidateQueries({ queryKey: ['work-rules', selectedUserId] });
    queryClient.invalidateQueries({ queryKey: ['effective-work-rule', selectedUserId] });
  };

  const createMutation = useMutation({
    mutationFn: (p: UserWorkRuleCreate) => createUserWorkRule(p),
    onSuccess: () => {
      invalidateRules();
      setForm({ name: '', effective_from: new Date().toISOString().slice(0, 10), target_weekly_hours: '', max_weekly_hours: '', max_daily_hours: '', notes: '' });
      setShowForm(false);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) => updateUserWorkRule(id, { is_active }),
    onSuccess: invalidateRules,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUserWorkRule,
    onSuccess: invalidateRules,
  });

  const reorderMutation = useMutation({
    mutationFn: (items: Array<{ id: number; priority: number }>) => reorderUserWorkRules(selectedUserId!, items),
    onSuccess: invalidateRules,
  });

  const onSubmit = () => {
    if (!selectedUserId || !form.name.trim()) return;
    createMutation.mutate({
      user_id: selectedUserId,
      name: form.name.trim(),
      effective_from: form.effective_from,
      target_weekly_hours: form.target_weekly_hours ? Number(form.target_weekly_hours) : undefined,
      max_weekly_hours: form.max_weekly_hours ? Number(form.max_weekly_hours) : undefined,
      max_daily_hours: form.max_daily_hours ? Number(form.max_daily_hours) : undefined,
      notes: form.notes || undefined,
      priority: rules?.length ?? 0,
      is_active: true,
    });
  };

  const handleDrop = (targetId: number) => {
    if (!draggedId || !rules || draggedId === targetId) return;
    const next = [...rules];
    const fromIdx = next.findIndex((r) => r.id === draggedId);
    const toIdx = next.findIndex((r) => r.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    reorderMutation.mutate(next.map((r, i) => ({ id: r.id, priority: i })));
    setDraggedId(null);
  };

  if (usersLoading) return <PageLoader />;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[280px_minmax(0,1fr)] gap-6 items-start">
      {/* Left: User picker */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-400" /> Users
          </h2>
        </CardHeader>
        <CardBody className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input
              className="w-full rounded-lg border border-slate-800 bg-slate-900/60 py-2 pl-9 pr-3 text-xs text-slate-200 placeholder-slate-600 focus:border-indigo-500/40 focus:outline-none"
              placeholder="Search users…"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
            />
          </div>
          <div className="space-y-1.5 max-h-[460px] overflow-y-auto pr-1">
            {filteredUsers.map((user) => (
              <button
                key={user.id}
                onClick={() => setSelectedUserId(user.id)}
                className={`w-full rounded-xl border px-3 py-2.5 text-left transition-colors ${
                  user.id === selectedUserId
                    ? 'border-indigo-500/40 bg-indigo-500/10 text-indigo-200'
                    : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700 hover:bg-slate-900'
                }`}
              >
                <p className="text-sm font-medium leading-tight">{user.full_name}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{user.email}</p>
              </button>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Right: Rules content */}
      <div className="space-y-5">
        {/* Effective summary strip */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-200">
                {selectedUser ? `${selectedUser.full_name}'s Policy` : 'Select a user'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Effective rule summary computed from the priority stack</p>
            </div>
            <Button size="sm" onClick={() => setShowForm(true)} disabled={!selectedUserId}>
              <Plus className="w-3.5 h-3.5" /> Add Rule
            </Button>
          </div>

          {!selectedUserId || rulesLoading ? (
            <PageLoader />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <EffectiveStat label="Target Weekly" value={effectiveRule?.target_weekly_hours} unit="h" color="text-sky-300" bg="bg-sky-500/10 border-sky-500/20" />
              <EffectiveStat label="Max Weekly" value={effectiveRule?.max_weekly_hours} unit="h" color="text-amber-300" bg="bg-amber-500/10 border-amber-500/20" />
              <EffectiveStat label="Max Daily" value={effectiveRule?.max_daily_hours} unit="h" color="text-rose-300" bg="bg-rose-500/10 border-rose-500/20" />
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3">
                <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1.5">Applied Rules</p>
                <div className="flex flex-wrap gap-1">
                  {(effectiveRule?.applied_rule_names ?? []).length ? (
                    effectiveRule!.applied_rule_names.map((n) => (
                      <span key={n} className="rounded-md bg-slate-800 border border-slate-700 px-2 py-0.5 text-[10px] text-slate-300">{n}</span>
                    ))
                  ) : (
                    <span className="text-[10px] text-slate-600">No active rules</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Rule stack */}
        <Card>
          <CardHeader>
            <div>
              <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Layers className="w-4 h-4 text-slate-400" /> Rule Stack
              </h2>
              <p className="text-xs text-slate-500 mt-1">Drag to reorder — highest priority wins first.</p>
            </div>
          </CardHeader>
          <CardBody className="space-y-2">
            {(rules ?? []).length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-800 px-4 py-10 text-center text-sm text-slate-500">
                No custom rules for this user. Click &ldquo;Add Rule&rdquo; to create one.
              </div>
            ) : (
              (rules ?? []).map((rule, idx) => (
                <div
                  key={rule.id}
                  draggable
                  onDragStart={() => setDraggedId(rule.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop(rule.id)}
                  className="group rounded-xl border border-slate-800 bg-slate-900/70 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-3 p-3">
                    {/* Drag handle + priority badge */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="cursor-grab active:cursor-grabbing rounded-lg border border-slate-700 bg-slate-800 p-1.5 text-slate-500 hover:text-slate-300">
                        <GripVertical className="w-3.5 h-3.5" />
                      </div>
                      <span className="w-6 h-6 rounded-md bg-indigo-500/15 text-indigo-300 text-[10px] font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-100 truncate">{rule.name}</p>
                      <p className="text-[11px] text-slate-500">
                        From {rule.effective_from}
                        {rule.notes && <span className="ml-2 text-slate-600">&middot; {rule.notes}</span>}
                      </p>
                    </div>

                    {/* Stats inline */}
                    <div className="hidden sm:flex items-center gap-3 text-xs flex-shrink-0">
                      <MiniTag label="Target" value={rule.target_weekly_hours} />
                      <MiniTag label="Max/wk" value={rule.max_weekly_hours} />
                      <MiniTag label="Max/day" value={rule.max_daily_hours} />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => toggleMutation.mutate({ id: rule.id, is_active: !rule.is_active })}
                        className={`rounded-full px-2.5 py-1 text-[10px] font-semibold transition-colors ${
                          rule.is_active ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-800 text-slate-500'
                        }`}
                      >
                        {rule.is_active ? 'Active' : 'Off'}
                      </button>
                      <button
                        onClick={() => deleteMutation.mutate(rule.id)}
                        className="rounded-lg p-1.5 text-slate-600 hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardBody>
        </Card>
      </div>

      {/* Add Rule Modal */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Add Work Rule">
        <div className="space-y-4">
          <Input label="Rule name" value={form.name} onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))} placeholder="e.g. Standard 40h week" />
          <Input label="Effective from" type="date" value={form.effective_from} onChange={(e) => setForm((c) => ({ ...c, effective_from: e.target.value }))} />
          <div className="grid grid-cols-3 gap-3">
            <Input label="Target weekly (h)" type="number" step="0.5" value={form.target_weekly_hours} onChange={(e) => setForm((c) => ({ ...c, target_weekly_hours: e.target.value }))} placeholder="40" />
            <Input label="Max weekly (h)" type="number" step="0.5" value={form.max_weekly_hours} onChange={(e) => setForm((c) => ({ ...c, max_weekly_hours: e.target.value }))} placeholder="45" />
            <Input label="Max daily (h)" type="number" step="0.5" value={form.max_daily_hours} onChange={(e) => setForm((c) => ({ ...c, max_daily_hours: e.target.value }))} placeholder="9" />
          </div>
          <Textarea label="Notes" rows={3} value={form.notes} onChange={(e) => setForm((c) => ({ ...c, notes: e.target.value }))} placeholder="Rule context…" />
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-200 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p>Weekly and daily max limits are enforced when users log or update hours in their timecards.</p>
          </div>
          <div className="flex gap-3 justify-end pt-1">
            <Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={onSubmit} isLoading={createMutation.isPending}><Plus className="w-4 h-4" /> Add Rule</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ================================================================
   TAB 2 — TRACKING CONFIGURATION (per-project categories, codes, rules)
   ================================================================ */

function TrackingConfigTab() {
  const queryClient = useQueryClient();
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [projectSearch, setProjectSearch] = useState('');
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState<TrackingCategory | null>(null);
  const [expandedCategoryId, setExpandedCategoryId] = useState<number | null>(null);

  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => getProjects({ status: 'active' }),
  });

  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['tracking-categories', selectedProjectId],
    queryFn: () => getTrackingCategories(selectedProjectId ? { project_id: selectedProjectId } : {}),
  });

  const filteredProjects = useMemo(() => {
    if (!projectSearch.trim()) return projects ?? [];
    const q = projectSearch.toLowerCase();
    return (projects ?? []).filter(
      (p) => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q),
    );
  }, [projects, projectSearch]);

  const invalidateCategories = () => {
    queryClient.invalidateQueries({ queryKey: ['tracking-categories'] });
  };

  if (projectsLoading) return <PageLoader />;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[280px_minmax(0,1fr)] gap-6 items-start">
      {/* Left: Project picker */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <FolderKanban className="w-4 h-4 text-slate-400" /> Projects
          </h2>
        </CardHeader>
        <CardBody className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input
              className="w-full rounded-lg border border-slate-800 bg-slate-900/60 py-2 pl-9 pr-3 text-xs text-slate-200 placeholder-slate-600 focus:border-indigo-500/40 focus:outline-none"
              placeholder="Search projects…"
              value={projectSearch}
              onChange={(e) => setProjectSearch(e.target.value)}
            />
          </div>
          <div className="space-y-1.5 max-h-[460px] overflow-y-auto pr-1">
            <button
              onClick={() => setSelectedProjectId(null)}
              className={`w-full rounded-xl border px-3 py-2.5 text-left transition-colors ${
                selectedProjectId === null
                  ? 'border-indigo-500/40 bg-indigo-500/10 text-indigo-200'
                  : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700 hover:bg-slate-900'
              }`}
            >
              <p className="text-sm font-medium">All Projects</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Show all tracking categories</p>
            </button>
            {filteredProjects.map((proj) => (
              <button
                key={proj.id}
                onClick={() => setSelectedProjectId(proj.id)}
                className={`w-full rounded-xl border px-3 py-2.5 text-left transition-colors ${
                  proj.id === selectedProjectId
                    ? 'border-indigo-500/40 bg-indigo-500/10 text-indigo-200'
                    : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">{proj.code}</span>
                  <p className="text-sm font-medium truncate">{proj.name}</p>
                </div>
                {proj.department && <p className="text-[11px] text-slate-500 mt-0.5">{proj.department}</p>}
              </button>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Right: Categories */}
      <div className="space-y-5">
        {/* Header bar */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-200">
              {selectedProjectId
                ? `Tracking — ${(projects ?? []).find((p) => p.id === selectedProjectId)?.name ?? ''}`
                : 'All Tracking Categories'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {(categories ?? []).length} categor{(categories ?? []).length === 1 ? 'y' : 'ies'}
            </p>
          </div>
          <Button size="sm" onClick={() => setShowCreateCategory(true)}>
            <Plus className="w-3.5 h-3.5" /> New Category
          </Button>
        </div>

        {categoriesLoading ? (
          <PageLoader />
        ) : (categories ?? []).length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-800 px-6 py-14 text-center">
            <Settings2 className="w-8 h-8 text-slate-700 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No tracking categories{selectedProjectId ? ' for this project' : ''} yet.</p>
            <p className="text-xs text-slate-600 mt-1">Click &ldquo;New Category&rdquo; to create one.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {(categories ?? []).map((cat) => (
              <CategoryCard
                key={cat.id}
                category={cat}
                isExpanded={expandedCategoryId === cat.id}
                onToggle={() => setExpandedCategoryId(expandedCategoryId === cat.id ? null : cat.id)}
                onEdit={() => setEditingCategory(cat)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Category Modal */}
      <CategoryFormModal
        isOpen={showCreateCategory}
        onClose={() => setShowCreateCategory(false)}
        projects={projects ?? []}
        defaultProjectId={selectedProjectId}
        onSuccess={invalidateCategories}
      />

      {/* Edit Category Modal */}
      {editingCategory && (
        <CategoryFormModal
          isOpen
          onClose={() => setEditingCategory(null)}
          projects={projects ?? []}
          defaultProjectId={editingCategory.project_id}
          existingCategory={editingCategory}
          onSuccess={invalidateCategories}
        />
      )}
    </div>
  );
}

/* ----------------------------------------------------------------
   Tracking category accordion card
   ---------------------------------------------------------------- */

function CategoryCard({
  category,
  isExpanded,
  onToggle,
  onEdit,
}: {
  category: TrackingCategory;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
}) {
  const activeCodes = (category.codes ?? []).filter((c) => c.is_active !== false);
  const activeRules = (category.rules ?? []).filter((r) => r.is_active !== false);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden transition-colors hover:border-slate-700">
      {/* Header row */}
      <button onClick={onToggle} className="w-full flex items-center gap-3 p-4 text-left">
        <div className="rounded-lg bg-indigo-500/10 border border-indigo-500/20 p-2">
          <BookOpen className="w-4 h-4 text-indigo-300" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-100 truncate">{category.name}</p>
          <p className="text-[11px] text-slate-500 mt-0.5 truncate">
            {category.description || 'No description'}
            {category.company && <span className="ml-2 text-slate-600">&middot; {category.company}</span>}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <StatBadge icon={<Code2 className="w-3 h-3" />} count={activeCodes.length} label="codes" color="sky" />
          <StatBadge icon={<Tag className="w-3 h-3" />} count={activeRules.length} label="rules" color="violet" />
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="rounded-lg p-1.5 text-slate-600 hover:text-slate-300 hover:bg-slate-800 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-slate-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-500" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-slate-800 px-4 pb-4">
          {/* Codes table */}
          <div className="mt-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
              <Code2 className="w-3 h-3" /> Tracking Codes ({(category.codes ?? []).length})
            </p>
            {(category.codes ?? []).length === 0 ? (
              <p className="text-xs text-slate-600 italic">No codes defined.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-800">
                      <th className="text-left py-2 pr-3 text-slate-500 font-medium">Code</th>
                      <th className="text-left py-2 pr-3 text-slate-500 font-medium">Label</th>
                      <th className="text-left py-2 pr-3 text-slate-500 font-medium">Type</th>
                      <th className="text-left py-2 pr-3 text-slate-500 font-medium">Labor Cat.</th>
                      <th className="text-left py-2 text-slate-500 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(category.codes ?? []).map((code, i) => (
                      <tr key={code.id ?? i} className="border-b border-slate-800/50 last:border-0">
                        <td className="py-2 pr-3">
                          <span className="font-mono bg-slate-800 px-1.5 py-0.5 rounded text-slate-200">{code.code}</span>
                        </td>
                        <td className="py-2 pr-3 text-slate-300">{code.label}</td>
                        <td className="py-2 pr-3 text-slate-400">{code.entry_type}</td>
                        <td className="py-2 pr-3 text-slate-400">{code.labor_category || '—'}</td>
                        <td className="py-2">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            code.is_active !== false ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-800 text-slate-500'
                          }`}>
                            {code.is_active !== false ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Rules table */}
          <div className="mt-5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
              <Tag className="w-3 h-3" /> Tracking Rules ({(category.rules ?? []).length})
            </p>
            {(category.rules ?? []).length === 0 ? (
              <p className="text-xs text-slate-600 italic">No rules defined.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-800">
                      <th className="text-left py-2 pr-3 text-slate-500 font-medium">Name</th>
                      <th className="text-left py-2 pr-3 text-slate-500 font-medium">Scope</th>
                      <th className="text-left py-2 pr-3 text-slate-500 font-medium">Condition</th>
                      <th className="text-left py-2 pr-3 text-slate-500 font-medium">Action</th>
                      <th className="text-left py-2 text-slate-500 font-medium">Priority</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(category.rules ?? []).map((rule, i) => (
                      <tr key={rule.id ?? i} className="border-b border-slate-800/50 last:border-0">
                        <td className="py-2 pr-3 text-slate-200 font-medium">{rule.name}</td>
                        <td className="py-2 pr-3 text-slate-400">
                          <span className="bg-slate-800 px-1.5 py-0.5 rounded text-[10px]">{rule.scope_type}</span>
                          {rule.scope_value && <span className="ml-1 text-slate-500">{rule.scope_value}</span>}
                        </td>
                        <td className="py-2 pr-3 text-slate-400">
                          <span className="bg-slate-800 px-1.5 py-0.5 rounded text-[10px]">{rule.condition_type}</span>
                          <span className="ml-1 text-slate-500">{rule.condition_value}</span>
                        </td>
                        <td className="py-2 pr-3 text-slate-400">
                          <span className="bg-violet-500/15 text-violet-300 px-1.5 py-0.5 rounded text-[10px]">{rule.action_type}</span>
                          <span className="ml-1 text-slate-500">{rule.action_value}</span>
                        </td>
                        <td className="py-2 text-slate-400">{rule.priority ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------
   Create / Edit Category Modal
   ---------------------------------------------------------------- */

function CategoryFormModal({
  isOpen,
  onClose,
  projects,
  defaultProjectId,
  existingCategory,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  projects: Array<{ id: number; name: string; code: string }>;
  defaultProjectId: number | null;
  existingCategory?: TrackingCategory;
  onSuccess: () => void;
}) {
  const isEdit = !!existingCategory;

  const [name, setName] = useState(existingCategory?.name ?? '');
  const [description, setDescription] = useState(existingCategory?.description ?? '');
  const [company, setCompany] = useState(existingCategory?.company ?? '');
  const [projectId, setProjectId] = useState<string>(
    String(existingCategory?.project_id ?? defaultProjectId ?? ''),
  );
  const [codes, setCodes] = useState<TrackingCode[]>(existingCategory?.codes ?? []);
  const [rules, setRules] = useState<TrackingRule[]>(existingCategory?.rules ?? []);

  // Reset form when existingCategory changes
  useEffect(() => {
    setName(existingCategory?.name ?? '');
    setDescription(existingCategory?.description ?? '');
    setCompany(existingCategory?.company ?? '');
    setProjectId(String(existingCategory?.project_id ?? defaultProjectId ?? ''));
    setCodes(existingCategory?.codes ?? []);
    setRules(existingCategory?.rules ?? []);
  }, [existingCategory, defaultProjectId]);

  const createMutation = useMutation({
    mutationFn: (data: TrackingCategoryCreate) => createTrackingCategory(data),
    onSuccess: () => { onSuccess(); onClose(); },
  });

  const updateMutation = useMutation({
    mutationFn: (data: TrackingCategoryUpdate) => updateTrackingCategory(existingCategory!.id, data),
    onSuccess: () => { onSuccess(); onClose(); },
  });

  const addCode = () => {
    setCodes((prev) => [
      ...prev,
      { label: '', code: '', entry_type: 'regular', is_active: true, sort_order: prev.length },
    ]);
  };

  const updateCode = (idx: number, field: string, value: string | boolean) => {
    setCodes((prev) => prev.map((c, i) => (i === idx ? { ...c, [field]: value } : c)));
  };

  const removeCode = (idx: number) => {
    setCodes((prev) => prev.filter((_, i) => i !== idx));
  };

  const addRule = () => {
    setRules((prev) => [
      ...prev,
      { name: '', scope_type: 'global', scope_value: '', condition_type: 'always', condition_value: 'true', action_type: 'allow', action_value: '', priority: prev.length, is_active: true },
    ]);
  };

  const updateRule = (idx: number, field: string, value: string | boolean | number) => {
    setRules((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  };

  const removeRule = (idx: number) => {
    setRules((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = () => {
    if (!name.trim()) return;
    const payload: TrackingCategoryCreate = {
      name: name.trim(),
      description: description || undefined,
      company: company || undefined,
      project_id: projectId ? Number(projectId) : undefined,
      codes: codes.map((c, i) => ({ ...c, sort_order: i })),
      rules: rules.map((r, i) => ({ ...r, priority: i })),
    };
    if (isEdit) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Edit Tracking Category' : 'New Tracking Category'}>
      <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
        {/* Basic info */}
        <div className="space-y-3">
          <Input label="Category name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Development Hours" />
          <Textarea label="Description" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What this category tracks…" />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Project" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              <option value="">Global (no project)</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
              ))}
            </Select>
            <Input label="Company" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="e.g. TechCorp" />
          </div>
        </div>

        {/* Codes section */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Code2 className="w-3.5 h-3.5 text-sky-400" /> Tracking Codes ({codes.length})
            </p>
            <button onClick={addCode} className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
              <Plus className="w-3 h-3" /> Add Code
            </button>
          </div>
          {codes.length === 0 ? (
            <p className="text-xs text-slate-600 italic py-2">No codes yet — click &ldquo;Add Code&rdquo; above.</p>
          ) : (
            <div className="space-y-2">
              {codes.map((code, idx) => (
                <div key={idx} className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                  <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
                    <Input label="Code" value={code.code} onChange={(e) => updateCode(idx, 'code', e.target.value)} placeholder="REG" />
                    <Input label="Label" value={code.label} onChange={(e) => updateCode(idx, 'label', e.target.value)} placeholder="Regular Hours" />
                    <button onClick={() => removeCode(idx)} className="mb-1 p-2 rounded-lg text-slate-600 hover:text-rose-400 hover:bg-rose-500/10">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    <Select label="Entry type" value={code.entry_type} onChange={(e) => updateCode(idx, 'entry_type', e.target.value)}>
                      <option value="regular">Regular</option>
                      <option value="overtime">Overtime</option>
                      <option value="leave">Leave</option>
                      <option value="holiday">Holiday</option>
                      <option value="other">Other</option>
                    </Select>
                    <Input label="Labor category" value={code.labor_category ?? ''} onChange={(e) => updateCode(idx, 'labor_category', e.target.value)} placeholder="e.g. Engineering" />
                    <Input label="Work location" value={code.default_work_location ?? ''} onChange={(e) => updateCode(idx, 'default_work_location', e.target.value)} placeholder="e.g. Remote" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Rules section */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-violet-400" /> Tracking Rules ({rules.length})
            </p>
            <button onClick={addRule} className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
              <Plus className="w-3 h-3" /> Add Rule
            </button>
          </div>
          {rules.length === 0 ? (
            <p className="text-xs text-slate-600 italic py-2">No rules yet — click &ldquo;Add Rule&rdquo; above.</p>
          ) : (
            <div className="space-y-2">
              {rules.map((rule, idx) => (
                <div key={idx} className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                  <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
                    <Input label="Rule name" value={rule.name} onChange={(e) => updateRule(idx, 'name', e.target.value)} placeholder="e.g. OT threshold" />
                    <button onClick={() => removeRule(idx)} className="mb-1 p-2 rounded-lg text-slate-600 hover:text-rose-400 hover:bg-rose-500/10">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <Select label="Scope" value={rule.scope_type} onChange={(e) => updateRule(idx, 'scope_type', e.target.value)}>
                      <option value="global">Global</option>
                      <option value="project">Project</option>
                      <option value="department">Department</option>
                      <option value="user">User</option>
                    </Select>
                    <Input label="Scope value" value={rule.scope_value ?? ''} onChange={(e) => updateRule(idx, 'scope_value', e.target.value)} placeholder="Optional scope filter" />
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <Select label="Condition" value={rule.condition_type} onChange={(e) => updateRule(idx, 'condition_type', e.target.value)}>
                      <option value="always">Always</option>
                      <option value="hours_gt">Hours Greater Than</option>
                      <option value="hours_lt">Hours Less Than</option>
                      <option value="day_of_week">Day of Week</option>
                      <option value="date_range">Date Range</option>
                    </Select>
                    <Input label="Condition value" value={rule.condition_value} onChange={(e) => updateRule(idx, 'condition_value', e.target.value)} placeholder="e.g. 8, Mon-Fri" />
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <Select label="Action" value={rule.action_type} onChange={(e) => updateRule(idx, 'action_type', e.target.value)}>
                      <option value="allow">Allow</option>
                      <option value="warn">Warn</option>
                      <option value="block">Block</option>
                      <option value="auto_classify">Auto-classify</option>
                      <option value="require_approval">Require Approval</option>
                    </Select>
                    <Input label="Action value" value={rule.action_value} onChange={(e) => updateRule(idx, 'action_value', e.target.value)} placeholder="e.g. overtime, message" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer buttons */}
      <div className="flex gap-3 justify-end pt-4 mt-4 border-t border-slate-800">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} isLoading={isPending}>
          {isEdit ? <><Pencil className="w-3.5 h-3.5" /> Update Category</> : <><Plus className="w-3.5 h-3.5" /> Create Category</>}
        </Button>
      </div>
    </Modal>
  );
}

/* ----------------------------------------------------------------
   Shared sub-components
   ---------------------------------------------------------------- */

function EffectiveStat({ label, value, unit, color, bg }: { label: string; value?: number; unit: string; color: string; bg: string }) {
  return (
    <div className={`rounded-xl border p-3 ${bg}`}>
      <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`mt-1 text-xl font-bold ${color}`}>{value != null ? `${value}${unit}` : '—'}</p>
    </div>
  );
}

function MiniTag({ label, value }: { label: string; value?: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-slate-400">
      <span className="text-[10px] text-slate-600">{label}</span>
      <span className="text-xs font-semibold text-slate-300">{value != null ? `${value}h` : '—'}</span>
    </span>
  );
}

function StatBadge({ icon, count, label, color }: { icon: React.ReactNode; count: number; label: string; color: string }) {
  const colors: Record<string, string> = {
    sky: 'bg-sky-500/10 text-sky-300 border-sky-500/20',
    violet: 'bg-violet-500/10 text-violet-300 border-violet-500/20',
    amber: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-medium ${colors[color] ?? colors.sky}`}>
      {icon} {count} {label}
    </span>
  );
}
