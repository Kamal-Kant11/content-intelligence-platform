// Sections: groups of blocks under a heading. Like blocks, sections are a view
// of the document, not stored entities. Blocks before the first heading form
// an "Introduction" section.
import { countWords } from './normalize.js';
import { score } from './scoring/scorer.js';

export function buildSections(blocks) {
  const sections = [];
  let current = null;
  for (const block of [...blocks].sort((a, b) => a.position - b.position)) {
    if (block.type === 'heading' || !current) {
      current = {
        sectionId: `sec_${String(sections.length + 1).padStart(2, '0')}`,
        title: block.type === 'heading' ? block.text : 'Introduction',
        level: block.type === 'heading' ? block.level || 2 : 0,
        blockIds: [],
        wordCount: 0,
      };
      sections.push(current);
    }
    current.blockIds.push(block.blockId);
    current.wordCount += countWords(block.text);
  }
  return sections;
}

// Per-section score with the same formula as the whole document.
export function scoreSections(blocks, findings) {
  return buildSections(blocks).map((section) => {
    const ids = new Set(section.blockIds);
    const own = findings.filter((f) => ids.has(f.blockId));
    const { overallScore, summary, categoryScores } = score(own);
    return {
      ...section,
      overallScore,
      categoryScores,
      counts: { critical: summary.critical, warnings: summary.warnings, info: summary.info, total: summary.total },
    };
  });
}
