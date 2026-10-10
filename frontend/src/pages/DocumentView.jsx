import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Info, Loader2 } from 'lucide-react';
import AppShell from './AppShell.jsx';
import { api, getErrorMessage } from '../api/client.js';
import { fileTypeLabel, formatBytes, formatDateTime } from '../utils/format.js';

function Meta({ label, children }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 break-words text-sm text-slate-200">{children}</dd>
    </div>
  );
}

export default function DocumentView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api
      .get(`/documents/${id}`)
      .then((res) => active && setDoc(res.data.document))
      .catch((err) => {
        if (!active) return;
        if (err?.response?.status === 404) setNotFound(true);
        else setError(getErrorMessage(err, 'Could not load this document.'));
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id]);

  async function onDelete() {
    setDeleting(true);
    setError('');
    try {
      await api.delete(`/documents/${id}`);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, 'Could not delete the document.'));
      setDeleting(false);
    }
  }

  return (
    <AppShell>
      <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200">
        <ArrowLeft size={16} /> Back to dashboard
      </Link>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-400" aria-label="Loading document" />
        </div>
      ) : notFound ? (
        <div className="card mt-6 px-6 py-14 text-center">
          <h1 className="text-lg font-medium text-white">Document not found</h1>
          <p className="mt-1.5 text-sm text-slate-400">It may have been deleted, or it doesn't belong to your account.</p>
          <Link to="/dashboard" className="btn-primary mt-6">
            Back to My Documents
          </Link>
        </div>
      ) : !doc ? (
        <div role="alert" className="mt-6 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          {error}
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <h1 className="break-words text-2xl font-semibold text-white">{doc.title}</h1>
            <span className="inline-flex w-fit shrink-0 items-center rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium capitalize text-amber-300 ring-1 ring-amber-400/20">
              {doc.status}
            </span>
          </div>

          {error && (
            <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <section className="card p-5">
            <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <Meta label="File name">{doc.fileName}</Meta>
              <Meta label="File type">{fileTypeLabel(doc.fileName)}</Meta>
              <Meta label="Size">{formatBytes(doc.fileSize)}</Meta>
              <Meta label="Uploaded">{formatDateTime(doc.createdAt)}</Meta>
            </dl>
          </section>

          <section className="card p-5">
            <h2 className="text-sm font-medium uppercase tracking-wide text-slate-400">Extracted text</h2>
            {doc.originalContent ? (
              <pre className="mt-3 max-h-[28rem] overflow-auto whitespace-pre-wrap break-words rounded-lg bg-charcoal-950/70 p-4 font-sans text-sm leading-relaxed text-slate-300">
                {doc.originalContent}
              </pre>
            ) : (
              <p className="mt-3 flex items-start gap-2 text-sm text-amber-300">
                <Info size={18} className="mt-0.5 shrink-0" />
                No text could be extracted from this document (it may be scanned, empty or protected).
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-indigo-400/20 bg-indigo-500/5 p-5">
            <p className="flex items-center gap-2 text-sm text-indigo-200">
              <Info size={18} className="shrink-0" />
              Content analysis will be available in a future phase.
            </p>
          </section>

          <div className="flex justify-end">
            {confirming ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-400">Delete this document?</span>
                <button type="button" className="btn-danger" onClick={onDelete} disabled={deleting}>
                  {deleting ? <Loader2 size={14} className="animate-spin" /> : 'Confirm'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setConfirming(false)} disabled={deleting}>
                  Cancel
                </button>
              </div>
            ) : (
              <button type="button" className="btn-danger" onClick={() => setConfirming(true)}>
                Delete Document
              </button>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}
