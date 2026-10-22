// HTTP only: read the request, call a service, send the response.
// Express 5 forwards errors thrown here to the central error handler.
import * as documents from '../services/documentService.js';
import * as analyses from '../services/analysisService.js';
import * as optimizations from '../services/optimizationService.js';
import { sendFile } from '../services/exportService.js';

// Documents
export async function createDocument(req, res) {
  res.status(201).json({ document: await documents.createDocument(req.user._id, req.body) });
}

export async function uploadDocument(req, res) {
  res.status(201).json({ document: await documents.createDocumentFromFile(req.user._id, req.file, req.body) });
}

export async function getDocuments(req, res) {
  res.json({ documents: await documents.listDocuments(req.user._id) });
}

export async function getDocument(req, res) {
  res.json({ document: await documents.getDocument(req.user._id, req.params.id) });
}

export async function updateDocument(req, res) {
  res.json({ document: await documents.updateDocument(req.user._id, req.params.id, req.body) });
}

export async function deleteDocument(req, res) {
  await documents.deleteDocument(req.user._id, req.params.id);
  res.json({ message: 'Document deleted.' });
}

// Analysis
export async function analyzeDocument(req, res) {
  const body = req.body ?? {};
  const { analysis, cached } = await analyses.analyzeDocument(req.user._id, req.params.id, {
    brandId: body.brandId,
    force: body.force === true,
  });
  res.status(cached ? 200 : 201).json({ analysis, cached });
}

export async function getAnalysis(req, res) {
  res.json(await analyses.getLatestAnalysis(req.user._id, req.params.id));
}

// Optimization
export async function optimizeDocument(req, res) {
  res.status(201).json({ optimization: await optimizations.createOptimization(req.user._id, req.params.id) });
}

export async function getOptimizations(req, res) {
  res.json({ optimizations: await optimizations.listOptimizations(req.user._id, req.params.id) });
}

export async function getOptimization(req, res) {
  res.json({ optimization: await optimizations.getOptimization(req.user._id, req.params.id, req.params.optimizationId) });
}

// Export / download
export async function exportDocument(req, res) {
  const { file, name } = await documents.exportDocument(req.user._id, req.params.id, req.query);
  sendFile(res, file, name);
}
