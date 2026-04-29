import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, Outlet } from 'react-router-dom';
import { Bell, Menu } from 'lucide-react';
import { getIssueReports } from '../../api/endpoints';
import { Sidebar } from './Sidebar';
import { useTheme } from '../../contexts/ThemeContext';

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { theme, colors } = useTheme();
  const { data: issues } = useQuery({
    queryKey: ['issues', 'header-alerts'],
    queryFn: () => getIssueReports(),
  });
  const activeAlertCount = useMemo(
    () => (issues ?? []).filter((issue) => issue.status !== 'resolved').length,
    [issues],
  );

  return (
    <div className={`min-h-screen ${colors.bg.primary} ${colors.text.primary}`}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className={`flex items-center justify-between gap-4 px-4 lg:px-8 py-4 border-b ${
          theme === 'dark' 
            ? 'border-slate-800 bg-slate-950/95 backdrop-blur' 
            : 'border-slate-200 bg-white/95 backdrop-blur'
        }`}>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className={`p-2 rounded-lg transition-colors lg:hidden ${
                theme === 'dark'
                  ? 'hover:bg-slate-800 text-slate-400 hover:text-slate-100'
                  : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>PayrollMan</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/alerts"
              className={`relative inline-flex items-center justify-center rounded-xl border px-3 py-2 transition-colors ${
                theme === 'dark'
                  ? 'border-slate-800 bg-slate-900/80 text-slate-300 hover:border-slate-700 hover:text-slate-100'
                  : 'border-slate-300 bg-slate-50 text-slate-600 hover:border-slate-400 hover:text-slate-900'
              }`}
              aria-label="Open alerts"
            >
              <Bell className="w-4 h-4" />
              {activeAlertCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {activeAlertCount > 9 ? '9+' : activeAlertCount}
                </span>
              )}
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className={`flex-1 p-6 lg:p-8 ${colors.bg.primary}`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
