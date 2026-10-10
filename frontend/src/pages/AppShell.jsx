import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import Backdrop from '../components/Backdrop.jsx';
import Logo from '../components/Logo.jsx';
import { useAuth } from '../context/AuthContext.jsx';

// Shared chrome for signed-in pages (header with logout).
export default function AppShell({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function onLogout() {
    logout();
    navigate('/', { replace: true });
  }

  return (
    <div className="relative min-h-screen">
      <Backdrop />
      <header className="border-b border-charcoal-800 bg-charcoal-950/70 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3.5">
          <Logo to="/dashboard" />
          <div className="flex items-center gap-3">
            <span className="hidden max-w-[12rem] truncate text-sm text-slate-400 sm:inline">{user?.email}</span>
            <button type="button" onClick={onLogout} className="btn-secondary px-3 py-2">
              <LogOut size={16} /> Logout
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-5 py-8 sm:py-10">{children}</main>
    </div>
  );
}
