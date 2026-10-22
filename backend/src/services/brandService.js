// Brand Intelligence services (PDF Phases 14-19):
//   Brand profile, Sources, learning (Observations), Rules.
import fs from 'node:fs/promises';
import path from 'node:path';
import mongoose from 'mongoose';
import Brand from '../models/Brand.js';
import Source from '../models/Source.js';
import Observation from '../models/Observation.js';
import Rule, { RULE_STATUSES } from '../models/Rule.js';
import Document from '../models/Document.js';
import { badRequest, conflict, notFound } from '../utils/httpError.js';
import { countWords, normalizeText } from '../intelligence/normalize.js';
import { chunkText } from '../intelligence/claims/analysis.js';
import { learnFromSources, profileFromObservations } from '../intelligence/brand/extraction.js';
import { generateRules } from '../intelligence/brand/ruleGeneration.js';
import { RULE_TYPES } from '../intelligence/brand/ruleConfig.js';
import { compilePattern } from '../intelligence/brand/rules.js';
import { CATEGORIES, SEVERITIES } from '../intelligence/findings.js';
import { classify, hasModel, TONE_LABELS } from './modelService.js';
import { extractFile, extractUrl } from './extractionService.js';

const strList = (v, max = 50) =>
  (Array.isArray(v) ? v : [])
    .map((s) => String(s).trim())
    .filter(Boolean)
    .slice(0, max);

const touch = (brandId) => Brand.updateOne({ _id: brandId }, { knowledgeUpdatedAt: new Date() });

// ---------------------------------------------------------------- brands

function applyProfile(brand, body) {
  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (!name) throw badRequest('Brand name is required.');
    brand.name = name;
  }
  if (body.description !== undefined) brand.description = String(body.description);
  if (body.voice) {
    if (body.voice.tone !== undefined) {
      const tone = strList(body.voice.tone);
      const invalid = tone.filter((t) => !TONE_LABELS.includes(t));
      if (invalid.length) throw badRequest(`Unknown tone "${invalid[0]}". Allowed: ${TONE_LABELS.join(', ')}.`);
      brand.voice.tone = tone;
    }
    if (body.voice.traits !== undefined) brand.voice.traits = strList(body.voice.traits);
    if (body.voice.style !== undefined) brand.voice.style = strList(body.voice.style);
  }
  if (body.vocabulary?.keyTerms !== undefined) brand.vocabulary.keyTerms = strList(body.vocabulary.keyTerms);
  if (body.messaging?.keyMessages !== undefined) brand.messaging.keyMessages = strList(body.messaging.keyMessages);
  brand.knowledgeUpdatedAt = new Date();
}

export async function createBrand(userId, body = {}) {
  const brand = new Brand({ userId, name: body.name });
  applyProfile(brand, body);
  return brand.save();
}

export async function listBrands(userId) {
  const brands = await Brand.find({ userId }).sort({ createdAt: -1 });
  const ids = brands.map((b) => b._id);
  const [sources, rules] = await Promise.all([
    Source.aggregate([{ $match: { brandId: { $in: ids } } }, { $group: { _id: '$brandId', n: { $sum: 1 } } }]),
    Rule.aggregate([{ $match: { brandId: { $in: ids }, status: 'active' } }, { $group: { _id: '$brandId', n: { $sum: 1 } } }]),
  ]);
  const count = (list, id) => list.find((x) => String(x._id) === String(id))?.n ?? 0;
  return brands.map((b) => ({ ...b.toJSON(), sourceCount: count(sources, b._id), activeRuleCount: count(rules, b._id) }));
}

export async function getBrand(userId, id) {
  const brand = mongoose.isValidObjectId(id) ? await Brand.findOne({ _id: id, userId }) : null;
  if (!brand) throw notFound('Brand not found.');
  return brand;
}

export async function updateBrand(userId, id, body = {}) {
  const brand = await getBrand(userId, id);
  applyProfile(brand, body);
  return brand.save();
}

export async function deleteBrand(userId, id) {
  const brand = await getBrand(userId, id);
  await Promise.all([
    Source.deleteMany({ brandId: brand._id }),
    Observation.deleteMany({ brandId: brand._id }),
    Rule.deleteMany({ brandId: brand._id }),
    Document.updateMany({ brandId: brand._id, userId }, { brandId: null }),
  ]);
  await brand.deleteOne();
}

// ---------------------------------------------------------------- sources

// POST /api/brands/:id/sources
//   multipart: file (pdf/docx/txt) [+ name]
//   JSON:      { type: 'text', name, content } | { type: 'url', url, name? }
export async function addSource(userId, brandId, { file, body = {} }) {
  const brand = await getBrand(userId, brandId);
  let type;
  let name = String(body.name ?? '').trim();
  let url = null;
  let content = '';
  let error = null;

  if (file) {
    type = path.extname(file.originalname).slice(1).toLowerCase();
    name ||= Buffer.from(file.originalname, 'latin1').toString('utf8');
    content = await extractFile(file.path);
    await fs.unlink(file.path).catch(() => {}); // the binary is not kept, only its text
    if (!content) error = 'No text could be extracted (the file may be scanned or empty).';
  } else if (body.type === 'url') {
    type = 'url';
    url = String(body.url ?? '').trim();
    if (!url) throw badRequest('url is required.');
    const page = await extractUrl(url);
    content = page.content;
    name ||= page.title || new URL(url).hostname;
    if (!content) error = 'No readable text was found at that URL.';
  } else if (body.type === 'text') {
    type = 'text';
    content = normalizeText(body.content);
    if (!content) throw badRequest('content is required.');
    if (!name) throw badRequest('name is required.');
  } else {
    throw badRequest('Upload a file, or send { type: "text" | "url", ... }.');
  }

  const source = await Source.create({
    brandId: brand._id,
    userId,
    type,
    name: name.slice(0, 200),
    url,
    status: error ? 'failed' : 'processed',
    error,
    content,
    chunks: error ? [] : chunkText(content),
    wordCount: countWords(content),
  });
  await touch(brand._id);
  return source;
}

export async function listSources(userId, brandId) {
  const brand = await getBrand(userId, brandId);
  return Source.find({ brandId: brand._id }).sort({ createdAt: -1 });
}

export async function getSource(userId, brandId, sourceId) {
  const brand = await getBrand(userId, brandId);
  const source = mongoose.isValidObjectId(sourceId)
    ? await Source.findOne({ _id: sourceId, brandId: brand._id }).select('+content')
    : null;
  if (!source) throw notFound('Source not found.');
  return source;
}

export async function deleteSource(userId, brandId, sourceId) {
  const source = await getSource(userId, brandId, sourceId);
  await source.deleteOne();
  await touch(source.brandId);
}

// ---------------------------------------------------------------- learning

// POST /api/brands/:id/learn
// Sources -> observations (replaces the previous set) -> NEW suggested rules -> profile update.
export async function learnBrand(userId, brandId) {
  const brand = await getBrand(userId, brandId);
  const sources = await Source.find({ brandId: brand._id, status: 'processed' }).select('+content');
  if (!sources.length) throw conflict('Add at least one processed source before learning.');

  const found = learnFromSources(sources, classify);
  await Observation.deleteMany({ brandId: brand._id });
  const observations = await Observation.insertMany(found.map((o) => ({ ...o, brandId: brand._id, userId })));

  // Never re-suggest a rule that already exists, whatever its status (rejected stays rejected).
  const known = new Set(await Rule.distinct('fingerprint', { brandId: brand._id }));
  const fresh = generateRules(observations).filter((r) => !known.has(r.fingerprint));
  const suggestedRules = await Rule.insertMany(
    fresh.map((r) => ({ ...r, brandId: brand._id, userId, status: 'suggested', origin: 'generated' }))
  );

  const profile = profileFromObservations(observations);
  brand.voice = profile.voice;
  brand.vocabulary.keyTerms = profile.keyTerms;
  brand.learnedAt = new Date();
  brand.knowledgeUpdatedAt = new Date();
  await brand.save();

  return { brand, observations, suggestedRules, toneModelAvailable: hasModel('tone') };
}

export async function listObservations(userId, brandId) {
  const brand = await getBrand(userId, brandId);
  return Observation.find({ brandId: brand._id }).sort({ origin: 1, confidence: -1 });
}

// ---------------------------------------------------------------- rules

const DEFAULT_CATEGORY = {
  forbidden_term: 'vocabulary',
  preferred_term: 'vocabulary',
  required_term: 'messaging',
  sentence_length: 'rule',
  passive_voice: 'rule',
  pattern: 'rule',
  tone: 'voice',
  claim: 'claim',
  custom_semantic: 'messaging',
};

export function validateConfiguration(type, c = {}) {
  switch (type) {
    case 'forbidden_term':
    case 'required_term':
      if (!strList(c.terms).length) throw badRequest('configuration.terms must list at least one term.');
      return { terms: strList(c.terms), ...(type === 'forbidden_term' && c.replacement ? { replacement: String(c.replacement) } : {}) };
    case 'preferred_term':
      if (!String(c.preferred ?? '').trim() || !strList(c.alternatives).length) {
        throw badRequest('configuration needs "preferred" and at least one entry in "alternatives".');
      }
      return { preferred: String(c.preferred).trim(), alternatives: strList(c.alternatives) };
    case 'sentence_length': {
      const maxWords = Number(c.maxWords);
      if (!Number.isInteger(maxWords) || maxWords < 5 || maxWords > 100) throw badRequest('configuration.maxWords must be a whole number from 5 to 100.');
      return { maxWords };
    }
    case 'pattern':
      if (!compilePattern(c.pattern, c.flags)) throw badRequest('configuration.pattern must be a valid regular expression (max 300 characters).');
      return { pattern: c.pattern, flags: c.flags || 'i', message: c.message || '', suggestion: c.suggestion || '', ...(typeof c.replacement === 'string' ? { replacement: c.replacement } : {}) };
    case 'tone': {
      const allowed = strList(c.allowed);
      if (!allowed.length || allowed.some((t) => !TONE_LABELS.includes(t))) {
        throw badRequest(`configuration.allowed must list tones from: ${TONE_LABELS.join(', ')}.`);
      }
      const minConfidence = c.minConfidence === undefined ? 0.6 : Number(c.minConfidence);
      if (!(minConfidence > 0 && minConfidence <= 1)) throw badRequest('configuration.minConfidence must be between 0 and 1.');
      return { allowed, minConfidence };
    }
    case 'custom_semantic':
      if (!strList(c.keywords).length) throw badRequest('configuration.keywords must list at least one keyword.');
      return { keywords: strList(c.keywords), message: c.message || '', suggestion: c.suggestion || '' };
    case 'passive_voice':
    case 'claim':
      return {};
    default:
      throw badRequest(`type must be one of: ${RULE_TYPES.join(', ')}.`);
  }
}

function checkEnum(value, allowed, field) {
  if (value !== undefined && !allowed.includes(value)) throw badRequest(`${field} must be one of: ${allowed.join(', ')}.`);
}

export async function listRules(userId, brandId, status) {
  const brand = await getBrand(userId, brandId);
  checkEnum(status, RULE_STATUSES, 'status');
  return Rule.find({ brandId: brand._id, ...(status ? { status } : {}) }).sort({ status: 1, createdAt: -1 });
}

// Manual rules are written by a person, so they are active immediately.
export async function createRule(userId, brandId, body = {}) {
  const brand = await getBrand(userId, brandId);
  checkEnum(body.type, RULE_TYPES, 'type');
  checkEnum(body.category, CATEGORIES, 'category');
  checkEnum(body.severity, SEVERITIES, 'severity');
  checkEnum(body.status, RULE_STATUSES, 'status');
  if (!String(body.name ?? '').trim()) throw badRequest('Rule name is required.');

  const rule = await Rule.create({
    brandId: brand._id,
    userId,
    name: body.name,
    type: body.type,
    category: body.category || DEFAULT_CATEGORY[body.type],
    severity: body.severity || 'warning',
    description: body.description || '',
    configuration: validateConfiguration(body.type, body.configuration),
    status: body.status || 'active',
    enabled: body.enabled !== false,
    origin: 'manual',
  });
  await touch(brand._id);
  return rule;
}

// PATCH /api/brands/:id/rules/:ruleId  - accept / edit / reject / enable / disable
export async function updateRule(userId, brandId, ruleId, body = {}) {
  const brand = await getBrand(userId, brandId);
  const rule = mongoose.isValidObjectId(ruleId) ? await Rule.findOne({ _id: ruleId, brandId: brand._id }) : null;
  if (!rule) throw notFound('Rule not found.');

  checkEnum(body.status, RULE_STATUSES, 'status');
  checkEnum(body.category, CATEGORIES, 'category');
  checkEnum(body.severity, SEVERITIES, 'severity');

  if (body.name !== undefined) {
    if (!String(body.name).trim()) throw badRequest('Rule name is required.');
    rule.name = body.name;
  }
  for (const field of ['description', 'category', 'severity', 'status']) if (body[field] !== undefined) rule[field] = body[field];
  if (body.enabled !== undefined) rule.enabled = Boolean(body.enabled);
  if (body.configuration !== undefined) {
    rule.configuration = validateConfiguration(rule.type, body.configuration);
    rule.markModified('configuration');
  }
  await rule.save();
  await touch(brand._id);
  return rule;
}

export async function deleteRule(userId, brandId, ruleId) {
  const brand = await getBrand(userId, brandId);
  const rule = mongoose.isValidObjectId(ruleId) ? await Rule.findOneAndDelete({ _id: ruleId, brandId: brand._id }) : null;
  if (!rule) throw notFound('Rule not found.');
  await touch(brand._id);
}
