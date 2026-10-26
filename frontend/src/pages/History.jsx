import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Globe, PlusCircle, Search, Type } from 'lucide-react';
import { api, getErrorMessage } from '../api/client.js';
import { Alert, EmptyState, PageHeader, Score, Spinner, StatusBadge } from '../components/ui.jsx';
import { formatDate, SOURCE_LABEL, STATUS } from '../utils/format.js';

const SOURCE_ICON = { file: FileText, url: Globe, text: Type };

// Original score → optimized score (when there is one).
function ScorePair({ before, after }) {
  return (
    <span className="tabular-nums">
      <Score value={before} />
      {after !== null && after !== undefined && (
        <>
          <span className="mx-1 text-slate-500">→</span>
          <Score value={after} />
        </>
      )}
    </span>
  );
}

export default function History() {
  const [documents, setDocuments] = useState(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');

  useEffect(() => {
    api
      .get('/documents')
      .then((res) => setDocuments(res.data.documents))
      .catch((err) => setError(getErrorMessage(err, 'Could not load your documents.')));
  }, []);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (documents || []).filter((d) => (status === 'all' || d.status === status) && (!q || d.title.toLowerCase().includes(q)));
  }, [documents, query, status]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Document history"
        subtitle="Every document you have added. Open one to see its analysis, comparison and downloads."
        actions={
          <Link to="/new" className="btn-primary">
            <PlusCircle size={16} /> New analysis
          </Link>
        }
      />

      <Alert>{error}</Alert>
      {!documents && !error && <Spinner label="Loading documents…" />}

      {documents && (
        <div className="card overflow-hidden">
          {documents.length > 0 && (
            <div className="flex flex-col gap-3 border-b border-charcoal-800 p-4 sm:flex-row">
              <label className="relative flex-1">
                <span className="sr-only">Search by title</span>
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input className="input pl-9" placeholder="Search by title" value={query} onChange={(e) => setQuery(e.target.value)} />
              </label>
              <label className="sm:w-52">
                <span className="sr-only">Filter by status</span>
                <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="all">All statuses</option>
                  {Object.entries(STATUS).map(([value, { label }]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          {documents.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No documents yet"
              text="Your analyzed documents will appear here."
              action={
                <Link to="/new" className="btn-primary">
                  Start your first analysis
                </Link>
              }
            />
          ) : shown.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-slate-400">No documents match your search.</p>
          ) : (
            <ul className="divide-y divide-charcoal-800">
              {shown.map((doc) => {
                const Icon = SOURCE_ICON[doc.sourceType];
                return (
                  <li key={doc.id}>
                    <Link to={`/documents/${doc.id}`} className="grid gap-3 px-5 py-4 transition hover:bg-charcoal-800/70 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                      <div className="flex min-w-0 gap-3">
                        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-charcoal-800 text-slate-300">
                          <Icon size={17} />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-white">{doc.title}</p>
                          <p className="mt-0.5 truncate text-xs text-slate-400">
                            {SOURCE_LABEL[doc.sourceType]}
                            {doc.sourceName && ` · ${doc.sourceName}`} · updated {formatDate(doc.updatedAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-400 md:justify-end">
                        <span>
                          Grammar <ScorePair before={doc.scores.originalGrammar} after={doc.scores.optimizedGrammar} />
                        </span>
                        <span>
                          Readability <ScorePair before={doc.scores.originalReadability} after={doc.scores.optimizedReadability} />
                        </span>
                        <StatusBadge status={doc.status} />
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
