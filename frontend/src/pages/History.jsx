import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, PlusCircle, Search } from 'lucide-react';
import { api, getErrorMessage } from '../api/client.js';
import { Alert, EmptyState, PageHeader, Spinner } from '../components/ui.jsx';
import { formatBytes, formatDate } from '../utils/format.js';

export default function History() {
  const [documents, setDocuments] = useState(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  async function remove(doc) {
    if (!window.confirm(`Delete "${doc.title}"? This cannot be undone.`)) return;
    setDeletingId(doc.id);
    try {
      await api.delete(`/documents/${doc.id}`);
      setDocuments((list) => list.filter((d) => d.id !== doc.id));
    } catch (err) {
      setError(getErrorMessage(err, 'Could not delete the document.'));
    } finally {
      setDeletingId(null);
    }
  }

  useEffect(() => {
    api
      .get('/documents')
      .then((res) => setDocuments(res.data.documents))
      .catch((err) => setError(getErrorMessage(err, 'Could not load your documents.')));
  }, []);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (documents || []).filter((d) => !q || d.title.toLowerCase().includes(q));
  }, [documents, query]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documents"
        subtitle="Every file you have uploaded."
        actions={
          <Link to="/new" className="btn-primary">
            <PlusCircle size={16} /> Upload file
          </Link>
        }
      />

      <Alert>{error}</Alert>
      {!documents && !error && <Spinner label="Loading documents…" />}

      {documents && (
        <div className="card overflow-hidden">
          {documents.length > 0 && (
            <div className="border-b border-charcoal-800 p-4">
              <label className="relative block">
                <span className="sr-only">Search by title</span>
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input className="input pl-9" placeholder="Search by title" value={query} onChange={(e) => setQuery(e.target.value)} />
              </label>
            </div>
          )}

          {documents.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No documents yet"
              text="Your uploaded files will appear here."
              action={
                <Link to="/new" className="btn-primary">
                  Upload your first file
                </Link>
              }
            />
          ) : shown.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-slate-400">No documents match your search.</p>
          ) : (
            <ul className="divide-y divide-charcoal-800">
              {shown.map((doc) => (
                <li key={doc.id} className="flex gap-3 px-5 py-4">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-charcoal-800 text-slate-300">
                    <FileText size={17} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-white">{doc.title}</p>
                    <p className="mt-0.5 truncate text-xs text-slate-400">
                      {doc.hasFile ? `${doc.fileName} · ${formatBytes(doc.size)}` : 'Typed text'} · added {formatDate(doc.createdAt)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(doc)}
                    disabled={deletingId === doc.id}
                    className="btn-secondary shrink-0 self-start text-red-300 hover:text-red-200"
                  >
                    {deletingId === doc.id ? 'Deleting…' : 'Delete'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
