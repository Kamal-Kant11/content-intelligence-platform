import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, ClipboardCheck, FileText, Gauge, Globe, Loader2, PenLine, Plus, Search, Trash2, Upload } from 'lucide-react';
import AppShell from './AppShell.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api, getErrorMessage } from '../api/client.js';
import { formatDate } from '../utils/format.js';
import { Badge, ErrorAlert, PageHeader, ScoreRing, Spinner, StatCard } from '../components/ui.jsx';

const SOURCE_ICONS = { file: Upload, url: Globe, write: PenLine, paste: FileText };
const FILTERS = [
  ['all', 'All'],
  ['draft', 'Draft'],
  ['in_review', 'In review'],
  ['approved', 'Approved'],
];

export default function Dashboard() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [deletingId, setDeletingId] = useState(null);
  const [confirmId, setConfirmId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setDocuments((await api.get('/documents')).data.documents);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load your documents.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onDelete(id) {
    setDeletingId(id);
    try {
      await api.delete(`/documents/${id}`);
      setDocuments((docs) => docs.filter((d) => d.id !== id));
      setConfirmId(null);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not delete the document.'));
    } finally {
      setDeletingId(null);
    }
  }

  const stats = useMemo(() => {
    const scored = documents.filter((d) => typeof d.lastAnalysis?.overallScore === 'number');
    const avg = scored.length ? Math.round(scored.reduce((s, d) => s + d.lastAnalysis.overallScore, 0) / scored.length) : null;
    return {
      total: documents.length,
      avg,
      scored: scored.length,
      inReview: documents.filter((d) => d.status === 'in_review').length,
      approved: documents.filter((d) => d.status === 'approved').length,
    };
  }, [documents]);

  const visible = documents.filter(
    (d) => (filter === 'all' || d.status === filter) && d.title.toLowerCase().includes(query.trim().toLowerCase())
  );
  const firstName = user?.name?.split(' ')[0] || 'there';

  return (
    <AppShell>
      <PageHeader title={`Welcome back, ${firstName}`} subtitle="Track quality scores and review progress across all your content." />

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={FileText} label="Documents" value={stats.total} hint={`${stats.scored} analyzed`} />
        <StatCard icon={Gauge} label="Average score" value={stats.avg ?? '—'} hint="across analyzed documents" tone="sky" />
        <StatCard icon={ClipboardCheck} label="In review" value={stats.inReview} hint="changes waiting for you" tone="amber" />
        <StatCard icon={CheckCircle2} label="Approved" value={stats.approved} hint="changes applied" tone="emerald" />
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:w-72">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input className="input pl-9" placeholder="Search documents" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search documents" />
        </div>
        <div className="flex gap-1 overflow-x-auto rounded-xl border border-charcoal-700 bg-charcoal-900/80 p-1">
          {FILTERS.map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm ${filter === id ? 'bg-charcoal-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mt-4">
          <ErrorAlert onRetry={load}>{error}</ErrorAlert>
        </div>
      )}

      {loading ? (
        <Spinner label="Loading documents" />
      ) : documents.length === 0 && !error ? (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card mt-6 px-6 py-16 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-300">
            <FileText size={26} />
          </span>
          <h3 className="mt-4 text-lg font-medium text-white">Add your first piece of content</h3>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-400">
            Write or paste text, upload a PDF, DOCX or TXT file, or import a web page. You get a section-by-section quality report in seconds.
          </p>
          <Link to="/documents/new" className="btn-primary mt-6">
            <Plus size={16} /> New content
          </Link>
        </motion.div>
      ) : (
        <div className="card mt-4 overflow-hidden">
          <div className="hidden grid-cols-[minmax(0,1fr)_7rem_7rem_8rem_5.5rem] gap-4 border-b border-charcoal-700 px-5 py-3 text-xs uppercase tracking-wide text-slate-500 md:grid">
            <span>Document</span>
            <span>Score</span>
            <span>Status</span>
            <span>Created</span>
            <span />
          </div>
          {visible.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-slate-400">No documents match.</p>
          ) : (
            <ul className="divide-y divide-charcoal-800">
              {visible.map((doc) => {
                const Icon = SOURCE_ICONS[doc.sourceType] || FileText;
                return (
                  <li key={doc.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-4 transition hover:bg-charcoal-800/40 md:grid-cols-[minmax(0,1fr)_7rem_7rem_8rem_5.5rem]">
                    <Link to={`/documents/${doc.id}`} className="flex min-w-0 items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-300">
                        <Icon size={19} />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-slate-100">{doc.title}</span>
                        <span className="block truncate text-xs capitalize text-slate-500">
                          {doc.contentType} · {doc.wordCount} words · {doc.source?.fileName || doc.sourceType}
                        </span>
                      </span>
                    </Link>
                    <div className="hidden md:block">
                      <ScoreRing score={doc.lastAnalysis?.overallScore} size={40} stroke={4} />
                    </div>
                    <div className="hidden md:block">
                      <Badge value={doc.status} />
                    </div>
                    <span className="hidden text-sm text-slate-400 md:block">{formatDate(doc.createdAt)}</span>
                    <div className="flex items-center justify-end gap-2">
                      <span className="md:hidden">
                        <ScoreRing score={doc.lastAnalysis?.overallScore} size={40} stroke={4} />
                      </span>
                      {confirmId === doc.id ? (
                        <>
                          <button type="button" className="btn-danger px-2.5 py-1.5 text-xs" onClick={() => onDelete(doc.id)} disabled={deletingId === doc.id}>
                            {deletingId === doc.id ? <Loader2 size={14} className="animate-spin" /> : 'Delete'}
                          </button>
                          <button type="button" className="btn-secondary px-2.5 py-1.5 text-xs" onClick={() => setConfirmId(null)}>
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="rounded-lg p-2 text-slate-500 hover:bg-red-500/10 hover:text-red-300"
                          onClick={() => setConfirmId(doc.id)}
                          aria-label={`Delete ${doc.title}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </AppShell>
  );
}
