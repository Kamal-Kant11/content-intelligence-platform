import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { History, LayoutDashboard, LogOut, PlusCircle } from 'lucide-react';
import Backdrop from './Backdrop.jsx';
import Logo from './Logo.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/new', label: 'New analysis', icon: PlusCircle },
  { to: '/documents', label: 'History', icon: History, end: true },
];

const linkClass = ({ isActive }) =>
  `inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
    isActive ? 'bg-indigo-500/10 text-indigo-300' : 'text-slate-300 hover:bg-charcoal-800/70 hover:text-white'
  }`;

// Shell for every signed-in page: top bar with navigation and sign out.
export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function signOut() {
    await logout();
    navigate('/', { replace: true });
  }

  return (
    <div className="relative min-h-screen">
      <Backdrop />
      <header className="sticky top-0 z-20 border-b border-charcoal-800/60 bg-charcoal-950/60 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Logo to="/dashboard" />
          <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
            {NAV.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end} className={linkClass}>
                <Icon size={16} /> {label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <span className="hidden max-w-[12rem] truncate text-sm text-slate-400 sm:inline" title={user?.email}>
              {user?.name}
            </span>
            <button type="button" onClick={signOut} className="btn-secondary px-3 py-2">
              <LogOut size={15} /> <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto border-t border-charcoal-800 px-4 py-2 md:hidden" aria-label="Main">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={linkClass}>
              <Icon size={16} /> {label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
        <Outlet />
      </main>
    </div>
  );
}
