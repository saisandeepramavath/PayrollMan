import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, Outlet } from 'react-router-dom';
import { Bell, Menu } from 'lucide-react';
import { getIssueReports } from '../../api/endpoints';
import { Sidebar } from './Sidebar';

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { data: issues } = useQuery({
    queryKey: ['issues', 'header-alerts'],
    queryFn: () => getIssueReports(),
  });
  const activeAlertCount = useMemo(
    () => (issues ?? []).filter((issue) => issue.status !== 'resolved').length,
    [issues],
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="flex items-center justify-between gap-4 px-4 lg:px-8 py-4 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors lg:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-sm font-semibold text-slate-200">WorkTracker</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/alerts"
              className="relative inline-flex items-center justify-center rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-slate-300 transition-colors hover:border-slate-700 hover:text-slate-100"
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
        <main className="flex-1 p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
