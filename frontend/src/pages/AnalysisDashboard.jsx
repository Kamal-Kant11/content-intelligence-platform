import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
<<<<<<< HEAD
import { api, getErrorMessage } from '../api/client.js';
import { Alert, ScoreRing, Spinner } from '../components/ui.jsx';

const LONG_SENTENCE = 'rounded bg-amber-500/25 text-amber-100';
const COMPLEX_WORD = 'rounded bg-sky-500/25 text-sky-100 underline decoration-sky-300/60';
=======
import { diffWords } from 'diff';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { api, getErrorMessage } from '../api/client.js';
import { Alert, Busy, ScoreRing, Spinner } from '../components/ui.jsx';

const MISTAKE = 'rounded bg-red-500/25 text-red-200';
const LONG_SENTENCE = 'rounded bg-amber-500/25 text-amber-100';
const COMPLEX_WORD = 'rounded bg-sky-500/25 text-sky-100 underline decoration-sky-300/60';
const FIX = 'rounded bg-emerald-500/25 text-emerald-200';
>>>>>>> bfa39c5c92556a58a6a4353a3094e5a37d68e0e8

const tone = (score) => {
  if (score === null || score === undefined) return 'text-slate-500';
  if (score >= 80) return 'text-emerald-300';
  if (score >= 50) return 'text-amber-300';
  return 'text-red-300';
};

<<<<<<< HEAD
const isLong = (span) => span.id === 'long-sentence';

function classFor(span) {
  return isLong(span) ? LONG_SENTENCE : COMPLEX_WORD;
}

// Colors the characters from `from` to `to` of `text`. Spans are applied in order,
// so a later span (a complex word) overrides an earlier one (a long sentence).
function markRange(text, from, to, spans) {
  const marks = new Array(to - from).fill('');
  for (const span of spans) {
    const cls = classFor(span);
    for (let i = Math.max(span.start, from); i < Math.min(span.end, to); i++) marks[i - from] = cls;
=======
const grammarLabel = (score) => {
  if (score === null || score === undefined) return '—';
  if (score >= 90) return 'Excellent';
  if (score >= 75) return 'Good';
  if (score >= 50) return 'Fair';
  return 'Needs work';
};

const overallOf = (side) => {
  const parts = [side.grammar.score, side.readability.score].filter((v) => v !== null && v !== undefined);
  return parts.length ? Math.round(parts.reduce((a, b) => a + b, 0) / parts.length) : null;
};

function Change({ before, after }) {
  const text = (v) => (v === null || v === undefined ? '—' : v);
  return (
    <span className="whitespace-nowrap tabular-nums">
      <span className="text-slate-400">{text(before)}</span>
      <span className="mx-2 text-slate-600">→</span>
      <span className={`font-semibold ${tone(after)}`}>{text(after)}</span>
    </span>
  );
}

function classFor(span) {
  if (span.kind === 'grammar') return MISTAKE;
  if (span.id === 'complex-word') return COMPLEX_WORD;
  return LONG_SENTENCE;
}

function markSegments(line) {
  const text = line.text;
  const marks = new Array(text.length).fill('');
  for (const span of [...line.readabilityIssues, ...line.mistakes]) {
    const cls = classFor(span);
    for (let i = Math.max(0, span.start); i < Math.min(text.length, span.end); i++) marks[i] = cls;
>>>>>>> bfa39c5c92556a58a6a4353a3094e5a37d68e0e8
  }
  const nodes = [];
  let i = 0;
  let key = 0;
<<<<<<< HEAD
  while (i < marks.length) {
    let j = i;
    while (j < marks.length && marks[j] === marks[i]) j++;
    const piece = text.slice(from + i, from + j);
=======
  while (i < text.length) {
    let j = i;
    while (j < text.length && marks[j] === marks[i]) j++;
    const piece = text.slice(i, j);
>>>>>>> bfa39c5c92556a58a6a4353a3094e5a37d68e0e8
    nodes.push(marks[i] ? <span key={key++} className={marks[i]}>{piece}</span> : <span key={key++}>{piece}</span>);
    i = j;
  }
  return nodes;
}

<<<<<<< HEAD
// One card per sentence: a long sentence and its hard words share a card.
function groupBySentence(lines) {
  const cards = [];
  for (const line of lines) {
    const bySentence = new Map();
    for (const span of line.readabilityIssues) {
      if (!bySentence.has(span.sentenceStart)) {
        bySentence.set(span.sentenceStart, {
          key: `${line.number}-${span.sentenceStart}`,
          lineNumber: line.number,
          lineText: line.text,
          from: span.sentenceStart,
          to: span.sentenceEnd,
          spans: [],
        });
      }
      bySentence.get(span.sentenceStart).spans.push(span);
    }
    cards.push(...bySentence.values());
  }
  return cards;
}

function Legend() {
  const items = [
    [LONG_SENTENCE, 'Long sentence'],
    [COMPLEX_WORD, 'Hard word'],
=======
function Legend() {
  const items = [
    [MISTAKE, 'Grammar mistake'],
    [LONG_SENTENCE, 'Long sentence'],
    [COMPLEX_WORD, 'Complex word'],
>>>>>>> bfa39c5c92556a58a6a4353a3094e5a37d68e0e8
  ];
  return (
    <div className="flex flex-wrap gap-4 text-xs text-slate-300">
      {items.map(([cls, label]) => (
        <span key={label} className="inline-flex items-center gap-2">
          <span className={`px-1.5 py-0.5 ${cls}`}>Aa</span>
          {label}
        </span>
      ))}
    </div>
  );
}

<<<<<<< HEAD
function ReadabilityScore({ overall }) {
  const score = overall.readability.score;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="card mx-auto flex w-full max-w-sm flex-col items-center gap-3 p-5 text-center"
    >
      <ScoreRing score={score} size={96} stroke={8} label="" />
      <p className="text-xs font-semibold uppercase tracking-wider text-sky-300">Readability score</p>
      <p className="text-sm font-semibold text-white">{overall.readability.label ?? '—'}</p>
      <p className={`text-xs ${tone(score)}`}>{overall.words} words</p>
    </motion.div>
  );
}

function IssueCounts({ lines }) {
  const issues = lines.flatMap((l) => l.readabilityIssues);
  const longSentences = issues.filter(isLong).length;
  const hardWords = issues.length - longSentences;
  const items = [
    ['Long sentences', longSentences, 'text-amber-300'],
    ['Hard words', hardWords, 'text-sky-300'],
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {items.map(([label, count, color]) => (
        <div key={label} className="card p-5 text-center">
          <p className={`text-3xl font-semibold tabular-nums ${color}`}>{count}</p>
          <p className="mt-1 text-xs uppercase tracking-wider text-slate-400">{label}</p>
        </div>
=======
function PanelHeader({ title, dot, detail }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-charcoal-800 px-5 py-3 text-sm font-semibold text-white">
      <span className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${dot}`} /> {title}
      </span>
      {detail && <span className="text-xs font-normal text-slate-400">{detail}</span>}
    </div>
  );
}

function OriginalPanel({ lines, visible }) {
  const mistakes = lines.reduce((n, line) => n + line.mistakes.length, 0);
  const readability = lines.reduce((n, line) => n + line.readabilityIssues.length, 0);
  return (
    <div className={`flex min-h-[18rem] flex-col rounded-2xl border border-red-500/30 bg-charcoal-950/60 ${visible ? '' : 'hidden'} md:flex`}>
      <PanelHeader title="Original content" dot="bg-red-400" detail={`${mistakes} grammar · ${readability} readability`} />
      <div className="max-h-[28rem] overflow-auto px-5 py-4 text-sm leading-7 text-slate-200">
        {lines.map((line) => (
          <p key={line.number} className="break-words">
            {markSegments(line)}
          </p>
        ))}
      </div>
    </div>
  );
}

function OptimizedPanel({ parts, visible }) {
  return (
    <div className={`flex min-h-[18rem] flex-col rounded-2xl border border-emerald-500/30 bg-charcoal-950/60 ${visible ? '' : 'hidden'} md:flex`}>
      <PanelHeader title="Optimized content" dot="bg-emerald-400" />
      <p className="max-h-[28rem] overflow-auto whitespace-pre-wrap break-words px-5 py-4 text-sm leading-7 text-slate-200">
        {parts.map((part, i) => {
          if (part.removed) return null;
          if (part.added) return <span key={i} className={FIX}>{part.value}</span>;
          return <span key={i}>{part.value}</span>;
        })}
      </p>
    </div>
  );
}

function LiveComparison({ lines, approved, approving, onApprove }) {
  const [view, setView] = useState('optimized');
  const optimizedText = useMemo(() => lines.map((l) => l.optimizedText).join('\n'), [lines]);
  const originalText = useMemo(() => lines.map((l) => l.text).join('\n'), [lines]);
  const parts = useMemo(() => diffWords(originalText, optimizedText), [originalText, optimizedText]);
  const changed = lines.some((l) => l.changed);

  return (
    <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="card p-5 sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <h2 className="font-semibold text-white">Live comparison</h2>
          <Legend />
        </div>
        <div className="inline-flex rounded-full border border-charcoal-700 bg-charcoal-950 p-1 text-sm md:hidden">
          {['original', 'optimized'].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`rounded-full px-4 py-1.5 capitalize transition ${view === v ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white' : 'text-slate-300'}`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-stretch">
        <OriginalPanel lines={lines} visible={view === 'original'} />
        <div className="hidden items-center justify-center md:flex">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500/30 text-indigo-200">
            <ArrowRight size={18} />
          </span>
        </div>
        <OptimizedPanel parts={parts} visible={view === 'optimized'} />
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          {approved
            ? 'Approved. The optimized text is now the document’s text. Red marks remain on any mistakes that are not fixed.'
            : changed
              ? 'Approve the optimized text to replace the original text in every analysis and export.'
              : 'The text has no fixable mistakes, so there is nothing to approve.'}
        </p>
        <button type="button" onClick={onApprove} disabled={approved || !changed || approving} className="btn-primary">
          <Busy busy={approving} label={approved ? 'Approved' : 'Approve optimized text'} busyLabel="Approving…" icon={CheckCircle2} />
        </button>
      </div>
    </motion.section>
  );
}

function KeyParameters({ overall }) {
  const { original, optimized } = overall;
  const rows = [
    {
      label: 'Grammar score',
      value: optimized.grammar.score,
      before: original.grammar.score,
      note: grammarLabel(optimized.grammar.score),
      color: 'text-indigo-300',
    },
    {
      label: 'Readability score',
      value: optimized.readability.score,
      before: original.readability.score,
      note: optimized.readability.label ?? '—',
      color: 'text-sky-300',
    },
    {
      label: 'Overall quality',
      value: overallOf(optimized),
      before: overallOf(original),
      note: grammarLabel(overallOf(optimized)),
      color: 'text-emerald-300',
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {rows.map((row, i) => (
        <motion.div
          key={row.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: i * 0.08 }}
          className="card flex flex-col items-center gap-3 p-5 text-center"
        >
          <ScoreRing score={row.value} size={96} stroke={8} label="" />
          <p className={`text-xs font-semibold uppercase tracking-wider ${row.color}`}>{row.label}</p>
          <p className="text-sm font-semibold text-white">{row.note}</p>
          <p className="text-xs text-slate-500">was {row.before ?? '—'}</p>
        </motion.div>
>>>>>>> bfa39c5c92556a58a6a4353a3094e5a37d68e0e8
      ))}
    </div>
  );
}

<<<<<<< HEAD
function IssueCard({ card }) {
  const long = card.spans.find(isLong);
  const hardWords = card.spans.filter((s) => !isLong(s));
  const steps = [...(long ? [long.advice] : []), ...hardWords.map((s) => s.advice)];

  return (
    <div className="rounded-xl border border-charcoal-700 bg-charcoal-950/60 p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="text-slate-400">Line {card.lineNumber}</span>
        {long && <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-amber-200">{long.label}</span>}
        {hardWords.length > 0 && (
          <span className="rounded-full bg-sky-500/20 px-2.5 py-0.5 text-sky-200">
            {hardWords.length} hard {hardWords.length === 1 ? 'word' : 'words'}: {hardWords.map((s) => s.word).join(', ')}
          </span>
        )}
      </div>

      <p className="text-xs uppercase tracking-wider text-slate-500">Sentence</p>
      <p className="mt-1 break-words text-sm leading-7 text-slate-100">{markRange(card.lineText, card.from, card.to, card.spans)}</p>

      <p className="mt-4 text-xs uppercase tracking-wider text-emerald-300">What to do</p>
      <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-300">
        {steps.map((step, i) => (
          <li key={i}>{step}</li>
        ))}
      </ul>
    </div>
  );
}

function ReadabilityIssues({ lines }) {
  const cards = useMemo(() => groupBySentence(lines), [lines]);
  return (
    <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.1 }} className="card p-5 sm:p-6">
      <div className="mb-5 space-y-2">
        <h2 className="font-semibold text-white">Readability issues</h2>
        <Legend />
      </div>
      {cards.length === 0 ? (
        <p className="text-sm text-slate-400">No readability issues found.</p>
      ) : (
        <div className="max-h-[44rem] space-y-3 overflow-auto pr-1">
          {cards.map((card) => (
            <IssueCard key={card.key} card={card} />
          ))}
        </div>
      )}
=======
function ImprovementBanner({ overall }) {
  const before = overallOf(overall.original);
  const after = overallOf(overall.optimized);
  const percent = before && after !== null ? Math.round(((after - before) / before) * 100) : 0;
  return (
    <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.2 }} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-600/30 to-violet-600/20 px-6 py-5">
      <p className="text-lg font-semibold text-white">
        Content quality {percent >= 0 ? 'improved' : 'dropped'} by <span className={percent >= 0 ? 'text-emerald-300' : 'text-red-300'}>{Math.abs(percent)}%</span>
      </p>
      <p className="text-sm text-slate-300">
        Overall {before ?? '—'} → {after ?? '—'}
      </p>
    </motion.section>
  );
}

function safeFileName(title) {
  return (title || '').replace(/[^\p{L}\p{N}_-]+/gu, '_').replace(/^_+|_+$/g, '').slice(0, 80) || 'document';
}

function downloadText(filename, text) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function ExportBar({ title, lines }) {
  const [copyState, setCopyState] = useState('idle');
  const original = lines.map((l) => l.text).join('\n');
  const optimized = lines.map((l) => l.optimizedText).join('\n');
  const base = safeFileName(title);

  async function copy() {
    try {
      await navigator.clipboard.writeText(optimized);
      setCopyState('copied');
    } catch {
      setCopyState('failed');
    }
    setTimeout(() => setCopyState('idle'), 2000);
  }

  return (
    <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="card flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
      <div>
        <p className="font-semibold text-white">Export text</p>
        <p className="mt-1 text-xs text-slate-500">Copy the text, or download it as .txt. Exports use the approved text once you approve.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={copy} className="btn-secondary">
          {copyState === 'copied' ? 'Copied' : copyState === 'failed' ? 'Copy failed' : 'Copy text'}
        </button>
        <button type="button" onClick={() => downloadText(`${base}.txt`, optimized)} className="btn-secondary">
          Download .txt
        </button>
        <button type="button" onClick={() => downloadText(`${base}-original.txt`, original)} className="btn-secondary">
          Download original .txt
        </button>
      </div>
    </motion.section>
  );
}

function LineRow({ line, index }) {
  const parts = useMemo(() => diffWords(line.text, line.optimizedText), [line.text, line.optimizedText]);
  const readable = line.readability.original.score !== null;

  return (
    <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(index * 0.01, 0.4), duration: 0.2 }} className="align-top hover:bg-charcoal-800/50">
      <td className="px-3 py-3 tabular-nums text-slate-500">{line.number}</td>
      <td className="px-3 py-3 leading-7 text-slate-200">
        <span className="break-words">{markSegments(line)}</span>
      </td>
      <td className="px-3 py-3 leading-7 text-slate-200">
        {line.changed ? (
          <span className="break-words">
            {parts.map((part, i) => {
              if (part.removed) return null;
              if (part.added) return <span key={i} className={FIX}>{part.value}</span>;
              return <span key={i}>{part.value}</span>;
            })}
          </span>
        ) : (
          <span className="break-words">{line.optimizedText}</span>
        )}
      </td>
      <td className="px-3 py-3 text-sm">
        <p className="text-xs uppercase tracking-wider text-indigo-300">Grammar</p>
        <p className="mt-1">
          <Change before={line.grammar.original.score} after={line.grammar.optimized.score} />
        </p>
        <p className="mt-3 text-xs uppercase tracking-wider text-sky-300">Readability</p>
        {readable ? (
          <p className="mt-1">
            <Change before={line.readability.original.score} after={line.readability.optimized.score} />
          </p>
        ) : (
          <p className="mt-1 text-xs text-slate-500">too short to score</p>
        )}
      </td>
    </motion.tr>
  );
}

function LineTable({ lines }) {
  return (
    <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.1 }} className="card p-5 sm:p-6">
      <h2 className="mb-1 font-semibold text-white">Line by line</h2>
      <p className="mb-4 text-xs text-slate-500">
        <span className="text-red-300">Red</span> marks a grammar mistake, <span className="text-amber-300">amber</span> a long sentence and <span className="text-sky-300">blue</span> a complex word. <span className="text-emerald-300">Green</span> is the correction. Scores are original →
        optimized.
      </p>
      <div className="max-h-[40rem] overflow-auto rounded-xl border border-charcoal-700">
        <table className="w-full min-w-[56rem] border-collapse text-left text-sm">
          <thead className="sticky top-0 bg-charcoal-950 text-xs uppercase tracking-wider text-slate-400">
            <tr>
              <th className="px-3 py-2.5 font-medium">#</th>
              <th className="px-3 py-2.5 font-medium">Original (mistakes in red)</th>
              <th className="px-3 py-2.5 font-medium">Optimized (fixed in green)</th>
              <th className="px-3 py-2.5 font-medium">Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-charcoal-800">
            {lines.map((line, i) => (
              <LineRow key={line.number} line={line} index={i} />
            ))}
          </tbody>
        </table>
      </div>
>>>>>>> bfa39c5c92556a58a6a4353a3094e5a37d68e0e8
    </motion.section>
  );
}

export default function AnalysisDashboard() {
  const { id } = useParams();
<<<<<<< HEAD
  const [state, setState] = useState({ loading: true, title: '', fileName: '', lines: null, overall: null, error: '' });
=======
  const [state, setState] = useState({ loading: true, title: '', fileName: '', lines: null, overall: null, approved: false, error: '' });
  const [approving, setApproving] = useState(false);
>>>>>>> bfa39c5c92556a58a6a4353a3094e5a37d68e0e8

  const load = useCallback(async () => {
    const [info, result] = await Promise.all([api.get(`/documents/${id}/analysis`), api.get(`/documents/${id}/lines`)]);
    return {
      title: info.data.title,
      fileName: info.data.hasFile ? info.data.fileName : 'Typed text',
      lines: result.data.lines,
      overall: result.data.overall,
<<<<<<< HEAD
=======
      approved: result.data.approved,
>>>>>>> bfa39c5c92556a58a6a4353a3094e5a37d68e0e8
    };
  }, [id]);

  useEffect(() => {
    let active = true;
    load()
      .then((data) => active && setState({ loading: false, ...data, error: '' }))
      .catch((err) => active && setState((s) => ({ ...s, loading: false, error: getErrorMessage(err, 'Could not analyze this document.') })));
    return () => {
      active = false;
    };
  }, [load]);

<<<<<<< HEAD
=======
  async function approve() {
    setApproving(true);
    setState((s) => ({ ...s, error: '' }));
    try {
      await api.post(`/documents/${id}/approve`);
      const data = await load();
      setState((s) => ({ ...s, ...data }));
    } catch (err) {
      setState((s) => ({ ...s, error: getErrorMessage(err, 'Could not approve the text.') }));
    } finally {
      setApproving(false);
    }
  }

>>>>>>> bfa39c5c92556a58a6a4353a3094e5a37d68e0e8
  if (state.loading) return <Spinner label="Analyzing…" />;

  const hasText = state.lines && state.lines.length > 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="break-words text-2xl font-semibold tracking-tight text-white sm:text-3xl">{state.title || 'Analysis'}</h1>
          {state.fileName && <p className="mt-1 text-sm text-slate-400">{state.fileName}</p>}
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-charcoal-700 bg-charcoal-950/60 px-4 py-1.5 text-sm text-slate-200">
<<<<<<< HEAD
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          Analysis complete
=======
          <span className={`h-2 w-2 rounded-full ${state.approved ? 'bg-indigo-400' : 'bg-emerald-400'}`} />
          {state.approved ? 'Approved' : 'Analysis complete'}
>>>>>>> bfa39c5c92556a58a6a4353a3094e5a37d68e0e8
        </span>
      </div>

      <Alert>{state.error}</Alert>

      {state.lines && !hasText && <p className="card p-8 text-center text-sm text-slate-400">There is no text to analyze in this document.</p>}

      {hasText && (
        <>
<<<<<<< HEAD
          <ReadabilityScore overall={state.overall} />
          <IssueCounts lines={state.lines} />
          <ReadabilityIssues lines={state.lines} />
=======
          <KeyParameters overall={state.overall} />
          <LiveComparison lines={state.lines} approved={state.approved} approving={approving} onApprove={approve} />
          <ImprovementBanner overall={state.overall} />
          <ExportBar title={state.title} lines={state.lines} />
          <LineTable lines={state.lines} />
>>>>>>> bfa39c5c92556a58a6a4353a3094e5a37d68e0e8
        </>
      )}
    </div>
  );
}
