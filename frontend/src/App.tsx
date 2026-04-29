import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute, PublicOnlyRoute } from './components/layout/ProtectedRoute';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import ProjectProgressDashboard from './pages/dashboard/ProjectProgressDashboard';
import { ProjectsPage } from './pages/projects/ProjectsPage';
import { ProjectDetailPage } from './pages/projects/ProjectDetailPage';
import { TimecardsPage } from './pages/timecards/TimecardsPage';
import { AlertsPage } from './pages/alerts/AlertsPage';
import { AssignmentsPage } from './pages/assignments/AssignmentsPage';
import { AdminPage } from './pages/admin/AdminPage';
import { ReviewQueuePage } from './pages/admin/IssuesInboxPage';
import { RulesPage } from './pages/admin/RulesPage';
import { EmployeeOnboardingPage } from './pages/admin/EmployeeOnboardingPage';
import { LandingPage } from './pages/landing/LandingPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route element={<PublicOnlyRoute />}>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
              </Route>
              <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/dashboard/progress" element={<ProjectProgressDashboard />} />
                  <Route path="/projects" element={<ProjectsPage />} />
                  <Route path="/projects/:id" element={<ProjectDetailPage />} />
                  <Route path="/projects/:id/edit" element={<ProjectDetailPage />} />
                  <Route path="/timecards" element={<TimecardsPage />} />
                  <Route path="/alerts" element={<AlertsPage />} />
                  <Route path="/assignments" element={<AssignmentsPage />} />
                  <Route element={<ProtectedRoute adminOnly />}>
                    <Route path="/admin" element={<AdminPage />} />
                    <Route path="/admin/issues" element={<ReviewQueuePage />} />
                    <Route path="/admin/rules" element={<RulesPage />} />
                    <Route path="/admin/onboarding" element={<EmployeeOnboardingPage />} />
                  </Route>
                </Route>
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
