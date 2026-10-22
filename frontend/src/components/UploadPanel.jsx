import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, FileText, Loader2, UploadCloud, X, AlertCircle } from 'lucide-react';
import { api, getErrorMessage } from '../api/client.js';
import { formatBytes, validateFile, fileTypeLabel } from '../utils/format.js';

// Drag-and-drop uploader. Posts to the real /api/documents/upload endpoint.
// fields: extra form fields sent with the file (title, contentType, brandId).
export default function UploadPanel({ onUploaded, fields = {} }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [uploaded, setUploaded] = useState(null);

  function selectFile(f) {
    if (!f) return;
    setUploaded(null);
    const problem = validateFile(f);
    if (problem) {
      setFile(null);
      setError(problem);
      return;
    }
    setError('');
    setProgress(0);
    setFile(f);
  }

  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    if (uploading) return;
    if (e.dataTransfer.files.length > 1) {
      setError('Please upload one file at a time.');
      return;
    }
    selectFile(e.dataTransfer.files[0]);
  }

  function removeFile() {
    if (uploading) return;
    setFile(null);
    setError('');
    setProgress(0);
    if (inputRef.current) inputRef.current.value = '';
  }

  async function upload() {
    if (!file || uploading) return;
    setUploading(true);
    setError('');
    setProgress(0);
    const form = new FormData();
    for (const [key, value] of Object.entries(fields)) if (value) form.append(key, value);
    form.append('file', file);
    try {
      const res = await api.post('/documents/upload', form, {
        onUploadProgress: (e) => {
          if (e.total) setProgress(Math.round((e.loaded / e.total) * 100));
        },
      });
      setUploaded(res.data.document);
      setFile(null);
      if (inputRef.current) inputRef.current.value = '';
      onUploaded?.(res.data.document);
    } catch (err) {
      setError(getErrorMessage(err, 'Upload failed. Please try again.'));
    } finally {
      setUploading(false);
    }
  }

  const doc = uploaded;

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`rounded-2xl border-2 border-dashed p-8 text-center transition sm:p-10 ${
          dragging
            ? 'border-indigo-400 bg-indigo-500/10'
            : 'border-charcoal-600 bg-charcoal-900/60 hover:border-charcoal-600/80'
        }`}
      >
        <UploadCloud className="mx-auto h-10 w-10 text-indigo-300" />
        <p className="mt-3 text-sm font-medium text-slate-200">Drag and drop your document here</p>
        <p className="mt-1 text-xs text-slate-400">PDF, DOCX or TXT · up to 10 MB</p>
        <button
          type="button"
          className="btn-secondary mt-5"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          Browse Files
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,.txt"
          className="sr-only"
          aria-label="Choose a document to upload"
          onChange={(e) => selectFile(e.target.files?.[0])}
        />
      </div>

      <AnimatePresence>
        {file && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="card mt-4 p-4"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-300">
                <FileText size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-100">{file.name}</p>
                <p className="text-xs text-slate-400">
                  {fileTypeLabel(file.name)} · {formatBytes(file.size)}
                </p>
              </div>
              <button
                type="button"
                onClick={removeFile}
                disabled={uploading}
                className="rounded-md p-1.5 text-slate-400 hover:bg-charcoal-700 hover:text-slate-100 disabled:opacity-50"
                aria-label="Remove selected file"
              >
                <X size={18} />
              </button>
            </div>

            {uploading && (
              <div className="mt-4">
                <div className="h-2 overflow-hidden rounded-full bg-charcoal-700">
                  <div
                    className="h-full rounded-full bg-indigo-400 transition-all"
                    style={{ width: `${progress}%` }}
                    role="progressbar"
                    aria-valuenow={progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  />
                </div>
                <p className="mt-1.5 text-xs text-slate-400">
                  {progress < 100 ? `Uploading… ${progress}%` : 'Processing document…'}
                </p>
              </div>
            )}

            <button type="button" className="btn-primary mt-4 w-full" onClick={upload} disabled={uploading}>
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Uploading…
                </>
              ) : (
                'Upload Document'
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <div role="alert" className="mt-4 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {doc && (
        <div role="status" className="mt-4 flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
          <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
          <p>
            <strong className="font-medium">{doc.source?.fileName || doc.title}</strong> uploaded successfully.
          </p>
        </div>
      )}
    </div>
  );
}
