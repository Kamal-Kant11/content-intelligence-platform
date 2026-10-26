import { CheckCircle2, ExternalLink } from 'lucide-react';
import { StatusBadge } from './ui.jsx';
import { formatDate, SOURCE_LABEL } from '../utils/format.js';

// Status, source and date line under a document title.
export function SourceLine({ doc }) {
  return (
    <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-400">
      <StatusBadge status={doc.status} />
      <span>{SOURCE_LABEL[doc.sourceType]}</span>
      {doc.sourceType === 'url' ? (
        <a href={doc.sourceName} target="_blank" rel="noopener noreferrer" className="inline-flex min-w-0 items-center gap-1 truncate text-indigo-300 hover:underline">
          <span className="truncate">{doc.sourceName}</span> <ExternalLink size={12} />
        </a>
      ) : (
        doc.sourceName && <span className="truncate">{doc.sourceName}</span>
      )}
      <span>· added {formatDate(doc.createdAt)}</span>
    </p>
  );
}

// A list of LanguageTool issues; renderAction adds a button to each one.
export function IssueList({ issues, emptyText = 'No grammar issues found.', renderAction }) {
  if (!issues.length) {
    return (
      <p className="flex items-center gap-2 text-sm text-emerald-300">
        <CheckCircle2 size={16} /> {emptyText}
      </p>
    );
  }
  return (
    <ol className="space-y-2">
      {issues.map((issue, i) => (
        <li key={`${issue.start}-${i}`} className="rounded-lg border border-charcoal-700 p-3 text-sm">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="text-white">
              <span className="mr-1.5 rounded bg-red-500/10 px-1.5 py-0.5 font-medium text-red-300">{issue.text || '(missing text)'}</span>
              {issue.message}
            </p>
            {renderAction?.(issue)}
          </div>
          <p className="mt-1.5 text-xs text-slate-400">
            {issue.suggestions.length > 0 ? (
              <>
                Suggestion{issue.suggestionCount > 1 ? 's' : ''}: <span className="font-medium text-emerald-300">{issue.suggestions.join(', ')}</span>
                {issue.suggestionCount > issue.suggestions.length && ` (+${issue.suggestionCount - issue.suggestions.length} more)`}
              </>
            ) : (
              'No suggestion available'
            )}
            <span className="mx-1.5">·</span>
            {issue.category} · <code className="text-[11px]">{issue.ruleId}</code>
          </p>
        </li>
      ))}
    </ol>
  );
}
