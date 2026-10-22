// The one Finding shape every engine produces (Content Quality AND Brand Intelligence).
//
//   Finding     = what is wrong            ("This sentence is 41 words long.")
//   suggestion  = what to do about it      ("Split it into two sentences.")
//   replacement = optional exact fix the rewriter may apply. It is NOT the
//                 optimized content: optimization is a separate step.

export const CATEGORIES = [
  'grammar',
  'readability',
  'structure',
  'vocabulary',
  'voice',
  'messaging',
  'rule',
  'claim',
];
export const SEVERITIES = ['critical', 'warning', 'info'];

export function createFinding({
  category,
  check,
  severity = 'info',
  message,
  text = '',
  suggestion = '',
  replacement = null,
  confidence = 1,
  blockId = null,
  ruleId = null,
  source = 'deterministic',
  evidence = undefined,
}) {
  return {
    category,
    check,
    severity,
    message,
    text,
    suggestion,
    replacement,
    confidence: Math.round(confidence * 100) / 100,
    blockId,
    ruleId,
    source,
    ...(evidence ? { evidence } : {}),
  };
}

// Blocks that contain prose (headings are checked separately where relevant).
export const proseBlocks = (blocks) => blocks.filter((b) => b.type !== 'heading');
