import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertCircle, ExternalLink, FileText, Loader2, Plus, Trash2 } from 'lucide-react';
import AppShell from './AppShell.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api, getErrorMessage } from '../api/client.js';
import { fileTypeLabel, formatBytes, formatDate } from '../utils/format.js';

function StatusBadge({ status }) {
  return (
    <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium capitalize text-amber-300 ring-1 ring-amber-400/20">
      {status}
    </span>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [confirmId, setConfirmId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/documents');
      setDocuments(res.data.documents);
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
    setError('');
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

  const firstName = user?.name?.split(' ')[0] || 'there';

  return (
    <AppShell>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Welcome, {firstName}</h1>
          <p className="mt-1 text-sm text-slate-400">Manage the documents in your private workspace.</p>
        </div>
        <Link to="/upload" className="btn-primary">
          <Plus size={16} /> Upload Document
        </Link>
      </div>

      <h2 className="mb-3 mt-9 text-sm font-medium uppercase tracking-wide text-slate-400">My Documents</h2>

      {error && (
        <div role="alert" className="mb-4 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <span className="flex-1">{error}</span>
          <button type="button" onClick={load} className="font-medium underline">
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-400" aria-label="Loading documents" />
        </div>
      ) : documents.length === 0 && !error ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card px-6 py-14 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-300">
            <FileText size={24} />
          </span>
          <h3 className="mt-4 font-medium text-white">No documents yet</h3>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-slate-400">
            Upload your first PDF, DOCX or TXT file to get started.
          </p>
          <Link to="/upload" className="btn-primary mt-6">
            <Plus size={16} /> Upload Document
          </Link>
        </motion.div>
      ) : (
        <ul className="space-y-3">
          {documents.map((doc) => (
            <li key={doc.id} className="card p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-300">
                    <FileText size={20} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-100" title={doc.fileName}>
                      {doc.fileName}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {fileTypeLabel(doc.fileName)} · {formatBytes(doc.fileSize)} · Uploaded {formatDate(doc.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <StatusBadge status={doc.status} />
                  {confirmId === doc.id ? (
                    <div className="flex items-center gap-2">
                      <button type="button" className="btn-danger px-3 py-2" onClick={() => onDelete(doc.id)} disabled={deletingId === doc.id}>
                        {deletingId === doc.id ? <Loader2 size={14} className="animate-spin" /> : 'Confirm'}
                      </button>
                      <button type="button" className="btn-secondary px-3 py-2" onClick={() => setConfirmId(null)} disabled={deletingId === doc.id}>
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button type="button" className="btn-secondary px-3 py-2" onClick={() => navigate(`/documents/${doc.id}`)}>
                        <ExternalLink size={14} /> Open
                      </button>
                      <button type="button" className="btn-danger px-3 py-2" onClick={() => setConfirmId(doc.id)} aria-label={`Delete ${doc.fileName}`}>
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
