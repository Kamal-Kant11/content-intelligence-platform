// Structure engine (PDF Phase 6): simple, deterministic structural checks.
import { createFinding } from '../findings.js';
import { splitSentences, truncate, words } from '../text.js';

export const DEFAULTS = {
  maxParagraphWords: 150,
  maxParagraphSentences: 6,
  maxHeadingWords: 12,
  headingEveryWords: 300,
};

export function run(blocks, options = {}) {
  const cfg = { ...DEFAULTS, ...options };
  const findings = [];
  let totalWords = 0;

  for (const block of blocks) {
    const count = words(block.text).length;
    totalWords += count;

    if (block.type === 'paragraph') {
      if (count > cfg.maxParagraphWords) {
        findings.push(
          createFinding({
            category: 'structure',
            check: 'structure.long_paragraph',
            severity: 'warning',
            message: `This paragraph is ${count} words long (limit ${cfg.maxParagraphWords}).`,
            text: truncate(block.text, 160),
            suggestion: 'Break it into smaller paragraphs, one idea each.',
            blockId: block.blockId,
          })
        );
      } else {
        const sentenceCount = splitSentences(block.text).length;
        if (sentenceCount > cfg.maxParagraphSentences) {
          findings.push(
            createFinding({
              category: 'structure',
              check: 'structure.many_sentences',
              severity: 'info',
              message: `This paragraph has ${sentenceCount} sentences.`,
              text: truncate(block.text, 160),
              suggestion: `Keep paragraphs to ${cfg.maxParagraphSentences} sentences or fewer.`,
              blockId: block.blockId,
            })
          );
        }
      }
    }

    if (block.type === 'heading' && count > cfg.maxHeadingWords) {
      findings.push(
        createFinding({
          category: 'structure',
          check: 'structure.long_heading',
          severity: 'info',
          message: `This heading is ${count} words long.`,
          text: block.text,
          suggestion: `Keep headings under ${cfg.maxHeadingWords} words.`,
          blockId: block.blockId,
        })
      );
    }

    if (block.type === 'list' && block.text.split('\n').length === 1) {
      findings.push(
        createFinding({
          category: 'structure',
          check: 'structure.single_item_list',
          severity: 'info',
          message: 'This list has only one item.',
          text: block.text,
          suggestion: 'Turn it into a sentence, or add more items.',
          blockId: block.blockId,
        })
      );
    }
  }

  const headings = blocks.filter((b) => b.type === 'heading').length;
  if (totalWords > cfg.headingEveryWords && headings === 0) {
    findings.push(
      createFinding({
        category: 'structure',
        check: 'structure.no_headings',
        severity: 'info',
        message: `The document has ${totalWords} words but no headings.`,
        suggestion: 'Add headings so readers can scan the content.',
      })
    );
  }

  return {
    findings,
    metrics: { blocks: blocks.length, headings, words: totalWords },
    checks: [
      'structure.long_paragraph',
      'structure.many_sentences',
      'structure.long_heading',
      'structure.single_item_list',
      'structure.no_headings',
    ],
  };
}
