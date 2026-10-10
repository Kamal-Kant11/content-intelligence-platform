import fs from 'node:fs/promises';
import path from 'node:path';
import mongoose from 'mongoose';
import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';
import Document from '../models/Document.js';

// Reads text out of the saved file. Never throws: on failure the document is
// still saved, just without extracted text.
async function extractText(filePath) {
  try {
    const ext = path.extname(filePath).toLowerCase();
    let text = '';
    if (ext === '.txt') {
      text = await fs.readFile(filePath, 'utf8');
    } else if (ext === '.docx') {
      text = (await mammoth.extractRawText({ path: filePath })).value;
    } else if (ext === '.pdf') {
      const parser = new PDFParse({ data: await fs.readFile(filePath) });
      try {
        text = (await parser.getText()).text;
      } finally {
        await parser.destroy();
      }
    }
    return (text || '').replace(/\0/g, '').trim();
  } catch (err) {
    console.error('Text extraction failed:', err.message);
    return '';
  }
}

const removeFile = (filePath) => fs.unlink(filePath).catch(() => {});

// Every query includes userId, so users can only reach their own documents.
function ownDocument(req) {
  if (!mongoose.isValidObjectId(req.params.id)) return null;
  return { _id: req.params.id, userId: req.user._id };
}

// POST /api/documents/upload
export async function uploadDocument(req, res, next) {
  const file = req.file;
  try {
    if (!file) return res.status(400).json({ message: 'Please choose a file to upload.' });

    const fileName = path.basename(Buffer.from(file.originalname, 'latin1').toString('utf8'));
    const document = await Document.create({
      userId: req.user._id,
      title: path.basename(fileName, path.extname(fileName)),
      fileName,
      contentType: file.mimetype,
      fileSize: file.size,
      storagePath: file.path,
      originalContent: await extractText(file.path),
      status: 'draft',
    });

    res.status(201).json({ document });
  } catch (err) {
    if (file) await removeFile(file.path);
    next(err);
  }
}

// GET /api/documents
export async function getDocuments(req, res, next) {
  try {
    const documents = await Document.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json({ documents });
  } catch (err) {
    next(err);
  }
}

// GET /api/documents/:id
export async function getDocument(req, res, next) {
  try {
    const filter = ownDocument(req);
    const doc = filter && (await Document.findOne(filter).select('+originalContent'));
    if (!doc) return res.status(404).json({ message: 'Document not found.' });

    res.json({ document: { ...doc.toJSON(), originalContent: doc.originalContent } });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/documents/:id
export async function deleteDocument(req, res, next) {
  try {
    const filter = ownDocument(req);
    const doc = filter && (await Document.findOneAndDelete(filter).select('+storagePath'));
    if (!doc) return res.status(404).json({ message: 'Document not found.' });

    await removeFile(doc.storagePath);
    res.json({ message: 'Document deleted.' });
  } catch (err) {
    next(err);
  }
}
