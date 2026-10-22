import * as optimizations from '../services/optimizationService.js';
import { sendFile } from '../services/exportService.js';

export async function getOptimization(req, res) {
  res.json({ optimization: await optimizations.getOptimization(req.user._id, null, req.params.id) });
}

export async function reviewChange(req, res) {
  res.json({ optimization: await optimizations.reviewChange(req.user._id, req.params.id, req.params.changeId, req.body) });
}

export async function reviewChanges(req, res) {
  res.json({ optimization: await optimizations.reviewChanges(req.user._id, req.params.id, req.body) });
}

export async function applyOptimization(req, res) {
  res.json(await optimizations.applyOptimization(req.user._id, req.params.id));
}

export async function exportReport(req, res) {
  const { file, name } = await optimizations.exportReport(req.user._id, req.params.id, req.query);
  sendFile(res, file, name);
}
