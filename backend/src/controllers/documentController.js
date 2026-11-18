import path from 'node:path';
import mongoose from 'mongoose';
import { config } from '../config/config.js';
import Document from '../models/Document.js';
import { extractPdfText } from '../services/pdfText.js';
import { analyzeText } from '../services/textAnalysis.js';
import { checkReadability } from '../services/readability.js';
import { analyzeDocumentLines } from '../services/lineAnalysis.js';
import { badRequest, notFound } from '../utils/httpError.js';

const CONTENT_TYPES = {
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

async function findOwnDocument(req, { withFile = false } = {}) {
  if (!mongoose.isValidObjectId(req.params.id)) throw notFound('Document not found.');
  const query = Document.findOne({ _id: req.params.id, user: req.user._id });
  const doc = await (withFile ? query.select('+data') : query);
  if (!doc) throw notFound('Document not found.');
  return doc;
}

async function readDocumentText(doc) {
  const isPdf = path.extname(doc.fileName).toLowerCase() === '.pdf';
  if (doc.fileName && !isPdf && !doc.text) throw badRequest('Text extraction is only available for PDF files.');

  const result = { isPdf, pageCount: 0, pdfText: '', pdfPages: [], formFields: [], typedText: doc.text || '' };
  if (isPdf) {
    try {
      const pdf = await extractPdfText(doc.data);
      result.pageCount = pdf.pageCount;
      result.pdfText = pdf.text;
      result.pdfPages = pdf.pages;
      result.formFields = pdf.fields;
    } catch (err) {
      console.error(`PDF text extraction failed for ${doc._id}:`, err.message);
      throw badRequest('This PDF could not be read. It may be damaged or password-protected.');
    }
  }
  return result;
}

function currentText(doc, r) {
  return [r.pdfText, r.typedText].filter(Boolean).join('\n\n');
}

function presentDocument(doc) {
  return {
    id: doc._id.toString(),
    title: doc.title,
    fileName: doc.fileName,
    hasFile: Boolean(doc.fileName),
    hasText: Boolean(doc.text),
    mimeType: doc.mimeType,
    size: doc.size,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export async function deleteDocument(req, res) {
  const doc = await findOwnDocument(req);
  await Document.deleteOne({ _id: doc._id, user: req.user._id });
  console.log(`Document ${doc._id} deleted`);
  res.json({ deleted: true, id: doc._id.toString() });
}

export async function listDocuments(req, res) {
  const docs = await Document.find({ user: req.user._id }).sort({ updatedAt: -1 }).limit(200);
  res.json({ documents: docs.map(presentDocument) });
}

export async function getDocumentFile(req, res) {
  const doc = await findOwnDocument(req, { withFile: true });
  if (!doc.fileName) throw notFound('This document has no file.');

  res.set({
    'Content-Type': CONTENT_TYPES[path.extname(doc.fileName).toLowerCase()] || 'application/octet-stream',
    'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(doc.fileName)}`,
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'private, no-store',
  });
  res.send(doc.data);
}

export async function getDocumentText(req, res) {
  const doc = await findOwnDocument(req, { withFile: true });
  const r = await readDocumentText(doc);
  const text = currentText(doc, r);

  res.json({
    fileName: doc.fileName,
    pageCount: r.pageCount,
    pdfText: r.pdfText,
    pdfPages: r.pdfPages,
    formFields: r.formFields,
    typedText: r.typedText,
    text,
  });
}

export async function getDocumentAnalysis(req, res) {
  const doc = await findOwnDocument(req, { withFile: true });
  const r = await readDocumentText(doc);
  const text = currentText(doc, r);

  res.json({
    title: doc.title,
    fileName: doc.fileName,
    hasFile: Boolean(doc.fileName),
    pageCount: r.pageCount,
    formFieldCount: r.formFields.length,
    analysis: analyzeText(text),
    sources: {
      pdfWords: analyzeText(r.pdfText).words,
      typedWords: analyzeText(r.typedText).words,
    },
    pages: r.pdfPages.map((pageText, i) => ({ number: i + 1, ...pick(analyzeText(pageText), ['words', 'characters', 'sentences']) })),
  });
}

export async function getDocumentScores(req, res) {
  const doc = await findOwnDocument(req, { withFile: true });
  const r = await readDocumentText(doc);
  const text = currentText(doc, r);

  res.json({
    readability: checkReadability(text),
  });
}

export async function getDocumentLines(req, res) {
  const doc = await findOwnDocument(req, { withFile: true });
  const r = await readDocumentText(doc);
  const text = currentText(doc, r);
  if (!text.trim()) throw badRequest('There is no text to check.');

  res.json(analyzeDocumentLines(text));
}

function pick(object, keys) {
  return Object.fromEntries(keys.map((key) => [key, object[key]]));
}

export async function uploadDocument(req, res) {
  const text = String(req.body?.text ?? '').trim();
  if (!req.file && !text) throw badRequest('Choose a file or type some text.');
  if (text.length > config.maxTextChars) {
    throw badRequest(`The text is too long (${text.length.toLocaleString('en-US')} characters). The limit is ${config.maxTextChars.toLocaleString('en-US')}.`);
  }
  if (req.file && req.file.size === 0) throw badRequest('This file is empty.');

  const fileName = req.file ? path.basename(req.file.originalname) : '';
  const typedTitle = String(req.body?.title ?? '').replace(/\s+/g, ' ').trim().slice(0, 200);
  const title =
    typedTitle ||
    (fileName ? path.parse(fileName).name : '') ||
    text.split(/\s+/).slice(0, 8).join(' ') ||
    'Untitled document';

  const doc = await Document.create({
    user: req.user._id,
    title,
    fileName,
    mimeType: req.file ? req.file.mimetype : '',
    size: req.file ? req.file.size : 0,
    data: req.file ? req.file.buffer : undefined,
    text,
  });
  console.log(`Document ${doc._id} saved (file: ${fileName || 'none'}, text: ${text.length} chars)`);
  res.status(201).json({ document: presentDocument(doc) });
}
