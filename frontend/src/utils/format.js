
export const MAX_FILE_MB = 5;

export const formatDate = (value) =>
  value ? new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—';

export const formatBytes = (bytes) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`);

export function scoreTone(score) {
  if (score === null || score === undefined) return { text: 'text-slate-500', stroke: '#475569' };
  if (score >= 80) return { text: 'text-emerald-400', stroke: '#34d399' };
  if (score >= 60) return { text: 'text-amber-400', stroke: '#fbbf24' };
  return { text: 'text-red-400', stroke: '#f87171' };
}
