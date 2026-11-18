import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, ListChecks, Type, X } from 'lucide-react';
import { api, getErrorMessage } from '../api/client.js';
import { Alert } from './ui.jsx';

const PDF_TONE = { border: 'border-indigo-500/30', bg: 'bg-indigo-500/5', label: 'text-indigo-300', chip: 'bg-indigo-500/15 text-indigo-200' };
const TYPED_TONE = { border: 'border-emerald-500/30', bg: 'bg-emerald-500/5', label: 'text-emerald-300', chip: 'bg-emerald-500/15 text-emerald-200' };

const enter = (index) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, delay: Math.min(index * 0.08, 0.8), ease: 'easeOut' },
});

function Skeleton() {
  return (
    <div className="space-y-4" role="status" aria-label="Extracting text">
      {[0, 1].map((i) => (
        <div key={i} className="animate-pulse rounded-xl border border-charcoal-800 bg-charcoal-900/60 p-5">
          <div className="mb-4 h-3 w-24 rounded bg-charcoal-700" />
          <div className="space-y-2.5">
            <div className="h-3 w-full rounded bg-charcoal-800" />
            <div className="h-3 w-5/6 rounded bg-charcoal-800" />
            <div className="h-3 w-2/3 rounded bg-charcoal-800" />
          </div>
        </div>
      ))}
    </div>
  );
}

function FormFieldsCard({ fields, index }) {
  return (
    <motion.section {...enter(index)} className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 sm:p-5">
      <header className="mb-3">
        <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-300">
          <ListChecks size={14} /> Form fields
        </span>
      </header>
      <dl className="divide-y divide-amber-500/10">
        {fields.map((field, i) => (
          <motion.div key={`${field.page}-${field.name}-${i}`} {...enter(index + 1 + i)} className="grid gap-1 py-2.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] sm:gap-4">
            <dt className="truncate text-sm font-medium text-amber-200">
              {field.name} <span className="text-xs text-slate-500">· page {field.page}</span>
            </dt>
            <dd className="break-words text-sm text-slate-100">{field.value}</dd>
          </motion.div>
        ))}
      </dl>
    </motion.section>
  );
}

function PageCard({ number, text, index }) {
  return (
    <motion.section {...enter(index)} className={`rounded-xl border p-4 sm:p-5 ${PDF_TONE.border} ${PDF_TONE.bg}`}>
      <header className="mb-3 flex items-center justify-between gap-2">
        <span className={`inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider ${PDF_TONE.label}`}>
          <FileText size={14} /> Page {number}
        </span>
      </header>
      {text ? (
        <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-7 text-slate-100">{text}</pre>
      ) : (
        <p className="text-sm italic text-slate-500">This page has no text.</p>
      )}
    </motion.section>
  );
}

export default function ExtractedText({ docId, fileName, onClose }) {
  const [state, setState] = useState({ loading: true, data: null, error: '' });

  useEffect(() => {
    let active = true;
    api
      .get(`/documents/${docId}/text`)
      .then((res) => active && setState({ loading: false, data: res.data, error: '' }))
      .catch((err) => active && setState({ loading: false, data: null, error: getErrorMessage(err, 'Could not extract text.') }));
    return () => {
      active = false;
    };
  }, [docId]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const { loading, data, error } = state;
  const pages = data?.pdfPages ?? [];
  const pdfText = data?.pdfText ?? '';
  const typedText = data?.typedText ?? '';
  const pageCount = data?.pageCount ?? 0;
  const characters = (pdfText.length + typedText.length).toLocaleString();
  const formFields = data?.formFields ?? [];
  const nothing = data && !pdfText && !typedText && formFields.length === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="overflow-hidden rounded-2xl border border-charcoal-700 bg-charcoal-950/70 shadow-lg shadow-black/30"
    >
      <div className="flex items-start justify-between gap-4 border-b border-charcoal-800 px-5 py-4">
        <div className="min-w-0">
          <p className="font-semibold text-white">Extracted text</p>
          <p className="mt-0.5 truncate text-xs text-slate-400">
            {fileName || 'Typed text'}
            {data && ` · ${characters} characters`}
            {pageCount > 0 && ` · ${pageCount} ${pageCount === 1 ? 'page' : 'pages'}`}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close extracted text"
          className="shrink-0 rounded-lg p-2 text-slate-400 transition hover:rotate-90 hover:bg-charcoal-800 hover:text-white"
        >
          <X size={18} />
        </button>
      </div>

      <div className="space-y-4 p-5">
        {loading && <Skeleton />}
        <Alert>{error}</Alert>

        {nothing && <p className="text-sm text-slate-400">No text was found in this document. A scanned PDF may contain only images.</p>}

        {pages.map((text, i) => (
          <PageCard key={i} number={i + 1} text={text} index={i} />
        ))}

        {formFields.length > 0 && <FormFieldsCard fields={formFields} index={pages.length} />}

        {typedText && (
          <motion.section {...enter(pages.length + (formFields.length > 0 ? 1 : 0))} className={`rounded-xl border p-4 sm:p-5 ${TYPED_TONE.border} ${TYPED_TONE.bg}`}>
            <header className="mb-3">
              <span className={`inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider ${TYPED_TONE.label}`}>
                <Type size={14} /> Typed text
              </span>
            </header>
            <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-7 text-slate-100">{typedText}</pre>
          </motion.section>
        )}
      </div>
    </motion.div>
  );
}
