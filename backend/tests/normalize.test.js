// PDF Task 3.3: block creation must be predictable.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assembleContent, normalizeText, parseBlocks } from '../src/intelligence/normalize.js';

test('heading, paragraph, paragraph, list -> four predictable blocks', () => {
  const blocks = parseBlocks(`# Product update

This is the first paragraph.
It wraps onto a second line.

This is the second paragraph.

- First item
- Second item`);

  assert.deepEqual(
    blocks.map((b) => [b.blockId, b.type, b.position]),
    [
      ['block_01', 'heading', 0],
      ['block_02', 'paragraph', 1],
      ['block_03', 'paragraph', 2],
      ['block_04', 'list', 3],
    ]
  );
  assert.equal(blocks[0].level, 1);
  assert.equal(blocks[1].text, 'This is the first paragraph. It wraps onto a second line.');
  assert.equal(blocks[3].text, 'First item\nSecond item');
});

test('quotes and numbered lists are recognised', () => {
  const blocks = parseBlocks('> A customer quote.\n\n1. one\n2. two');
  assert.deepEqual(blocks.map((b) => b.type), ['quote', 'list']);
});

test('a short title line in plain text becomes a heading', () => {
  const blocks = parseBlocks('Quarterly Results\n\nRevenue grew this quarter.');
  assert.equal(blocks[0].type, 'heading');
  assert.equal(blocks[1].type, 'paragraph');
});

test('same input always gives the same blocks', () => {
  const text = '# A\n\nB text.\n\n- c';
  assert.deepEqual(parseBlocks(text), parseBlocks(text));
});

test('assembleContent round-trips through parseBlocks', () => {
  const blocks = parseBlocks('# Title\n\nParagraph one.\n\n- a\n- b\n\n> quote');
  assert.deepEqual(parseBlocks(assembleContent(blocks)), blocks);
});

test('normalizeText cleans line endings, null bytes and extra blank lines', () => {
  assert.equal(normalizeText('a\r\n\r\n\r\n\r\nb\0  '), 'a\n\nb');
});
