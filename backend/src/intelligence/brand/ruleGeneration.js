// Rule generation (PDF Phase 19): Observations -> SUGGESTED rules.
//
// Nothing becomes active automatically. A person accepts, edits or rejects
// each suggestion. Every rule has a fingerprint so a re-learn does not suggest
// the same rule again, including one the user already rejected.

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

function ruleFor(o) {
  const why = `Suggested because: ${o.observation}`;
  const severity = o.origin === 'explicit' ? 'warning' : 'info';
  const d = o.data;

  switch (d.kind) {
    case 'forbidden':
      return {
        name: `Avoid ${d.terms.slice(0, 3).join(', ')}${d.terms.length > 3 ? '…' : ''}`,
        type: 'forbidden_term',
        category: 'vocabulary',
        severity: 'warning',
        description: why,
        configuration: { terms: d.terms },
        fingerprint: `forbidden_term:${d.terms.map((t) => t.toLowerCase()).sort().join('|')}`,
      };
    case 'preferred':
      return {
        name: `Use "${d.preferred}" instead of "${d.term}"`,
        type: 'preferred_term',
        category: 'vocabulary',
        severity,
        description: why,
        configuration: { preferred: d.preferred, alternatives: [d.term] },
        fingerprint: `preferred_term:${d.term.toLowerCase()}`,
      };
    case 'required':
      return {
        name: `Mention ${d.terms.join(', ')}`,
        type: 'required_term',
        category: 'messaging',
        severity,
        description: why,
        configuration: { terms: d.terms },
        fingerprint: `required_term:${d.terms.map((t) => t.toLowerCase()).sort().join('|')}`,
      };
    case 'passive':
      return {
        name: 'Prefer active voice',
        type: 'passive_voice',
        category: 'rule',
        severity,
        description: why,
        configuration: {},
        fingerprint: 'passive_voice',
      };
    case 'sentenceLength': {
      const maxWords = d.maxWords ?? clamp(Math.ceil(d.p90 + 1), 15, 35);
      return {
        name: `Keep sentences under ${maxWords} words`,
        type: 'sentence_length',
        category: 'rule',
        severity,
        description: why,
        configuration: { maxWords },
        fingerprint: 'sentence_length',
      };
    }
    default:
      return null;
  }
}

// observations: saved Observation documents (with _id).
export function generateRules(observations) {
  const rules = [];
  const byFingerprint = new Map();

  // Explicit observations first so they win over inferred ones with the same fingerprint.
  const ordered = [...observations].sort((a, b) => (a.origin === 'explicit' ? -1 : 1) - (b.origin === 'explicit' ? -1 : 1));
  for (const o of ordered) {
    const rule = ruleFor(o);
    if (!rule || byFingerprint.has(rule.fingerprint)) continue;
    rule.observationIds = [o._id];
    byFingerprint.set(rule.fingerprint, rule);
    rules.push(rule);
  }

  // One tone rule from all tone observations.
  const tones = observations.filter((o) => o.data.kind === 'tone' && o.data.share >= 0.25);
  if (tones.length) {
    const allowed = tones.map((o) => o.data.label);
    rules.push({
      name: `Write in a ${allowed.join(' / ')} tone`,
      type: 'tone',
      category: 'voice',
      severity: 'warning',
      description: `Suggested because: ${tones.map((o) => o.observation).join(' ')}`,
      configuration: { allowed, minConfidence: 0.6 },
      fingerprint: `tone:${[...allowed].sort().join('|')}`,
      observationIds: tones.map((o) => o._id),
    });
  }

  return rules;
}
