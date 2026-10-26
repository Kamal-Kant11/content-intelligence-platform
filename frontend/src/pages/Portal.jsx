import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, ClipboardList, FileText, PlusCircle } from 'lucide-react';
import { api, getErrorMessage } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Alert, EmptyState, PageHeader, Score, Spinner, StatusBadge } from '../components/ui.jsx';
import { formatDate, SOURCE_LABEL } from '../utils/format.js';

function StatCard({ icon: Icon, label, value, tone }) {
  return (
    <div className="card flex items-center gap-4 p-5">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tone}`}>
        <Icon size={20} />
      </span>
      <div>
        <p className="text-sm text-slate-400">{label}</p>
        <p className="text-2xl font-semibold text-white">{value}</p>
      </div>
    </div>
  );
}

// The dashboard a signed-in user sees.
export default function Portal() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/documents')
      .then((res) => setData(res.data))
      .catch((err) => setError(getErrorMessage(err, 'Could not load your documents.')));
  }, []);

  const recent = data?.documents.filter((d) => d.scores.originalGrammar !== null).slice(0, 5) ?? [];

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Welcome, ${user?.name?.split(' ')[0] || 'there'}`}
        subtitle="Check grammar and readability, review the optimized draft and download the approved version."
        actions={
          <Link to="/new" className="btn-primary">
            <PlusCircle size={16} /> New analysis
          </Link>
        }
      />

      <Alert>{error}</Alert>
      {!data && !error && <Spinner label="Loading your dashboard…" />}

      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard icon={FileText} label="Total documents" value={data.stats.total} tone="bg-indigo-500/10 text-indigo-300" />
            <StatCard icon={ClipboardList} label="Drafts awaiting review" value={data.stats.awaitingReview} tone="bg-amber-500/10 text-amber-300" />
            <StatCard icon={CheckCircle2} label="Approved documents" value={data.stats.approved} tone="bg-emerald-500/10 text-emerald-300" />
          </div>

          <section className="card">
            <div className="flex items-center justify-between border-b border-charcoal-800 px-5 py-4">
              <h2 className="font-semibold text-white">Recent analyses</h2>
              {data.stats.total > 0 && (
                <Link to="/documents" className="inline-flex items-center gap-1 text-sm font-medium text-indigo-300 hover:text-violet-300">
                  View all <ArrowRight size={14} />
                </Link>
              )}
            </div>
            {recent.length === 0 ? (
              <EmptyState
                icon={FileText}
                title={data.stats.total ? 'No analyses yet' : 'No documents yet'}
                text={
                  data.stats.total
                    ? 'Open a document and run the analysis to see its scores here.'
                    : 'Upload a file, enter a website URL or paste text to get your first grammar and readability scores.'
                }
                action={
                  <Link to={data.stats.total ? '/documents' : '/new'} className="btn-primary">
                    {data.stats.total ? 'Open history' : 'Start your first analysis'}
                  </Link>
                }
              />
            ) : (
              <ul className="divide-y divide-charcoal-800">
                {recent.map((doc) => (
                  <li key={doc.id}>
                    <Link to={`/documents/${doc.id}`} className="flex flex-col gap-2 px-5 py-4 transition hover:bg-charcoal-800/70 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-white">{doc.title}</p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {SOURCE_LABEL[doc.sourceType]} · {doc.wordCount} words · {formatDate(doc.updatedAt)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-4 text-sm">
                        <span className="text-slate-400">
                          Grammar <Score value={doc.scores.optimizedGrammar ?? doc.scores.originalGrammar} />
                        </span>
                        <span className="text-slate-400">
                          Readability <Score value={doc.scores.optimizedReadability ?? doc.scores.originalReadability} />
                        </span>
                        <StatusBadge status={doc.status} />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
