// Voice engine: classifies each block's tone with the local "tone" model and,
// when the brand defines allowed tones, flags blocks that don't match.
// Tone lives inside Voice (PDF section 7).
import { createFinding, proseBlocks } from '../findings.js';
import { truncate, words } from '../text.js';

const ADVICE = {
  promotional: 'Tone down the hype: drop superlatives, exclamation marks and sales phrases.',
  formal: 'Use plainer, more direct wording.',
  conversational: 'Use a more professional register.',
  technical: 'Explain the technical detail in plain language, or move it to documentation.',
};

export const MIN_WORDS = 8;

// classify(modelName, text) -> { label, confidence, scores } | null
export function run(blocks, options, classify) {
  const findings = [];
  const counts = {};
  let classified = 0;

  for (const block of proseBlocks(blocks)) {
    if (words(block.text).length < MIN_WORDS) continue;
    const result = classify('tone', block.text);
    if (!result) break; // model not trained/loaded: skip the engine
    classified += 1;
    counts[result.label] = (counts[result.label] || 0) + 1;

    const allowed = options?.allowed || [];
    if (allowed.length && !allowed.includes(result.label) && result.confidence >= (options.minConfidence ?? 0.6)) {
      findings.push(
        createFinding({
          category: options.category || 'voice',
          check: 'voice.tone_mismatch',
          severity: options.severity || 'warning',
          message: `This ${block.type} sounds ${result.label} (${Math.round(result.confidence * 100)}% confidence), but the brand voice is ${allowed.join(', ')}.`,
          text: truncate(block.text, 160),
          suggestion: ADVICE[result.label] || 'Rewrite it in the brand voice.',
          confidence: result.confidence,
          blockId: block.blockId,
          ruleId: options.ruleId || null,
          source: 'model',
        })
      );
    }
  }

  const toneDistribution = Object.fromEntries(Object.entries(counts).map(([l, n]) => [l, Math.round((n / classified) * 100) / 100]));
  const dominantTone = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  return {
    findings,
    metrics: { toneDistribution, dominantTone, blocksClassified: classified },
    checks: options?.allowed?.length ? ['voice.tone_mismatch'] : [],
  };
}
