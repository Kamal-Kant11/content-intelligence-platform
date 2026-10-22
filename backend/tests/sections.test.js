import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseBlocks } from '../src/intelligence/normalize.js';
import { buildSections, scoreSections } from '../src/intelligence/sections.js';
import { renderBlocks, resolveFormat } from '../src/services/exportService.js';

const blocks = parseBlocks('Intro text here.\n\n# Pricing\n\nIt costs less.\n\n- a\n- b\n\n## FAQ\n\nAsk us.');

test('sections start at each heading; leading blocks form an Introduction', () => {
  const sections = buildSections(blocks);
  assert.deepEqual(sections.map((s) => [s.sectionId, s.title, s.blockIds.length]), [
    ['sec_01', 'Introduction', 1],
    ['sec_02', 'Pricing', 3],
    ['sec_03', 'FAQ', 2],
  ]);
});

test('each section is scored only on its own findings', () => {
  const findings = [{ blockId: 'block_03', category: 'grammar', check: 'x', severity: 'warning', confidence: 1 }];
  const [intro, pricing] = scoreSections(blocks, findings);
  assert.equal(intro.overallScore, 100);
  assert.equal(pricing.overallScore, 95);
  assert.equal(pricing.counts.warnings, 1);
});

test('export renders every format with the right file signature', async () => {
  const sig = async (format) => (await renderBlocks({ title: 'T', blocks, format })).buffer;
  assert.equal((await sig('docx')).subarray(0, 2).toString(), 'PK');
  assert.equal((await sig('pdf')).subarray(0, 4).toString(), '%PDF');
  assert.match((await sig('md')).toString(), /^Intro text here\.\n\n# Pricing/);
  assert.match((await sig('txt')).toString(), /• a\n• b/);
});

test('"source" format follows the uploaded file type', () => {
  assert.equal(resolveFormat('source', { source: { fileName: 'brief.PDF' } }), 'pdf');
  assert.equal(resolveFormat('source', { source: { fileName: 'notes.txt' } }), 'txt');
  assert.equal(resolveFormat(undefined, { source: {} }), 'docx');
  assert.throws(() => resolveFormat('exe', { source: {} }), /format must be one of/);
});
