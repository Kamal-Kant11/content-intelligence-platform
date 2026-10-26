import { AlertCircle, CheckCircle2, Info, Loader2, TriangleAlert } from 'lucide-react';
import { STATUS, scoreTone } from '../utils/format.js';

// Circular score gauge.
export function ScoreRing({ score, size = 96, stroke = 8, label = '/ 100' }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const value = typeof score === 'number' ? Math.max(0, Math.min(100, score)) : 0;
  const { stroke: color } = scoreTone(score);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1e2228" strokeWidth={stroke} />
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
      <div className="absolute inset-0 flex flex-col items-center justify-center" role="img" aria-label={`Score ${score ?? 'not available'} out of 100`}>
        <span className="font-bold leading-none text-white" style={{ fontSize: size * 0.3 }}>
          {score ?? '—'}
        </span>
        {size >= 72 && <span className="mt-1 text-[10px] text-slate-400">{label}</span>}
      </div>
    </div>
  );
}

// A score number colored green / amber / red.
export function Score({ value }) {
  return <span className={`font-semibold tabular-nums ${scoreTone(value).text}`}>{value ?? '—'}</span>;
}

export function StatusBadge({ status }) {
  const s = STATUS[status] || STATUS.draft;
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${s.className}`}>{s.label}</span>;
}

const ALERT_STYLES = {
  error: ['border-red-500/30 bg-red-500/10 text-red-300', AlertCircle],
  warning: ['border-amber-500/30 bg-amber-500/10 text-amber-300', TriangleAlert],
  success: ['border-emerald-500/30 bg-emerald-500/10 text-emerald-300', CheckCircle2],
  info: ['border-indigo-500/30 bg-indigo-500/10 text-indigo-300', Info],
};

export function Alert({ kind = 'error', children, className = '' }) {
  if (!children) return null;
  const [style, Icon] = ALERT_STYLES[kind];
  return (
    <div role={kind === 'error' ? 'alert' : 'status'} className={`flex gap-2.5 rounded-lg border p-3 text-sm ${style} ${className}`}>
      <Icon size={17} className="mt-0.5 shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function Spinner({ label = 'Loading…' }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-400" role="status">
      <Loader2 className="h-5 w-5 animate-spin text-indigo-400" /> {label}
    </div>
  );
}

// Button content that swaps to a spinner while busy.
export function Busy({ busy, label, busyLabel, icon: Icon }) {
  if (busy) {
    return (
      <>
        <Loader2 className="h-4 w-4 animate-spin" /> {busyLabel}
      </>
    );
  }
  return (
    <>
      {Icon && <Icon size={16} />} {label}
    </>
  );
}

export function EmptyState({ icon: Icon, title, text, action }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      {Icon && (
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 text-indigo-400 ring-1 ring-indigo-400/20">
          <Icon size={22} />
        </span>
      )}
      <h3 className="mt-4 font-semibold text-white">{title}</h3>
      {text && <p className="mt-1 max-w-sm text-sm text-slate-400">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// "+12" in green, "-5" in red, "±0" in grey. Pass lowerIsBetter for counts like grammar issues.
export function Change({ before, after, lowerIsBetter = false, digits = 0 }) {
  if (typeof before !== 'number' || typeof after !== 'number') return <span className="text-slate-500">—</span>;
  const diff = Math.round((after - before) * 10 ** digits) / 10 ** digits;
  if (diff === 0) return <span className="text-slate-400">±0</span>;
  const good = lowerIsBetter ? diff < 0 : diff > 0;
  return <span className={`font-medium ${good ? 'text-emerald-400' : 'text-red-400'}`}>{diff > 0 ? `+${diff}` : `−${Math.abs(diff)}`}</span>;
}

export function PageHeader({ title, subtitle, actions, children }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {children}
        <h1 className="break-words text-2xl font-semibold tracking-tight text-white sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
