// Engine for brand rules that are not covered by the content-quality engines:
//   pattern          - a regular expression the brand wants to flag
//   custom_semantic  - keyword-triggered guidance. A true semantic check needs a
//                      semantic model; this deterministic version flags blocks
//                      that mention the configured keywords.
import { createFinding } from '../findings.js';
import { termRegex, truncate } from '../text.js';

const MAX_PATTERN_LENGTH = 300;
const MAX_MATCHES_PER_RULE = 50;

export function compilePattern(pattern, flags = 'i') {
  if (typeof pattern !== 'string' || !pattern || pattern.length > MAX_PATTERN_LENGTH) return null;
  try {
    const safeFlags = [...new Set(`${flags || ''}g`.replace(/[^gimsu]/g, ''))].join('');
    return new RegExp(pattern, safeFlags);
  } catch {
    return null;
  }
}

export function run(blocks, { patterns = [], semantic = [] } = {}) {
  const findings = [];

  for (const rule of patterns) {
    const re = compilePattern(rule.pattern, rule.flags);
    if (!re) continue;
    let matches = 0;
    for (const block of blocks) {
      for (const m of block.text.matchAll(re)) {
        if (!m[0] || ++matches > MAX_MATCHES_PER_RULE) break;
        findings.push(
          createFinding({
            category: rule.category || 'rule',
            check: `rule.pattern.${rule.ruleId}`,
            severity: rule.severity || 'warning',
            message: rule.message || `Matches brand rule "${rule.name}".`,
            text: m[0],
            suggestion: rule.suggestion || '',
            replacement: typeof rule.replacement === 'string' ? rule.replacement : null,
            blockId: block.blockId,
            ruleId: rule.ruleId,
          })
        );
      }
    }
  }

  for (const rule of semantic) {
    if (!rule.keywords.length) continue;
    for (const block of blocks) {
      const hit = rule.keywords.find((k) => termRegex(k, 'i').test(block.text));
      if (!hit) continue;
      findings.push(
        createFinding({
          category: rule.category || 'messaging',
          check: `rule.semantic.${rule.ruleId}`,
          severity: rule.severity || 'info',
          message: rule.message || `Check this against brand rule "${rule.name}".`,
          text: truncate(block.text, 160),
          suggestion: rule.suggestion || '',
          confidence: 0.6,
          blockId: block.blockId,
          ruleId: rule.ruleId,
        })
      );
    }
  }

  return {
    findings,
    checks: [...patterns.map((r) => `rule.pattern.${r.ruleId}`), ...semantic.map((r) => `rule.semantic.${r.ruleId}`)],
  };
}
