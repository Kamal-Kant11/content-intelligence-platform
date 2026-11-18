

import { SOUNDS } from './parameters.js';

const CONSONANT_SOUND_PREFIX = SOUNDS.consonantPrefix;
const VOWEL_SOUND_WORDS = new Set(SOUNDS.vowelWords);

export function startsWithVowelSound(word) {
  const lower = word.toLowerCase();
  if (VOWEL_SOUND_WORDS.has(lower)) return true;
  if (CONSONANT_SOUND_PREFIX.test(lower)) return false;
  return /^[aeiou]/i.test(lower);
}

const FIXES = [
  {
    pattern: /\b(\p{L}+)\s+\1\b/giu,
    to: (match, word) => (['that', 'had'].includes(word.toLowerCase()) ? match : word),
  },
  { pattern: /[^\S\n]{2,}/g, to: ' ' },
  { pattern: /[^\S\n]+([,.;:!?])/g, to: '$1' },
  { pattern: /([,;:])(?=\p{L})/gu, to: '$1 ' },
  { pattern: /(\p{L}{3,})([.!?])(?=\p{Lu})/gu, to: '$1$2 ' },
  { pattern: /(^|[.!?]\s+)(\p{Ll})/gmu, to: (match, before, letter) => before + letter.toUpperCase() },
  { pattern: /\bi\b(?!\.)/g, to: 'I' },
  { pattern: /\b(could|would|should|must) of\b/gi, to: '$1 have' },
  { pattern: /\balot\b/gi, to: 'a lot' },
  { pattern: /\byour welcome\b/gi, to: "you're welcome" },
  { pattern: /!{2,}/g, to: '!' },
  { pattern: /\?{2,}/g, to: '?' },
  {
    pattern: /\b([aA]n?)(\s+)(\p{L}+)/gu,
    to: (match, article, space, word) => {
      const capital = article[0] === 'A';
      const useAn = startsWithVowelSound(word);
      return (capital ? 'A' : 'a') + (useAn ? 'n' : '') + space + word;
    },
  },
];

export function optimizeLine(text) {
  let result = text;
  for (const fix of FIXES) result = result.replace(fix.pattern, fix.to);
  return result.trim();
}
