import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { BrainCircuit, FilePlus2, LayoutDashboard, LogOut, Menu, Palette, ShieldCheck, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

const NAV = [
  { to: '/dashboard', label: 'Overview', icon: LayoutDashboard, hint: 'Documents and scores' },
  { to: '/documents/new', label: 'New content', icon: FilePlus2, hint: 'Write, paste, upload, URL' },
  { to: '/brands', label: 'Brands', icon: Palette, hint: 'Voice, sources, rules' },
  { to: '/models', label: 'Models', icon: BrainCircuit, hint: 'Local trained models' },
];

function Sidebar({ onNavigate }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const initials = (user?.name || 'U')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex h-full flex-col">
      <Link to="/dashboard" onClick={onNavigate} className="flex items-center gap-2.5 px-5 py-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/30">
          <ShieldCheck size={18} />
        </span>
        <span>
          <span className="block text-sm font-semibold text-white">Content Assurance</span>
          <span className="block text-[11px] text-slate-500">Quality · Brand · Claims</span>
        </span>
      </Link>

      <nav className="flex-1 space-y-1 px-3" aria-label="Main">
        {NAV.map(({ to, label, icon: Icon, hint }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/dashboard'}
            onClick={onNavigate}
            className={({ isActive }) =>
              `group flex items-center gap-3 rounded-xl px-3 py-2.5 transition ${
                isActive ? 'bg-indigo-500/15 text-white ring-1 ring-indigo-400/30' : 'text-slate-400 hover:bg-charcoal-800 hover:text-slate-200'
              }`
            }
          >
            <Icon size={18} className="shrink-0" />
            <span className="min-w-0">
              <span className="block text-sm font-medium">{label}</span>
              <span className="block truncate text-[11px] text-slate-500 group-hover:text-slate-400">{hint}</span>
            </span>
          </NavLink>
        ))}
      </nav>

      <div className="m-3 rounded-xl border border-charcoal-700 bg-charcoal-900/80 p-3">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-sm font-semibold text-indigo-200">
            {initials}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-100">{user?.name}</p>
            <p className="truncate text-xs text-slate-500">{user?.email}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            logout();
            navigate('/', { replace: true });
          }}
          className="btn-secondary mt-3 w-full py-2"
        >
          <LogOut size={15} /> Log out
        </button>
      </div>
    </div>
  );
}

// Signed-in portal layout: fixed sidebar on desktop, slide-in drawer on mobile.
export default function AppShell({ children, wide = false }) {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const current = NAV.find((n) => (n.to === '/dashboard' ? location.pathname === n.to : location.pathname.startsWith(n.to)));

  return (
    <div className="min-h-screen bg-charcoal-950">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-0 overflow-hidden">
        <div className="absolute right-[-10rem] top-[-14rem] h-[30rem] w-[40rem] rounded-full bg-indigo-500/10 blur-[120px]" />
      </div>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-charcoal-800 bg-charcoal-950/90 backdrop-blur lg:block">
        <Sidebar />
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <button type="button" className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} aria-label="Close menu" />
          <aside className="absolute inset-y-0 left-0 w-72 border-r border-charcoal-800 bg-charcoal-950">
            <button type="button" onClick={() => setOpen(false)} className="absolute right-3 top-5 p-1 text-slate-400" aria-label="Close menu">
              <X size={20} />
            </button>
            <Sidebar onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <div className="relative lg:pl-64">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-charcoal-800 bg-charcoal-950/80 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
          <button type="button" onClick={() => setOpen(true)} className="rounded-lg p-1.5 text-slate-300 hover:bg-charcoal-800 lg:hidden" aria-label="Open menu">
            <Menu size={20} />
          </button>
          <p className="text-sm text-slate-400">
            <span className="text-slate-500">Portal</span>
            <span className="mx-2 text-slate-600">/</span>
            <span className="text-slate-200">{current?.label || 'Document'}</span>
          </p>
          <Link to="/documents/new" className="btn-primary ml-auto px-3 py-2">
            <FilePlus2 size={16} /> <span className="hidden sm:inline">New content</span>
          </Link>
        </header>
        <main className={`mx-auto ${wide ? 'max-w-7xl' : 'max-w-6xl'} px-4 py-8 sm:px-6 lg:px-8`}>{children}</main>
      </div>
    </div>
  );
}
