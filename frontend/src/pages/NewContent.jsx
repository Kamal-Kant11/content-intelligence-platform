import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileUp, Type, UploadCloud, X } from 'lucide-react';
import { api, getErrorMessage } from '../api/client.js';
import { Alert, Busy, PageHeader } from '../components/ui.jsx';
import { MAX_FILE_MB } from '../utils/format.js';

const ACCEPTED = ['.pdf', '.docx', '.txt'];
const MAX_TEXT_CHARS = 20000;

const MODES = [
  { id: 'file', label: 'Upload file', icon: FileUp },
  { id: 'text', label: 'Text', icon: Type },
];

function FileInput({ file, onPick, onClear, disabled }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          onPick(e.dataTransfer.files[0]);
        }}
        className={`flex flex-col items-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition ${
          dragging ? 'border-indigo-400 bg-indigo-500/10' : 'border-charcoal-600 bg-charcoal-950/60'
        }`}
      >
        <UploadCloud className="text-indigo-400" size={30} />
        <p className="mt-3 font-medium text-white">Drag and drop a file here</p>
        <p className="mt-1 text-sm text-slate-400">PDF, DOCX or TXT, up to {MAX_FILE_MB} MB</p>
        <button type="button" className="btn-secondary mt-4" onClick={() => inputRef.current?.click()} disabled={disabled}>
          Choose file
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED.join(',')}
          className="sr-only"
          aria-label="Choose a PDF, DOCX or TXT file"
          onChange={(e) => {
            onPick(e.target.files[0]);
            e.target.value = '';
          }}
        />
      </div>
      {file && (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-charcoal-700 px-4 py-3 text-sm">
          <span className="min-w-0 truncate font-medium text-white">{file.name}</span>
          <span className="flex shrink-0 items-center gap-3 text-slate-400">
            {(file.size / 1024).toFixed(0)} KB
            {!disabled && (
              <button type="button" onClick={onClear} aria-label="Remove file" className="text-slate-500 hover:text-red-400">
                <X size={16} />
              </button>
            )}
          </span>
        </div>
      )}
    </div>
  );
}

export default function NewContent() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('file');
  const [file, setFile] = useState(null);
  const [text, setText] = useState('');
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState('');

  const busy = progress !== null;
  const tooLong = text.length > MAX_TEXT_CHARS;
  const ready = mode === 'file' ? Boolean(file) : text.trim().length > 0 && !tooLong;

  function pick(f) {
    setError('');
    if (!f) return;
    const ext = f.name.slice(f.name.lastIndexOf('.')).toLowerCase();
    if (!ACCEPTED.includes(ext)) return setError('Only PDF, DOCX and TXT files are supported.');
    if (f.size === 0) return setError('This file is empty.');
    if (f.size > MAX_FILE_MB * 1024 * 1024) return setError(`The file is too large. The limit is ${MAX_FILE_MB} MB.`);
    setFile(f);
  }

  function chooseMode(next) {
    setError('');
    setMode(next);
  }

  async function submit(e) {
    e.preventDefault();
    if (!ready) return setError(mode === 'file' ? 'Choose a file first.' : 'Type some text first.');
    setError('');
    setProgress(0);
    const form = new FormData();
    if (mode === 'file') form.append('file', file);
    else form.append('text', text);
    try {
      await api.post('/documents/upload', form, {
        onUploadProgress: (ev) => ev.total && setProgress(Math.round((ev.loaded / ev.total) * 100)),
      });
      navigate('/documents');
    } catch (err) {
      setError(getErrorMessage(err, 'Saving failed. Please try again.'));
      setProgress(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Add content" subtitle="Choose one: upload a file or type text." />

      <div className="card">
        <div role="tablist" aria-label="Content type" className="grid grid-cols-2 gap-1 border-b border-charcoal-800 p-2">
          {MODES.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={mode === id}
              disabled={busy}
              onClick={() => chooseMode(id)}
              className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                mode === id ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-sm' : 'text-slate-300 hover:bg-charcoal-800/70'
              }`}
            >
              <Icon size={16} /> {label}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-6 p-5 sm:p-6" noValidate>
          {mode === 'file' ? (
            <FileInput file={file} onPick={pick} onClear={() => setFile(null)} disabled={busy} />
          ) : (
            <div>
              <label htmlFor="content" className="label">
                Your text
              </label>
              <textarea
                id="content"
                rows={12}
                className={`input resize-y leading-6 ${tooLong ? 'input-error' : ''}`}
                placeholder="Type or paste the text here…"
                value={text}
                disabled={busy}
                onChange={(e) => setText(e.target.value)}
              />
              <div className="mt-1.5 flex justify-end text-xs text-slate-400">
                <span className={tooLong ? 'font-medium text-red-400' : ''}>
                  {text.length.toLocaleString()} / {MAX_TEXT_CHARS.toLocaleString()} characters
                </span>
              </div>
            </div>
          )}

          <Alert>{error}</Alert>

          {busy && (
            <div>
              <div className="h-2 overflow-hidden rounded-full bg-charcoal-800" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all" style={{ width: `${progress}%` }} />
              </div>
              <p className="mt-1.5 text-xs text-slate-400">{progress < 100 ? `Saving… ${progress}%` : 'Saving…'}</p>
            </div>
          )}

          <button type="submit" className="btn-primary" disabled={busy || !ready}>
            <Busy busy={busy} label="Save document" busyLabel="Saving…" icon={mode === 'file' ? FileUp : Type} />
          </button>
        </form>
      </div>
    </div>
  );
}
