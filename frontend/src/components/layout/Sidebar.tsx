import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  ClipboardList,
  Users,
  Shield,
  SlidersHorizontal,
  TriangleAlert,
  LogOut,
  ChevronRight,
  UserPlus,
  Sun,
  Moon,
} from 'lucide-react';
import { cn } from '../../utils';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
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
  { to: '/admin/onboarding', icon: UserPlus, label: 'Onboard Employee' },
  { to: '/admin/issues', icon: TriangleAlert, label: 'Alerts' },
  { to: '/admin/rules', icon: SlidersHorizontal, label: 'Rules Board' },
];

function NavItem({ to, icon: Icon, label }: { to: string; icon: React.ElementType; label: string }) {
  const { theme } = useTheme();
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group border',
          isActive
            ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-600/20'
            : theme === 'dark'
              ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-800 border-transparent'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-transparent'
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon
            className={cn(
              'w-4 h-4 flex-shrink-0 transition-colors',
              isActive
                ? 'text-indigo-400'
                : theme === 'dark'
                  ? 'text-slate-500 group-hover:text-slate-300'
                  : 'text-slate-500 group-hover:text-slate-700'
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
  const { user, logout, canManageUsers, canManageAssignments } = useAuth();
  const { theme, toggleTheme } = useTheme();
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
          'border-r transition-colors duration-200',
          'lg:translate-x-0',
          theme === 'dark'
            ? 'bg-slate-950 border-slate-800'
            : 'bg-white border-slate-200',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo + Theme toggle */}
        <div className={cn(
          'flex items-center justify-between px-5 py-5 border-b gap-2',
          theme === 'dark' ? 'border-slate-800' : 'border-slate-200'
        )}>
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="Logo" className="w-8 h-8 flex-shrink-0" />
            <div>
              <p className={`text-sm font-bold leading-none ${theme === 'dark' ? 'text-slate-50' : 'text-slate-900'}`}>PayrollMan</p>
              <p className={`text-[10px] mt-0.5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Time & Projects</p>
            </div>
          </div>
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-lg transition-colors ${
              theme === 'dark'
                ? 'hover:bg-slate-800 text-slate-400 hover:text-slate-100'
                : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
            title="Toggle light/dark mode"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </button>
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

          {canManageUsers && (
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
        <div className={`px-3 py-4 border-t ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
          <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${theme === 'dark' ? 'hover:bg-slate-800/60' : 'hover:bg-slate-100'} cursor-pointer group`}>
            <Avatar name={user?.full_name ?? 'User'} size="sm" />
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-semibold truncate ${theme === 'dark' ? 'text-slate-50' : 'text-slate-900'}`}>{user?.full_name}</p>
              <p className={`text-[10px] truncate ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>{user?.email}</p>
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
