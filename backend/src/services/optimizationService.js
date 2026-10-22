// Optimization (PDF Phase 12) + block-wise review (PDF Phase 13).
//
//   latest analysis -> rewriter -> proposed change per block -> review -> apply
//
// Final assembly:  approved -> proposed text,  rejected -> original text,
//                  edited   -> user's text.    originalContent is never touched.
import mongoose from 'mongoose';
import Analysis from '../models/Analysis.js';
import Optimization, { CHANGE_STATUSES } from '../models/Optimization.js';
import Document from '../models/Document.js';
import { badRequest, conflict, notFound } from '../utils/httpError.js';
import { assembleContent, countWords, parseBlocks } from '../intelligence/normalize.js';
import { rewriteBlock } from '../intelligence/rewrite/rewriter.js';
import { buildSections } from '../intelligence/sections.js';
import { getDocument } from './documentService.js';
import { fileName, renderBlocks, resolveFormat } from './exportService.js';
import { contentDigest } from './analysisService.js';

// POST /api/documents/:id/optimize
export async function createOptimization(userId, documentId) {
  const doc = await getDocument(userId, documentId);
  const analysis = await Analysis.findOne({ documentId: doc._id }).sort({ createdAt: -1 });
  if (!analysis) throw conflict('Analyze the document before optimizing it.');
  if (analysis.metrics?.contentDigest !== contentDigest(doc)) {
    throw conflict('The content changed since the last analysis. Run the analysis again first.');
  }

  const maxSentenceWords = analysis.metrics?.limits?.maxSentenceWords ?? 25;
  const sectionOf = new Map(buildSections(doc.blocks).flatMap((s) => s.blockIds.map((id) => [id, s])));
  const changes = [];
  for (const block of doc.blocks) {
    const blockFindings = analysis.findings.filter((f) => f.blockId === block.blockId);
    if (!blockFindings.length) continue;
    const result = rewriteBlock(block, blockFindings, { maxSentenceWords });
    if (!result.changed) continue;
    changes.push({
      changeId: `chg_${String(changes.length + 1).padStart(2, '0')}`,
      blockId: block.blockId,
      sectionId: sectionOf.get(block.blockId)?.sectionId ?? null,
      sectionTitle: sectionOf.get(block.blockId)?.title ?? null,
      originalText: block.text,
      proposedText: result.proposedText,
      reason: result.reasons.join(' '),
      findingIds: result.findingIds,
    });
  }

  // Only one open review per document.
  await Optimization.updateMany({ documentId: doc._id, status: 'open' }, { status: 'discarded' });
  const optimization = await Optimization.create({ documentId: doc._id, userId, analysisId: analysis._id, changes });

  doc.status = 'in_review';
  await doc.save();
  return optimization;
}

async function findOwned(userId, optimizationId) {
  const opt = mongoose.isValidObjectId(optimizationId)
    ? await Optimization.findOne({ _id: optimizationId, userId })
    : null;
  if (!opt) throw notFound('Optimization not found.');
  return opt;
}

export async function getOptimization(userId, documentId, optimizationId) {
  const opt = await findOwned(userId, optimizationId);
  if (documentId && String(opt.documentId) !== String(documentId)) throw notFound('Optimization not found.');
  return opt;
}

export async function listOptimizations(userId, documentId) {
  const doc = await getDocument(userId, documentId);
  return Optimization.find({ documentId: doc._id, userId }).sort({ createdAt: -1 }).limit(20);
}

function applyReview(opt, { changeId, status, editedText }) {
  const change = opt.changes.find((c) => c.changeId === changeId);
  if (!change) throw notFound(`Change ${changeId} not found.`);
  if (!CHANGE_STATUSES.includes(status)) throw badRequest(`status must be one of: ${CHANGE_STATUSES.join(', ')}.`);
  if (status === 'edited') {
    if (typeof editedText !== 'string' || !editedText.trim()) throw badRequest('editedText is required when status is "edited".');
    change.editedText = editedText.trim();
  } else {
    change.editedText = null;
  }
  change.status = status;
}

function assertOpen(opt) {
  if (opt.status !== 'open') throw conflict(`This optimization is already ${opt.status}.`);
}

// PATCH /api/optimizations/:id/changes/:changeId  { status, editedText? }
export async function reviewChange(userId, optimizationId, changeId, body = {}) {
  const opt = await findOwned(userId, optimizationId);
  assertOpen(opt);
  applyReview(opt, { changeId, status: body.status, editedText: body.editedText });
  return opt.save();
}

// POST /api/optimizations/:id/review  { changes: [{ changeId, status, editedText? }] }
export async function reviewChanges(userId, optimizationId, body = {}) {
  if (!Array.isArray(body.changes) || !body.changes.length) throw badRequest('changes must be a non-empty array.');
  const opt = await findOwned(userId, optimizationId);
  assertOpen(opt);
  for (const item of body.changes) applyReview(opt, item);
  return opt.save();
}

export function finalText(change) {
  if (change.status === 'approved') return change.proposedText;
  if (change.status === 'edited') return change.editedText;
  return change.originalText;
}

// POST /api/optimizations/:id/apply
export async function applyOptimization(userId, optimizationId) {
  const opt = await findOwned(userId, optimizationId);
  assertOpen(opt);
  const pending = opt.changes.filter((c) => c.status === 'pending').length;
  if (pending) throw conflict(`${pending} change(s) still need review.`);

  const doc = await Document.findOne({ _id: opt.documentId, userId });
  if (!doc) throw notFound('Document not found.');

  const blocks = doc.blocks.map((b) => b.toObject());
  for (const change of opt.changes) {
    const block = blocks.find((b) => b.blockId === change.blockId);
    if (!block || block.text !== change.originalText) {
      throw conflict('The document changed after this optimization was created. Optimize again.');
    }
    block.text = finalText(change);
  }

  // Re-parse so an edit that adds paragraphs or list items becomes proper blocks.
  doc.currentContent = assembleContent(blocks);
  doc.blocks = parseBlocks(doc.currentContent);
  doc.wordCount = countWords(doc.currentContent);
  doc.status = 'approved';
  await doc.save();

  opt.status = 'applied';
  opt.appliedAt = new Date();
  await opt.save();
  return { document: doc, optimization: opt };
}

const STATUS_LABEL = { approved: 'Approved', rejected: 'Rejected', edited: 'Edited', pending: 'Pending' };

// GET /api/optimizations/:id/report?format=docx|pdf|txt|md
// A change log: every proposed change grouped by section, with before / after / why.
export async function exportReport(userId, optimizationId, { format } = {}) {
  const opt = await findOwned(userId, optimizationId);
  const doc = await Document.findOne({ _id: opt.documentId, userId });
  if (!doc) throw notFound('Document not found.');
  const fmt = resolveFormat(format || 'docx', doc);

  const count = (s) => opt.changes.filter((c) => c.status === s).length;
  const blocks = [];
  const add = (type, text, level) => blocks.push({ blockId: `r${blocks.length}`, position: blocks.length, type, text, ...(level ? { level } : {}) });

  add('heading', `Change report: ${doc.title}`, 1);
  add(
    'paragraph',
    `${opt.changes.length} proposed change(s): ${count('approved')} approved, ${count('edited')} edited, ${count('rejected')} rejected, ${count('pending')} pending. ` +
      `Status: ${opt.status}${opt.appliedAt ? ` on ${opt.appliedAt.toISOString().slice(0, 16).replace('T', ' ')} UTC` : ''}.`
  );

  let lastSection;
  for (const change of opt.changes) {
    const section = change.sectionTitle || 'Document';
    if (section !== lastSection) {
      add('heading', section, 2);
      lastSection = section;
    }
    add('heading', `${change.blockId}: ${STATUS_LABEL[change.status]}`, 3);
    add('paragraph', `Before: ${change.originalText}`);
    add('paragraph', `After: ${finalText(change)}`);
    if (change.reason) add('quote', `Why: ${change.reason}`);
  }

  const file = await renderBlocks({ title: `Change report: ${doc.title}`, blocks, format: fmt });
  return { file, name: fileName(doc.title, 'change report', file.ext) };
}
