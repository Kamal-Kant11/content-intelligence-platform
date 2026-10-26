import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpen, RefreshCw, ScanSearch, SpellCheck, Wand2 } from 'lucide-react';
import { api, getErrorMessage } from '../api/client.js';
import { Alert, Busy, PageHeader, ScoreRing, Spinner } from '../components/ui.jsx';
import { IssueList, SourceLine } from '../components/DocumentParts.jsx';
import { HighlightedText } from '../components/TextViews.jsx';
import { useDocument } from '../hooks/useDocument.js';

function Metric({ label, value, hint }) {
  return (
    <div className="rounded-xl bg-charcoal-950/60 px-4 py-3">
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className="mt-0.5 font-semibold text-white">{value}</dd>
      {hint && <p className="text-[11px] text-slate-500">{hint}</p>}
    </div>
  );
}

function AnalysisView({ text, analysis }) {
  const { grammar, readability } = analysis;
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <section className="card p-5">
          <div className="flex items-center gap-5">
            <ScoreRing score={grammar.score} />
            <div>
              <h2 className="flex items-center gap-2 font-semibold text-white">
                <SpellCheck size={18} className="text-indigo-400" /> Grammar
              </h2>
              <p className="mt-1 text-sm text-slate-300">
                {grammar.issueCount} issue{grammar.issueCount === 1 ? '' : 's'} found by LanguageTool in {analysis.wordCount} words.
              </p>
            </div>
          </div>
          <p className="mt-4 text-xs text-slate-400">
            Internal estimate: 100 minus weighted issues per 1,000 words (grammar and spelling count double). This is not an official LanguageTool score.
          </p>
        </section>

        <section className="card p-5">
          <div className="flex items-center gap-5">
            <ScoreRing score={readability.score} />
            <div>
              <h2 className="flex items-center gap-2 font-semibold text-white">
                <BookOpen size={18} className="text-violet-400" /> Readability
              </h2>
              <p className="mt-1 text-sm text-slate-300">
                {readability.level.label}
                {readability.level.audience && ` · ${readability.level.audience}`}
              </p>
            </div>
          </div>
          <p className="mt-4 text-xs text-slate-400">
            Flesch Reading Ease, a formula based on sentence length and syllables per word. Higher means easier to read. Raw scores outside 0–100 are shown as 0 or 100.
          </p>
        </section>
      </div>

      <section className="card p-5">
        <h2 className="font-semibold text-white">Readability metrics</h2>
        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric label="Flesch Reading Ease (raw)" value={readability.fleschReadingEase ?? '—'} />
          <Metric label="Reading level" value={readability.level.label} hint={readability.level.audience} />
          <Metric label="Words" value={readability.wordCount} />
          <Metric label="Sentences" value={readability.sentenceCount} />
          <Metric label="Avg. sentence length" value={`${readability.avgSentenceLength} words`} />
          <Metric label="Avg. word length" value={`${readability.avgWordLength} letters`} />
          <Metric label="Syllables per word" value={readability.avgSyllablesPerWord} />
          <Metric label="Long sentences" value={readability.longSentenceCount} hint="over 25 words" />
        </dl>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section className="card p-5">
          <h2 className="font-semibold text-white">Text with grammar issues highlighted</h2>
          <p className="mt-1 text-xs text-slate-400">Hover a highlighted word to see the message and suggestions.</p>
          <HighlightedText text={text} issues={grammar.issues} className="mt-4 max-h-[32rem] overflow-y-auto rounded-xl bg-charcoal-950/60 p-4" />
        </section>
        <section className="card p-5">
          <h2 className="font-semibold text-white">Grammar issues ({grammar.issueCount})</h2>
          <div className="mt-4 max-h-[34rem] overflow-y-auto pr-1">
            <IssueList issues={grammar.issues} />
          </div>
        </section>
      </div>
    </div>
  );
}

export default function DocumentResults() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { doc, setDoc, loadError } = useDocument(id);
  const [busy, setBusy] = useState(null); // 'analyze' | 'optimize'
  const [error, setError] = useState('');

  async function run(action) {
    setBusy(action);
    setError('');
    try {
      const res = await api.post(`/documents/${id}/${action}`);
      setDoc(res.data.document);
      if (action === 'optimize') navigate(`/documents/${id}/compare`);
    } catch (err) {
      setError(getErrorMessage(err, action === 'analyze' ? 'The analysis failed.' : 'Optimization failed.'));
    } finally {
      setBusy(null);
    }
  }

  if (loadError) {
    return (
      <div className="space-y-4">
        <Alert>{loadError}</Alert>
        <Link to="/documents" className="btn-secondary">
          <ArrowLeft size={16} /> Back to history
        </Link>
      </div>
    );
  }
  if (!doc) return <Spinner label="Loading document…" />;

  const analysis = doc.original.analysis;

  return (
    <div className="space-y-6">
      <PageHeader
        title={doc.title}
        actions={
          analysis && (
            <>
              <button type="button" className="btn-secondary" onClick={() => run('analyze')} disabled={!!busy}>
                <Busy busy={busy === 'analyze'} label="Re-run analysis" busyLabel="Analyzing…" icon={RefreshCw} />
              </button>
              {doc.optimized && (
                <Link to={`/documents/${id}/compare`} className="btn-secondary">
                  Open comparison <ArrowRight size={16} />
                </Link>
              )}
              <button type="button" className="btn-primary" onClick={() => run('optimize')} disabled={!!busy}>
                <Busy busy={busy === 'optimize'} label={doc.optimized ? 'Optimize again' : 'Optimize content'} busyLabel="Optimizing and re-checking…" icon={Wand2} />
              </button>
            </>
          )
        }
      >
        <Link to="/documents" className="mb-2 inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white">
          <ArrowLeft size={14} /> History
        </Link>
      </PageHeader>
      <SourceLine doc={doc} />

      <Alert>{error}</Alert>

      {!analysis ? (
        <section className="card p-5 sm:p-6">
          <h2 className="font-semibold text-white">Check the extracted text</h2>
          <p className="mt-1 text-sm text-slate-400">
            This is the text that will be analyzed ({doc.wordCount.toLocaleString()} words, {doc.original.text.length.toLocaleString()} characters). The original is
            saved as it is and never overwritten.
          </p>
          <div className="mt-4 max-h-[28rem] overflow-y-auto whitespace-pre-wrap break-words rounded-xl bg-charcoal-950/60 p-4 text-sm leading-7 text-slate-200">
            {doc.original.text}
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button type="button" className="btn-primary" onClick={() => run('analyze')} disabled={!!busy}>
              <Busy busy={busy === 'analyze'} label="Analyze content" busyLabel="Checking grammar and readability…" icon={ScanSearch} />
            </button>
            <Link to="/new" className="btn-secondary">
              Use different content
            </Link>
          </div>
        </section>
      ) : (
        <>
          {busy === 'optimize' && <Alert kind="info">Applying grammar fixes and readability rules, then analyzing the new draft…</Alert>}
          <AnalysisView text={doc.original.text} analysis={analysis} />
        </>
      )}
    </div>
  );
}
