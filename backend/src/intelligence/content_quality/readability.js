// Readability engine (PDF Phase 5).
//
// Metric: Flesch Reading Ease  = 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words)
//         Flesch-Kincaid Grade = 0.39 * (words / sentences) + 11.8 * (syllables / words) - 15.59
// 60-70 reading ease is plain English; below 30 is very hard. The score alone is
// not actionable, so the engine also reports the specific sentences and words
// that make the text hard to read.
import { createFinding, proseBlocks } from '../findings.js';
import { countSyllables, matchCase, splitSentences, termRegex, words } from '../text.js';

// Difficult wording -> plain alternative.
export const PLAIN_WORDS = {
  utilize: 'use',
  utilise: 'use',
  utilization: 'use',
  facilitate: 'help',
  commence: 'start',
  terminate: 'end',
  endeavor: 'try',
  ascertain: 'find out',
  subsequently: 'later',
  approximately: 'about',
  numerous: 'many',
  sufficient: 'enough',
  demonstrate: 'show',
  purchase: 'buy',
  assistance: 'help',
  additional: 'more',
  'in order to': 'to',
  'prior to': 'before',
  'due to the fact that': 'because',
  'at this point in time': 'now',
  'in the event that': 'if',
  'with regard to': 'about',
  'a large number of': 'many',
  'is able to': 'can',
};

export const FILLER_WORDS = ['very', 'really', 'basically', 'actually', 'quite', 'literally'];

const PASSIVE_RE =
  /\b(am|is|are|was|were|be|been|being)\s+(?:\w+ly\s+)?(\w+ed|known|done|made|given|taken|seen|written|built|sent|shown|found|held|kept|left|paid|told|chosen|driven|grown|thrown|broken|spoken)\b/gi;
// Participles that usually work as adjectives ("we were surprised"), plus words that merely end in -ed.
const NOT_PASSIVE = new Set([
  'interested', 'tired', 'excited', 'married', 'supposed', 'used', 'based', 'related', 'concerned', 'pleased',
  'surprised', 'worried', 'confused', 'convinced', 'prepared', 'qualified', 'satisfied', 'disappointed',
  'amazed', 'bored', 'scared', 'delighted', 'committed', 'dedicated', 'located', 'involved', 'focused',
  'need', 'red', 'bed', 'seed', 'feed', 'speed', 'shed', 'hundred',
]);

export const DEFAULTS = {
  maxSentenceWords: 25,
  maxGradeLevel: 14,
  minReadingEase: 30,
  passiveSeverity: 'info',
  passiveRuleId: null,
  sentenceRuleId: null,
};

export function readabilityStats(text) {
  const sentences = splitSentences(text);
  const w = words(text);
  const syllables = w.reduce((s, word) => s + countSyllables(word), 0);
  const sCount = Math.max(1, sentences.length);
  const wCount = Math.max(1, w.length);
  const readingEase = 206.835 - 1.015 * (wCount / sCount) - 84.6 * (syllables / wCount);
  const grade = 0.39 * (wCount / sCount) + 11.8 * (syllables / wCount) - 15.59;
  return {
    sentences: sentences.length,
    words: w.length,
    avgSentenceLength: Math.round((w.length / sCount) * 10) / 10,
    readingEase: Math.round(readingEase * 10) / 10,
    gradeLevel: Math.round(grade * 10) / 10,
  };
}

export function findPassive(sentence) {
  return [...sentence.matchAll(PASSIVE_RE)].filter((m) => !NOT_PASSIVE.has(m[2].toLowerCase())).map((m) => m[0]);
}

export function run(blocks, options = {}) {
  const cfg = { ...DEFAULTS, ...options };
  const findings = [];
  const prose = proseBlocks(blocks);

  for (const block of prose) {
    for (const sentence of splitSentences(block.text)) {
      const count = words(sentence).length;
      if (count > cfg.maxSentenceWords) {
        findings.push(
          createFinding({
            category: cfg.sentenceRuleId ? 'rule' : 'readability',
            check: 'readability.long_sentence',
            severity: 'warning',
            message: `This sentence is ${count} words long (limit ${cfg.maxSentenceWords}).`,
            text: sentence,
            suggestion: 'Split it into two or more shorter sentences.',
            blockId: block.blockId,
            ruleId: cfg.sentenceRuleId,
          })
        );
      }

      for (const phrase of findPassive(sentence)) {
        findings.push(
          createFinding({
            category: cfg.passiveRuleId ? 'rule' : 'readability',
            check: 'readability.passive_voice',
            severity: cfg.passiveSeverity,
            message: `Passive voice: "${phrase}".`,
            text: phrase,
            suggestion: 'Say who does the action, e.g. "The team reviewed it" instead of "It was reviewed".',
            confidence: 0.7,
            blockId: block.blockId,
            ruleId: cfg.passiveRuleId,
          })
        );
      }
    }

    for (const [hard, plain] of Object.entries(PLAIN_WORDS)) {
      for (const m of block.text.matchAll(termRegex(hard))) {
        findings.push(
          createFinding({
            category: 'readability',
            check: 'readability.difficult_wording',
            severity: 'info',
            message: `"${m[0]}" is harder to read than it needs to be.`,
            text: m[0],
            suggestion: `Use "${plain}" instead.`,
            replacement: matchCase(m[0], plain),
            blockId: block.blockId,
          })
        );
      }
    }

    for (const filler of FILLER_WORDS) {
      for (const m of block.text.matchAll(termRegex(filler))) {
        findings.push(
          createFinding({
            category: 'readability',
            check: 'readability.filler_word',
            severity: 'info',
            message: `"${m[0]}" is a filler word that adds little meaning.`,
            text: m[0],
            suggestion: `Remove "${m[0]}" or use a more precise word.`,
            replacement: '',
            confidence: 0.8,
            blockId: block.blockId,
          })
        );
      }
    }

    const stats = readabilityStats(block.text);
    if (stats.words >= 30 && stats.gradeLevel > cfg.maxGradeLevel) {
      findings.push(
        createFinding({
          category: 'readability',
          check: 'readability.complex_paragraph',
          severity: 'info',
          message: `This ${block.type} reads at grade level ${stats.gradeLevel} (target ${cfg.maxGradeLevel} or lower).`,
          text: block.text.slice(0, 160),
          suggestion: 'Use shorter sentences and simpler words.',
          blockId: block.blockId,
        })
      );
    }
  }

  const metrics = readabilityStats(prose.map((b) => b.text).join('\n'));
  if (metrics.words >= 100 && metrics.readingEase < cfg.minReadingEase) {
    findings.push(
      createFinding({
        category: 'readability',
        check: 'readability.hard_document',
        severity: 'warning',
        message: `The document is hard to read (reading ease ${metrics.readingEase}; aim for ${cfg.minReadingEase}+).`,
        suggestion: 'Shorten the longest sentences and replace formal words flagged below.',
      })
    );
  }

  return {
    findings,
    metrics,
    checks: [
      'readability.long_sentence',
      'readability.passive_voice',
      'readability.difficult_wording',
      'readability.filler_word',
      'readability.complex_paragraph',
      'readability.hard_document',
    ],
  };
}
