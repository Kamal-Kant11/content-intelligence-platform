// Grammar engine (PDF Phase 8).
//
// Deterministic rules for common, high-confidence mistakes: subject-verb
// agreement, tense clashes, punctuation, fragments, a/an, repeated words and
// frequent confusions. It is not a full grammar engine; each rule carries a
// confidence so the UI and scorer can weigh it.
import { createFinding, proseBlocks } from '../findings.js';
import { matchCase, splitSentences, words } from '../text.js';

// "an" is used before a vowel SOUND: "an hour", "a user", "an FAQ".
const VOWEL_SOUND_EXCEPTIONS = /^(hour|honest|honor|honour|heir)/i;
const CONSONANT_SOUND_EXCEPTIONS = /^(uni|use|usu|uti|eu|one|once|ubiq|ufo|uk\b|us\b)/i;
const LETTER_NAMES_WITH_VOWEL_SOUND = 'AEFHILMNORSX';

export function startsWithVowelSound(word) {
  if (/^[A-Z]{2,5}$/.test(word)) return LETTER_NAMES_WITH_VOWEL_SOUND.includes(word[0]); // acronym: "an FAQ", "a URL"
  if (VOWEL_SOUND_EXCEPTIONS.test(word)) return true;
  if (CONSONANT_SOUND_EXCEPTIONS.test(word)) return false;
  return /^[aeiou]/i.test(word);
}

// Each rule: regex over a sentence, message, replacement(match) and confidence.
const RULES = [
  {
    check: 'grammar.repeated_word',
    re: /\b(\w+)\s+\1\b/gi,
    when: (m) => !/^(that|had|is|bye|very|knock)$/i.test(m[1]),
    message: (m) => `Repeated word: "${m[0]}".`,
    suggestion: 'Remove the duplicate word.',
    replacement: (m) => m[1],
    severity: 'warning',
    confidence: 0.95,
  },
  {
    check: 'grammar.article',
    re: /\b(a|an)\s+([A-Za-z][\w-]*)/gi,
    when: (m) => (m[1].toLowerCase() === 'an') !== startsWithVowelSound(m[2]),
    message: (m) => `Use "${startsWithVowelSound(m[2]) ? 'an' : 'a'}" before "${m[2]}".`,
    suggestion: 'Fix the article.',
    replacement: (m) => `${matchCase(m[1], startsWithVowelSound(m[2]) ? 'an' : 'a')} ${m[2]}`,
    severity: 'warning',
    confidence: 0.85,
  },
  {
    check: 'grammar.subject_verb_agreement',
    re: /\b(he|she|it)\s+(don't|do not)\b/gi,
    message: (m) => `"${m[1]}" needs "${m[2].includes("'") ? "doesn't" : 'does not'}".`,
    replacement: (m) => `${m[1]} ${m[2].includes("'") ? "doesn't" : 'does not'}`,
    severity: 'warning',
    confidence: 0.95,
  },
  {
    check: 'grammar.subject_verb_agreement',
    re: /\b(he|she|it)\s+have\b/gi,
    message: (m) => `"${m[1]} have" should be "${m[1]} has".`,
    replacement: (m) => `${m[1]} has`,
    severity: 'warning',
    confidence: 0.85,
  },
  {
    check: 'grammar.subject_verb_agreement',
    re: /\b(we|they|you)\s+(was|is|has|does|doesn't)\b/gi,
    message: (m) => `"${m[1]} ${m[2]}" does not agree.`,
    replacement: (m) => `${m[1]} ${{ was: 'were', is: 'are', has: 'have', does: 'do', "doesn't": "don't" }[m[2].toLowerCase()]}`,
    severity: 'warning',
    confidence: 0.9,
  },
  {
    check: 'grammar.subject_verb_agreement',
    re: /\b(there|here)\s+(is|was)\s+(many|several|multiple|few|two|three|four|five|numerous)\b/gi,
    message: (m) => `"${m[1]} ${m[2]} ${m[3]}" should use a plural verb.`,
    replacement: (m) => `${m[1]} ${m[2].toLowerCase() === 'is' ? 'are' : 'were'} ${m[3]}`,
    severity: 'warning',
    confidence: 0.9,
  },
  {
    check: 'grammar.tense',
    re: /\b(yesterday|last (?:week|month|year))\b[^.!?]*\bwill\b|\bwill\b[^.!?]*\b(yesterday|last (?:week|month|year))\b/gi,
    message: () => 'Past time expression used with future tense ("will").',
    suggestion: 'Use the past tense, or change the time expression.',
    replacement: null,
    severity: 'warning',
    confidence: 0.75,
  },
  {
    check: 'grammar.confusion',
    re: /\b(could|should|would|must|might)\s+of\b/gi,
    message: (m) => `"${m[0]}" should be "${m[1]} have".`,
    replacement: (m) => `${m[1]} have`,
    severity: 'warning',
    confidence: 0.95,
  },
  {
    check: 'grammar.confusion',
    re: /\balot\b/gi,
    message: () => '"alot" should be "a lot".',
    replacement: (m) => matchCase(m[0], 'a lot'),
    severity: 'warning',
    confidence: 0.99,
  },
  {
    check: 'grammar.confusion',
    re: /\birregardless\b/gi,
    message: () => 'Use "regardless".',
    replacement: (m) => matchCase(m[0], 'regardless'),
    severity: 'info',
    confidence: 0.95,
  },
  {
    check: 'grammar.confusion',
    re: /\b(more|less|better|worse|faster|slower|greater|higher|lower|rather)\s+then\b/gi,
    message: (m) => `"${m[0]}" should use "than".`,
    replacement: (m) => `${m[1]} than`,
    severity: 'warning',
    confidence: 0.9,
  },
  {
    check: 'grammar.confusion',
    re: /\bits\s+(a|an|the|been|not|going|important|time|clear|possible|easy|hard)\b/gi,
    message: () => '"its" (possessive) should be "it\'s" (it is / it has).',
    replacement: (m) => `${matchCase(m[0], "it's")} ${m[1]}`,
    severity: 'warning',
    confidence: 0.8,
  },
  {
    check: 'grammar.confusion',
    re: /\byour\s+(welcome|right|wrong|going|not)\b/gi,
    message: (m) => `"your ${m[1]}" should be "you're ${m[1]}".`,
    replacement: (m) => `${matchCase(m[0], "you're")} ${m[1]}`,
    severity: 'warning',
    confidence: 0.85,
  },
  {
    check: 'grammar.punctuation',
    re: /\s+([,.;:!?])(?!\d)/g,
    message: () => 'Space before punctuation.',
    replacement: (m) => m[1],
    severity: 'info',
    confidence: 0.95,
  },
  {
    check: 'grammar.punctuation',
    re: /([,;])(?=[A-Za-z])/g,
    message: () => 'Missing space after punctuation.',
    replacement: (m) => `${m[1]} `,
    severity: 'info',
    confidence: 0.9,
  },
  {
    check: 'grammar.punctuation',
    re: /([!?.]){2,}/g,
    when: (m) => m[0] !== '...',
    message: () => 'Repeated punctuation.',
    replacement: (m) => m[1],
    severity: 'info',
    confidence: 0.9,
  },
];

const SUBORDINATE_START = /^(because|although|though|since|while|unless|whereas|which|if)\b/i;

export function run(blocks) {
  const findings = [];

  for (const block of proseBlocks(blocks)) {
    for (const line of block.text.split('\n')) {
      for (const sentence of splitSentences(line)) {
        for (const rule of RULES) {
          for (const m of sentence.matchAll(rule.re)) {
            if (rule.when && !rule.when(m)) continue;
            findings.push(
              createFinding({
                category: 'grammar',
                check: rule.check,
                severity: rule.severity,
                message: rule.message(m),
                text: m[0],
                suggestion: rule.suggestion || (rule.replacement ? `Change to "${rule.replacement(m)}".` : ''),
                replacement: rule.replacement ? rule.replacement(m) : null,
                confidence: rule.confidence,
                blockId: block.blockId,
              })
            );
          }
        }

        const count = words(sentence).length;
        if (block.type === 'paragraph' && /^[a-z]/.test(sentence)) {
          findings.push(
            createFinding({
              category: 'grammar',
              check: 'grammar.capitalization',
              severity: 'warning',
              message: 'Sentence starts with a lowercase letter.',
              text: sentence.slice(0, 40),
              suggestion: 'Capitalise the first word.',
              replacement: sentence[0].toUpperCase() + sentence.slice(1, 40),
              confidence: 0.9,
              blockId: block.blockId,
            })
          );
        }

        const fragment =
          block.type === 'paragraph' &&
          ((count > 0 && count <= 2 && /[.]$/.test(sentence)) ||
            (SUBORDINATE_START.test(sentence) && !sentence.includes(',') && count < 10));
        if (fragment) {
          findings.push(
            createFinding({
              category: 'grammar',
              check: 'grammar.fragment',
              severity: 'info',
              message: 'Possible sentence fragment.',
              text: sentence,
              suggestion: 'Make sure the sentence has a subject and a main verb, or join it to the previous sentence.',
              confidence: 0.55,
              blockId: block.blockId,
            })
          );
        }
      }
    }

    if (block.type === 'paragraph' && words(block.text).length > 3 && !/[.!?:"'”’)]$/.test(block.text)) {
      findings.push(
        createFinding({
          category: 'grammar',
          check: 'grammar.missing_end_punctuation',
          severity: 'info',
          message: 'Paragraph does not end with punctuation.',
          text: block.text.slice(-40),
          suggestion: 'End the sentence with a full stop.',
          replacement: `${block.text.slice(-40)}.`,
          confidence: 0.85,
          blockId: block.blockId,
        })
      );
    }
  }

  return {
    findings,
    checks: [
      'grammar.repeated_word',
      'grammar.article',
      'grammar.subject_verb_agreement',
      'grammar.tense',
      'grammar.confusion',
      'grammar.punctuation',
      'grammar.capitalization',
      'grammar.fragment',
      'grammar.missing_end_punctuation',
    ],
  };
}
