import { useState } from 'react';
import { Download, FileClock, FileText, Loader2 } from 'lucide-react';
import { downloadErrorMessage, downloadFile } from '../utils/download.js';
import { ErrorAlert } from './ui.jsx';

const FORMATS = [
  { id: 'docx', label: 'Word', ext: 'DOCX' },
  { id: 'pdf', label: 'PDF', ext: 'PDF' },
  { id: 'txt', label: 'Plain text', ext: 'TXT' },
  { id: 'md', label: 'Markdown', ext: 'MD' },
];

export function sourceFormatOf(doc) {
  const ext = (doc?.source?.fileName || '').split('.').pop()?.toLowerCase();
  return ['pdf', 'docx', 'txt'].includes(ext) ? ext : 'docx';
}

// Download the document (whole or one section, current or original) and the change report.
export default function ExportPanel({ doc, sections = [], optimizationId, defaultSection = '', compact = false }) {
  const source = sourceFormatOf(doc);
  const [format, setFormat] = useState('source');
  const [version, setVersion] = useState('current');
  const [section, setSection] = useState(defaultSection);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function run(kind, fn) {
    setBusy(kind);
    setError('');
    setMessage('');
    try {
      const name = await fn();
      setMessage(`Downloaded ${name}`);
    } catch (err) {
      setError(await downloadErrorMessage(err));
    } finally {
      setBusy('');
    }
  }

  const changed = doc.originalContent !== doc.currentContent;

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Format</p>
        <div className={`grid gap-2 ${compact ? 'grid-cols-2 sm:grid-cols-5' : 'grid-cols-2 sm:grid-cols-5'}`}>
          <button
            type="button"
            onClick={() => setFormat('source')}
            className={`rounded-xl border p-3 text-left transition ${
              format === 'source' ? 'border-indigo-400 bg-indigo-500/10' : 'border-charcoal-600 hover:border-charcoal-500'
            }`}
          >
            <p className="text-sm font-medium text-white">Same as uploaded</p>
            <p className="text-xs text-slate-400">{source.toUpperCase()}{doc.sourceType !== 'file' ? ' (default)' : ''}</p>
          </button>
          {FORMATS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFormat(f.id)}
              className={`rounded-xl border p-3 text-left transition ${
                format === f.id ? 'border-indigo-400 bg-indigo-500/10' : 'border-charcoal-600 hover:border-charcoal-500'
              }`}
            >
              <p className="text-sm font-medium text-white">{f.label}</p>
              <p className="text-xs text-slate-400">.{f.ext.toLowerCase()}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Version</p>
          <div className="inline-flex rounded-lg border border-charcoal-600 p-0.5">
            {[
              ['current', changed ? 'With applied changes' : 'Current'],
              ['original', 'Original'],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setVersion(id)}
                className={`rounded-md px-3 py-1.5 text-sm ${version === id ? 'bg-charcoal-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        {sections.length > 1 && version === 'current' && (
          <div>
            <label htmlFor="export-section" className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-500">
              Content
            </label>
            <select id="export-section" className="input py-2" value={section} onChange={(e) => setSection(e.target.value)}>
              <option value="">Whole document</option>
              {sections.map((s) => (
                <option key={s.sectionId} value={s.sectionId}>
                  Section: {s.title}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-primary"
          disabled={!!busy}
          onClick={() =>
            run('doc', () =>
              downloadFile(`/documents/${doc.id}/export`, {
                format,
                version,
                ...(section && version === 'current' ? { section } : {}),
              })
            )
          }
        >
          {busy === 'doc' ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          Download {section && version === 'current' ? 'section' : 'document'}
        </button>
        {optimizationId && (
          <button
            type="button"
            className="btn-secondary"
            disabled={!!busy}
            onClick={() => run('report', () => downloadFile(`/optimizations/${optimizationId}/report`, { format: format === 'source' ? 'docx' : format }))}
          >
            {busy === 'report' ? <Loader2 size={16} className="animate-spin" /> : <FileClock size={16} />} Download change report
          </button>
        )}
      </div>

      {message && (
        <p className="flex items-center gap-2 text-sm text-emerald-300">
          <FileText size={15} /> {message}
        </p>
      )}
      <ErrorAlert>{error}</ErrorAlert>
      <p className="text-xs text-slate-500">
        Exports keep headings, paragraphs, lists and quotes. Fonts, images and tables from an uploaded file are not kept, because only its
        text structure is stored.
      </p>
    </div>
  );
}
