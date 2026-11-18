import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, FileText, PlusCircle } from 'lucide-react';
import { api, getErrorMessage } from '../api/client.js';
import ExtractedText from '../components/ExtractedText.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { Alert, EmptyState, PageHeader, Spinner } from '../components/ui.jsx';
import { formatBytes, formatDate } from '../utils/format.js';

const isPdf = (doc) => doc.fileName.toLowerCase().endsWith('.pdf');

export default function Portal() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState(null);
  const [error, setError] = useState('');
  const [openTextId, setOpenTextId] = useState(null);
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

  const recent = documents?.slice(0, 5) ?? [];

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Welcome, ${user?.name?.split(' ')[0] || 'there'}`}
        subtitle="Upload a PDF, DOCX or TXT file to add it to your documents."
        actions={
          <Link to="/new" className="btn-primary">
            <PlusCircle size={16} /> Upload file
          </Link>
        }
      />

      <Alert>{error}</Alert>
      {!documents && !error && <Spinner label="Loading your dashboard…" />}

      {documents && (
        <section className="card">
          <div className="flex items-center justify-between border-b border-charcoal-800 px-5 py-4">
            <h2 className="font-semibold text-white">Recent documents ({documents.length})</h2>
            {documents.length > 0 && (
              <Link to="/documents" className="text-sm font-medium text-indigo-300 hover:text-violet-300">
                View all
              </Link>
            )}
          </div>
          {recent.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No documents yet"
              text="Upload a PDF, DOCX or TXT file to add your first document."
              action={
                <Link to="/new" className="btn-primary">
                  Upload your first file
                </Link>
              }
            />
          ) : (
            <ul className="divide-y divide-charcoal-800">
              {recent.map((doc) => {
                const open = openTextId === doc.id;
                return (
                  <li key={doc.id} className="px-5 py-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-white">{doc.title}</p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {doc.hasFile ? `${doc.fileName} · ${formatBytes(doc.size)}` : 'Typed text'} · {formatDate(doc.createdAt)}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2">
                        {(isPdf(doc) || doc.hasText) && (
                          <button type="button" onClick={() => setOpenTextId(open ? null : doc.id)} className="btn-secondary">
                            Extract text
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => remove(doc)}
                          disabled={deletingId === doc.id}
                          className="btn-secondary text-red-300 hover:text-red-200"
                        >
                          {deletingId === doc.id ? 'Deleting…' : 'Delete'}
                        </button>
                        <Link to={`/documents/${doc.id}/analysis`} className="btn-secondary">
                          <BarChart3 size={15} /> Analysis
                        </Link>
                      </div>
                    </div>
                    {open && (
                      <div className="mt-4">
                        <ExtractedText docId={doc.id} fileName={doc.hasFile ? doc.fileName : ''} onClose={() => setOpenTextId(null)} />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
