// Vocabulary engine (PDF Phase 7): forbidden, preferred and required terms.
//
// The configuration has the same shape as BrandRule.configuration, so active
// brand rules plug straight in (see intelligence/brand/ruleConfig.js).
import { createFinding } from '../findings.js';
import { matchCase, termRegex } from '../text.js';

export const DEFAULT_FORBIDDEN = [
  'synergy',
  'revolutionary',
  'game-changer',
  'game-changing',
  'world-class',
  'best-in-class',
  'cutting-edge',
  'bleeding-edge',
  'paradigm shift',
  'disruptive',
].map((term) => ({ term }));

export const DEFAULT_PREFERRED = [
  { term: 'e-mail', preferred: 'email' },
  { term: 'web site', preferred: 'website' },
  { term: 'on-line', preferred: 'online' },
  { term: 'whitelist', preferred: 'allowlist' },
  { term: 'blacklist', preferred: 'blocklist' },
  { term: 'click here', preferred: 'select this link' },
];

// forbiddenTerms: [{ term, replacement?, severity?, ruleId?, category? }]
// preferredTerms: [{ term, preferred, severity?, ruleId?, category? }]
// requiredTerms:  [{ term, severity?, ruleId?, category? }]
export function run(blocks, options = {}) {
  const forbiddenTerms = options.forbiddenTerms ?? DEFAULT_FORBIDDEN;
  const preferredTerms = options.preferredTerms ?? DEFAULT_PREFERRED;
  const requiredTerms = options.requiredTerms ?? [];
  const findings = [];

  for (const block of blocks) {
    for (const rule of forbiddenTerms) {
      for (const m of block.text.matchAll(termRegex(rule.term))) {
        findings.push(
          createFinding({
            category: rule.category || 'vocabulary',
            check: 'vocabulary.forbidden_term',
            severity: rule.severity || 'warning',
            message: `Avoid "${m[0]}".`,
            text: m[0],
            suggestion: rule.replacement ? `Use "${rule.replacement}" instead.` : 'Remove it or use more neutral language.',
            replacement: rule.replacement ? matchCase(m[0], rule.replacement) : '',
            blockId: block.blockId,
            ruleId: rule.ruleId || null,
          })
        );
      }
    }

    for (const rule of preferredTerms) {
      for (const m of block.text.matchAll(termRegex(rule.term))) {
        findings.push(
          createFinding({
            category: rule.category || 'vocabulary',
            check: 'vocabulary.preferred_term',
            severity: rule.severity || 'info',
            message: `Use "${rule.preferred}" instead of "${m[0]}".`,
            text: m[0],
            suggestion: `Replace with "${rule.preferred}".`,
            replacement: matchCase(m[0], rule.preferred),
            blockId: block.blockId,
            ruleId: rule.ruleId || null,
          })
        );
      }
    }
  }

  const fullText = blocks.map((b) => b.text).join('\n');
  for (const rule of requiredTerms) {
    if (!termRegex(rule.term, 'i').test(fullText)) {
      findings.push(
        createFinding({
          category: rule.category || 'messaging',
          check: 'vocabulary.required_term',
          severity: rule.severity || 'warning',
          message: `The content never mentions "${rule.term}".`,
          suggestion: `Mention "${rule.term}" where it fits naturally.`,
          ruleId: rule.ruleId || null,
        })
      );
    }
  }

  return {
    findings,
    checks: ['vocabulary.forbidden_term', 'vocabulary.preferred_term', ...(requiredTerms.length ? ['vocabulary.required_term'] : [])],
  };
}
