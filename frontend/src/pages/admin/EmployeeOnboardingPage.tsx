import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Users,
  AlertCircle,
  CheckCircle,
  Clock,
  Trash2,
  Eye,
  EyeOff,
  Save,
  Phone,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { PageLoader } from '../../components/ui';
import { Avatar } from '../../components/ui/Avatar';
import { formatDate } from '../../utils';
import { cn } from '../../utils';
import api from '../../api/client';

interface ProjectAssignment {
  project_id: number;
  role: string;
  notes?: string;
}

interface OnboardingFormData {
  first_name: string;
  last_name: string;
  email: string;
  personal_email?: string;
  office_phone?: string;
  personal_phone?: string;
  date_of_birth?: string;
  additional_details?: string;
  password: string;
  role_id?: number;
  projects: ProjectAssignment[];
  auto_approve_assignments: boolean;
}

interface OnboardedEmployee {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  personal_email?: string;
  office_phone?: string;
  personal_phone?: string;
  date_of_birth?: string;
  is_active: boolean;
  role_id?: number;
  created_at: string;
  total_projects: number;
  approved_projects: number;
  pending_projects: number;
}

interface Project {
  id: number;
  code: string;
  name: string;
}

interface OnboardingStatus {
  employee_id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  personal_email?: string;
  office_phone?: string;
  personal_phone?: string;
  date_of_birth?: string;
  created_at: string;
  total_assignments: number;
  approved_assignments: number;
  pending_assignments: number;
  is_active: boolean;
  assignments: {
    approved: Array<{
      id: number;
      project_id: number;
      project_name: string;
      role: string;
      status: string;
    }>;
    pending: Array<{
      id: number;
      project_id: number;
      project_name: string;
      role: string;
      status: string;
    }>;
  };
}

// API service using authenticated axios client
const apiService = {
  onboardEmployee: async (data: OnboardingFormData) => {
    const response = await api.post('/onboarding/onboard', data);
    return response.data;
  },

  getOnboardedEmployees: async () => {
    const response = await api.get('/onboarding/onboarded');
    return response.data;
  },

  getProjects: async () => {
    const response = await api.get('/projects');
    return response.data;
  },

  getOnboardingStatus: async (employeeId: number) => {
    const response = await api.get(`/onboarding/onboarding-status/${employeeId}`);
    return response.data;
  },

  completeOnboarding: async (employeeId: number) => {
    const response = await api.post(`/onboarding/complete-onboarding/${employeeId}`);
    return response.data;
  },
};

export function EmployeeOnboardingPage() {
  const { isAdmin, canManageUsers, isLoading: authLoading } = useAuth();
  const { theme, colors } = useTheme();
  const queryClient = useQueryClient();
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<OnboardingFormData>({
    first_name: '',
    last_name: '',
    email: '',
    personal_email: '',
    office_phone: '',
    personal_phone: '',
    date_of_birth: '',
    additional_details: '',
    password: '',
    role_id: undefined,
    projects: [],
    auto_approve_assignments: true,
  });

  // Fetch onboarded employees (only by current user)
  // Only fetch if user is confirmed to be admin and page is mounted
  const { data: employees = [], isLoading: employeesLoading, error: employeesError } = useQuery<OnboardedEmployee[]>({
    queryKey: ['onboarded-employees'],
    queryFn: apiService.getOnboardedEmployees,
    enabled: isAdmin === true,
    retry: false,
  });

  // Fetch available projects
  // Only fetch if user is confirmed to be admin
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: apiService.getProjects,
    enabled: isAdmin === true,
    retry: false,
  });

  // Fetch onboarding status for selected employee
  const { data: statusData } = useQuery<OnboardingStatus>({
    queryKey: ['onboarding-status', selectedEmployeeId],
    queryFn: () => apiService.getOnboardingStatus(selectedEmployeeId!),
    enabled: !!selectedEmployeeId && showStatusModal,
  });

  // Onboard employee mutation
  const onboardMutation = useMutation({
    mutationFn: apiService.onboardEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarded-employees'] });
      setShowOnboardingModal(false);
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        personal_email: '',
        office_phone: '',
        personal_phone: '',
        date_of_birth: '',
        additional_details: '',
        password: '',
        role_id: undefined,
        projects: [],
        auto_approve_assignments: true,
      });
    },
  });

  // Complete onboarding mutation
  const completeMutation = useMutation({
    mutationFn: apiService.completeOnboarding,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarded-employees'] });
      if (selectedEmployeeId) {
        queryClient.invalidateQueries({ queryKey: ['onboarding-status', selectedEmployeeId] });
      }
    },
  });

  const handleAddProject = () => {
    setFormData(prev => ({
      ...prev,
      projects: [...prev.projects, { project_id: 0, role: '' }],
    }));
  };

  const handleRemoveProject = (index: number) => {
    setFormData(prev => ({
      ...prev,
      projects: prev.projects.filter((_, i) => i !== index),
    }));
  };

  const handleProjectChange = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      projects: prev.projects.map((p, i) => (i === index ? { ...p, [field]: value } : p)),
    }));
  };

  const handleSubmitOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    onboardMutation.mutate(formData);
  };

  const handleCompleteOnboarding = () => {
    if (selectedEmployeeId) {
      completeMutation.mutate(selectedEmployeeId);
    }
  };

  // Show loading while auth is still loading
  if (authLoading) {
    return <PageLoader />;
  }

  if (!isAdmin || !canManageUsers) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardBody className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Access Denied</h2>
            <p className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>
              Only managers and HR can access employee onboarding.
            </p>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Users className="w-8 h-8 text-indigo-500" />
            Employee Onboarding
          </h1>
          <p className={theme === 'dark' ? 'text-slate-400 mt-1' : 'text-slate-600 mt-1'}>
            Create new employee accounts and assign projects
          </p>
        </div>
        <Button
          onClick={() => setShowOnboardingModal(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4" />
          New Employee
        </Button>
      </div>

      {/* Onboarded Employees List */}
      <Card>
        <CardHeader>
          <h2 className={cn('text-xl font-bold', theme === 'dark' ? 'text-slate-100' : 'text-slate-900')}>
            Your Team ({employees.length})
          </h2>
        </CardHeader>
        <CardBody>
          {employeesError ? (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 mx-auto mb-3 text-red-500" />
              <p className={theme === 'dark' ? 'text-slate-100 font-semibold' : 'text-slate-900 font-semibold'}>
                Error Loading Employees
              </p>
              <p className={theme === 'dark' ? 'text-slate-400 text-sm mt-2' : 'text-slate-600 text-sm mt-2'}>
                {employeesError instanceof Error ? employeesError.message : 'Failed to load onboarded employees'}
              </p>
            </div>
          ) : employeesLoading ? (
            <PageLoader />
          ) : employees.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 mx-auto mb-3" />
              <p className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>
                No employees onboarded yet
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={`border-b ${colors.table.divider}`}>
                    <th className="text-left py-3 px-4 font-semibold">Name</th>
                    <th className="text-left py-3 px-4 font-semibold">Email</th>
                    <th className="text-left py-3 px-4 font-semibold">Phone</th>
                    <th className="text-center py-3 px-4 font-semibold">Projects</th>
                    <th className="text-center py-3 px-4 font-semibold">Status</th>
                    <th className="text-left py-3 px-4 font-semibold">Joined</th>
                    <th className="text-center py-3 px-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map(emp => (
                    <tr
                      key={emp.id}
                      className={cn(
                        `border-b ${colors.table.divider}`,
                        theme === 'dark'
                          ? 'hover:bg-slate-800/30'
                          : 'hover:bg-slate-50'
                      )}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <Avatar name={emp.full_name} />
                          <div>
                            <p className={cn('font-medium', theme === 'dark' ? 'text-slate-100' : 'text-slate-900')}>
                              {emp.full_name}
                            </p>
                            <p className="text-xs text-slate-500">
                              {emp.first_name} {emp.last_name}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm">{emp.email}</td>
                      <td className="py-3 px-4 text-sm">
                        {emp.office_phone ? (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {emp.office_phone}
                          </span>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>
                      <td className={cn('py-3 px-4 text-center', theme === 'dark' ? 'text-slate-300' : 'text-slate-700')}>
                        {emp.approved_projects}/{emp.total_projects}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex justify-center">
                          {emp.is_active ? (
                            <span className="flex items-center gap-1 text-green-500 text-sm">
                              <CheckCircle className="w-4 h-4" />
                              Active
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-yellow-500 text-sm">
                              <Clock className="w-4 h-4" />
                              Pending
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm">{formatDate(emp.created_at)}</td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => {
                            setSelectedEmployeeId(emp.id);
                            setShowStatusModal(true);
                          }}
                          className="text-indigo-500 hover:text-indigo-400 text-sm font-medium"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Onboarding Modal */}
      <Modal isOpen={showOnboardingModal} onClose={() => setShowOnboardingModal(false)}>
        <div className="space-y-6 max-h-[90vh] overflow-y-auto">
          <h2 className={cn('text-2xl font-bold', theme === 'dark' ? 'text-slate-100' : 'text-slate-900')}>
            Onboard New Employee
          </h2>
          <form onSubmit={handleSubmitOnboarding} className="space-y-4">
            {/* Personal Information */}
            <div className={cn('space-y-3 pb-4 border-b', colors.border.default)}>
              <h3 className={cn('text-sm font-semibold', theme === 'dark' ? 'text-slate-300' : 'text-slate-700')}>
                Personal Information
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="First Name"
                  placeholder="John"
                  value={formData.first_name}
                  onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                  required
                />
                <Input
                  label="Last Name"
                  placeholder="Doe"
                  value={formData.last_name}
                  onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                  required
                />
              </div>
              <Input
                label="Date of Birth"
                type="date"
                value={formData.date_of_birth}
                onChange={e => setFormData({ ...formData, date_of_birth: e.target.value })}
              />
            </div>

            {/* Contact Information */}
            <div className={cn('space-y-3 pb-4 border-b', colors.border.default)}>
              <h3 className={cn('text-sm font-semibold', theme === 'dark' ? 'text-slate-300' : 'text-slate-700')}>
                Contact Information
              </h3>
              <Input
                label="Work Email"
                type="email"
                placeholder="john@company.com"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                required
              />
              <Input
                label="Personal Email"
                type="email"
                placeholder="john.personal@email.com"
                value={formData.personal_email}
                onChange={e => setFormData({ ...formData, personal_email: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Office Phone"
                  placeholder="+1 (555) 123-4567"
                  value={formData.office_phone}
                  onChange={e => setFormData({ ...formData, office_phone: e.target.value })}
                />
                <Input
                  label="Personal Phone"
                  placeholder="+1 (555) 987-6543"
                  value={formData.personal_phone}
                  onChange={e => setFormData({ ...formData, personal_phone: e.target.value })}
                />
              </div>
            </div>

            {/* Security */}
            <div className={cn('space-y-3 pb-4 border-b', colors.border.default)}>
              <h3 className={cn('text-sm font-semibold', theme === 'dark' ? 'text-slate-300' : 'text-slate-700')}>
                Security
              </h3>
              <div>
                <label className={cn('block text-sm font-medium mb-2', theme === 'dark' ? 'text-slate-300' : 'text-slate-700')}>
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                    required
                    className={cn('w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-indigo-500', colors.input.bg, colors.input.text, colors.input.border)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={cn('absolute right-3 top-1/2 -translate-y-1/2', theme === 'dark' ? 'text-slate-400 hover:text-slate-300' : 'text-slate-600 hover:text-slate-700')}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Additional Details */}
            <div className={cn('space-y-3 pb-4 border-b', colors.border.default)}>
              <label className={cn('block text-sm font-medium', theme === 'dark' ? 'text-slate-300' : 'text-slate-700')}>
                Additional Details
              </label>
              <textarea
                value={formData.additional_details}
                onChange={e => setFormData({ ...formData, additional_details: e.target.value })}
                placeholder="Any additional notes or details..."
                rows={3}
                className={cn('w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-indigo-500', colors.input.bg, colors.input.text, colors.input.placeholder, colors.input.border)}
              />
            </div>

            {/* Project Assignments */}
            <div className={cn('space-y-3 pb-4 border-b', colors.border.default)}>
              <div className="flex items-center justify-between">
                <label className={cn('block text-sm font-medium', theme === 'dark' ? 'text-slate-300' : 'text-slate-700')}>
                  Project Assignments
                </label>
                <button
                  type="button"
                  onClick={handleAddProject}
                  className="text-indigo-500 hover:text-indigo-400 text-sm flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  Add Project
                </button>
              </div>
              {formData.projects.map((proj, idx) => (
                <div key={idx} className="flex gap-2">
                  <select
                    value={proj.project_id}
                    onChange={e => handleProjectChange(idx, 'project_id', parseInt(e.target.value))}
                    className={cn('flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:border-indigo-500 text-sm', colors.input.bg, colors.input.text, colors.input.border)}
                  >
                    <option value={0}>Select Project</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.code} - {p.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Role (e.g., Developer)"
                    value={proj.role}
                    onChange={e => handleProjectChange(idx, 'role', e.target.value)}
                    className={cn('flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:border-indigo-500 text-sm', colors.input.bg, colors.input.text, colors.input.placeholder, colors.input.border)}
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveProject(idx)}
                    className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Auto Approve */}
            <label className={cn('flex items-center gap-2 pb-6 border-b', colors.border.default)}>
              <input
                type="checkbox"
                checked={formData.auto_approve_assignments}
                onChange={e => setFormData({ ...formData, auto_approve_assignments: e.target.checked })}
                className="w-4 h-4 rounded cursor-pointer"
              />
              <span className={cn('text-sm', theme === 'dark' ? 'text-slate-400' : 'text-slate-600')}>
                Automatically approve all project assignments
              </span>
            </label>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button onClick={() => setShowOnboardingModal(false)} variant="outline" className="flex-1">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={onboardMutation.isPending}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 flex items-center justify-center gap-2"
              >
                {onboardMutation.isPending ? (
                  <>
                    <Clock className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Create Employee
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Status Modal */}
      <Modal isOpen={showStatusModal} onClose={() => setShowStatusModal(false)}>
        {statusData && (
          <div className="space-y-6">
            {/* Employee Info */}
            <div>
              <h2 className={cn('text-2xl font-bold', theme === 'dark' ? 'text-slate-100' : 'text-slate-900')}>
                {statusData.full_name}
              </h2>
              <p className={cn('text-sm', theme === 'dark' ? 'text-slate-400' : 'text-slate-600')}>
                {statusData.first_name} {statusData.last_name}
              </p>
              <div className={cn('mt-3 space-y-2 text-sm', theme === 'dark' ? 'text-slate-400' : 'text-slate-600')}>
                <p>📧 {statusData.email}</p>
                {statusData.personal_email && <p>🔗 {statusData.personal_email}</p>}
                {statusData.office_phone && <p>📞 {statusData.office_phone}</p>}
                {statusData.personal_phone && <p>📱 {statusData.personal_phone}</p>}
                {statusData.date_of_birth && <p>🎂 {statusData.date_of_birth}</p>}
              </div>
            </div>

            {/* Status Overview */}
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardBody className="text-center">
                  <div className="text-2xl font-bold text-indigo-500">{statusData.total_assignments}</div>
                  <p className="text-xs mt-1">Total Projects</p>
                </CardBody>
              </Card>
              <Card>
                <CardBody className="text-center">
                  <div className="text-2xl font-bold text-green-500">{statusData.approved_assignments}</div>
                  <p className="text-xs mt-1">Approved</p>
                </CardBody>
              </Card>
              <Card>
                <CardBody className="text-center">
                  <div className="text-2xl font-bold text-yellow-500">{statusData.pending_assignments}</div>
                  <p className="text-xs mt-1">Pending</p>
                </CardBody>
              </Card>
            </div>

            {/* Assignments */}
            {statusData.assignments.approved.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-green-500 mb-3">Approved Projects</h3>
                <div className="space-y-2">
                  {statusData.assignments.approved.map(a => (
                    <div
                      key={a.id}
                      className={cn(
                        'p-3 rounded-lg flex items-center justify-between',
                        theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-50'
                      )}
                    >
                      <div>
                        <p className={cn('font-medium', theme === 'dark' ? 'text-slate-100' : 'text-slate-900')}>
                          {a.project_name}
                        </p>
                        <p className={cn('text-xs', theme === 'dark' ? 'text-slate-400' : 'text-slate-600')}>
                          {a.role}
                        </p>
                      </div>
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {statusData.assignments.pending.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-yellow-500 mb-3">Pending Approval</h3>
                <div className="space-y-2">
                  {statusData.assignments.pending.map(a => (
                    <div
                      key={a.id}
                      className={cn(
                        'p-3 rounded-lg flex items-center justify-between',
                        theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-100'
                      )}
                    >
                      <div>
                        <p className={cn('font-medium', theme === 'dark' ? 'text-slate-100' : 'text-slate-900')}>
                          {a.project_name}
                        </p>
                        <p className={cn('text-xs', theme === 'dark' ? 'text-slate-400' : 'text-slate-600')}>
                          {a.role}
                        </p>
                      </div>
                      <Clock className="w-5 h-5 text-yellow-500" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className={cn('flex gap-3 pt-6 border-t', colors.border.default)}>
              <Button onClick={() => setShowStatusModal(false)} variant="outline" className="flex-1">
                Close
              </Button>
              {!statusData.is_active && statusData.pending_assignments === 0 && (
                <Button
                  onClick={handleCompleteOnboarding}
                  disabled={completeMutation.isPending}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {completeMutation.isPending ? 'Completing...' : 'Complete Onboarding'}
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
