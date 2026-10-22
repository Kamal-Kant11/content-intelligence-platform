// Turns active brand rules into configuration for the analysis engines.
// This is the connection point described in PDF Phase 7 / Phase 20:
//   BrandRule.configuration -> engine options.
import { DEFAULT_FORBIDDEN, DEFAULT_PREFERRED } from '../content_quality/vocabulary.js';

export const RULE_TYPES = [
  'forbidden_term',
  'preferred_term',
  'required_term',
  'sentence_length',
  'passive_voice',
  'pattern',
  'tone',
  'claim',
  'custom_semantic',
];

const list = (v) => (Array.isArray(v) ? v : v ? [v] : []).map((s) => String(s).trim()).filter(Boolean);

export function buildEngineOptions(rules = []) {
  const forbidden = new Map(DEFAULT_FORBIDDEN.map((r) => [r.term.toLowerCase(), r]));
  const preferred = new Map(DEFAULT_PREFERRED.map((r) => [r.term.toLowerCase(), r]));
  const options = {
    vocabulary: { requiredTerms: [] },
    readability: {},
    voice: null,
    patterns: [],
    semantic: [],
    claims: null,
  };

  for (const rule of rules) {
    if (rule.status !== 'active' || rule.enabled === false) continue;
    const c = rule.configuration || {};
    const base = { ruleId: String(rule._id ?? rule.id), severity: rule.severity, category: rule.category };

    switch (rule.type) {
      case 'forbidden_term':
        for (const term of list(c.terms)) forbidden.set(term.toLowerCase(), { term, replacement: c.replacement || null, ...base });
        break;
      case 'preferred_term':
        for (const term of list(c.alternatives)) {
          if (c.preferred) preferred.set(term.toLowerCase(), { term, preferred: c.preferred, ...base });
        }
        break;
      case 'required_term':
        for (const term of list(c.terms)) options.vocabulary.requiredTerms.push({ term, ...base });
        break;
      case 'sentence_length':
        if (Number(c.maxWords) > 0) {
          options.readability.maxSentenceWords = Number(c.maxWords);
          options.readability.sentenceRuleId = base.ruleId;
        }
        break;
      case 'passive_voice':
        options.readability.passiveSeverity = rule.severity;
        options.readability.passiveRuleId = base.ruleId;
        break;
      case 'tone':
        options.voice = { allowed: list(c.allowed), minConfidence: Number(c.minConfidence) || 0.6, ...base };
        break;
      case 'pattern':
        if (c.pattern) options.patterns.push({ ...c, ...base, name: rule.name });
        break;
      case 'claim':
        options.claims = { requireEvidence: c.requireEvidence !== false, ...base };
        break;
      case 'custom_semantic':
        options.semantic.push({ keywords: list(c.keywords), message: c.message || rule.description, suggestion: c.suggestion, ...base, name: rule.name });
        break;
    }
  }

  options.vocabulary.forbiddenTerms = [...forbidden.values()];
  options.vocabulary.preferredTerms = [...preferred.values()];
  return options;
}
