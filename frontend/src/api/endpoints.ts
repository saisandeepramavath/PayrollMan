import api from './client';
import type {
  LoginRequest,
  RegisterRequest,
  TokenResponse,
  User,
  Role,
  RoleCreate,
  RoleUpdate,
  Project,
  ProjectCreate,
  ProjectUpdate,
  ProjectAssignment,
  TrackingCategory,
  TrackingCategoryCreate,
  TrackingCategoryUpdate,
  PunchEntry,
  PunchEntryCreate,
  PunchEntryUpdate,
  Timecard,
  TimecardCreate,
  TimecardSubmission,
  IssueReport,
  IssueReportCreate,
  IssueReportNotice,
  IssueReportUpdate,
  UserWorkRule,
  UserWorkRuleCreate,
  UserWorkRuleUpdate,
  UserEffectiveWorkRule,
} from '../types';

// ── Auth ──────────────────────────────────────────────
export const login = (data: LoginRequest) =>
  api.post<TokenResponse>('/auth/login', data).then((r) => r.data);

export const register = (data: RegisterRequest) =>
  api.post<User>('/auth/register', data).then((r) => r.data);

export const getMe = () =>
  api.get<User>('/auth/me').then((r) => r.data);

// ── Projects ──────────────────────────────────────────
export const getProjects = (params?: {
  status?: string;
  department?: string;
  search?: string;
  skip?: number;
  limit?: number;
  created_by_me?: boolean;
}) => api.get<Project[]>('/projects/', { params }).then((r) => r.data);

export const getProject = (id: number) =>
  api.get<Project>(`/projects/${id}`).then((r) => r.data);

export const createProject = (data: ProjectCreate) =>
  api.post<Project>('/projects/', data).then((r) => r.data);

export const updateProject = (id: number, data: ProjectUpdate) =>
  api.put<Project>(`/projects/${id}`, data).then((r) => r.data);

export const deleteProject = (id: number) =>
  api.delete(`/projects/${id}`).then((r) => r.data);

export const getTrackingCategories = (params?: { project_id?: number; company?: string; assigned_only?: boolean; user_id?: number }) =>
  api.get<TrackingCategory[]>('/tracking/categories', { params }).then((r) => r.data);

export const createTrackingCategory = (data: TrackingCategoryCreate) =>
  api.post<TrackingCategory>('/tracking/categories', data).then((r) => r.data);

export const updateTrackingCategory = (id: number, data: TrackingCategoryUpdate) =>
  api.put<TrackingCategory>(`/tracking/categories/${id}`, data).then((r) => r.data);

// ── Project Assignments ───────────────────────────────
export const getAssignments = (params?: { project_id?: number; user_id?: number; status?: string }) =>
  api.get<ProjectAssignment[]>('/assignments/', { params }).then((r) => r.data);

export const getProjectAssignments = (projectId: number, params?: { status?: string }) =>
  api.get<ProjectAssignment[]>(`/assignments/project/${projectId}`, { params }).then((r) => r.data);

export const getPendingApprovals = () =>
  api.get<ProjectAssignment[]>('/assignments/pending').then((r) => r.data);

export const createAssignment = (data: {
  project_id: number;
  user_id: number;
  role?: string;
  notes?: string;
}) => api.post<ProjectAssignment>('/assignments/', data).then((r) => r.data);

export const approveAssignment = (id: number, notes?: string) =>
  api
    .put<ProjectAssignment>(`/assignments/${id}/approve`, { notes })
    .then((r) => r.data);

export const rejectAssignment = (id: number, notes?: string) =>
  api
    .put<ProjectAssignment>(`/assignments/${id}/reject`, { notes })
    .then((r) => r.data);

export const revokeAssignment = (id: number) =>
  api.put<ProjectAssignment>(`/assignments/${id}/revoke`).then((r) => r.data);

export const deleteAssignment = (id: number) =>
  api.delete(`/assignments/${id}`).then((r) => r.data);

// ── Punch Entries ─────────────────────────────────────
export const punchIn = (data?: { punch_in?: string; notes?: string }) =>
  api.post<PunchEntry>('/punch/in', data ?? {}).then((r) => r.data);

export const punchOut = (data?: { punch_out?: string; notes?: string }) =>
  api.post<PunchEntry>('/punch/out', data ?? {}).then((r) => r.data);

export const getActivePunch = () =>
  api.get<PunchEntry | null>('/punch/active').then((r) => r.data);

export const getPunchEntries = (params?: { start_date?: string; end_date?: string; user_id?: number }) =>
  api.get<PunchEntry[]>('/punch/', { params }).then((r) => r.data);

export const deletePunchEntry = (id: number) =>
  api.delete(`/punch/${id}`).then((r) => r.data);

export const createPunchEntry = (data: PunchEntryCreate) =>
  api.post<PunchEntry>('/punch/', data).then((r) => r.data);

export const updatePunchEntry = (id: number, data: PunchEntryUpdate) =>
  api.put<PunchEntry>(`/punch/${id}`, data).then((r) => r.data);

// ── Timecards ─────────────────────────────────────────
export const getTimecards = (params?: { start_date?: string; end_date?: string; user_id?: number }) =>
  api.get<Timecard[]>('/timecards/', { params }).then((r) => r.data);

export const getTimecard = (id: number, params?: { user_id?: number }) =>
  api.get<Timecard>(`/timecards/${id}`, { params }).then((r) => r.data);

export const createTimecard = (data: TimecardCreate, params?: { user_id?: number }) =>
  api.post<Timecard>('/timecards/', data, { params }).then((r) => r.data);

export const updateTimecard = (id: number, data: Partial<TimecardCreate>, params?: { user_id?: number }) =>
  api.put<Timecard>(`/timecards/${id}`, data, { params }).then((r) => r.data);

export const deleteTimecard = (id: number, params?: { user_id?: number }) =>
  api.delete(`/timecards/${id}`, { params }).then((r) => r.data);

export const getWeekTimecardSubmission = (params: { week_start: string; user_id?: number }) =>
  api.get<TimecardSubmission>('/timecards/submissions/week', { params }).then((r) => r.data);

export const submitWeekTimecard = (data: { week_start: string }) =>
  api.post<TimecardSubmission>('/timecards/submissions/submit', data).then((r) => r.data);

export const listTimecardSubmissions = (params?: { status?: string; user_id?: number }) =>
  api.get<TimecardSubmission[]>('/timecards/submissions/', { params }).then((r) => r.data);

export const reviewTimecardSubmission = (
  id: number,
  data: { action: 'approve' | 'hold'; review_notes?: string },
) => api.post<TimecardSubmission>(`/timecards/submissions/${id}/review`, data).then((r) => r.data);

// ── Issues ────────────────────────────────────────────
export const getIssueReports = (params?: { status?: string; issue_type?: string }) =>
  api.get<IssueReport[]>('/issues/', { params }).then((r) => r.data);

export const createIssueReport = (data: IssueReportCreate) =>
  api.post<IssueReport>('/issues/', data).then((r) => r.data);

export const updateIssueReport = (id: number, data: IssueReportUpdate) =>
  api.put<IssueReport>(`/issues/${id}`, data).then((r) => r.data);

export const sendIssueNotice = (id: number, data: IssueReportNotice) =>
  api.post<IssueReport>(`/issues/${id}/notice`, data).then((r) => r.data);

// ── Users (admin) ─────────────────────────────────────
export const getUsers = () =>
  api.get<User[]>('/auth/users').then((r) => r.data);

export const toggleUserActive = (id: number) =>
  api.patch<User>(`/auth/users/${id}/toggle-active`).then((r) => r.data);

// ── Roles (admin) ──────────────────────────────────────────────────
export const getRoles = () =>
  api.get<Role[]>('/roles/').then((r) => r.data);

export const createRole = (data: RoleCreate) =>
  api.post<Role>('/roles/', data).then((r) => r.data);

export const updateRole = (id: number, data: RoleUpdate) =>
  api.put<Role>(`/roles/${id}`, data).then((r) => r.data);

export const deleteRole = (id: number) =>
  api.delete(`/roles/${id}`).then((r) => r.data);

export const assignUserRole = (userId: number, roleId: number | null) =>
  api.put<User>(`/roles/users/${userId}/role`, { role_id: roleId }).then((r) => r.data);

// ── User Work Rules ──────────────────────────────────
export const getUserWorkRules = (userId: number) =>
  api.get<UserWorkRule[]>(`/work-rules/users/${userId}`).then((r) => r.data);

export const getEffectiveUserWorkRule = (userId: number) =>
  api.get<UserEffectiveWorkRule>(`/work-rules/users/${userId}/effective`).then((r) => r.data);

export const createUserWorkRule = (data: UserWorkRuleCreate) =>
  api.post<UserWorkRule>('/work-rules/', data).then((r) => r.data);

export const updateUserWorkRule = (ruleId: number, data: UserWorkRuleUpdate) =>
  api.put<UserWorkRule>(`/work-rules/${ruleId}`, data).then((r) => r.data);

export const deleteUserWorkRule = (ruleId: number) =>
  api.delete(`/work-rules/${ruleId}`).then((r) => r.data);

export const reorderUserWorkRules = (userId: number, items: Array<{ id: number; priority: number }>) =>
  api.put<UserWorkRule[]>(`/work-rules/users/${userId}/reorder`, { items }).then((r) => r.data);
