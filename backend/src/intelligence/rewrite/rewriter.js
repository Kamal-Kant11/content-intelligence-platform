// Rewriter (PDF Phase 12): findings -> proposed text for one block.
//
// Runs locally with no AI API. It applies the exact replacements engines
// attached to findings, splits overlong sentences at natural break points, and
// tidies spacing and punctuation. Findings without a safe automatic fix (passive
// voice, unsupported claims...) stay as suggestions for the reviewer.
import { escapeRegExp, splitSentences, words } from '../text.js';
import { startsWithVowelSound } from '../content_quality/grammar.js';

const SPLIT_POINTS = [/;\s+/, /,\s+(?:and|but|so|which means)\s+/i, /\s+(?:and|but)\s+(?=(?:we|you|they|it|this|the|our)\b)/i];

export function splitLongSentence(sentence, maxWords) {
  if (words(sentence).length <= maxWords) return sentence;
  for (const re of SPLIT_POINTS) {
    const m = sentence.match(re);
    if (!m) continue;
    const first = sentence.slice(0, m.index).trim();
    const rest = sentence.slice(m.index + m[0].length).trim();
    if (words(first).length < 5 || words(rest).length < 5) continue;
    const end = /[.!?]$/.test(rest) ? '' : '.';
    return `${first.replace(/[,;]$/, '')}. ${rest[0].toUpperCase()}${rest.slice(1)}${end}`;
  }
  return sentence;
}

function tidy(text) {
  return text
    .split('\n')
    .map((line) =>
      line
        .replace(/ {2,}/g, ' ')
        .replace(/\s+([,.;:!?])/g, '$1')
        .replace(/([,;])\1+/g, '$1')
        .replace(/^[,;]\s*/, '')
        .replace(/\b(a|an) ([A-Za-z][\w-]*)/gi, (m, art, w) => {
          const correct = startsWithVowelSound(w) ? 'an' : 'a';
          return `${art[0] === art[0].toUpperCase() ? correct[0].toUpperCase() + correct.slice(1) : correct} ${w}`;
        })
        .replace(/(^|[.!?]\s+)([a-z])/g, (m, p, c) => p + c.toUpperCase())
        .trim()
    )
    .join('\n');
}

// Replace the first occurrence of `find` (whole-word when it starts/ends with a word char).
// An empty replacement removes the word together with a comma that directly follows it.
function replaceOnce(text, find, replacement) {
  const left = /^\w/.test(find) ? '(?<![\\w-])' : '';
  const right = /\w$/.test(find) ? '(?![\\w-])' : '';
  const core = `${left}${escapeRegExp(find)}${right}`;
  const re = new RegExp(replacement === '' ? `\\s*${core}(?:\\s*,(?=\\s))?` : core);
  if (!re.test(text)) return null;
  return text.replace(re, replacement);
}

// block: { blockId, type, text }   findings: findings for this block
export function rewriteBlock(block, findings, { maxSentenceWords = 25, toneDown = false } = {}) {
  let text = block.text;
  const applied = [];

  for (const f of findings) {
    if (f.check === 'grammar.missing_end_punctuation') {
      if (!/[.!?:]$/.test(text)) {
        text = `${text}.`;
        applied.push(f);
      }
      continue;
    }
    if (f.replacement === null || f.replacement === undefined || !f.text) continue;
    const next = replaceOnce(text, f.text, f.replacement);
    if (next !== null && next !== text) {
      text = next;
      applied.push(f);
    }
  }

  const longSentences = findings.filter((f) => f.check === 'readability.long_sentence');
  if (longSentences.length && block.type !== 'heading') {
    const before = text;
    text = text
      .split('\n')
      .map((line) => splitSentences(line).map((s) => splitLongSentence(s, maxSentenceWords)).join(' '))
      .join('\n');
    if (text !== before) applied.push(...longSentences);
  }

  const toneFindings = findings.filter((f) => f.check === 'voice.tone_mismatch');
  if ((toneDown || toneFindings.length) && /!/.test(text)) {
    text = text.replace(/!+/g, '.');
    applied.push(...toneFindings);
  }

  text = block.type === 'heading' ? text.replace(/ {2,}/g, ' ').trim() : tidy(text);
  const reasons = [...new Set(applied.map((f) => f.message))];
  return { proposedText: text, changed: text !== block.text, reasons, findingIds: [...new Set(applied.map((f) => f.findingId).filter(Boolean))] };
}
