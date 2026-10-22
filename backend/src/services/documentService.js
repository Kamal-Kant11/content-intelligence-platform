// DocumentService: create / list / get / update / delete content (PDF Phase 2).
// Every query filters by userId, so users can never reach each other's documents.
import fs from 'node:fs/promises';
import path from 'node:path';
import mongoose from 'mongoose';
import Document, { CONTENT_TYPES } from '../models/Document.js';
import Analysis from '../models/Analysis.js';
import Optimization from '../models/Optimization.js';
import Brand from '../models/Brand.js';
import { badRequest, notFound } from '../utils/httpError.js';
import { countWords, normalizeText, parseBlocks } from '../intelligence/normalize.js';
import { buildSections } from '../intelligence/sections.js';
import { extractFile, extractUrl } from './extractionService.js';
import { fileName, renderBlocks, resolveFormat } from './exportService.js';

const MAX_CONTENT_CHARS = 200_000;
const LIST_FIELDS = '-originalContent -currentContent -blocks';

const removeFile = (filePath) => (filePath ? fs.unlink(filePath).catch(() => {}) : Promise.resolve());

function cleanTitle(title, fallback) {
  const t = String(title ?? '').trim() || String(fallback ?? '').trim();
  if (!t) throw badRequest('Title is required.');
  return t.slice(0, 200);
}

function cleanContentType(contentType) {
  if (contentType === undefined || contentType === null || contentType === '') return 'general';
  if (!CONTENT_TYPES.includes(contentType)) throw badRequest(`contentType must be one of: ${CONTENT_TYPES.join(', ')}.`);
  return contentType;
}

async function cleanBrandId(userId, brandId) {
  if (!brandId) return null;
  if (!mongoose.isValidObjectId(brandId) || !(await Brand.exists({ _id: brandId, userId }))) {
    throw badRequest('Brand not found.');
  }
  return brandId;
}

// Extraction -> normalization -> block parsing -> Document
function buildContent(raw) {
  const content = normalizeText(raw);
  if (content.length > MAX_CONTENT_CHARS) throw badRequest('Content is too long (maximum 200,000 characters).');
  return { originalContent: content, currentContent: content, blocks: parseBlocks(content), wordCount: countWords(content) };
}

// POST /api/documents  { title, contentType, sourceType: write|paste|url, content | url }
export async function createDocument(userId, body = {}) {
  const sourceType = body.sourceType || 'paste';
  if (!['write', 'paste', 'url'].includes(sourceType)) {
    throw badRequest('sourceType must be write, paste or url. Use /api/documents/upload for files.');
  }

  let raw = body.content;
  let fallbackTitle;
  let source = {};
  if (sourceType === 'url') {
    if (!body.url) throw badRequest('url is required.');
    const page = await extractUrl(body.url);
    raw = page.content;
    fallbackTitle = page.title || new URL(body.url).hostname;
    source = { url: String(body.url).trim() };
  }
  if (typeof raw !== 'string' || !raw.trim()) {
    throw badRequest(sourceType === 'url' ? 'No readable text was found at that URL.' : 'Content is required.');
  }

  return Document.create({
    userId,
    title: cleanTitle(body.title, fallbackTitle),
    contentType: cleanContentType(body.contentType),
    brandId: await cleanBrandId(userId, body.brandId),
    sourceType,
    source,
    ...buildContent(raw),
  });
}

// POST /api/documents/upload (multipart, field "file")
export async function createDocumentFromFile(userId, file, body = {}) {
  if (!file) throw badRequest('Please choose a file to upload.');
  try {
    const fileName = path.basename(Buffer.from(file.originalname, 'latin1').toString('utf8'));
    const text = await extractFile(file.path);
    return await Document.create({
      userId,
      title: cleanTitle(body.title, path.basename(fileName, path.extname(fileName))),
      contentType: cleanContentType(body.contentType),
      brandId: await cleanBrandId(userId, body.brandId),
      sourceType: 'file',
      source: { fileName, fileSize: file.size, mimeType: file.mimetype },
      storagePath: file.path,
      ...buildContent(text),
    });
  } catch (err) {
    await removeFile(file.path);
    throw err;
  }
}

export function listDocuments(userId) {
  return Document.find({ userId }).select(LIST_FIELDS).sort({ createdAt: -1 });
}

export async function getDocument(userId, id) {
  const doc = mongoose.isValidObjectId(id) ? await Document.findOne({ _id: id, userId }) : null;
  if (!doc) throw notFound('Document not found.');
  return doc;
}

// PATCH /api/documents/:id  { title?, contentType?, brandId? }  (content is never edited here)
export async function updateDocument(userId, id, body = {}) {
  const doc = await getDocument(userId, id);
  if (body.title !== undefined) doc.title = cleanTitle(body.title);
  if (body.contentType !== undefined) doc.contentType = cleanContentType(body.contentType);
  if (body.brandId !== undefined) doc.brandId = await cleanBrandId(userId, body.brandId);
  return doc.save();
}

export async function deleteDocument(userId, id) {
  const doc = mongoose.isValidObjectId(id)
    ? await Document.findOneAndDelete({ _id: id, userId }).select('+storagePath')
    : null;
  if (!doc) throw notFound('Document not found.');
  await Promise.all([
    Analysis.deleteMany({ documentId: doc._id }),
    Optimization.deleteMany({ documentId: doc._id }),
    removeFile(doc.storagePath),
  ]);
}

// GET /api/documents/:id/export?format=source|docx|pdf|txt|md&version=current|original&section=sec_01
export async function exportDocument(userId, id, { format, version = 'current', section } = {}) {
  const doc = await getDocument(userId, id);
  if (!['current', 'original'].includes(version)) throw badRequest('version must be current or original.');
  const fmt = resolveFormat(format, doc);

  let blocks = version === 'original' ? parseBlocks(doc.originalContent) : doc.blocks.map((b) => b.toObject());
  let title = doc.title;
  if (section) {
    const match = buildSections(blocks).find((s) => s.sectionId === section);
    if (!match) throw notFound('Section not found.');
    const ids = new Set(match.blockIds);
    blocks = blocks.filter((b) => ids.has(b.blockId));
    title = `${doc.title} - ${match.title}`;
  }
  if (!blocks.length) throw badRequest('This document has no text to export.');

  const file = await renderBlocks({ title, blocks, format: fmt });
  return { file, name: fileName(title, version === 'original' ? 'original' : '', file.ext) };
}
