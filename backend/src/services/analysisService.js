// AnalysisService: orchestration only (PDF Phase 4).
// Loads the document and brand knowledge, runs the pipeline, scores, stores.
import crypto from 'node:crypto';
import Analysis from '../models/Analysis.js';
import Rule from '../models/Rule.js';
import Source from '../models/Source.js';
import { config } from '../config/config.js';
import { runAnalysis } from '../intelligence/pipeline.js';
import { classify, modelVersion } from './modelService.js';
import { getDocument } from './documentService.js';
import { getBrand } from './brandService.js';

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

export const contentDigest = (doc) => sha256(doc.currentContent || '');

// POST /api/documents/:id/analyze  { brandId?, force? }
export async function analyzeDocument(userId, documentId, { brandId, force = false } = {}) {
  const doc = await getDocument(userId, documentId);
  const effectiveBrandId = brandId === undefined ? doc.brandId : brandId || null;
  const brand = effectiveBrandId ? await getBrand(userId, effectiveBrandId) : null;

  const models = { tone: modelVersion('tone'), claim: modelVersion('claim') };
  // Same content + same brand knowledge + same engines/models -> reuse the stored result.
  const contentHash = sha256(
    JSON.stringify({
      content: contentDigest(doc),
      brand: brand ? [String(brand._id), brand.knowledgeUpdatedAt?.toISOString()] : null,
      engine: config.engineVersion,
      models,
    })
  );

  if (!force) {
    const cached = await Analysis.findOne({ documentId: doc._id, contentHash }).sort({ createdAt: -1 });
    if (cached) return { analysis: cached, cached: true };
  }

  const started = Date.now();
  const [rules, sources] = brand
    ? await Promise.all([
        Rule.find({ brandId: brand._id, status: 'active', enabled: true }),
        Source.find({ brandId: brand._id, status: 'processed' }).select('+chunks name'),
      ])
    : [[], []];
  const chunks = sources.flatMap((s) =>
    s.chunks.map((c) => ({ chunkId: c.chunkId, text: c.text, sourceId: String(s._id), sourceName: s.name }))
  );

  const result = runAnalysis(doc.blocks, { rules, brandVoice: brand?.voice, chunks, classify });

  const analysis = await Analysis.create({
    documentId: doc._id,
    userId,
    brandId: brand?._id ?? null,
    contentHash,
    overallScore: result.overallScore,
    categoryScores: result.categoryScores,
    summary: result.summary,
    findings: result.findings,
    metrics: { ...result.metrics, contentDigest: contentDigest(doc) },
    engineVersion: config.engineVersion,
    processingMetadata: {
      durationMs: Date.now() - started,
      engines: result.engines,
      models,
      brandRulesApplied: rules.length,
      sourceChunks: chunks.length,
    },
  });

  doc.lastAnalysis = { analysisId: analysis._id, overallScore: analysis.overallScore, analyzedAt: analysis.createdAt };
  await doc.save();
  return { analysis, cached: false };
}

// GET /api/documents/:id/analysis -> latest analysis, or { analysis: null } if never analyzed.
// "Not analyzed yet" is a normal state, so it is not reported as a 404.
export async function getLatestAnalysis(userId, documentId) {
  const doc = await getDocument(userId, documentId);
  const analysis = await Analysis.findOne({ documentId: doc._id }).sort({ createdAt: -1 });
  if (!analysis) return { analysis: null, stale: false };
  return { analysis, stale: analysis.metrics?.contentDigest !== contentDigest(doc) };
}
