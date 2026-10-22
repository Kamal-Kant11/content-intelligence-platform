// Same grouping as backend/src/intelligence/sections.js: a section starts at
// each heading; blocks before the first heading form an "Introduction".
export function buildSections(blocks = []) {
  const sections = [];
  let current = null;
  for (const block of [...blocks].sort((a, b) => a.position - b.position)) {
    if (block.type === 'heading' || !current) {
      current = {
        sectionId: `sec_${String(sections.length + 1).padStart(2, '0')}`,
        title: block.type === 'heading' ? block.text : 'Introduction',
        blocks: [],
      };
      sections.push(current);
    }
    current.blocks.push(block);
  }
  return sections;
}

export const countWords = (text = '') => (text.match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g) || []).length;

// Client-side preview of block parsing for the editor (mirrors the backend rules).
export function previewBlocks(text = '') {
  const out = [];
  for (const chunk of text.replace(/\r\n?/g, '\n').split(/\n\s*\n/)) {
    const lines = chunk.split('\n').map((l) => l.trim()).filter(Boolean);
    let current = null;
    for (const line of lines) {
      const h = line.match(/^(#{1,6})\s+(.*)$/);
      const li = line.match(/^(?:[-*•]|\d+[.)])\s+(.*)$/);
      const q = line.match(/^>\s?(.*)$/);
      if (h) {
        current = null;
        out.push({ type: 'heading', text: h[2] });
      } else if (li) {
        if (current?.type !== 'list') out.push((current = { type: 'list', text: '' }));
        current.text += (current.text ? '\n' : '') + li[1];
      } else if (q) {
        if (current?.type !== 'quote') out.push((current = { type: 'quote', text: '' }));
        current.text += (current.text ? ' ' : '') + q[1];
      } else {
        if (current?.type !== 'paragraph') out.push((current = { type: 'paragraph', text: '' }));
        current.text += (current.text ? ' ' : '') + line;
      }
    }
  }
  return out.filter((b) => b.text);
}
