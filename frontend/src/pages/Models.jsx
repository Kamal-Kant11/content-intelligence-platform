import { useEffect, useState } from 'react';
import { BrainCircuit } from 'lucide-react';
import AppShell from './AppShell.jsx';
import { api, getErrorMessage } from '../api/client.js';
import { ErrorAlert, PageHeader, Section, Spinner } from '../components/ui.jsx';
import { formatDateTime } from '../utils/format.js';

const pct = (n) => (n === undefined || n === null ? '—' : `${Math.round(n * 1000) / 10}%`);

export default function Models() {
  const [models, setModels] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/health/models')
      .then((res) => setModels(res.data.models))
      .catch((err) => setError(getErrorMessage(err, 'Could not load model information.')));
  }, []);

  return (
    <AppShell>
      <PageHeader
        title="Local models"
        subtitle="Trained on your own labelled data and run inside the backend. No external AI API is called."
      />

      <div className="mt-6 space-y-5">
        <ErrorAlert>{error}</ErrorAlert>
        {!models && !error && <Spinner />}
        {models?.length === 0 && (
          <ErrorAlert>No trained models are loaded. Run "npm run train" in backend/ and restart the API.</ErrorAlert>
        )}

        {models?.map((m) => (
          <Section key={m.name}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-medium text-white">
                  <BrainCircuit size={18} className="text-indigo-300" /> {m.name}
                </h2>
                <p className="mt-1 text-sm text-slate-400">{m.description}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-semibold text-emerald-300">{pct(m.metrics?.accuracy)}</p>
                <p className="text-xs text-slate-500">accuracy ({m.metrics?.folds}-fold cross-validation)</p>
              </div>
            </div>

            <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-4">
              <div>
                <dt className="text-slate-500">Version</dt>
                <dd className="text-slate-200">{m.version}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Trained</dt>
                <dd className="text-slate-200">{formatDateTime(m.trainedAt)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Training examples</dt>
                <dd className="text-slate-200">
                  {m.dataset?.examples} ({m.dataset?.file})
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Macro F1</dt>
                <dd className="text-slate-200">{pct(m.metrics?.macroF1)}</dd>
              </div>
            </dl>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-slate-500">
                  <tr>
                    <th className="py-1.5 pr-4 font-medium">Label</th>
                    <th className="py-1.5 pr-4 font-medium">Precision</th>
                    <th className="py-1.5 pr-4 font-medium">Recall</th>
                    <th className="py-1.5 pr-4 font-medium">F1</th>
                    <th className="py-1.5 font-medium">Examples</th>
                  </tr>
                </thead>
                <tbody className="text-slate-300">
                  {Object.entries(m.metrics?.perLabel || {}).map(([label, s]) => (
                    <tr key={label} className="border-t border-charcoal-700">
                      <td className="py-1.5 pr-4 capitalize">{label.replace('_', ' ')}</td>
                      <td className="py-1.5 pr-4">{pct(s.precision)}</td>
                      <td className="py-1.5 pr-4">{pct(s.recall)}</td>
                      <td className="py-1.5 pr-4">{pct(s.f1)}</td>
                      <td className="py-1.5">{s.support}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        ))}

        <Section title="How to train">
          <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-300">
            <li>
              Add labelled examples to <code className="text-indigo-300">backend/ml/data/tone.jsonl</code> or{' '}
              <code className="text-indigo-300">claim.jsonl</code>, one JSON object per line:{' '}
              <code className="text-slate-400">{'{"text": "...", "label": "conversational"}'}</code>
            </li>
            <li>
              Run <code className="text-indigo-300">npm run train</code> in <code>backend/</code>. It prints cross-validated accuracy and per-label
              scores, then saves <code>ml/models/&lt;name&gt;.json</code>.
            </li>
            <li>Restart the API. Analyses made after the restart use the new model version (cached results are not reused).</li>
          </ol>
        </Section>
      </div>
    </AppShell>
  );
}
