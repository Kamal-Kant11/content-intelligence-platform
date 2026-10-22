// Claims & evidence (PDF Phase 21).
//
//   content -> detect claims (local "claim" model + number/superlative cues)
//           -> retrieve the most relevant approved source chunks (BM25 keyword search)
//           -> compare figures in the claim with figures in the evidence
//           -> finding: mismatch / unsupported
//
// Plain keyword retrieval is enough for this stage, so no vector database is
// introduced (the PDF says to add RAG only when it is actually needed).
import { createFinding, proseBlocks } from '../findings.js';
import { STOPWORDS, splitSentences, truncate, words } from '../text.js';

const SUPERLATIVE_RE = /\b(best|fastest|leading|largest|only|first|#1|number one|most \w+|lowest|highest|guaranteed?)\b/i;
const QUANTITY_RE = /(\d+(?:[.,]\d+)?)\s*(%|percent\b|x\b|times\b)?/gi;

export function extractQuantities(text) {
  const out = [];
  for (const m of text.matchAll(QUANTITY_RE)) {
    const value = Number(m[1].replace(',', '.'));
    if (!Number.isFinite(value)) continue;
    const unit = !m[2] ? 'num' : /x|times/i.test(m[2]) ? 'x' : '%';
    if (unit === 'num' && value >= 1900 && value <= 2100) continue; // years are not claims
    out.push({ value, unit, raw: m[0].trim() });
  }
  return out;
}

const terms = (text) =>
  words(text)
    .map((w) => w.toLowerCase().replace(/(?<=\w{3})s$/, ''))
    .filter((w) => !STOPWORDS.has(w) && !/^\d/.test(w));

// chunks: [{ chunkId, text, sourceId, sourceName }]
export function buildIndex(chunks) {
  const docs = chunks.map((c) => ({ ...c, terms: terms(c.text) }));
  const df = new Map();
  for (const d of docs) for (const t of new Set(d.terms)) df.set(t, (df.get(t) || 0) + 1);
  const avgLen = docs.reduce((s, d) => s + d.terms.length, 0) / Math.max(1, docs.length);
  return { docs, df, avgLen, N: docs.length };
}

export function search(index, query, k = 3) {
  const q = [...new Set(terms(query))];
  const k1 = 1.2;
  const b = 0.75;
  return index.docs
    .map((d) => {
      let score = 0;
      for (const t of q) {
        const tf = d.terms.filter((x) => x === t).length;
        if (!tf) continue;
        const idf = Math.log(1 + (index.N - index.df.get(t) + 0.5) / (index.df.get(t) + 0.5));
        score += idf * ((tf * (k1 + 1)) / (tf + k1 * (1 - b + (b * d.terms.length) / index.avgLen)));
      }
      const overlap = q.length ? q.filter((t) => d.terms.includes(t)).length / q.length : 0;
      return { doc: d, score, overlap };
    })
    .filter((r) => r.score > 0)
    .sort((a, b2) => b2.score - a.score)
    .slice(0, k);
}

const sameValue = (a, b) => Math.abs(a - b) <= Math.max(0.01, Math.abs(b) * 0.01);

export function run(blocks, { chunks = [], options = null } = {}, classify) {
  const findings = [];
  const stats = { detected: 0, supported: 0, mismatched: 0, unsupported: 0 };
  const index = chunks.length ? buildIndex(chunks) : null;

  for (const block of proseBlocks(blocks)) {
    for (const sentence of splitSentences(block.text)) {
      const quantities = extractQuantities(sentence).filter((q) => q.unit !== 'num' || q.value > 1);
      const superlative = SUPERLATIVE_RE.test(sentence);
      const model = classify('claim', sentence);
      const isClaim = (model && model.label === 'claim' && model.confidence >= 0.6) || quantities.some((q) => q.unit !== 'num') || superlative;
      if (!isClaim) continue;
      stats.detected += 1;
      if (!index) continue; // no approved sources to compare against

      const hits = search(index, sentence).filter((h) => h.overlap >= 0.3);
      if (!hits.length) {
        if (quantities.length || superlative) {
          stats.unsupported += 1;
          findings.push(
            createFinding({
              category: 'claim',
              check: 'claim.unsupported',
              severity: 'info',
              message: 'No approved source supports this claim.',
              text: sentence,
              suggestion: 'Add a source for this claim, soften it, or remove it.',
              confidence: 0.6,
              blockId: block.blockId,
              ruleId: options?.ruleId ?? null,
              source: model ? 'model' : 'deterministic',
            })
          );
        }
        continue;
      }

      if (!quantities.length) {
        stats.supported += 1;
        continue;
      }

      let supported = false;
      let conflict = null;
      for (const hit of hits) {
        const evidenceQ = extractQuantities(hit.doc.text);
        for (const q of quantities) {
          const sameUnit = evidenceQ.filter((e) => e.unit === q.unit);
          if (sameUnit.some((e) => sameValue(q.value, e.value))) supported = true;
          else if (sameUnit.length && !conflict) conflict = { q, e: sameUnit[0], hit };
        }
      }

      if (supported) {
        stats.supported += 1;
      } else if (conflict) {
        stats.mismatched += 1;
        findings.push(
          createFinding({
            category: 'claim',
            check: 'claim.mismatch',
            severity: options?.severity || 'warning',
            message: `Claim says ${conflict.q.raw}, but "${conflict.hit.doc.sourceName}" says ${conflict.e.raw}.`,
            text: sentence,
            suggestion: 'Use the figure from the approved source, or cite where this figure comes from.',
            confidence: Math.min(0.9, 0.5 + conflict.hit.overlap / 2),
            blockId: block.blockId,
            ruleId: options?.ruleId ?? null,
            evidence: [{ sourceId: conflict.hit.doc.sourceId, text: truncate(conflict.hit.doc.text) }],
          })
        );
      } else {
        stats.unsupported += 1;
        findings.push(
          createFinding({
            category: 'claim',
            check: 'claim.unsupported',
            severity: 'info',
            message: 'Approved sources discuss this topic but do not contain this figure.',
            text: sentence,
            suggestion: 'Check the figure against an approved source.',
            confidence: 0.6,
            blockId: block.blockId,
            ruleId: options?.ruleId ?? null,
            evidence: [{ sourceId: hits[0].doc.sourceId, text: truncate(hits[0].doc.text) }],
          })
        );
      }
    }
  }

  return { findings, metrics: { claims: stats }, checks: index ? ['claim.mismatch', 'claim.unsupported'] : [] };
}

// Splits source text into overlapping-free chunks of ~3 sentences for retrieval.
export function chunkText(text, size = 3) {
  const sentences = splitSentences(text);
  const chunks = [];
  for (let i = 0; i < sentences.length; i += size) {
    chunks.push({ chunkId: `chunk_${String(chunks.length + 1).padStart(3, '0')}`, text: sentences.slice(i, i + size).join(' ') });
  }
  return chunks;
}
