import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CheckCircle2,
  ClipboardPaste,
  File as FileIcon,
  FileText,
  Globe,
  Heading1,
  Heading2,
  List,
  Loader2,
  PenLine,
  Quote,
  ScanSearch,
  Sparkles,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';
import AppShell from './AppShell.jsx';
import { api, getErrorMessage } from '../api/client.js';
import { ErrorAlert, PageHeader, ProgressBar } from '../components/ui.jsx';
import { formatBytes, validateFile } from '../utils/format.js';
import { buildSections, countWords, previewBlocks } from '../utils/sections.js';

const METHODS = [
  { id: 'write', label: 'Write', icon: PenLine, text: 'Draft in the editor with headings, lists and quotes.' },
  { id: 'paste', label: 'Paste', icon: ClipboardPaste, text: 'Paste text from an email, doc or CMS.' },
  { id: 'file', label: 'Upload file', icon: UploadCloud, text: 'PDF, DOCX or TXT up to 10 MB.' },
  { id: 'url', label: 'Web page', icon: Globe, text: 'Import the main text of a public page.' },
];

const CONTENT_TYPES = [
  ['general', 'General'],
  ['article', 'Article'],
  ['blog', 'Blog post'],
  ['marketing', 'Marketing'],
  ['email', 'Email'],
];

const TYPE_STYLES = {
  heading: 'bg-violet-500/15 text-violet-300',
  paragraph: 'bg-sky-500/10 text-sky-300',
  list: 'bg-emerald-500/10 text-emerald-300',
  quote: 'bg-amber-500/10 text-amber-300',
};

function Steps({ step }) {
  const steps = ['Choose source', 'Add content', 'Details', 'Analyze'];
  return (
    <ol className="flex flex-wrap items-center gap-2 text-xs">
      {steps.map((label, i) => (
        <li key={label} className="flex items-center gap-2">
          <span
            className={`flex h-6 w-6 items-center justify-center rounded-full font-semibold ${
              i < step ? 'bg-emerald-500/20 text-emerald-300' : i === step ? 'bg-indigo-500 text-white' : 'bg-charcoal-700 text-slate-400'
            }`}
          >
            {i < step ? <CheckCircle2 size={14} /> : i + 1}
          </span>
          <span className={i === step ? 'text-slate-200' : 'text-slate-500'}>{label}</span>
          {i < steps.length - 1 && <span className="mx-1 h-px w-6 bg-charcoal-600" />}
        </li>
      ))}
    </ol>
  );
}

function Editor({ value, onChange, mode }) {
  const ref = useRef(null);

  function insert(prefix) {
    const el = ref.current;
    const start = el.selectionStart;
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    const next = value.slice(0, lineStart) + prefix + value.slice(lineStart);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = start + prefix.length;
    });
  }

  async function pasteClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      if (text) onChange(value ? `${value}\n\n${text}` : text);
    } catch {
      ref.current?.focus();
    }
  }

  const tools = [
    { icon: Heading1, label: 'Heading', prefix: '# ' },
    { icon: Heading2, label: 'Subheading', prefix: '## ' },
    { icon: List, label: 'List item', prefix: '- ' },
    { icon: Quote, label: 'Quote', prefix: '> ' },
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-charcoal-600 bg-charcoal-900 focus-within:border-indigo-400">
      <div className="flex flex-wrap items-center gap-1 border-b border-charcoal-700 px-2 py-1.5">
        {tools.map(({ icon: Icon, label, prefix }) => (
          <button
            key={label}
            type="button"
            onClick={() => insert(prefix)}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-slate-400 hover:bg-charcoal-700 hover:text-slate-100"
            title={`Insert ${label.toLowerCase()}`}
          >
            <Icon size={14} /> <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
        <span className="mx-1 h-4 w-px bg-charcoal-600" />
        {mode === 'paste' && (
          <button type="button" onClick={pasteClipboard} className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-indigo-300 hover:bg-charcoal-700">
            <ClipboardPaste size={14} /> Paste from clipboard
          </button>
        )}
        {value && (
          <button type="button" onClick={() => onChange('')} className="ml-auto inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-slate-500 hover:text-red-300">
            <Trash2 size={14} /> Clear
          </button>
        )}
      </div>
      <textarea
        ref={ref}
        id="content"
        aria-label="Content"
        className="block min-h-[22rem] w-full resize-y bg-transparent px-4 py-3 font-mono text-[13px] leading-relaxed text-slate-100 placeholder-slate-600 focus:outline-none"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={'# Product launch\n\nStart with a short introduction paragraph.\n\n## Why it matters\n\nExplain the benefit in plain words.\n\n- First key point\n- Second key point\n\n> A quote from a customer.'}
      />
    </div>
  );
}

function Dropzone({ file, onFile, progress, uploading }) {
  const input = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');

  function pick(f) {
    if (!f) return;
    const problem = validateFile(f);
    setError(problem || '');
    onFile(problem ? null : f);
  }

  const ext = file?.name.split('.').pop()?.toUpperCase();

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
          if (uploading) return;
          if (e.dataTransfer.files.length > 1) return setError('Please upload one file at a time.');
          pick(e.dataTransfer.files[0]);
        }}
        className={`relative flex min-h-[20rem] flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition ${
          dragging ? 'border-indigo-400 bg-indigo-500/10' : 'border-charcoal-600 bg-charcoal-900/60'
        }`}
      >
        <motion.span
          animate={{ y: dragging ? -6 : 0 }}
          className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/30 to-violet-500/20 text-indigo-200 ring-1 ring-indigo-400/30"
        >
          <UploadCloud size={30} />
        </motion.span>
        <p className="mt-4 text-base font-medium text-white">{dragging ? 'Drop it here' : 'Drag and drop your document'}</p>
        <p className="mt-1 text-sm text-slate-400">or</p>
        <button type="button" className="btn-secondary mt-3" onClick={() => input.current?.click()} disabled={uploading}>
          Browse files
        </button>
        <div className="mt-6 flex flex-wrap justify-center gap-2 text-xs">
          {['PDF', 'DOCX', 'TXT'].map((t) => (
            <span key={t} className="rounded-md border border-charcoal-600 px-2 py-0.5 text-slate-400">
              {t}
            </span>
          ))}
          <span className="rounded-md border border-charcoal-600 px-2 py-0.5 text-slate-400">max 10 MB</span>
        </div>
        <input ref={input} type="file" accept=".pdf,.docx,.txt" className="sr-only" aria-label="Choose a document" onChange={(e) => pick(e.target.files?.[0])} />
      </div>

      <AnimatePresence>
        {file && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-4 rounded-xl border border-charcoal-700 bg-charcoal-900 p-4">
            <div className="flex items-center gap-3">
              <span className="relative flex h-12 w-10 shrink-0 items-center justify-center rounded-md bg-indigo-500/15 text-indigo-300">
                <FileIcon size={22} />
                <span className="absolute -bottom-1.5 rounded bg-indigo-500 px-1 text-[9px] font-bold text-white">{ext}</span>
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-100">{file.name}</p>
                <p className="text-xs text-slate-400">
                  {formatBytes(file.size)} · {uploading ? (progress < 100 ? `Uploading ${progress}%` : 'Extracting text…') : 'Ready to upload'}
                </p>
              </div>
              {!uploading && (
                <button type="button" onClick={() => onFile(null)} className="rounded-md p-1.5 text-slate-400 hover:bg-charcoal-700 hover:text-white" aria-label="Remove file">
                  <X size={18} />
                </button>
              )}
            </div>
            {uploading && <ProgressBar value={progress} max={100} className="mt-3" />}
          </motion.div>
        )}
      </AnimatePresence>
      {error && (
        <div className="mt-3">
          <ErrorAlert>{error}</ErrorAlert>
        </div>
      )}
    </div>
  );
}

function StructurePreview({ text }) {
  const blocks = useMemo(() => previewBlocks(text), [text]);
  const sections = useMemo(() => buildSections(blocks.map((b, i) => ({ ...b, position: i, blockId: i }))), [blocks]);
  if (!blocks.length) return null;
  return (
    <div className="card p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-medium uppercase tracking-wide text-slate-400">Structure preview</h3>
        <p className="text-xs text-slate-500">
          {sections.length} section{sections.length === 1 ? '' : 's'} · {blocks.length} block{blocks.length === 1 ? '' : 's'}
        </p>
      </div>
      <div className="space-y-3">
        {sections.map((s) => (
          <div key={s.sectionId} className="rounded-lg border border-charcoal-700 p-3">
            <p className="mb-2 text-xs font-medium text-slate-300">{s.title}</p>
            <div className="space-y-1.5">
              {s.blocks.map((b) => (
                <div key={b.blockId} className="flex items-start gap-2 text-xs">
                  <span className={`w-16 shrink-0 rounded px-1.5 py-0.5 text-center capitalize ${TYPE_STYLES[b.type]}`}>{b.type}</span>
                  <span className="line-clamp-2 text-slate-400">{b.text.replace(/\n/g, ' · ')}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function NewDocument() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const method = METHODS.some((m) => m.id === params.get('tab')) ? params.get('tab') : null;

  const [title, setTitle] = useState('');
  const [contentType, setContentType] = useState('general');
  const [brandId, setBrandId] = useState('');
  const [content, setContent] = useState('');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState(null);
  const [analyzeAfter, setAnalyzeAfter] = useState(true);
  const [brands, setBrands] = useState([]);
  const [phase, setPhase] = useState(''); // '', 'saving', 'analyzing'
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/brands')
      .then((res) => setBrands(res.data.brands))
      .catch(() => setBrands([]));
  }, []);

  const hasInput = method === 'file' ? !!file : method === 'url' ? !!url.trim() : !!content.trim();
  const step = !method ? 0 : !hasInput ? 1 : 2;
  const words = countWords(content);

  async function submit() {
    setError('');
    if (!hasInput) return setError(method === 'file' ? 'Choose a file first.' : method === 'url' ? 'Enter a URL.' : 'Add some content first.');
    if ((method === 'write' || method === 'paste') && !title.trim()) return setError('Give the content a title.');

    setPhase('saving');
    setProgress(0);
    try {
      let doc;
      if (method === 'file') {
        const form = new FormData();
        if (title) form.append('title', title);
        form.append('contentType', contentType);
        if (brandId) form.append('brandId', brandId);
        form.append('file', file);
        doc = (
          await api.post('/documents/upload', form, {
            onUploadProgress: (e) => e.total && setProgress(Math.round((e.loaded / e.total) * 100)),
          })
        ).data.document;
      } else {
        doc = (
          await api.post('/documents', {
            title,
            contentType,
            brandId: brandId || undefined,
            sourceType: method,
            ...(method === 'url' ? { url } : { content }),
          })
        ).data.document;
      }
      if (analyzeAfter && doc.blocks?.length) {
        setPhase('analyzing');
        await api.post(`/documents/${doc.id}/analyze`, {});
      }
      navigate(`/documents/${doc.id}`);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not create the document.'));
      setPhase('');
    }
  }

  return (
    <AppShell wide>
      <PageHeader title="Add content" subtitle="Every input becomes the same structured document: sections and blocks you can analyze and review.">
        <Steps step={step} />
      </PageHeader>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {METHODS.map(({ id, label, icon: Icon, text }) => (
          <button
            key={id}
            type="button"
            onClick={() => setParams({ tab: id }, { replace: true })}
            aria-pressed={method === id}
            className={`group rounded-2xl border p-4 text-left transition ${
              method === id ? 'border-indigo-400 bg-indigo-500/10 shadow-lg shadow-indigo-500/10' : 'border-charcoal-700 bg-charcoal-900/80 hover:border-charcoal-500'
            }`}
          >
            <span
              className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                method === id ? 'bg-indigo-500 text-white' : 'bg-charcoal-800 text-slate-300 group-hover:text-white'
              }`}
            >
              <Icon size={19} />
            </span>
            <p className="mt-3 text-sm font-medium text-white">{label}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{text}</p>
          </button>
        ))}
      </div>

      {!method ? (
        <div className="card mt-6 flex flex-col items-center px-6 py-14 text-center">
          <Sparkles className="text-indigo-300" />
          <p className="mt-3 text-sm text-slate-400">Choose how you want to add content to get started.</p>
        </div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-6">
            {method === 'file' ? (
              <Dropzone file={file} onFile={setFile} progress={progress} uploading={phase === 'saving'} />
            ) : method === 'url' ? (
              <div className="card p-6">
                <label htmlFor="url" className="mb-1.5 block text-sm font-medium text-slate-300">
                  Web page URL
                </label>
                <div className="relative">
                  <Globe size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input id="url" type="url" className="input pl-9" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/blog/launch" />
                </div>
                <ul className="mt-5 grid gap-3 text-sm text-slate-400 sm:grid-cols-3">
                  <li className="rounded-xl border border-charcoal-700 p-3">
                    <p className="font-medium text-slate-200">Main text only</p>
                    <p className="mt-1 text-xs">Navigation, footers and scripts are removed.</p>
                  </li>
                  <li className="rounded-xl border border-charcoal-700 p-3">
                    <p className="font-medium text-slate-200">Structure kept</p>
                    <p className="mt-1 text-xs">Headings, lists and quotes become blocks.</p>
                  </li>
                  <li className="rounded-xl border border-charcoal-700 p-3">
                    <p className="font-medium text-slate-200">Public pages</p>
                    <p className="mt-1 text-xs">Pages behind a login can't be fetched.</p>
                  </li>
                </ul>
              </div>
            ) : (
              <>
                <Editor value={content} onChange={setContent} mode={method} />
                <p className="-mt-3 text-right text-xs text-slate-500">
                  {words} words · {content.length.toLocaleString()} characters
                </p>
                <StructurePreview text={content} />
              </>
            )}
          </div>

          <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
            <div className="card space-y-4 p-5">
              <h3 className="text-sm font-medium uppercase tracking-wide text-slate-400">Details</h3>
              <div>
                <label htmlFor="title" className="mb-1.5 block text-sm font-medium text-slate-300">
                  Title {method === 'file' || method === 'url' ? <span className="text-slate-500">(optional)</span> : null}
                </label>
                <input
                  id="title"
                  className="input"
                  value={title}
                  maxLength={200}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={method === 'file' ? 'Defaults to the file name' : method === 'url' ? 'Defaults to the page title' : 'Spring product launch'}
                />
              </div>
              <div>
                <p className="mb-1.5 text-sm font-medium text-slate-300">Content type</p>
                <div className="flex flex-wrap gap-1.5">
                  {CONTENT_TYPES.map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setContentType(id)}
                      className={`rounded-lg border px-2.5 py-1 text-xs transition ${
                        contentType === id ? 'border-indigo-400 bg-indigo-500/15 text-white' : 'border-charcoal-600 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label htmlFor="brand" className="mb-1.5 block text-sm font-medium text-slate-300">
                  Brand
                </label>
                <select id="brand" className="input" value={brandId} onChange={(e) => setBrandId(e.target.value)}>
                  <option value="">None: content quality only</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
                {brands.length === 0 && (
                  <p className="mt-1.5 text-xs text-slate-500">
                    <Link to="/brands" className="text-indigo-300 hover:text-indigo-200">
                      Create a brand
                    </Link>{' '}
                    to check voice, rules and claims too.
                  </p>
                )}
              </div>
              <label className="flex items-start gap-2.5 rounded-lg border border-charcoal-700 p-3 text-sm text-slate-300">
                <input type="checkbox" className="mt-0.5" checked={analyzeAfter} onChange={(e) => setAnalyzeAfter(e.target.checked)} />
                <span>
                  Analyze right away
                  <span className="block text-xs text-slate-500">Open the document with its score and section report ready.</span>
                </span>
              </label>

              <ErrorAlert>{error}</ErrorAlert>

              <button type="button" className="btn-primary w-full py-3" onClick={submit} disabled={!!phase}>
                {phase ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    {phase === 'analyzing' ? 'Analyzing…' : method === 'url' ? 'Fetching page…' : method === 'file' ? 'Uploading…' : 'Saving…'}
                  </>
                ) : (
                  <>
                    {analyzeAfter ? <ScanSearch size={16} /> : <FileText size={16} />} {analyzeAfter ? 'Create and analyze' : 'Create document'}
                  </>
                )}
              </button>
            </div>

            <div className="card p-5">
              <h3 className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-400">What happens next</h3>
              <ol className="space-y-3 text-sm">
                {[
                  ['Extract', 'Text is read from the file, page or editor.'],
                  ['Normalize', 'Spacing and line breaks are cleaned up.'],
                  ['Sections & blocks', 'Headings start sections; paragraphs, lists and quotes become blocks.'],
                  ['Analyze', 'Grammar, readability, structure, vocabulary and brand checks, scored per section.'],
                ].map(([name, text], i) => (
                  <li key={name} className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-charcoal-700 text-xs text-slate-300">{i + 1}</span>
                    <span>
                      <span className="block text-slate-200">{name}</span>
                      <span className="block text-xs text-slate-500">{text}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </aside>
        </div>
      )}
    </AppShell>
  );
}
