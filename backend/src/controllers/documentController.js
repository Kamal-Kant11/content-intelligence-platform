import path from 'node:path';
import mongoose from 'mongoose';
import { config } from '../config/config.js';
import Document, { MAX_VERSIONS } from '../models/Document.js';
import { analyzeText, buildOptimizedDraft } from '../services/analysisService.js';
import { extractFileText, extractUrlText } from '../services/extractionService.js';
import { buildDocx, exportFilename } from '../services/exportService.js';
import { badRequest, conflict, notFound } from '../utils/httpError.js';
import { getWords, hasWords, normalizeText } from '../utils/text.js';

// ---------------------------------------------------------------------------
// Helpers

// Every query includes the signed-in user, so a user can only ever reach their own documents.
async function findOwnDocument(req) {
  const { id } = req.params;
  const doc = mongoose.isValidObjectId(id) ? await Document.findOne({ _id: id, user: req.user._id }) : null;
  if (!doc) throw notFound('Document not found.');
  return doc;
}

// tooLongHint tells the user what to do when a file or page is over the limit.
function validateContent(raw, tooLongHint = '') {
  const text = normalizeText(raw);
  if (!hasWords(text)) throw badRequest('The content is empty. Add some text first.');
  if (text.length > config.maxTextChars) {
    throw badRequest(`The content is too long (${text.length.toLocaleString('en-US')} characters). The limit is ${config.maxTextChars.toLocaleString('en-US')}.${tooLongHint}`);
  }
  return text;
}

function cleanTitle(raw, fallbackText) {
  const title = String(raw ?? '').replace(/\s+/g, ' ').trim().slice(0, 200);
  if (title) return title;
  const firstWords = getWords(fallbackText).slice(0, 8).join(' ');
  return firstWords || 'Untitled document';
}

const versionSummary = (v) => ({
  id: v._id.toString(),
  source: v.source,
  createdAt: v.createdAt,
  grammarScore: v.analysis?.grammar?.score ?? null,
  readabilityScore: v.analysis?.readability?.score ?? null,
  wordCount: v.analysis?.wordCount ?? 0,
});

function presentSummary(doc) {
  return {
    id: doc._id.toString(),
    title: doc.title,
    sourceType: doc.sourceType,
    sourceName: doc.sourceName,
    status: doc.status,
    scores: doc.scores,
    wordCount: doc.wordCount,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    approvedAt: doc.approvedAt,
  };
}

function presentDocument(doc) {
  const current = doc.currentVersion();
  return {
    ...presentSummary(doc),
    reviewedAt: doc.reviewedAt,
    currentVersionId: doc.currentVersionId?.toString() ?? null,
    approvedVersionId: doc.approvedVersionId?.toString() ?? null,
    original: { text: doc.originalText, analysis: doc.originalAnalysis },
    optimized: current
      ? { versionId: current._id.toString(), source: current.source, text: current.text, analysis: current.analysis, changes: current.changes, createdAt: current.createdAt }
      : null,
    versions: doc.versions.map(versionSummary),
  };
}

function setOriginalAnalysis(doc, analysis) {
  doc.originalAnalysis = analysis;
  doc.scores.originalGrammar = analysis.grammar.score;
  doc.scores.originalReadability = analysis.readability.score;
  doc.wordCount = analysis.wordCount;
}

// Adds a new optimized version and makes it the one under review.
// A new version always needs a fresh review, so any earlier approval is cleared.
function addVersion(doc, { text, source, analysis, changes = [] }) {
  if (doc.versions.length >= MAX_VERSIONS) {
    throw conflict(`This document already has ${MAX_VERSIONS} saved versions. Start a new document to continue editing.`);
  }
  doc.versions.push({ text, source, analysis, changes });
  const version = doc.versions[doc.versions.length - 1];
  doc.currentVersionId = version._id;
  doc.scores.optimizedGrammar = analysis.grammar.score;
  doc.scores.optimizedReadability = analysis.readability.score;
  doc.status = 'awaiting_review';
  doc.approvedVersionId = null;
  doc.approvedAt = null;
  return version;
}

async function saveDocument(doc) {
  try {
    await doc.save();
  } catch (err) {
    if (err.name === 'VersionError') throw conflict('This document was changed in another tab. Reload the page and try again.');
    throw err;
  }
}

async function createDocument(req, res, { title, sourceType, sourceName, text }) {
  const doc = await Document.create({
    user: req.user._id,
    title: cleanTitle(title, text),
    sourceType,
    sourceName,
    originalText: text,
    wordCount: getWords(text).length,
  });
  console.log(`Document ${doc._id} created from ${sourceType} (${text.length} chars)`);
  res.status(201).json({ document: presentDocument(doc) });
}

// ---------------------------------------------------------------------------
// Handlers

// GET /api/documents
export async function listDocuments(req, res) {
  const user = req.user._id;
  const [docs, counts] = await Promise.all([
    Document.find({ user }).select('-originalText -originalAnalysis -versions').sort({ updatedAt: -1 }).limit(200),
    Document.aggregate([{ $match: { user } }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
  ]);
  const byStatus = Object.fromEntries(counts.map((c) => [c._id, c.n]));
  res.json({
    documents: docs.map(presentSummary),
    stats: {
      total: counts.reduce((sum, c) => sum + c.n, 0),
      awaitingReview: byStatus.awaiting_review || 0,
      approved: byStatus.approved || 0,
      analyzed: (byStatus.analyzed || 0) + (byStatus.awaiting_review || 0) + (byStatus.approved || 0) + (byStatus.rejected || 0),
    },
  });
}

// GET /api/documents/:id
export async function getDocument(req, res) {
  res.json({ document: presentDocument(await findOwnDocument(req)) });
}

// POST /api/documents/from-text   { title?, text }
export async function createFromText(req, res) {
  const body = req.body ?? {};
  const text = validateContent(typeof body.text === 'string' ? body.text : '');
  await createDocument(req, res, { title: body.title, sourceType: 'text', sourceName: '', text });
}

// POST /api/documents/upload   multipart: file, title?
export async function createFromUpload(req, res) {
  if (!req.file) throw badRequest('Choose a PDF, DOCX or TXT file to upload.');
  const name = path.basename(req.file.originalname);
  const text = validateContent(await extractFileText(req.file.buffer, name), ' Split the file, or paste the part you need into Paste Text.');
  await createDocument(req, res, {
    title: req.body?.title || path.parse(name).name,
    sourceType: 'file',
    sourceName: name,
    text,
  });
}

// POST /api/documents/from-url   { url, title? }
export async function createFromUrl(req, res) {
  const body = req.body ?? {};
  if (typeof body.url !== 'string' || !body.url.trim()) throw badRequest('Enter a website URL.');
  const page = await extractUrlText(body.url);
  const text = validateContent(page.text, ' Copy the part you need and use Paste Text instead.');
  await createDocument(req, res, {
    title: body.title || page.title || new URL(page.url).hostname,
    sourceType: 'url',
    sourceName: page.url,
    text,
  });
}

// POST /api/documents/:id/analyze   - grammar + readability of the original text
export async function analyzeDocument(req, res) {
  const doc = await findOwnDocument(req);
  setOriginalAnalysis(doc, await analyzeText(doc.originalText));
  if (doc.status === 'draft') doc.status = 'analyzed';
  await saveDocument(doc);
  res.json({ document: presentDocument(doc) });
}

// POST /api/documents/:id/optimize
// The original stays untouched; the optimized draft is stored as a new version and re-analyzed
// with the same two methods. Scores are whatever the analysis measures, better or not.
export async function optimizeDocument(req, res) {
  const doc = await findOwnDocument(req);
  if (!doc.originalAnalysis) {
    setOriginalAnalysis(doc, await analyzeText(doc.originalText));
  }

  const draft = buildOptimizedDraft(doc.originalText, doc.originalAnalysis);
  const analysis = await analyzeText(draft.text);
  addVersion(doc, { text: draft.text, source: 'optimizer', analysis, changes: draft.changes });
  await saveDocument(doc);

  res.json({
    document: presentDocument(doc),
    optimization: {
      changeCount: draft.changes.length,
      skippedSuggestions: draft.skippedSuggestions,
      unchanged: draft.text === doc.originalText,
    },
  });
}

// PUT /api/documents/:id/draft   { text }  - user edit of the optimized draft, re-analyzed and saved as a new version
export async function saveDraft(req, res) {
  const doc = await findOwnDocument(req);
  if (!doc.currentVersionId) throw conflict('Optimize the document before editing the optimized draft.');
  const text = validateContent(req.body?.text);

  if (text !== doc.currentVersion().text) {
    addVersion(doc, { text, source: 'edit', analysis: await analyzeText(text) });
    await saveDocument(doc);
  }
  res.json({ document: presentDocument(doc) });
}

// PATCH /api/documents/:id/review
//   { action: "approve", versionId }       approve exactly this saved version
//   { action: "edit_approve", text }       save the edited text as a new version and approve it
//   { action: "reject" }                   discard the optimization; the original is kept
export async function reviewDocument(req, res) {
  const { action, versionId, text } = req.body ?? {};
  const doc = await findOwnDocument(req);
  if (!doc.currentVersionId) throw conflict('There is no optimized version to review yet.');

  if (action === 'reject') {
    doc.status = 'rejected';
    doc.approvedVersionId = null;
    doc.approvedAt = null;
  } else if (action === 'approve' || action === 'edit_approve') {
    let version = doc.currentVersion();
    if (action === 'edit_approve') {
      const edited = validateContent(text);
      if (edited !== version.text) version = addVersion(doc, { text: edited, source: 'edit', analysis: await analyzeText(edited) });
    } else if (versionId !== version._id.toString()) {
      throw conflict('The optimized text changed since you loaded it. Review the latest version and approve again.');
    }
    doc.status = 'approved';
    doc.approvedVersionId = version._id;
    doc.approvedAt = new Date();
  } else {
    throw badRequest('action must be "approve", "edit_approve" or "reject".');
  }

  doc.reviewedAt = new Date();
  await saveDocument(doc);
  console.log(`Document ${doc._id} ${doc.status}`);
  res.json({ document: presentDocument(doc) });
}

// GET /api/documents/:id/export?format=txt|docx  - only the approved version can be downloaded
export async function exportDocument(req, res) {
  const format = String(req.query.format || 'txt').toLowerCase();
  if (!['txt', 'docx'].includes(format)) throw badRequest('format must be "txt" or "docx".');

  const doc = await findOwnDocument(req);
  const approved = doc.status === 'approved' && doc.approvedVersionId ? doc.versions.id(doc.approvedVersionId) : null;
  if (!approved) throw conflict('Only approved content can be downloaded. Review and approve the optimized version first.');

  const filename = exportFilename(doc.title, format);
  res.attachment(filename);
  if (format === 'txt') {
    res.type('text/plain; charset=utf-8').send(approved.text);
  } else {
    res.type('application/vnd.openxmlformats-officedocument.wordprocessingml.document').send(await buildDocx(doc.title, approved.text));
  }
}
