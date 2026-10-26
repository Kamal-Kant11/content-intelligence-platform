// The one analysis pipeline used for every input (file, URL, pasted text) and for optimized drafts.
import { applyGrammarFixes, checkGrammar, grammarScore } from '../analysis/grammar.js';
import { analyzeReadability } from '../analysis/readability.js';
import { simplifyText } from '../analysis/simplify.js';

export async function analyzeText(text) {
  const issues = await checkGrammar(text);
  const readability = analyzeReadability(text);
  return {
    grammar: { score: grammarScore(issues, readability.wordCount), issueCount: issues.length, issues },
    readability,
    wordCount: readability.wordCount,
    sentenceCount: readability.sentenceCount,
    charCount: text.length,
    analyzedAt: new Date(),
  };
}

// Builds the optimized draft from the original text and its analysis:
// LanguageTool fixes first (their positions refer to the original), then the readability rules.
export function buildOptimizedDraft(text, analysis) {
  const grammar = applyGrammarFixes(text, analysis.grammar.issues);
  const readability = simplifyText(grammar.text);
  return {
    text: readability.text,
    changes: [...grammar.changes, ...readability.changes],
    skippedSuggestions: grammar.skipped,
  };
}
