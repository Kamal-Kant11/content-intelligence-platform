// Parameter 1: grammar.
// Issues come from a LanguageTool server (a rule-based grammar checker, not a trained ML model).
// The score out of 100 is our own estimate built from those issues, not an official LanguageTool score.
import { config } from '../config/config.js';
import { HttpError, unavailable } from '../utils/httpError.js';

// --- Score -----------------------------------------------------------------
// score = 100 - PENALTY x (weighted issues per 1,000 words), clamped to 0..100.
// Short texts are treated as at least MIN_WORDS long so a single issue in a
// 10-word sentence does not drop the score to 0.
//   Example: 3 grammar issues (weight 2) in 300 words -> 6 x 1000/300 = 20 -> score 80.
export const ISSUE_WEIGHTS = {
  grammar: 2,
  misspelling: 2,
  duplication: 2,
  typographical: 1,
  inconsistency: 1,
  whitespace: 0.5,
  style: 0.5,
};
const DEFAULT_WEIGHT = 1;
const PENALTY = 1;
const MIN_WORDS = 100;

export function grammarScore(issues, wordCount) {
  if (!wordCount) return null;
  const weighted = issues.reduce((sum, issue) => sum + (ISSUE_WEIGHTS[issue.issueType] ?? DEFAULT_WEIGHT), 0);
  const perThousand = (weighted * 1000) / Math.max(wordCount, MIN_WORDS);
  return Math.max(0, Math.min(100, Math.round(100 - PENALTY * perThousand)));
}

// --- LanguageTool client ---------------------------------------------------
// The public API accepts about 20 KB per request, so long texts are sent in chunks
// cut at paragraph (or sentence, or word) boundaries.
const CHUNK_CHARS = 15_000;

export function chunkText(text, size = CHUNK_CHARS) {
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + size, text.length);
    if (end < text.length) {
      const window = text.slice(start, end);
      const cut = Math.max(window.lastIndexOf('\n'), window.lastIndexOf('. ') + 1, window.lastIndexOf(' '));
      if (cut > size / 2) end = start + cut + 1;
    }
    chunks.push({ start, text: text.slice(start, end) });
    start = end;
  }
  return chunks;
}

async function requestLanguageTool(text) {
  let res;
  try {
    res = await fetch(`${config.languageToolUrl}/v2/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: new URLSearchParams({ text, language: config.languageToolLanguage }),
      signal: AbortSignal.timeout(config.languageToolTimeoutMs),
    });
  } catch (err) {
    console.error(`LanguageTool request failed (${config.languageToolUrl}):`, err.message);
    throw unavailable(
      `The grammar service (LanguageTool) is not reachable at ${config.languageToolUrl}. ` +
        'Start your LanguageTool server or check LANGUAGETOOL_URL in backend/.env, then try again.'
    );
  }
  if (res.status === 429) {
    throw unavailable('LanguageTool rate limit reached. Wait a minute and try again, or run your own LanguageTool server.');
  }
  if (!res.ok) {
    console.error(`LanguageTool responded ${res.status}: ${(await res.text().catch(() => '')).slice(0, 300)}`);
    throw new HttpError(502, `The grammar service (LanguageTool) returned an error (status ${res.status}). Try again later.`);
  }
  const data = await res.json();
  return Array.isArray(data.matches) ? data.matches : [];
}

function toIssue(match, chunkStart, fullText) {
  const start = chunkStart + match.offset;
  const end = start + match.length;
  const replacements = (match.replacements || []).map((r) => r.value);
  return {
    message: match.message,
    shortMessage: match.shortMessage || '',
    ruleId: match.rule?.id || 'UNKNOWN',
    category: match.rule?.category?.name || 'Other',
    issueType: match.rule?.issueType || 'uncategorized',
    start,
    end,
    text: fullText.slice(start, end),
    suggestions: replacements.slice(0, 5),
    suggestionCount: replacements.length,
  };
}

export async function checkGrammar(text) {
  const issues = [];
  for (const chunk of chunkText(text)) {
    const matches = await requestLanguageTool(chunk.text);
    for (const match of matches) issues.push(toIssue(match, chunk.start, text));
  }
  return issues;
}

// Used by the health check. Never throws.
export async function pingLanguageTool() {
  try {
    const res = await fetch(`${config.languageToolUrl}/v2/languages`, { signal: AbortSignal.timeout(3000) });
    return res.ok ? 'up' : 'down';
  } catch {
    return 'down';
  }
}

// --- Corrections -----------------------------------------------------------
// Only unambiguous fixes are applied: the issue must have exactly one suggestion and be a
// mechanical type (spelling, grammar, typo, repeated word...). Style hints and issues with
// several possible fixes are left for the user to decide.
const AUTO_FIX_TYPES = new Set(['misspelling', 'grammar', 'typographical', 'duplication', 'whitespace', 'inconsistency']);

export function applyGrammarFixes(text, issues) {
  const fixable = issues
    .filter((i) => i.suggestionCount === 1 && AUTO_FIX_TYPES.has(i.issueType))
    .sort((a, b) => a.start - b.start);

  const changes = [];
  let out = '';
  let cursor = 0;
  for (const issue of fixable) {
    // Skip fixes that overlap an earlier one or no longer match the text.
    if (issue.start < cursor || text.slice(issue.start, issue.end) !== issue.text) continue;
    const replacement = issue.suggestions[0];
    out += text.slice(cursor, issue.start) + replacement;
    changes.push({ type: 'grammar', from: issue.text, to: replacement, reason: issue.message });
    cursor = issue.end;
  }
  out += text.slice(cursor);
  return { text: out, changes, skipped: issues.length - changes.length };
}
