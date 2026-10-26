// Display helpers shared by the pages.

// Must match MAX_TEXT_CHARS in backend/.env (default 20000).
export const MAX_TEXT_CHARS = 20000;
export const MAX_FILE_MB = 5;

export const STATUS = {
  draft: { label: 'Not analyzed', className: 'bg-charcoal-800 text-slate-300 ring-charcoal-600' },
  analyzed: { label: 'Analyzed', className: 'bg-indigo-500/10 text-indigo-300 ring-indigo-500/30' },
  awaiting_review: { label: 'Awaiting review', className: 'bg-amber-500/10 text-amber-300 ring-amber-500/30' },
  approved: { label: 'Approved', className: 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/30' },
  rejected: { label: 'Rejected', className: 'bg-red-500/10 text-red-300 ring-red-500/30' },
};

export const SOURCE_LABEL = { file: 'File upload', url: 'Website', text: 'Pasted text' };

export const formatDate = (value) =>
  value ? new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—';

// Same word rule as the backend.
export const countWords = (text) => (String(text).match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu) || []).length;

// Score colors: green 80+, amber 60–79, red below 60.
export function scoreTone(score) {
  if (score === null || score === undefined) return { text: 'text-slate-500', stroke: '#475569' };
  if (score >= 80) return { text: 'text-emerald-400', stroke: '#34d399' };
  if (score >= 60) return { text: 'text-amber-400', stroke: '#fbbf24' };
  return { text: 'text-red-400', stroke: '#f87171' };
}
