import { diffWords } from 'diff';

const MARK_STYLE = {
  misspelling: 'bg-red-500/20 decoration-red-400',
  grammar: 'bg-red-500/20 decoration-red-400',
  duplication: 'bg-red-500/20 decoration-red-400',
  typographical: 'bg-amber-500/20 decoration-amber-400',
};
const DEFAULT_MARK = 'bg-violet-500/20 decoration-violet-400';

// Shows text with each grammar issue underlined; hovering shows the LanguageTool message.
export function HighlightedText({ text, issues = [], className = '' }) {
  const parts = [];
  let cursor = 0;
  [...issues]
    .map((issue, index) => ({ ...issue, index }))
    .sort((a, b) => a.start - b.start)
    .forEach((issue) => {
      if (issue.start < cursor || issue.end <= issue.start) return;
      parts.push(text.slice(cursor, issue.start));
      parts.push(
        <mark
          key={issue.index}
          title={`${issue.message}${issue.suggestions?.length ? ` → ${issue.suggestions.join(', ')}` : ''}`}
          className={`rounded-sm text-inherit underline decoration-2 underline-offset-2 ${MARK_STYLE[issue.issueType] || DEFAULT_MARK}`}
        >
          {text.slice(issue.start, issue.end)}
        </mark>
      );
      cursor = issue.end;
    });
  parts.push(text.slice(cursor));
  return <div className={`whitespace-pre-wrap break-words text-sm leading-7 text-slate-200 ${className}`}>{parts}</div>;
}

// Word-level differences between two texts.
//   mode "both":    removed words struck through in red, added words in green
//   mode "removed": only what was removed (for the original panel)
//   mode "added":   only what was added
export function DiffText({ before, after, mode = 'both', className = '' }) {
  const parts = diffWords(before, after);
  return (
    <div className={`whitespace-pre-wrap break-words text-sm leading-7 text-slate-200 ${className}`}>
      {parts.map((part, i) => {
        if (part.removed) {
          if (mode === 'added') return null;
          return (
            <del key={i} className="rounded-sm bg-red-500/20 text-red-300 decoration-red-400">
              {part.value}
            </del>
          );
        }
        if (part.added) {
          if (mode === 'removed') return null;
          return (
            <ins key={i} className="rounded-sm bg-emerald-500/20 text-emerald-300 no-underline">
              {part.value}
            </ins>
          );
        }
        return <span key={i}>{part.value}</span>;
      })}
    </div>
  );
}
