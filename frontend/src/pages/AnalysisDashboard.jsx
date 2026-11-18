import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api, getErrorMessage } from '../api/client.js';
import { Alert, ScoreRing, Spinner } from '../components/ui.jsx';

const LONG_SENTENCE = 'rounded bg-amber-500/25 text-amber-100';
const COMPLEX_WORD = 'rounded bg-sky-500/25 text-sky-100 underline decoration-sky-300/60';

const tone = (score) => {
  if (score === null || score === undefined) return 'text-slate-500';
  if (score >= 80) return 'text-emerald-300';
  if (score >= 50) return 'text-amber-300';
  return 'text-red-300';
};

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
  }
  const nodes = [];
  let i = 0;
  let key = 0;
  while (i < marks.length) {
    let j = i;
    while (j < marks.length && marks[j] === marks[i]) j++;
    const piece = text.slice(from + i, from + j);
    nodes.push(marks[i] ? <span key={key++} className={marks[i]}>{piece}</span> : <span key={key++}>{piece}</span>);
    i = j;
  }
  return nodes;
}

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
      ))}
    </div>
  );
}

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
    </motion.section>
  );
}

export default function AnalysisDashboard() {
  const { id } = useParams();
  const [state, setState] = useState({ loading: true, title: '', fileName: '', lines: null, overall: null, error: '' });

  const load = useCallback(async () => {
    const [info, result] = await Promise.all([api.get(`/documents/${id}/analysis`), api.get(`/documents/${id}/lines`)]);
    return {
      title: info.data.title,
      fileName: info.data.hasFile ? info.data.fileName : 'Typed text',
      lines: result.data.lines,
      overall: result.data.overall,
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
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          Analysis complete
        </span>
      </div>

      <Alert>{state.error}</Alert>

      {state.lines && !hasText && <p className="card p-8 text-center text-sm text-slate-400">There is no text to analyze in this document.</p>}

      {hasText && (
        <>
          <ReadabilityScore overall={state.overall} />
          <IssueCounts lines={state.lines} />
          <ReadabilityIssues lines={state.lines} />
        </>
      )}
    </div>
  );
}
