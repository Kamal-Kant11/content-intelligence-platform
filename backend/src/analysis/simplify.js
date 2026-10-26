// Conservative readability rules. Each rule is a fixed, transparent text change:
//   1. Replace wordy phrases with plain equivalents that mean the same thing.
//   2. Split a sentence longer than LONG_SENTENCE_WORDS at a "; " or ", and/but/so"
//      when both halves are still full clauses (at least MIN_PART_WORDS words).
// Anything that does not match a rule is left exactly as it was. These rules cannot
// guarantee the meaning is preserved perfectly, which is why every change is shown for review.
import { getWords, SENTENCE_SPLIT_RE } from '../utils/text.js';
import { LONG_SENTENCE_WORDS } from './readability.js';

const MIN_PART_WORDS = 8;

const PLAIN_WORDING = [
  ['due to the fact that', 'because'],
  ['in spite of the fact that', 'although'],
  ['at this point in time', 'now'],
  ['in the event that', 'if'],
  ['for the purpose of', 'for'],
  ['in close proximity to', 'near'],
  ['in order to', 'to'],
  ['with regard to', 'about'],
  ['prior to', 'before'],
  ['is able to', 'can'],
  ['are able to', 'can'],
  ['utilization', 'use'],
  ['utilizes', 'uses'],
  ['utilized', 'used'],
  ['utilizing', 'using'],
  ['utilize', 'use'],
  ['utilises', 'uses'],
  ['utilised', 'used'],
  ['utilising', 'using'],
  ['utilise', 'use'],
  ['approximately', 'about'],
  ['numerous', 'many'],
  ['commence', 'begin'],
  ['commences', 'begins'],
  ['commencing', 'beginning'],
];

// Whole words only, so "self-sufficient" or "utilizer" are never touched.
const PHRASE_RULES = PLAIN_WORDING.map(([phrase, plain]) => ({
  phrase,
  plain,
  re: new RegExp(`(?<![\\p{L}\\p{N}'’-])${phrase.replace(/ /g, '\\s+')}(?![\\p{L}\\p{N}'’-])`, 'giu'),
}));

const matchCase = (original, replacement) =>
  /^\p{Lu}/u.test(original) ? replacement[0].toUpperCase() + replacement.slice(1) : replacement;

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function replaceWordyPhrases(sentence, changes) {
  let out = sentence;
  for (const { phrase, plain, re } of PHRASE_RULES) {
    out = out.replace(re, (match) => {
      const to = matchCase(match, plain);
      changes.push({ type: 'readability', from: match, to, reason: `Plain wording: "${phrase}" → "${plain}"` });
      return to;
    });
  }
  return out;
}

// Returns the sentence split into shorter sentences, or unchanged if no safe split point exists.
export function splitLongSentence(sentence, depth = 0) {
  if (depth > 2 || getWords(sentence).length <= LONG_SENTENCE_WORDS) return sentence;

  const half = getWords(sentence).length / 2;
  let best = null;
  for (const m of sentence.matchAll(/;\s+|,\s+(and|but|so)\s+/gi)) {
    const left = sentence.slice(0, m.index);
    const right = sentence.slice(m.index + m[0].length);
    const connector = m[1]?.toLowerCase();
    if (getWords(left).length < MIN_PART_WORDS || getWords(right).length < MIN_PART_WORDS) continue;
    // "apples, pears, and plums" is a list, not two clauses: the item before ", and" is short.
    if (connector === 'and' && left.includes(',') && getWords(left.slice(left.lastIndexOf(','))).length < 4) continue;
    const distance = Math.abs(getWords(left).length - half);
    if (!best || distance < best.distance) best = { left, right, connector, distance };
  }
  if (!best) return sentence;

  const { left, right, connector } = best;
  // "and" is dropped; "but" and "so" carry meaning, so they start the new sentence.
  const second = connector && connector !== 'and' ? `${capitalize(connector)} ${right}` : capitalize(right);
  return `${splitLongSentence(`${left.trimEnd()}.`, depth + 1)} ${splitLongSentence(second, depth + 1)}`;
}

export function simplifyText(text) {
  const changes = [];
  const out = text
    .split('\n')
    .map((line) =>
      line
        .split(SENTENCE_SPLIT_RE)
        .map((part, i) => {
          if (i % 2 === 1) return part; // whitespace between sentences
          const reworded = replaceWordyPhrases(part, changes);
          const split = splitLongSentence(reworded);
          if (split !== reworded) {
            changes.push({
              type: 'readability',
              from: reworded,
              to: split,
              reason: `Split a ${getWords(reworded).length}-word sentence into shorter sentences`,
            });
          }
          return split;
        })
        .join('')
    )
    .join('\n');
  return { text: out, changes };
}
