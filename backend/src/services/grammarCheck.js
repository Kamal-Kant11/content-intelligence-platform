import { GRAMMAR, SOUNDS, WORD_PATTERN } from './parameters.js';

const MIN_SCORED_WORDS = GRAMMAR.minScoredWords;
const EXAMPLES_PER_RULE = GRAMMAR.examplesPerRule;

const CONSONANT_SOUND_PREFIX = SOUNDS.consonantPrefix;
const VOWEL_SOUND_WORDS = new Set(SOUNDS.vowelWords);

function startsWithVowelSound(word) {
  const lower = word.toLowerCase();
  if (VOWEL_SOUND_WORDS.has(lower)) return true;
  if (CONSONANT_SOUND_PREFIX.test(lower)) return false;
  return /^[aeiou]/i.test(lower);
}

const RULES = [
  {
    id: 'repeated-word',
    label: 'Repeated word',
    pattern: /\b(\p{L}+)\s+\1\b/giu,
    accept: (m) => ['that', 'had'].includes(m[1].toLowerCase()),
  },
  {
    id: 'extra-spaces',
    label: 'Extra spaces',
    pattern: /[^\S\n]{2,}/g,
  },
  {
    id: 'space-before-punctuation',
    label: 'Space before punctuation',
    pattern: /\S[ \t]+[,;:.!?](?!\d)/g,
  },
  {
    id: 'missing-space-after-comma',
    label: 'Missing space after comma, semicolon or colon',
    pattern: /[,;:]\p{L}/gu,
  },
  {
    id: 'missing-space-after-sentence',
    label: 'Missing space after a sentence end',
    pattern: /[.!?]\p{Lu}/gu,
  },
  {
    id: 'lowercase-sentence-start',
    label: 'Sentence starts with a lowercase letter',
    pattern: /(?:^|[.!?]\s+)\p{Ll}/gmu,
  },
  {
    id: 'lowercase-i',
    label: 'Lowercase "i" should be "I"',
    pattern: /\bi\b/g,
    accept: (m, text) => text[m.index + 1] === '.',
  },
  {
    id: 'a-before-vowel',
    label: 'Use "an" before a vowel sound',
    pattern: /\ba\s+(\p{L}+)/giu,
    accept: (m) => !startsWithVowelSound(m[1]),
  },
  {
    id: 'an-before-consonant',
    label: 'Use "a" before a consonant sound',
    pattern: /\ban\s+(\p{L}+)/giu,
    accept: (m) => startsWithVowelSound(m[1]),
  },
  {
    id: 'could-of',
    label: 'Use "have" after could, would, should or must',
    pattern: /\b(could|would|should|must) of\b/gi,
  },
  {
    id: 'alot',
    label: 'Write "a lot" as two words',
    pattern: /\balot\b/gi,
  },
  {
    id: 'your-welcome',
    label: 'Use "you\'re welcome"',
    pattern: /\byour welcome\b/gi,
  },
  {
    id: 'repeated-punctuation',
    label: 'Repeated punctuation',
    pattern: /[!?]{2,}|\.{4,}/g,
  },
];

function snippet(text, index, length) {
  return text.slice(Math.max(0, index - 15), index + length + 15).replace(/\s+/g, ' ').trim();
}

function checkRule(text, rule) {
  const matches = [];
  for (const m of text.matchAll(rule.pattern)) {
    if (rule.accept && rule.accept(m, text)) continue;
    matches.push(m);
  }
  return {
    id: rule.id,
    label: rule.label,
    count: matches.length,
    examples: matches.slice(0, EXAMPLES_PER_RULE).map((m) => snippet(text, m.index, m[0].length)),
    spans: matches.map((m) => ({ start: m.index, end: m.index + m[0].length, kind: 'grammar', id: rule.id, label: rule.label })),
  };
}

function unbalancedBrackets(text) {
  const pairs = [
    ['(', ')'],
    ['[', ']'],
  ];
  const count = pairs.reduce((sum, [open, close]) => sum + Math.abs(text.split(open).length - text.split(close).length), 0);
  return count;
}

export function checkGrammar(text = '') {
  const words = (text.match(WORD_PATTERN) || []).length;
  if (words === 0) return { score: null, words: 0, issueCount: 0, issues: [] };

  const issues = RULES.map((rule) => checkRule(text, rule));
  const brackets = unbalancedBrackets(text);
  if (brackets > 0) issues.push({ id: 'unbalanced-brackets', label: 'Unbalanced brackets', count: brackets, examples: [] });

  const found = issues.filter((issue) => issue.count > 0);
  const issueCount = found.reduce((sum, issue) => sum + issue.count, 0);
  const penalty = (issueCount / Math.max(words, MIN_SCORED_WORDS)) * 100 * GRAMMAR.penaltyPer100Words;
  const score = Math.max(0, Math.round(100 - penalty));

  const spans = found.flatMap((issue) => issue.spans || []).sort((a, b) => a.start - b.start);
  return { score, words, issueCount, issues: found.map(({ spans: _spans, ...issue }) => issue), spans };
}
