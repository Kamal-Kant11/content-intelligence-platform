import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  BrainCircuit,
  CheckCircle2,
  ChevronDown,
  Columns2,
  Download,
  FileDown,
  Layers,
  ListChecks,
  Loader2,
  RefreshCw,
  ScanSearch,
  Trash2,
  Wand2,
} from 'lucide-react';
import AppShell from './AppShell.jsx';
import ExportPanel from '../components/ExportPanel.jsx';
import { api, getErrorMessage } from '../api/client.js';
import { formatDateTime } from '../utils/format.js';
import { buildSections, countWords } from '../utils/sections.js';
import { downloadErrorMessage, downloadFile } from '../utils/download.js';
import { BackLink, Badge, ErrorAlert, ScoreRing, Section, SeverityBadge, Spinner, Tabs, scoreColor } from '../components/ui.jsx';

function BlockText({ block }) {
  if (block.type === 'heading') return <p className="text-base font-semibold text-white">{block.text}</p>;
  if (block.type === 'list')
    return (
      <ul className="list-disc space-y-1 pl-5">
        {block.text.split('\n').map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    );
  if (block.type === 'quote') return <blockquote className="border-l-2 border-indigo-400/50 pl-3 italic">{block.text}</blockquote>;
  return <p>{block.text}</p>;
}

function FindingItem({ finding, sourceNames, compact = false }) {
  return (
    <li className={`rounded-lg border border-charcoal-700 bg-charcoal-950/60 ${compact ? 'p-2.5' : 'p-3'}`}>
      <div className="flex flex-wrap items-center gap-2">
        <SeverityBadge severity={finding.severity} />
        <span className="text-xs capitalize text-slate-500">{finding.category}</span>
        {finding.source === 'model' && (
          <span className="inline-flex items-center gap-1 text-xs text-indigo-300">
            <BrainCircuit size={12} /> model
          </span>
        )}
        {finding.ruleId && <span className="text-xs text-indigo-300">brand rule</span>}
        {finding.confidence < 1 && <span className="ml-auto text-xs text-slate-500">{Math.round(finding.confidence * 100)}%</span>}
      </div>
      <p className="mt-1.5 text-sm text-slate-200">{finding.message}</p>
      {!compact && finding.text && finding.text !== finding.message && (
        <p className="mt-1.5 break-words rounded bg-charcoal-800/70 px-2 py-1 text-xs text-slate-400">“{finding.text}”</p>
      )}
      {finding.suggestion && <p className="mt-1 text-xs text-emerald-300/90">→ {finding.suggestion}</p>}
      {finding.evidence?.map((e, i) => (
        <p key={i} className="mt-1.5 border-l-2 border-indigo-400/40 pl-2 text-xs text-slate-400">
          <span className="text-slate-500">{sourceNames[e.sourceId] || 'Source'}:</span> {e.text}
        </p>
      ))}
    </li>
  );
}

function CountChips({ counts }) {
  if (!counts) return null;
  return (
    <div className="flex flex-wrap gap-1.5 text-[11px]">
      {counts.critical > 0 && <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-red-300">{counts.critical} critical</span>}
      {counts.warnings > 0 && <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-amber-300">{counts.warnings} warnings</span>}
      {counts.info > 0 && <span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-sky-300">{counts.info} info</span>}
      {counts.total === 0 && (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-300">
          <CheckCircle2 size={11} /> clean
        </span>
      )}
    </div>
  );
}

function SectionCard({ section, index, stats, findingsByBlock, open, onToggle, onDownload, downloading, sourceNames }) {
  const words = section.blocks.reduce((s, b) => s + countWords(b.text), 0);
  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center gap-4 p-4 sm:p-5">
        <button type="button" onClick={onToggle} className="flex min-w-0 flex-1 items-center gap-4 text-left" aria-expanded={open}>
          {stats ? <ScoreRing score={stats.overallScore} size={52} stroke={5} /> : <span className="flex h-[52px] w-[52px] items-center justify-center rounded-full border border-dashed border-charcoal-600 text-xs text-slate-500">{index + 1}</span>}
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">
              Section {index + 1} · {section.blocks.length} block{section.blocks.length === 1 ? '' : 's'} · {words} words
            </p>
            <p className="truncate text-base font-medium text-white">{section.title}</p>
            <div className="mt-1.5">
              <CountChips counts={stats?.counts} />
            </div>
          </div>
        </button>
        <div className="flex items-center gap-2">
          <button type="button" className="btn-secondary px-3 py-2 text-xs" onClick={onDownload} disabled={downloading} title="Download this section">
            {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Section
          </button>
          <button type="button" onClick={onToggle} className="rounded-lg p-2 text-slate-400 hover:bg-charcoal-800" aria-label={open ? 'Collapse section' : 'Expand section'}>
            <ChevronDown size={18} className={`transition ${open ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {open && (
        <div className="space-y-3 border-t border-charcoal-700 bg-charcoal-950/30 p-4 sm:p-5">
          {section.blocks.map((block) => {
            const findings = findingsByBlock[block.blockId] || [];
            return (
              <div key={block.blockId} className={`rounded-xl border p-4 ${findings.length ? 'border-amber-500/20 bg-amber-500/[0.03]' : 'border-charcoal-700'}`}>
                <p className="mb-1.5 text-[11px] uppercase tracking-wide text-slate-500">
                  {block.type} · {block.blockId}
                </p>
                <div className="text-sm leading-relaxed text-slate-300">
                  <BlockText block={block} />
                </div>
                {findings.length > 0 && (
                  <ul className="mt-3 grid gap-2 md:grid-cols-2">
                    {findings.map((f) => (
                      <FindingItem key={f.findingId} finding={f} sourceNames={sourceNames} compact />
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ScoreBreakdown({ analysis }) {
  const { categoryScores, metrics } = analysis;
  const r = metrics?.readability;
  const tone = metrics?.voice?.toneDistribution || {};
  const claims = metrics?.claims?.claims;
  return (
    <div className="space-y-5">
      {Object.keys(categoryScores || {}).length > 0 ? (
        <div className="space-y-2.5">
          {Object.entries(categoryScores).map(([category, value]) => (
            <div key={category} className="text-xs">
              <div className="mb-1 flex justify-between">
                <span className="capitalize text-slate-400">{category}</span>
                <span className={scoreColor(value)}>{value}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-charcoal-700">
                <div className="h-full rounded-full bg-indigo-400" style={{ width: `${value}%` }} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="flex items-center gap-2 text-sm text-emerald-300">
          <CheckCircle2 size={16} /> Every category is clean.
        </p>
      )}

      {r && (
        <dl className="grid grid-cols-2 gap-3 border-t border-charcoal-700 pt-4 text-xs">
          {[
            ['Reading ease', r.readingEase],
            ['Grade level', r.gradeLevel],
            ['Avg. sentence', `${r.avgSentenceLength} words`],
            ['Sentences', r.sentences],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="text-slate-500">{k}</dt>
              <dd className="mt-0.5 text-sm text-slate-200">{v}</dd>
            </div>
          ))}
        </dl>
      )}

      {Object.keys(tone).length > 0 && (
        <div className="border-t border-charcoal-700 pt-4">
          <p className="mb-2 flex items-center gap-1.5 text-xs text-slate-500">
            <BrainCircuit size={13} /> Tone (local model)
          </p>
          <div className="flex h-2 overflow-hidden rounded-full">
            {Object.entries(tone).map(([label, share], i) => (
              <div key={label} title={`${label} ${Math.round(share * 100)}%`} className={['bg-indigo-400', 'bg-emerald-400', 'bg-amber-400', 'bg-sky-400'][i % 4]} style={{ width: `${share * 100}%` }} />
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs capitalize text-slate-400">
            {Object.entries(tone).map(([label, share]) => (
              <span key={label}>
                {label} {Math.round(share * 100)}%
              </span>
            ))}
          </div>
        </div>
      )}

      {claims && claims.detected > 0 && (
        <div className="border-t border-charcoal-700 pt-4 text-xs text-slate-400">
          <p className="mb-1 text-slate-500">Claims</p>
          {claims.detected} detected · {claims.supported} supported · {claims.mismatched} mismatched · {claims.unsupported} unsupported
        </div>
      )}
    </div>
  );
}

export default function DocumentView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [doc, setDoc] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [stale, setStale] = useState(false);
  const [optimizations, setOptimizations] = useState([]);
  const [brands, setBrands] = useState([]);
  const [sourceNames, setSourceNames] = useState({});
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [tab, setTab] = useState('sections');
  const [openSections, setOpenSections] = useState(null);
  const [category, setCategory] = useState('all');
  const [severity, setSeverity] = useState('all');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const [docRes, brandRes, optRes, analysisRes] = await Promise.all([
        api.get(`/documents/${id}`),
        api.get('/brands'),
        api.get(`/documents/${id}/optimizations`),
        api.get(`/documents/${id}/analysis`),
      ]);
      setDoc(docRes.data.document);
      setBrands(brandRes.data.brands);
      setOptimizations(optRes.data.optimizations);
      setAnalysis(analysisRes.data.analysis);
      setStale(analysisRes.data.stale);
    } catch (err) {
      if (err?.response?.status === 404) setNotFound(true);
      else setError(getErrorMessage(err, 'Could not load this document.'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!analysis?.brandId) return;
    api
      .get(`/brands/${analysis.brandId}/sources`)
      .then((res) => setSourceNames(Object.fromEntries(res.data.sources.map((s) => [s.id, s.name]))))
      .catch(() => {});
  }, [analysis?.brandId]);

  async function run(label, fn) {
    setBusy(label);
    setError('');
    try {
      await fn();
    } catch (err) {
      setError(err?.response?.data instanceof Blob ? await downloadErrorMessage(err) : getErrorMessage(err));
    } finally {
      setBusy('');
    }
  }

  const analyze = (force = false) =>
    run(force ? 'reanalyze' : 'analyze', async () => {
      const res = await api.post(`/documents/${id}/analyze`, { force });
      setAnalysis(res.data.analysis);
      setStale(false);
      setOpenSections(null);
      setTab('sections');
    });

  const optimize = () =>
    run('optimize', async () => {
      const res = await api.post(`/documents/${id}/optimize`);
      navigate(`/documents/${id}/review/${res.data.optimization.id}`);
    });

  const changeBrand = (brandId) =>
    run('brand', async () => {
      setDoc((await api.patch(`/documents/${id}`, { brandId: brandId || null })).data.document);
    });

  const remove = () =>
    run('delete', async () => {
      await api.delete(`/documents/${id}`);
      navigate('/dashboard', { replace: true });
    });

  const sections = useMemo(() => buildSections(doc?.blocks || []), [doc?.blocks]);
  const sectionStats = useMemo(
    () => (!analysis || stale ? {} : Object.fromEntries((analysis.metrics?.sections || []).map((s) => [s.sectionId, s]))),
    [analysis, stale]
  );
  const findingsByBlock = useMemo(() => {
    const map = {};
    if (analysis && !stale) for (const f of analysis.findings) if (f.blockId) (map[f.blockId] ||= []).push(f);
    return map;
  }, [analysis, stale]);

  // By default open the sections that have findings (or all when there are few).
  const isOpen = (s) =>
    openSections ? openSections.includes(s.sectionId) : sections.length <= 3 || (sectionStats[s.sectionId]?.counts?.total ?? 0) > 0;
  const toggle = (s) =>
    setOpenSections((prev) => {
      const current = prev ?? sections.filter(isOpen).map((x) => x.sectionId);
      return current.includes(s.sectionId) ? current.filter((x) => x !== s.sectionId) : [...current, s.sectionId];
    });

  const allFindings = analysis?.findings || [];
  const categories = [...new Set(allFindings.map((f) => f.category))];
  const visibleFindings = allFindings.filter((f) => (category === 'all' || f.category === category) && (severity === 'all' || f.severity === severity));
  const openOptimization = optimizations.find((o) => o.status === 'open');
  const appliedOptimization = optimizations.find((o) => o.status === 'applied');

  if (loading)
    return (
      <AppShell wide>
        <Spinner label="Loading document" className="py-24" />
      </AppShell>
    );

  if (notFound)
    return (
      <AppShell wide>
        <div className="card mx-auto mt-6 max-w-lg px-6 py-14 text-center">
          <h1 className="text-lg font-medium text-white">Document not found</h1>
          <p className="mt-1.5 text-sm text-slate-400">It may have been deleted, or it doesn't belong to your account.</p>
          <Link to="/dashboard" className="btn-primary mt-6">
            Back to overview
          </Link>
        </div>
      </AppShell>
    );

  if (!doc)
    return (
      <AppShell wide>
        <ErrorAlert onRetry={load}>{error}</ErrorAlert>
      </AppShell>
    );

  const changed = doc.originalContent !== doc.currentContent;
  const summary = analysis?.summary;

  return (
    <AppShell wide>
      <BackLink to="/dashboard">Back to overview</BackLink>

      {/* Header */}
      <div className="card mt-4 overflow-hidden">
        <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center">
          <ScoreRing score={analysis ? analysis.overallScore : undefined} size={104} stroke={9} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge value={doc.status} />
              <span className="rounded-full bg-charcoal-800 px-2.5 py-0.5 text-xs capitalize text-slate-300">{doc.contentType}</span>
              {stale && <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs text-amber-300">content changed: analyze again</span>}
            </div>
            <h1 className="mt-2 break-words text-2xl font-semibold text-white">{doc.title}</h1>
            <p className="mt-1 truncate text-xs text-slate-500">
              {doc.wordCount} words · {sections.length} sections · {doc.blocks.length} blocks ·{' '}
              {doc.sourceType === 'file' ? doc.source?.fileName : doc.sourceType === 'url' ? doc.source?.url : doc.sourceType} · updated{' '}
              {formatDateTime(doc.updatedAt)}
            </p>
            {summary && (
              <p className="mt-2 text-sm text-slate-400">
                <span className="text-emerald-300">{summary.passed}</span>/{summary.checksRun} checks passed ·{' '}
                <span className="text-red-300">{summary.critical} critical</span> · <span className="text-amber-300">{summary.warnings} warnings</span> ·{' '}
                <span className="text-sky-300">{summary.info} info</span>
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2 lg:max-w-sm lg:justify-end">
            <button type="button" className="btn-primary" onClick={() => analyze(false)} disabled={!!busy || !doc.blocks.length}>
              {busy === 'analyze' ? <Loader2 size={16} className="animate-spin" /> : <ScanSearch size={16} />} Analyze
            </button>
            {analysis && (
              <button type="button" className="btn-secondary" onClick={() => analyze(true)} disabled={!!busy} title="Ignore the cached result">
                {busy === 'reanalyze' ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              </button>
            )}
            {openOptimization ? (
              <Link to={`/documents/${id}/review/${openOptimization.id}`} className="btn-secondary">
                <Wand2 size={16} /> Continue review
              </Link>
            ) : (
              <button
                type="button"
                className="btn-secondary"
                onClick={optimize}
                disabled={!!busy || !analysis || stale}
                title={!analysis ? 'Analyze first' : stale ? 'Content changed: analyze again' : 'Create an optimized version'}
              >
                {busy === 'optimize' ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />} Optimize
              </button>
            )}
            <button type="button" className="btn-secondary" onClick={() => setTab('export')}>
              <FileDown size={16} /> Export
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-3 border-t border-charcoal-700 bg-charcoal-950/40 px-5 py-3 sm:flex-row sm:items-center sm:px-6">
          <label htmlFor="doc-brand" className="text-xs uppercase tracking-wide text-slate-500">
            Brand
          </label>
          <select id="doc-brand" className="input py-1.5 sm:max-w-xs" value={doc.brandId || ''} onChange={(e) => changeBrand(e.target.value)} disabled={!!busy}>
            <option value="">None (content quality only)</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          {analysis && <p className="text-xs text-slate-500 sm:ml-auto">Analyzed {formatDateTime(analysis.createdAt)} · {analysis.processingMetadata?.durationMs} ms</p>}
          {confirmDelete ? (
            <span className="flex gap-2">
              <button type="button" className="btn-danger px-3 py-1.5 text-xs" onClick={remove} disabled={busy === 'delete'}>
                Confirm delete
              </button>
              <button type="button" className="btn-secondary px-3 py-1.5 text-xs" onClick={() => setConfirmDelete(false)}>
                Cancel
              </button>
            </span>
          ) : (
            <button type="button" className={`text-slate-500 hover:text-red-300 ${analysis ? '' : 'sm:ml-auto'}`} onClick={() => setConfirmDelete(true)} aria-label="Delete document">
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-4">
          <ErrorAlert>{error}</ErrorAlert>
        </div>
      )}

      <div className="mt-6">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'sections', label: 'Sections', icon: Layers, count: sections.length },
            { id: 'findings', label: 'All findings', icon: ListChecks, count: allFindings.length },
            { id: 'content', label: changed ? 'Original vs current' : 'Content', icon: Columns2 },
            { id: 'export', label: 'Export', icon: FileDown },
          ]}
        />
      </div>

      {tab === 'sections' && (
        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="space-y-4">
            {!analysis && (
              <div className="rounded-xl border border-indigo-400/20 bg-indigo-500/5 p-4 text-sm text-indigo-200">
                Analyze the document to get a score and findings for every section.
              </div>
            )}
            {sections.length === 0 ? (
              <p className="card p-6 text-sm text-amber-300">No text could be extracted from this document (it may be scanned, empty or protected).</p>
            ) : (
              sections.map((s, i) => (
                <SectionCard
                  key={s.sectionId}
                  section={s}
                  index={i}
                  stats={sectionStats[s.sectionId]}
                  findingsByBlock={findingsByBlock}
                  open={isOpen(s)}
                  onToggle={() => toggle(s)}
                  downloading={busy === `section-${s.sectionId}`}
                  onDownload={() => run(`section-${s.sectionId}`, () => downloadFile(`/documents/${id}/export`, { format: 'source', section: s.sectionId }))}
                  sourceNames={sourceNames}
                />
              ))
            )}
          </div>
          <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
            <Section title="Score breakdown">
              {analysis ? <ScoreBreakdown analysis={analysis} /> : <p className="text-sm text-slate-400">Not analyzed yet.</p>}
            </Section>
            {analysis && sections.length > 1 && !stale && (
              <Section title="Sections ranked">
                <ul className="space-y-2">
                  {[...(analysis.metrics?.sections || [])]
                    .sort((a, b) => a.overallScore - b.overallScore)
                    .map((s) => (
                      <li key={s.sectionId} className="flex items-center gap-3 text-sm">
                        <span className={`w-8 text-right font-semibold ${scoreColor(s.overallScore)}`}>{s.overallScore}</span>
                        <span className="truncate text-slate-300">{s.title}</span>
                      </li>
                    ))}
                </ul>
              </Section>
            )}
          </aside>
        </div>
      )}

      {tab === 'findings' && (
        <div className="mt-6">
          {!analysis ? (
            <p className="card p-6 text-sm text-slate-400">Not analyzed yet.</p>
          ) : (
            <>
              <div className="mb-4 flex flex-wrap gap-2">
                <select className="input w-auto py-2 text-sm" value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filter by category">
                  <option value="all">All categories</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <select className="input w-auto py-2 text-sm" value={severity} onChange={(e) => setSeverity(e.target.value)} aria-label="Filter by severity">
                  <option value="all">All severities</option>
                  <option value="critical">Critical</option>
                  <option value="warning">Warning</option>
                  <option value="info">Info</option>
                </select>
              </div>
              {visibleFindings.length === 0 ? (
                <p className="flex items-center gap-2 text-sm text-emerald-300">
                  <CheckCircle2 size={16} /> No findings here.
                </p>
              ) : (
                <ul className="grid gap-3 lg:grid-cols-2">
                  {visibleFindings.map((f) => (
                    <FindingItem key={f.findingId} finding={f} sourceNames={sourceNames} />
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      )}

      {tab === 'content' && (
        <div className={`mt-6 grid gap-6 ${changed ? 'lg:grid-cols-2' : ''}`}>
          {changed && (
            <Section title="Original (never changed)">
              <pre className="max-h-[40rem] overflow-auto whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-slate-400">{doc.originalContent}</pre>
            </Section>
          )}
          <Section title={changed ? 'Current (with applied changes)' : 'Content'}>
            <pre className="max-h-[40rem] overflow-auto whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-slate-200">{doc.currentContent}</pre>
          </Section>
        </div>
      )}

      {tab === 'export' && (
        <div className="mt-6">
          <Section title="Download">
            <ExportPanel doc={doc} sections={sections} optimizationId={appliedOptimization?.id} />
          </Section>
        </div>
      )}
    </AppShell>
  );
}
