import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileUp, Globe, Type, UploadCloud, X } from 'lucide-react';
import { api, getErrorMessage } from '../api/client.js';
import { Alert, Busy, PageHeader } from '../components/ui.jsx';
import { countWords, MAX_FILE_MB, MAX_TEXT_CHARS } from '../utils/format.js';

const TABS = [
  { id: 'file', label: 'Upload File', icon: FileUp },
  { id: 'url', label: 'Website URL', icon: Globe },
  { id: 'text', label: 'Paste Text', icon: Type },
];

const ACCEPTED = ['.pdf', '.docx', '.txt'];

function TitleField({ value, onChange, hint }) {
  return (
    <div>
      <label htmlFor="title" className="label">
        Title <span className="font-normal text-slate-500">(optional)</span>
      </label>
      <input id="title" className="input" maxLength={200} value={value} onChange={(e) => onChange(e.target.value)} placeholder={hint} />
    </div>
  );
}

function UploadTab({ onCreated }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState('');

  function pick(f) {
    setError('');
    if (!f) return;
    const ext = f.name.slice(f.name.lastIndexOf('.')).toLowerCase();
    if (!ACCEPTED.includes(ext)) return setError('Only PDF, DOCX and TXT files are supported.');
    if (f.size === 0) return setError('This file is empty.');
    if (f.size > MAX_FILE_MB * 1024 * 1024) return setError(`The file is too large. The limit is ${MAX_FILE_MB} MB.`);
    setFile(f);
  }

  async function submit(e) {
    e.preventDefault();
    if (!file) return setError('Choose a file first.');
    setError('');
    setProgress(0);
    const form = new FormData();
    form.append('file', file);
    if (title.trim()) form.append('title', title.trim());
    try {
      const res = await api.post('/documents/upload', form, {
        onUploadProgress: (ev) => ev.total && setProgress(Math.round((ev.loaded / ev.total) * 100)),
      });
      onCreated(res.data.document);
    } catch (err) {
      setError(getErrorMessage(err, 'Upload failed. Please try again.'));
      setProgress(null);
    }
  }

  const busy = progress !== null;
  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          pick(e.dataTransfer.files[0]);
        }}
        className={`flex flex-col items-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition ${
          dragging ? 'border-indigo-400 bg-indigo-500/10' : 'border-charcoal-600 bg-charcoal-950/60'
        }`}
      >
        <UploadCloud className="text-indigo-400" size={32} />
        <p className="mt-3 font-medium text-white">Drag and drop a file here</p>
        <p className="mt-1 text-sm text-slate-400">PDF, DOCX or TXT, up to {MAX_FILE_MB} MB</p>
        <button type="button" className="btn-secondary mt-4" onClick={() => inputRef.current?.click()} disabled={busy}>
          Choose file
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED.join(',')}
          className="sr-only"
          aria-label="Choose a PDF, DOCX or TXT file"
          onChange={(e) => {
            pick(e.target.files[0]);
            e.target.value = '';
          }}
        />
      </div>

      {file && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-charcoal-700 px-4 py-3 text-sm">
          <span className="min-w-0 truncate font-medium text-white">{file.name}</span>
          <span className="flex shrink-0 items-center gap-3 text-slate-400">
            {(file.size / 1024).toFixed(0)} KB
            {!busy && (
              <button type="button" onClick={() => setFile(null)} aria-label="Remove file" className="text-slate-500 hover:text-red-400">
                <X size={16} />
              </button>
            )}
          </span>
        </div>
      )}

      <TitleField value={title} onChange={setTitle} hint="Defaults to the file name" />
      <Alert>{error}</Alert>

      {busy && (
        <div>
          <div className="h-2 overflow-hidden rounded-full bg-charcoal-800" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-1.5 text-xs text-slate-400">{progress < 100 ? `Uploading… ${progress}%` : 'Extracting text…'}</p>
        </div>
      )}

      <button type="submit" className="btn-primary" disabled={busy || !file}>
        <Busy busy={busy} label="Upload and extract text" busyLabel="Working…" icon={FileUp} />
      </button>
    </form>
  );
}

function UrlTab({ onCreated }) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setError('');
    let parsed;
    try {
      parsed = new URL(url.trim());
    } catch {
      return setError('Enter a full URL, including http:// or https://.');
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) return setError('Only http:// and https:// URLs are supported.');

    setBusy(true);
    try {
      const res = await api.post('/documents/from-url', { url: parsed.toString(), title: title.trim() || undefined });
      onCreated(res.data.document);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not fetch that page.'));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <div>
        <label htmlFor="url" className="label">
          Website URL
        </label>
        <input id="url" type="url" inputMode="url" className="input" placeholder="https://example.com/blog/post" value={url} onChange={(e) => setUrl(e.target.value)} />
        <p className="mt-1.5 text-xs text-slate-400">
          Public pages only. Pages behind a login or paywall, and private network addresses, are not supported.
        </p>
      </div>
      <TitleField value={title} onChange={setTitle} hint="Defaults to the page title" />
      <Alert>{error}</Alert>
      <button type="submit" className="btn-primary" disabled={busy || !url.trim()}>
        <Busy busy={busy} label="Fetch page text" busyLabel="Fetching page…" icon={Globe} />
      </button>
    </form>
  );
}

function TextTab({ onCreated }) {
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const tooLong = text.length > MAX_TEXT_CHARS;

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!countWords(text)) return setError('Paste or type some text first.');
    if (tooLong) return setError(`The text is too long. The limit is ${MAX_TEXT_CHARS.toLocaleString()} characters.`);
    setBusy(true);
    try {
      const res = await api.post('/documents/from-text', { text, title: title.trim() || undefined });
      onCreated(res.data.document);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save the text.'));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <TitleField value={title} onChange={setTitle} hint="Defaults to the first few words" />
      <div>
        <label htmlFor="content" className="label">
          Your content
        </label>
        <textarea
          id="content"
          rows={12}
          className={`input resize-y leading-6 ${tooLong ? 'input-error' : ''}`}
          placeholder="Paste or type the text you want to check…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="mt-1.5 flex justify-between text-xs text-slate-400">
          <span>{countWords(text).toLocaleString()} words</span>
          <span className={tooLong ? 'font-medium text-red-400' : ''}>
            {text.length.toLocaleString()} / {MAX_TEXT_CHARS.toLocaleString()} characters
          </span>
        </div>
      </div>
      <Alert>{error}</Alert>
      <button type="submit" className="btn-primary" disabled={busy || !text.trim() || tooLong}>
        <Busy busy={busy} label="Continue" busyLabel="Saving…" icon={Type} />
      </button>
    </form>
  );
}

// One page, three ways in. Every tab creates a document and opens its preview,
// where the same analysis pipeline runs.
export default function NewContent() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('file');
  const onCreated = (doc) => navigate(`/documents/${doc.id}`);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="New content analysis" subtitle="Add your content, check the extracted text, then run the grammar and readability analysis." />

      <div className="card">
        <div role="tablist" aria-label="Content input method" className="grid grid-cols-3 gap-1 border-b border-charcoal-800 p-2">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              role="tab"
              id={`tab-${id}`}
              aria-selected={tab === id}
              aria-controls={`panel-${id}`}
              onClick={() => setTab(id)}
              className={`flex items-center justify-center gap-2 rounded-lg px-2 py-2.5 text-sm font-medium transition ${
                tab === id ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-sm' : 'text-slate-300 hover:bg-charcoal-800/70'
              }`}
            >
              <Icon size={16} className="hidden sm:block" /> {label}
            </button>
          ))}
        </div>
        <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="p-5 sm:p-6">
          {tab === 'file' && <UploadTab onCreated={onCreated} />}
          {tab === 'url' && <UrlTab onCreated={onCreated} />}
          {tab === 'text' && <TextTab onCreated={onCreated} />}
        </div>
      </div>
    </div>
  );
}
