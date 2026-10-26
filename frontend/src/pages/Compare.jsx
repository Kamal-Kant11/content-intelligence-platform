import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Download, PencilLine, RefreshCw, RotateCcw, ThumbsUp, XCircle } from 'lucide-react';
import { api, downloadExport, getErrorMessage } from '../api/client.js';
import { Alert, Busy, Change, PageHeader, Score, Spinner } from '../components/ui.jsx';
import { IssueList, SourceLine } from '../components/DocumentParts.jsx';
import { DiffText } from '../components/TextViews.jsx';
import { useDocument } from '../hooks/useDocument.js';
import { countWords, formatDate, MAX_TEXT_CHARS } from '../utils/format.js';

// Where an issue (found in the saved version) is in the current draft: its original
// position if the text is still there, otherwise the nearest occurrence close by.
function locate(draft, issue) {
  if (draft.slice(issue.start, issue.end) === issue.text) return issue.start;
  if (!issue.text) return -1;
  let best = -1;
  for (let i = draft.indexOf(issue.text); i !== -1; i = draft.indexOf(issue.text, i + 1)) {
    if (Math.abs(i - issue.start) <= 300 && (best === -1 || Math.abs(i - issue.start) < Math.abs(best - issue.start))) best = i;
  }
  return best;
}

function ScoreTable({ original, optimized }) {
  const rows = [
    ['Grammar score', original.grammar.score, optimized.grammar.score, { score: true }],
    ['Grammar issues', original.grammar.issueCount, optimized.grammar.issueCount, { lowerIsBetter: true }],
    ['Readability score', original.readability.score, optimized.readability.score, { score: true }],
    ['Flesch Reading Ease (raw)', original.readability.fleschReadingEase, optimized.readability.fleschReadingEase, { digits: 1 }],
    ['Reading level', original.readability.level.label, optimized.readability.level.label, { text: true }],
    ['Word count', original.wordCount, optimized.wordCount, { neutral: true }],
    ['Sentences', original.sentenceCount, optimized.sentenceCount, { neutral: true }],
    ['Avg. sentence length', original.readability.avgSentenceLength, optimized.readability.avgSentenceLength, { lowerIsBetter: true, digits: 1 }],
  ];
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[28rem] text-sm">
        <thead>
          <tr className="border-b border-charcoal-700 text-left text-xs uppercase tracking-wide text-slate-400">
            <th className="py-2 pr-4 font-medium">Metric</th>
            <th className="py-2 pr-4 font-medium">Original</th>
            <th className="py-2 pr-4 font-medium">Optimized</th>
            <th className="py-2 font-medium">Change</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-charcoal-800">
          {rows.map(([label, before, after, opts]) => (
            <tr key={label}>
              <td className="py-2.5 pr-4 text-slate-200">{label}</td>
              <td className="py-2.5 pr-4 tabular-nums">{opts.score ? <Score value={before} /> : before}</td>
              <td className="py-2.5 pr-4 tabular-nums">{opts.score ? <Score value={after} /> : after}</td>
              <td className="py-2.5 tabular-nums">
                {opts.text ? (
                  <span className="text-slate-400">{before === after ? 'Same' : 'Changed'}</span>
                ) : opts.neutral ? (
                  <span className="text-slate-400">{after - before > 0 ? `+${after - before}` : after - before === 0 ? '±0' : `−${before - after}`}</span>
                ) : (
                  <Change before={before} after={after} lowerIsBetter={opts.lowerIsBetter} digits={opts.digits} />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Compare() {
  const { id } = useParams();
  const { doc, setDoc, loadError } = useDocument(id);
  const [edit, setEdit] = useState({ versionId: null, text: '' });
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // The editor holds edits of one saved version; when the server returns a new version,
  // the editor starts again from that version's text.
  const saved = doc?.optimized;
  const draft = saved && edit.versionId === saved.versionId ? edit.text : (saved?.text ?? '');
  const setDraft = (text) => setEdit({ versionId: saved.versionId, text });
  const dirty = !!saved && draft !== saved.text;

  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (e) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  async function act(name, request, successMessage) {
    setBusy(name);
    setError('');
    setNotice('');
    try {
      const res = await request();
      if (res?.data?.document) setDoc(res.data.document);
      if (successMessage) setNotice(successMessage);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  const saveEdits = () => act('save', () => api.put(`/documents/${id}/draft`, { text: draft }), 'Your edits were saved as a new version and analyzed again.');
  const approve = () => act('approve', () => api.patch(`/documents/${id}/review`, { action: 'approve', versionId: saved.versionId }), 'Optimized content approved.');
  const editAndApprove = () => act('edit_approve', () => api.patch(`/documents/${id}/review`, { action: 'edit_approve', text: draft }), 'Your edited version was analyzed and approved.');
  const reject = () => {
    if (!window.confirm('Reject the optimized version? The original text stays exactly as it is.')) return;
    act('reject', () => api.patch(`/documents/${id}/review`, { action: 'reject' }), 'Optimization rejected. The original text is unchanged.');
  };
  const download = (format) => act(`download-${format}`, () => downloadExport(id, format));

  function applySuggestion(issue, suggestion) {
    const at = locate(draft, issue);
    if (at === -1) return;
    setDraft(draft.slice(0, at) + suggestion + draft.slice(at + issue.text.length));
  }

  if (loadError) return <Alert>{loadError}</Alert>;
  if (!doc) return <Spinner label="Loading comparison…" />;

  if (!saved) {
    return (
      <div className="space-y-4">
        <Alert kind="info">This document has not been optimized yet.</Alert>
        <Link to={`/documents/${id}`} className="btn-secondary">
          <ArrowLeft size={16} /> Back to analysis
        </Link>
      </div>
    );
  }

  const original = doc.original.analysis;
  const optimized = saved.analysis;
  const approvedHere = doc.status === 'approved' && doc.approvedVersionId === saved.versionId && !dirty;
  const tooLong = draft.length > MAX_TEXT_CHARS;
  const empty = !countWords(draft);

  return (
    <div className="space-y-6">
      <PageHeader title={`Compare: ${doc.title}`}>
        <Link to={`/documents/${id}`} className="mb-2 inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white">
          <ArrowLeft size={14} /> Analysis
        </Link>
      </PageHeader>
      <SourceLine doc={doc} />

      <Alert>{error}</Alert>
      <Alert kind="success">{notice}</Alert>
      {saved.text === doc.original.text && saved.source === 'optimizer' && (
        <Alert kind="info">The optimizer found no safe automatic changes for this text. You can still edit the right panel yourself.</Alert>
      )}

      {/* Review status and actions */}
      <section className={`card p-5 ${approvedHere ? 'border-emerald-500/30 bg-emerald-500/[0.06]' : ''}`}>
        {approvedHere ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-2 font-medium text-emerald-300">
              <CheckCircle2 size={20} /> Approved {formatDate(doc.approvedAt)}. Downloads contain exactly this version.
            </p>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-success" onClick={() => download('txt')} disabled={!!busy}>
                <Busy busy={busy === 'download-txt'} label="Download TXT" busyLabel="Preparing…" icon={Download} />
              </button>
              <button type="button" className="btn-success" onClick={() => download('docx')} disabled={!!busy}>
                <Busy busy={busy === 'download-docx'} label="Download DOCX" busyLabel="Preparing…" icon={Download} />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="text-sm text-slate-300">
              {doc.status === 'rejected' && !dirty ? (
                <p>Optimization rejected. The original text is kept unchanged. You can still edit and approve, or optimize again from the analysis page.</p>
              ) : dirty ? (
                <p>You have unsaved edits. Use “Edit and approve”, or “Re-analyze edits” to check them first.</p>
              ) : (
                <p>Review the optimized version. Downloads are available after approval.</p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-success" onClick={approve} disabled={!!busy || dirty}>
                <Busy busy={busy === 'approve'} label="Approve optimized content" busyLabel="Approving…" icon={ThumbsUp} />
              </button>
              <button type="button" className="btn-primary" onClick={editAndApprove} disabled={!!busy || !dirty || tooLong || empty}>
                <Busy busy={busy === 'edit_approve'} label="Edit and approve" busyLabel="Analyzing and approving…" icon={PencilLine} />
              </button>
              <button type="button" className="btn-danger" onClick={reject} disabled={!!busy || doc.status === 'rejected'}>
                <Busy busy={busy === 'reject'} label="Reject optimization" busyLabel="Rejecting…" icon={XCircle} />
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Scores */}
      <section className="card p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold text-white">Scores before and after</h2>
          <p className="text-xs text-slate-400">
            Measured on the {saved.source === 'edit' ? 'version you edited' : 'optimized version'} saved {formatDate(saved.createdAt)}
            {doc.versions.length > 1 && ` · version ${doc.versions.length} of ${doc.versions.length}`}
          </p>
        </div>
        {dirty && <Alert kind="warning" className="mt-3">These scores are for the last saved version. Re-analyze to score your edits.</Alert>}
        <div className="mt-3">
          <ScoreTable original={original} optimized={optimized} />
        </div>
      </section>

      {/* Side-by-side panels */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card flex flex-col p-5">
          <h2 className="font-semibold text-white">Original</h2>
          <p className="mt-0.5 text-xs text-slate-400">
            {original.wordCount} words · <span className="rounded-sm bg-red-500/20 px-1 text-red-300 line-through">removed text</span> is highlighted
          </p>
          <DiffText before={doc.original.text} after={draft} mode="removed" className="mt-3 max-h-[30rem] flex-1 overflow-y-auto rounded-xl bg-charcoal-950/60 p-4" />
        </section>

        <section className="card flex flex-col p-5">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="font-semibold text-white">Optimized (editable)</h2>
            <span className={`text-xs ${tooLong ? 'font-medium text-red-400' : 'text-slate-400'}`}>
              {countWords(draft)} words · {draft.length.toLocaleString()} / {MAX_TEXT_CHARS.toLocaleString()} chars
            </span>
          </div>
          <label htmlFor="draft" className="sr-only">
            Optimized text
          </label>
          <textarea
            id="draft"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className={`input mt-3 min-h-[20rem] flex-1 resize-y leading-7 ${tooLong ? 'input-error' : ''}`}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="btn-secondary" onClick={saveEdits} disabled={!!busy || !dirty || tooLong || empty}>
              <Busy busy={busy === 'save'} label="Re-analyze edits" busyLabel="Analyzing…" icon={RefreshCw} />
            </button>
            <button type="button" className="btn-secondary" onClick={() => setDraft(saved.text)} disabled={!!busy || !dirty}>
              <RotateCcw size={16} /> Undo edits
            </button>
          </div>
        </section>
      </div>

      {/* Differences */}
      <section className="card p-5">
        <h2 className="font-semibold text-white">Highlighted differences</h2>
        <p className="mt-0.5 text-xs text-slate-400">
          <span className="rounded-sm bg-red-500/20 px-1 text-red-300 line-through">Removed</span> and{' '}
          <span className="rounded-sm bg-emerald-500/20 px-1 text-emerald-300">added</span> words, comparing the original with the text in the editor.
        </p>
        <DiffText before={doc.original.text} after={draft} className="mt-3 max-h-[30rem] overflow-y-auto rounded-xl bg-charcoal-950/60 p-4" />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="font-semibold text-white">Changes made by the optimizer ({saved.changes.length})</h2>
          {saved.source === 'edit' ? (
            <p className="mt-3 text-sm text-slate-400">This version was edited by you, so it has no automatic changes of its own.</p>
          ) : saved.changes.length === 0 ? (
            <p className="mt-3 text-sm text-slate-400">No automatic changes were safe to make.</p>
          ) : (
            <ol className="mt-3 max-h-[28rem] space-y-2 overflow-y-auto pr-1">
              {saved.changes.map((change, i) => (
                <li key={i} className="rounded-lg border border-charcoal-700 p-3 text-sm">
                  <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${change.type === 'grammar' ? 'bg-indigo-500/10 text-indigo-300' : 'bg-violet-500/10 text-violet-300'}`}>
                    {change.type === 'grammar' ? 'Grammar' : 'Readability'}
                  </span>
                  <p className="mt-2 break-words">
                    <del className="rounded-sm bg-red-500/20 px-0.5 text-red-300">{change.from}</del>
                    <span className="mx-1.5 text-slate-500">→</span>
                    <ins className="rounded-sm bg-emerald-500/20 px-0.5 text-emerald-300 no-underline">{change.to || '(removed)'}</ins>
                  </p>
                  <p className="mt-1 text-xs text-slate-400">{change.reason}</p>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="card p-5">
          <h2 className="font-semibold text-white">Grammar issues remaining ({optimized.grammar.issueCount})</h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Issues with several possible fixes are not changed automatically. Click a suggestion to put it into the editor, then re-analyze.
          </p>
          <div className="mt-3 max-h-[28rem] overflow-y-auto pr-1">
            <IssueList
              issues={optimized.grammar.issues}
              emptyText="No grammar issues found in the optimized version."
              renderAction={(issue) => {
                const found = locate(draft, issue) !== -1;
                return issue.suggestions.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {issue.suggestions.slice(0, 3).map((s) => (
                      <button
                        key={s}
                        type="button"
                        disabled={!found || !!busy}
                        onClick={() => applySuggestion(issue, s)}
                        title={found ? `Replace “${issue.text}” with “${s}”` : 'This text is no longer in the editor'}
                        className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-40"
                      >
                        {s || '(remove)'}
                      </button>
                    ))}
                  </div>
                ) : null;
              }}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
