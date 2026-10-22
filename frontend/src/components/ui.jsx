import { Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';

export function Spinner({ label = 'Loading', className = 'py-16' }) {
  return (
    <div className={`flex justify-center ${className}`}>
      <Loader2 className="h-6 w-6 animate-spin text-indigo-400" aria-label={label} />
    </div>
  );
}

export function ErrorAlert({ children, onRetry }) {
  if (!children) return null;
  return (
    <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
      <AlertCircle size={18} className="mt-0.5 shrink-0" />
      <span className="flex-1">{children}</span>
      {onRetry && (
        <button type="button" onClick={onRetry} className="font-medium underline">
          Retry
        </button>
      )}
    </div>
  );
}

export function BackLink({ to, children }) {
  return (
    <Link to={to} className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200">
      <ArrowLeft size={16} /> {children}
    </Link>
  );
}

const STATUS_STYLES = {
  draft: 'bg-amber-500/10 text-amber-300 ring-amber-400/20',
  in_review: 'bg-sky-500/10 text-sky-300 ring-sky-400/20',
  approved: 'bg-emerald-500/10 text-emerald-300 ring-emerald-400/20',
  suggested: 'bg-sky-500/10 text-sky-300 ring-sky-400/20',
  active: 'bg-emerald-500/10 text-emerald-300 ring-emerald-400/20',
  rejected: 'bg-slate-500/10 text-slate-400 ring-slate-400/20',
  processed: 'bg-emerald-500/10 text-emerald-300 ring-emerald-400/20',
  failed: 'bg-red-500/10 text-red-300 ring-red-400/20',
  pending: 'bg-slate-500/10 text-slate-300 ring-slate-400/20',
  edited: 'bg-indigo-500/10 text-indigo-300 ring-indigo-400/20',
  explicit: 'bg-indigo-500/10 text-indigo-300 ring-indigo-400/20',
  inferred: 'bg-slate-500/10 text-slate-300 ring-slate-400/20',
};

export function Badge({ value, children }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ${
        STATUS_STYLES[value] || 'bg-charcoal-700 text-slate-300 ring-charcoal-600'
      }`}
    >
      {children ?? String(value).replace('_', ' ')}
    </span>
  );
}

const SEVERITY_STYLES = {
  critical: 'bg-red-500/15 text-red-300 ring-red-400/30',
  warning: 'bg-amber-500/15 text-amber-300 ring-amber-400/30',
  info: 'bg-sky-500/10 text-sky-300 ring-sky-400/20',
};

export function SeverityBadge({ severity }) {
  return (
    <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium capitalize ring-1 ${SEVERITY_STYLES[severity]}`}>
      {severity}
    </span>
  );
}

export function scoreColor(score) {
  if (score === undefined || score === null) return 'text-slate-400';
  if (score >= 85) return 'text-emerald-300';
  if (score >= 65) return 'text-amber-300';
  return 'text-red-300';
}

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="break-words text-2xl font-semibold text-white">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

export function Section({ title, action, children, className = '' }) {
  return (
    <section className={`card p-5 ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="text-sm font-medium uppercase tracking-wide text-slate-400">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Select({ label, id, children, ...props }) {
  return (
    <div>
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-300">
          {label}
        </label>
      )}
      <select id={id} className="input" {...props}>
        {children}
      </select>
    </div>
  );
}

// Circular score gauge.
export function ScoreRing({ score, size = 96, stroke = 8, label = '/ 100' }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const value = typeof score === 'number' ? Math.max(0, Math.min(100, score)) : 0;
  const color = score === undefined || score === null ? '#475569' : score >= 85 ? '#34d399' : score >= 65 ? '#fbbf24' : '#f87171';
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#262a31" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (value / 100) * c}
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center" role="img" aria-label={`Score ${score ?? 'not available'}`}>
        <span className="font-semibold leading-none text-white" style={{ fontSize: size * 0.3 }}>
          {score ?? '—'}
        </span>
        {size >= 72 && <span className="mt-1 text-[10px] text-slate-500">{label}</span>}
      </div>
    </div>
  );
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-charcoal-700">
      {tabs.map(({ id, label, icon: Icon, count }) => (
        <button
          key={id}
          role="tab"
          type="button"
          aria-selected={value === id}
          onClick={() => onChange(id)}
          className={`-mb-px inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm transition ${
            value === id ? 'border-indigo-400 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          {Icon && <Icon size={15} />} {label}
          {count !== undefined && <span className="rounded-full bg-charcoal-700 px-1.5 text-[11px] text-slate-300">{count}</span>}
        </button>
      ))}
    </div>
  );
}

export function ProgressBar({ value, max, className = '' }) {
  const pct = max ? Math.round((value / max) * 100) : 0;
  return (
    <div className={`h-2 overflow-hidden rounded-full bg-charcoal-700 ${className}`} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-500" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function StatCard({ icon: Icon, label, value, hint, tone = 'indigo' }) {
  const tones = {
    indigo: 'bg-indigo-500/15 text-indigo-300',
    emerald: 'bg-emerald-500/15 text-emerald-300',
    amber: 'bg-amber-500/15 text-amber-300',
    sky: 'bg-sky-500/15 text-sky-300',
  };
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
        {Icon && (
          <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${tones[tone]}`}>
            <Icon size={16} />
          </span>
        )}
      </div>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
