export interface Role {
  id: number;
  name: string;
  display_name: string;
  can_create_projects: boolean;
  can_manage_assignments: boolean;
  can_view_all_timecards: boolean;
  can_manage_users: boolean;
  created_at: string;
  updated_at?: string;
}

export interface RoleCreate {
  name: string;
  display_name: string;
  can_create_projects: boolean;
  can_manage_assignments: boolean;
  can_view_all_timecards: boolean;
  can_manage_users: boolean;
}

export interface RoleUpdate {
  display_name?: string;
  can_create_projects?: boolean;
  can_manage_assignments?: boolean;
  can_view_all_timecards?: boolean;
  can_manage_users?: boolean;
}

export interface User {
  id: number;
  email: string;
  full_name: string;
  is_active: boolean;
  is_superuser?: boolean;
  role_id?: number;
  role?: Role;
  created_at: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  full_name: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export type ProjectStatus = 'active' | 'on_hold' | 'completed' | 'cancelled';

export interface Project {
  id: number;
  name: string;
  code: string;
  description?: string;
  department?: string;
  company?: string;
  creator_id: number;
  supervisor_id?: number;
  status: ProjectStatus;
  requires_approval: boolean;
  start_date?: string;
  end_date?: string;
  created_at: string;
  updated_at?: string;
  creator_name?: string;
  supervisor_name?: string;
  assigned_users_count?: number;
}

export interface TrackingCode {
  id?: number;
  category_id?: number;
  label: string;
  code: string;
  description?: string;
  entry_type: string;
  labor_category?: string;
  extra_fields?: Record<string, string>;
  default_work_location?: string;
  is_active?: boolean;
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
}

export interface TrackingRule {
  id?: number;
  category_id?: number;
  name: string;
  scope_type: string;
  scope_value?: string;
  condition_type: string;
  condition_value: string;
  action_type: string;
  action_value: string;
  priority?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface TrackingCategoryCreate {
  name: string;
  description?: string;
  company?: string;
  is_active?: boolean;
  sort_order?: number;
  project_id?: number;
  codes: TrackingCode[];
  rules: TrackingRule[];
}

export interface TrackingCategoryUpdate extends Partial<TrackingCategoryCreate> {}

export interface TrackingCategory extends TrackingCategoryCreate {
  id: number;
  creator_id: number;
  created_at: string;
  updated_at?: string;
}

export interface ProjectCreate {
  name: string;
  code: string;
  description?: string;
  department?: string;
  company?: string;
  supervisor_id?: number;
  status?: ProjectStatus;
  requires_approval?: boolean;
  start_date?: string;
  end_date?: string;
  tracking_setup?: TrackingCategoryCreate;
}

export interface ProjectUpdate extends Partial<ProjectCreate> {}

export type AssignmentStatus = 'pending' | 'approved' | 'rejected' | 'revoked';

export interface ProjectAssignment {
  id: number;
  project_id: number;
  user_id: number;
  assigner_id: number;
  role?: string;
  notes?: string;
  status: AssignmentStatus;
  approved_by_id?: number;
  approved_at?: string;
  created_at: string;
  updated_at?: string;
  user_name?: string;
  user_email?: string;
  project_name?: string;
  project_code?: string;
  total_project_hours_since_assigned?: number;
  assigned_since?: string;
}

export interface PunchEntry {
  id: number;
  user_id: number;
  date: string;
  punch_in: string;
  punch_out?: string;
  duration_minutes?: number;
  duration_display?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface PunchEntryCreate {
  date: string;
  punch_in: string;
  punch_out?: string;
  notes?: string;
}

export interface PunchEntryUpdate {
  date?: string;
  punch_in?: string;
  punch_out?: string;
  notes?: string;
}

export interface Timecard {
  id: number;
  user_id: number;
  date: string;
  hours_worked: number;
  description?: string;
  project_id?: number;
  project_name?: string;
  project_code?: string;
  cost_center?: string;
  work_location?: string;
  entry_type?: string;
  labor_category?: string;
  created_at: string;
  updated_at?: string;
}

export interface TimecardCreate {
  date: string;
  hours_worked: number;
  description?: string;
  project_id?: number;
  cost_center?: string;
  work_location?: string;
  entry_type?: string;
  labor_category?: string;
}

export type TimecardSubmissionStatus = 'draft' | 'submitted' | 'on_hold' | 'approved';

export interface TimecardSubmission {
  id?: number;
  user_id: number;
  week_start: string;
  week_end: string;
  status: TimecardSubmissionStatus;
  submitted_at?: string;
  auto_approve_at?: string;
  approved_at?: string;
  reviewer_id?: number;
  review_notes?: string;
  created_at?: string;
  updated_at?: string;
  user_name?: string;
  user_email?: string;
  reviewer_name?: string;
  unresolved_issue_count: number;
}

export type IssueReportStatus = 'open' | 'in_review' | 'resolved';
export type IssueReportPriority = 'low' | 'medium' | 'high';
export type IssueReportType = 'timecard' | 'attendance' | 'project' | 'other';

export interface IssueReport {
  id: number;
  user_id: number;
  reporter_id: number;
  timecard_id?: number;
  issue_type: IssueReportType;
  status: IssueReportStatus;
  priority: IssueReportPriority;
  title: string;
  description: string;
  week_start?: string;
  notice_subject?: string;
  notice_message?: string;
  resolution_notes?: string;
  resolved_by_id?: number;
  resolved_at?: string;
  created_at: string;
  updated_at?: string;
  user_name?: string;
  user_email?: string;
  reporter_name?: string;
  reporter_email?: string;
  project_name?: string;
  project_code?: string;
}

export interface IssueReportCreate {
  user_id?: number;
  timecard_id?: number;
  issue_type?: IssueReportType;
  priority?: IssueReportPriority;
  title: string;
  description: string;
  week_start?: string;
}

export interface IssueReportUpdate {
  status?: IssueReportStatus;
  resolution_notes?: string;
}

export interface IssueReportNotice {
  notice_subject: string;
  notice_message: string;
}

export interface TimeAllocation {
  id: number;
  user_id: number;
  project_id: number;
  date: string;
  hours: number;
  description?: string;
  created_at: string;
}

export interface UserWorkRule {
  id: number;
  user_id: number;
  name: string;
  target_weekly_hours?: number;
  max_weekly_hours?: number;
  max_daily_hours?: number;
  effective_from: string;
  priority: number;
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface UserWorkRuleCreate {
  user_id: number;
  name: string;
  target_weekly_hours?: number;
  max_weekly_hours?: number;
  max_daily_hours?: number;
  effective_from: string;
  priority?: number;
  is_active?: boolean;
  notes?: string;
}

export interface UserWorkRuleUpdate {
  name?: string;
  target_weekly_hours?: number;
  max_weekly_hours?: number;
  max_daily_hours?: number;
  effective_from?: string;
  priority?: number;
  is_active?: boolean;
  notes?: string;
}

export interface UserEffectiveWorkRule {
  user_id: number;
  as_of_date: string;
  target_weekly_hours?: number;
  max_weekly_hours?: number;
  max_daily_hours?: number;
  applied_rule_names: string[];
}
