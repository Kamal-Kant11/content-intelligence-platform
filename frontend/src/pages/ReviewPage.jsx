import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Check, CheckCircle2, Columns2, Download, Loader2, Pencil, RotateCcw, Rows2, X } from 'lucide-react';
import AppShell from './AppShell.jsx';
import ExportPanel from '../components/ExportPanel.jsx';
import { api, getErrorMessage } from '../api/client.js';
import { diffWords } from '../utils/diff.js';
import { buildSections } from '../utils/sections.js';
import { downloadErrorMessage, downloadFile } from '../utils/download.js';
import { BackLink, Badge, ErrorAlert, ProgressBar, Section, Spinner } from '../components/ui.jsx';

const finalOf = (c) => (c.status === 'edited' ? c.editedText : c.status === 'rejected' ? c.originalText : c.proposedText);

// side: 'before' shows removals, 'after' shows additions, 'inline' shows both.
function Diff({ before, after, side = 'inline' }) {
  return (
    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
      {diffWords(before, after).map((part, i) => {
        if (part.type === 'same') return <span key={i} className="text-slate-300">{part.text}</span>;
        if (part.type === 'removed')
          return side === 'after' ? null : (
            <del key={i} className="mr-1 rounded bg-red-500/15 text-red-300 decoration-red-400/70">
              {part.text}
            </del>
          );
        return side === 'before' ? null : (
          <ins key={i} className="rounded bg-emerald-500/15 text-emerald-300 no-underline">
            {part.text}
          </ins>
        );
      })}
    </p>
  );
}

function ChangeCard({ change, locked, onReview, busy, layout }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const after = change.status === 'pending' ? change.proposedText : finalOf(change);
  const accent =
    change.status === 'approved' ? 'border-emerald-500/30' : change.status === 'rejected' ? 'border-charcoal-700 opacity-80' : change.status === 'edited' ? 'border-indigo-400/40' : 'border-charcoal-700';

  return (
    <li className={`rounded-xl border bg-charcoal-900/80 ${accent}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-charcoal-700 px-4 py-2.5">
        <span className="text-xs uppercase tracking-wide text-slate-500">{change.blockId}</span>
        <Badge value={change.status} />
      </div>

      <div className="p-4">
        {editing ? (
          <div className="space-y-2">
            <textarea className="input min-h-[8rem] text-sm leading-relaxed" value={draft} onChange={(e) => setDraft(e.target.value)} aria-label="Edited text" autoFocus />
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-primary px-3 py-2"
                disabled={!draft.trim() || busy}
                onClick={async () => {
                  if (await onReview(change.changeId, 'edited', draft)) setEditing(false);
                }}
              >
                Save edit
              </button>
              <button type="button" className="btn-secondary px-3 py-2" onClick={() => setEditing(false)}>
                Cancel
              </button>
            </div>
          </div>
        ) : layout === 'split' ? (
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg bg-charcoal-950/60 p-3">
              <p className="mb-1.5 text-[11px] uppercase tracking-wide text-red-300/70">Before</p>
              <Diff before={change.originalText} after={after} side="before" />
            </div>
            <div className="rounded-lg bg-charcoal-950/60 p-3">
              <p className="mb-1.5 text-[11px] uppercase tracking-wide text-emerald-300/70">{change.status === 'rejected' ? 'Kept original' : 'After'}</p>
              <Diff before={change.originalText} after={after} side="after" />
            </div>
          </div>
        ) : (
          <Diff before={change.originalText} after={after} />
        )}

        {change.reason && <p className="mt-3 text-xs text-slate-500">Why: {change.reason}</p>}

        {!locked && !editing && (
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className="btn-secondary px-3 py-1.5 text-sm text-emerald-300" disabled={busy || change.status === 'approved'} onClick={() => onReview(change.changeId, 'approved')}>
              <Check size={15} /> Approve
            </button>
            <button type="button" className="btn-secondary px-3 py-1.5 text-sm text-red-300" disabled={busy || change.status === 'rejected'} onClick={() => onReview(change.changeId, 'rejected')}>
              <X size={15} /> Reject
            </button>
            <button
              type="button"
              className="btn-secondary px-3 py-1.5 text-sm"
              disabled={busy}
              onClick={() => {
                setDraft(change.editedText ?? change.proposedText);
                setEditing(true);
              }}
            >
              <Pencil size={15} /> Edit
            </button>
            {change.status !== 'pending' && (
              <button type="button" className="btn-secondary px-3 py-1.5 text-sm text-slate-400" disabled={busy} onClick={() => onReview(change.changeId, 'pending')}>
                <RotateCcw size={15} /> Undo
              </button>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

export default function ReviewPage() {
  const { id, optimizationId } = useParams();
  const [opt, setOpt] = useState(null);
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [layout, setLayout] = useState('split');

  const load = useCallback(async () => {
    try {
      const [o, d] = await Promise.all([api.get(`/documents/${id}/optimizations/${optimizationId}`), api.get(`/documents/${id}`)]);
      setOpt(o.data.optimization);
      setDoc(d.data.document);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load this review.'));
    } finally {
      setLoading(false);
    }
  }, [id, optimizationId]);

  useEffect(() => {
    load();
  }, [load]);

  async function call(label, fn) {
    setBusy(label);
    setError('');
    try {
      await fn();
      return true;
    } catch (err) {
      setError(err?.response?.data instanceof Blob ? await downloadErrorMessage(err) : getErrorMessage(err));
      return false;
    } finally {
      setBusy('');
    }
  }

  const review = (changeId, status, editedText) =>
    call('review', async () => {
      setOpt((await api.patch(`/optimizations/${optimizationId}/changes/${changeId}`, { status, editedText })).data.optimization);
    });

  const reviewMany = (changes, status, label) =>
    call(label, async () => {
      const pending = changes.filter((c) => c.status === 'pending' || label.startsWith('section'));
      if (!pending.length) return;
      const res = await api.post(`/optimizations/${optimizationId}/review`, { changes: pending.map((c) => ({ changeId: c.changeId, status })) });
      setOpt(res.data.optimization);
    });

  const apply = () =>
    call('apply', async () => {
      const res = await api.post(`/optimizations/${optimizationId}/apply`);
      setOpt(res.data.optimization);
      setDoc(res.data.document);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

  // Group changes by the section they belong to (stored on each change).
  const groups = useMemo(() => {
    const map = new Map();
    for (const c of opt?.changes || []) {
      const key = c.sectionId || 'document';
      if (!map.has(key)) map.set(key, { sectionId: key, title: c.sectionTitle || 'Document', changes: [] });
      map.get(key).changes.push(c);
    }
    return [...map.values()];
  }, [opt]);

  const docSections = useMemo(() => buildSections(doc?.blocks || []), [doc?.blocks]);

  if (loading)
    return (
      <AppShell wide>
        <Spinner />
      </AppShell>
    );

  if (!opt || !doc)
    return (
      <AppShell wide>
        <BackLink to={`/documents/${id}`}>Back to document</BackLink>
        <div className="mt-6">
          <ErrorAlert>{error}</ErrorAlert>
        </div>
      </AppShell>
    );

  const total = opt.changes.length;
  const count = (s) => opt.changes.filter((c) => c.status === s).length;
  const pending = count('pending');
  const locked = opt.status !== 'open';
  const applied = opt.status === 'applied';

  return (
    <AppShell wide>
      <BackLink to={`/documents/${id}`}>Back to document</BackLink>

      <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm text-slate-500">{doc.title}</p>
          <h1 className="text-2xl font-semibold text-white">{applied ? 'Changes applied' : 'Review and apply changes'}</h1>
          <p className="mt-1 text-sm text-slate-400">
            {total} proposed change{total === 1 ? '' : 's'} across {groups.length} section{groups.length === 1 ? '' : 's'} ·{' '}
            <span className="text-emerald-300">{count('approved')} approved</span> · <span className="text-indigo-300">{count('edited')} edited</span> ·{' '}
            <span className="text-red-300">{count('rejected')} rejected</span> · {pending} pending
          </p>
        </div>
        <div className="inline-flex rounded-lg border border-charcoal-600 p-0.5">
          <button type="button" onClick={() => setLayout('split')} className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm ${layout === 'split' ? 'bg-charcoal-700 text-white' : 'text-slate-400'}`}>
            <Columns2 size={15} /> Side by side
          </button>
          <button type="button" onClick={() => setLayout('inline')} className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm ${layout === 'inline' ? 'bg-charcoal-700 text-white' : 'text-slate-400'}`}>
            <Rows2 size={15} /> Inline
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4">
          <ErrorAlert>{error}</ErrorAlert>
        </div>
      )}

      {applied && (
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <Section title="Download the updated document" className="border-emerald-500/30">
            <p className="mb-4 flex items-center gap-2 text-sm text-emerald-300">
              <CheckCircle2 size={16} /> Applied. Your original content is kept unchanged alongside this version.
            </p>
            <ExportPanel doc={doc} sections={docSections} optimizationId={opt.id} />
          </Section>
          <Section title="Download by section">
            <ul className="space-y-2">
              {docSections.map((s) => (
                <li key={s.sectionId} className="flex items-center gap-3 rounded-lg border border-charcoal-700 px-3 py-2">
                  <span className="min-w-0 flex-1 truncate text-sm text-slate-200">{s.title}</span>
                  <button
                    type="button"
                    className="btn-secondary px-2.5 py-1.5 text-xs"
                    disabled={!!busy}
                    onClick={() => call(`dl-${s.sectionId}`, () => downloadFile(`/documents/${id}/export`, { format: 'source', section: s.sectionId }))}
                    aria-label={`Download section ${s.title}`}
                  >
                    {busy === `dl-${s.sectionId}` ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                  </button>
                </li>
              ))}
            </ul>
            <Link to={`/documents/${id}`} className="btn-primary mt-4 w-full">
              Re-analyze the updated document
            </Link>
          </Section>
        </div>
      )}

      {total === 0 ? (
        <div className="card mt-6 px-6 py-12 text-center text-sm text-slate-400">
          No automatic changes were needed. Remaining findings (such as passive voice) are suggestions to handle by hand.
        </div>
      ) : (
        <div className="mt-6 grid gap-6 pb-28 lg:grid-cols-[15rem_minmax(0,1fr)]">
          <nav className="hidden lg:block" aria-label="Sections">
            <div className="sticky top-20 space-y-1">
              <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">Sections</p>
              {groups.map((g) => {
                const left = g.changes.filter((c) => c.status === 'pending').length;
                return (
                  <a key={g.sectionId} href={`#${g.sectionId}`} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-charcoal-800">
                    <span className="min-w-0 flex-1 truncate">{g.title}</span>
                    {left ? (
                      <span className="rounded-full bg-amber-500/15 px-2 text-[11px] text-amber-300">{left}</span>
                    ) : (
                      <CheckCircle2 size={14} className="text-emerald-400" />
                    )}
                  </a>
                );
              })}
            </div>
          </nav>

          <div className="space-y-8">
            {groups.map((g) => (
              <section key={g.sectionId} id={g.sectionId} className="scroll-mt-24">
                <div className="mb-3 flex flex-wrap items-center gap-3">
                  <h2 className="text-lg font-medium text-white">{g.title}</h2>
                  <span className="text-xs text-slate-500">
                    {g.changes.length} change{g.changes.length === 1 ? '' : 's'}
                  </span>
                  {!locked && (
                    <span className="ml-auto flex gap-2">
                      <button type="button" className="btn-secondary px-3 py-1.5 text-xs text-emerald-300" disabled={!!busy} onClick={() => reviewMany(g.changes, 'approved', `section-a-${g.sectionId}`)}>
                        <Check size={14} /> Approve section
                      </button>
                      <button type="button" className="btn-secondary px-3 py-1.5 text-xs text-red-300" disabled={!!busy} onClick={() => reviewMany(g.changes, 'rejected', `section-r-${g.sectionId}`)}>
                        <X size={14} /> Reject section
                      </button>
                    </span>
                  )}
                </div>
                <ul className="space-y-3">
                  {g.changes.map((change) => (
                    <ChangeCard key={`${change.changeId}-${change.status}`} change={change} locked={locked} onReview={review} busy={!!busy} layout={layout} />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      )}

      {!locked && total > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-charcoal-700 bg-charcoal-950/90 backdrop-blur lg:left-64">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:px-6 lg:px-8">
            <div className="flex-1">
              <p className="mb-1.5 text-xs text-slate-400">
                {total - pending} of {total} reviewed
              </p>
              <ProgressBar value={total - pending} max={total} />
            </div>
            <div className="flex flex-wrap gap-2">
              {pending > 0 && (
                <>
                  <button type="button" className="btn-secondary" disabled={!!busy} onClick={() => reviewMany(opt.changes, 'approved', 'all-a')}>
                    Approve remaining
                  </button>
                  <button type="button" className="btn-secondary" disabled={!!busy} onClick={() => reviewMany(opt.changes, 'rejected', 'all-r')}>
                    Reject remaining
                  </button>
                </>
              )}
              <button type="button" className="btn-primary" disabled={!!busy || pending > 0} onClick={apply} title={pending ? 'Review every change first' : ''}>
                {busy === 'apply' ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} Apply changes
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
