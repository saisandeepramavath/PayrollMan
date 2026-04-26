import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  Clock,
  ClipboardList,
  Users,
  Shield,
  SlidersHorizontal,
  TriangleAlert,
  LogOut,
  ChevronRight,
} from 'lucide-react';
import { cn } from '../../utils';
import { useAuth } from '../../contexts/AuthContext';
import { Avatar } from '../ui/Avatar';

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/projects', icon: FolderKanban, label: 'Projects' },
  { to: '/timecards', icon: ClipboardList, label: 'Timecards' },
  { to: '/alerts', icon: TriangleAlert, label: 'Alerts' },
  { to: '/assignments', icon: Users, label: 'Assignments', managerOnly: true },
];

const ADMIN_ITEMS = [
  { to: '/admin', icon: Shield, label: 'Admin Panel' },
  { to: '/admin/issues', icon: TriangleAlert, label: 'Alerts' },
  { to: '/admin/rules', icon: SlidersHorizontal, label: 'Rules Board' },
];

function NavItem({ to, icon: Icon, label }: { to: string; icon: typeof Clock; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group',
          isActive
            ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-600/20'
            : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800 border border-transparent'
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon
            className={cn(
              'w-4 h-4 flex-shrink-0 transition-colors',
              isActive ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'
            )}
          />
          <span className="truncate">{label}</span>
          {isActive && <ChevronRight className="w-3.5 h-3.5 ml-auto text-indigo-400/60" />}
        </>
      )}
    </NavLink>
  );
}

export function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { user, logout, isAdmin, canManageAssignments } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-40 h-screen w-64 flex flex-col',
          'bg-slate-950 border-r border-slate-800',
          'transition-transform duration-200 ease-out',
          'lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-800">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0">
            <Clock className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-100 leading-none">WorkTracker</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Time & Projects</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <div className="flex flex-col gap-1">
            <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest px-3 mb-2">
              Workspace
            </p>
            {NAV_ITEMS.filter((item) => !item.managerOnly || canManageAssignments).map((item) => (
              <NavItem key={item.to} {...item} />
            ))}
          </div>

          {isAdmin && (
            <div className="flex flex-col gap-1 mt-6">
              <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest px-3 mb-2">
                Administration
              </p>
              {ADMIN_ITEMS.map((item) => (
                <NavItem key={item.to} {...item} />
              ))}
            </div>
          )}
        </nav>

        {/* User footer */}
        <div className="px-3 py-4 border-t border-slate-800">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-800/60 cursor-pointer group">
            <Avatar name={user?.full_name ?? 'User'} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-200 truncate">{user?.full_name}</p>
              <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-rose-600/20 text-slate-500 hover:text-rose-400"
              title="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
