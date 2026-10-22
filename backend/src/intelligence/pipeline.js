// The analysis pipeline as a pure function: blocks in, findings + score out.
// No database and no Express, so it can be unit-tested directly.
//
//            ┌ grammar / readability / structure / vocabulary   (content quality)
//  blocks ───┼ voice (tone model) / brand rules                  (brand intelligence)
//            └ claims (claim model + source evidence)            (claims)
//                         │
//                     findings ──> scorer ──> score
import * as grammar from './content_quality/grammar.js';
import * as readability from './content_quality/readability.js';
import * as structure from './content_quality/structure.js';
import * as vocabulary from './content_quality/vocabulary.js';
import * as voice from './brand/voice.js';
import * as brandRules from './brand/rules.js';
import * as claims from './claims/analysis.js';
import { buildEngineOptions } from './brand/ruleConfig.js';
import { score } from './scoring/scorer.js';
import { scoreSections } from './sections.js';

const SEVERITY_ORDER = { critical: 0, warning: 1, info: 2 };

// classify(modelName, text) -> prediction | null
export function runAnalysis(blocks, { rules = [], brandVoice = null, chunks = [], classify = () => null } = {}) {
  const opts = buildEngineOptions(rules);
  // Without an approved tone rule, the brand profile's tone still guides voice checks (as info).
  if (!opts.voice && brandVoice?.tone?.length) opts.voice = { allowed: brandVoice.tone, minConfidence: 0.6, severity: 'info' };

  const engines = {
    grammar: () => grammar.run(blocks),
    readability: () => readability.run(blocks, opts.readability),
    structure: () => structure.run(blocks),
    vocabulary: () => vocabulary.run(blocks, opts.vocabulary),
    voice: () => voice.run(blocks, opts.voice, classify),
    rules: () => brandRules.run(blocks, opts),
    claims: () => claims.run(blocks, { chunks, options: opts.claims }, classify),
  };

  let findings = [];
  const checks = [];
  const metrics = { limits: { maxSentenceWords: opts.readability.maxSentenceWords ?? readability.DEFAULTS.maxSentenceWords } };
  for (const [name, run] of Object.entries(engines)) {
    const result = run();
    findings.push(...result.findings);
    checks.push(...result.checks);
    if (result.metrics) metrics[name] = result.metrics;
  }

  // Same issue reported twice for the same text (e.g. a default term and a brand rule) -> keep one.
  const seen = new Set();
  findings = findings.filter((f) => {
    const key = `${f.blockId}|${f.check}|${f.text}|${f.ruleId ?? ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const position = Object.fromEntries(blocks.map((b) => [b.blockId, b.position]));
  findings.sort(
    (a, b) =>
      (position[a.blockId] ?? -1) - (position[b.blockId] ?? -1) || SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
  );
  findings.forEach((f, i) => (f.findingId = `f_${String(i + 1).padStart(3, '0')}`));
  metrics.sections = scoreSections(blocks, findings);

  return { findings, metrics, checks, engines: Object.keys(engines), ...score(findings, checks) };
}
