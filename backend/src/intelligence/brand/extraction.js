// Brand learning (PDF Phases 17-18): Sources -> Observations.
//
// Two kinds of observation, kept apart on purpose:
//   explicit - the source SAYS it ("Avoid the word synergy.")
//   inferred - the system NOTICED it ("Most content reads as conversational.")
// Every observation keeps evidence: the source id and the text it came from.
import { parseBlocks } from '../normalize.js';
import { findPassive } from '../content_quality/readability.js';
import { STOPWORDS, splitSentences, truncate, words } from '../text.js';
import { MIN_WORDS } from './voice.js';

const ev = (source, text) => ({ sourceId: String(source._id ?? source.id), text: truncate(text) });

const quoted = (s) => [...s.matchAll(/["“‘']([^"”’']{2,40})["”’']/g)].map((m) => m[1].trim());

function splitTerms(s) {
  const fromQuotes = quoted(s);
  if (fromQuotes.length) return fromQuotes;
  return s
    .replace(/[.;:!?)]+$/, '')
    .split(/,|\bor\b|\band\b/)
    .map((t) => t.trim().replace(/^(the|words?|terms?|phrases?|like|such as)\s+/i, ''))
    .filter((t) => t && t.split(/\s+/).length <= 3 && !/jargon|language|words|buzzwords|passive|sentences?/i.test(t));
}

const EXPLICIT = [
  {
    re: /\b(?:avoid|never use|do not use|don't use|don’t use|steer clear of|we never say|we don't say)\b\s*(?:the\s+)?(?:words?|terms?|phrases?|buzzwords?)?\s*(?:such as|like)?\s*:?\s*(.+)$/i,
    build: (m) => {
      const terms = splitTerms(m[1]);
      return terms.length && { type: 'vocabulary', data: { kind: 'forbidden', terms }, text: `Guidelines say to avoid: ${terms.join(', ')}.` };
    },
  },
  {
    re: /\b(?:use|say|write)\s+["“']?([A-Za-z][\w -]{0,30}?)["”']?\s*,?\s*(?:instead of|rather than)\s+["“']?([A-Za-z][\w -]{0,30}?)["”']?\s*(?:[.,;)]|$)/i,
    build: (m) => ({
      type: 'vocabulary',
      data: { kind: 'preferred', preferred: m[1].trim(), term: m[2].trim() },
      text: `Guidelines prefer "${m[1].trim()}" over "${m[2].trim()}".`,
    }),
  },
  {
    re: /\balways (?:mention|include|refer to(?: us as)?)\s+["“']?([^"”'.,;]{2,40})["”']?/i,
    build: (m) => ({ type: 'messaging', data: { kind: 'required', terms: [m[1].trim()] }, text: `Guidelines require mentioning "${m[1].trim()}".` }),
  },
  {
    re: /\b(?:use (?:the )?active voice|avoid (?:the )?passive(?: voice)?)\b/i,
    build: () => ({ type: 'style', data: { kind: 'passive' }, text: 'Guidelines ask for active voice.' }),
  },
  {
    re: /\bsentences?\b[^.]*?\b(?:under|below|fewer than|less than|no more than|maximum of|at most)\s+(\d{1,2})\s+words/i,
    build: (m) => ({ type: 'style', data: { kind: 'sentenceLength', maxWords: Number(m[1]) }, text: `Guidelines limit sentences to ${m[1]} words.` }),
  },
  {
    re: /\b(?:keep|write|use)\s+(?:your\s+)?(?:short|concise)\s+sentences\b/i,
    build: () => ({ type: 'style', data: { kind: 'sentenceLength', maxWords: 20 }, text: 'Guidelines ask for short sentences.' }),
  },
  {
    re: /\b(?:our|the)\s+(?:brand\s+)?(?:voice|tone)\s+(?:is|should be|must be|sounds?)\s+([^.]+)/i,
    build: (m) => {
      const traits = m[1]
        .split(/,|\band\b|\bbut\b/)
        .map((t) => t.trim().toLowerCase().replace(/^(very|always|never)\s+/, ''))
        .filter((t) => t && t.split(/\s+/).length <= 2 && !/^not\b/.test(t));
      return traits.length && { type: 'voice', data: { kind: 'traits', traits }, text: `Guidelines describe the voice as ${traits.join(', ')}.` };
    },
  },
];

const VARIANTS = [
  ['email', 'e-mail'],
  ['website', 'web site'],
  ['online', 'on-line'],
  ['ecommerce', 'e-commerce'],
  ['healthcare', 'health care'],
];

const countOf = (text, term) => (text.match(new RegExp(`(?<![\\w-])${term.replace(/[-]/g, '\\-')}(?![\\w-])`, 'gi')) || []).length;

export function learnFromSources(sources, classify) {
  const observations = [];
  const sentences = []; // { source, text }
  const passages = []; // { source, text }

  for (const source of sources) {
    for (const block of parseBlocks(source.content || '')) {
      if (block.type !== 'heading' && words(block.text).length >= MIN_WORDS) passages.push({ source, text: block.text });
      for (const s of splitSentences(block.text)) sentences.push({ source, text: s });
    }
  }

  // ---- explicit observations
  const seen = new Set();
  for (const { source, text } of sentences) {
    for (const pattern of EXPLICIT) {
      const m = text.match(pattern.re);
      const built = m && pattern.build(m);
      if (!built) continue;
      const key = JSON.stringify(built.data);
      if (seen.has(key)) continue;
      seen.add(key);
      observations.push({ type: built.type, origin: 'explicit', observation: built.text, confidence: 0.95, evidence: [ev(source, text)], data: built.data });
    }
  }

  // ---- inferred: tone (local model)
  const toneResults = passages.map((p) => ({ ...p, result: classify('tone', p.text) })).filter((p) => p.result);
  if (toneResults.length >= 2) {
    const counts = {};
    for (const p of toneResults) counts[p.result.label] = (counts[p.result.label] || 0) + 1;
    const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    for (const [label, n] of ranked) {
      const share = n / toneResults.length;
      if (share < 0.25 && label !== ranked[0][0]) continue;
      const best = toneResults
        .filter((p) => p.result.label === label)
        .sort((a, b) => b.result.confidence - a.result.confidence)
        .slice(0, 2);
      observations.push({
        type: 'tone',
        origin: 'inferred',
        observation: `${Math.round(share * 100)}% of source passages read as ${label}.`,
        confidence: Math.round(Math.min(0.95, share + 0.2) * 100) / 100,
        evidence: best.map((p) => ev(p.source, p.text)),
        data: { kind: 'tone', label, share: Math.round(share * 100) / 100, passages: toneResults.length },
      });
    }
  }

  // ---- inferred: sentence length, passive voice, person
  if (sentences.length >= 5) {
    const lengths = sentences.map((s) => words(s.text).length).sort((a, b) => a - b);
    const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const p90 = lengths[Math.floor(lengths.length * 0.9)];
    const median = lengths[Math.floor(lengths.length / 2)];
    const style = avg <= 15 ? 'short and concise' : avg <= 22 ? 'moderate in length' : 'long';
    const examples = sentences.filter((s) => words(s.text).length === median).slice(0, 2);
    observations.push({
      type: 'style',
      origin: 'inferred',
      observation: `Sentences are ${style} (average ${avg.toFixed(1)} words, 90% under ${p90 + 1}).`,
      confidence: Math.round(Math.min(0.9, 0.5 + sentences.length / 200) * 100) / 100,
      evidence: examples.map((s) => ev(s.source, s.text)),
      data: { kind: 'sentenceLength', avgSentenceLength: Math.round(avg * 10) / 10, p90 },
    });

    const passive = sentences.filter((s) => findPassive(s.text).length);
    const ratio = passive.length / sentences.length;
    if (sentences.length >= 10 && ratio < 0.08) {
      observations.push({
        type: 'style',
        origin: 'inferred',
        observation: `Content rarely uses passive voice (${Math.round(ratio * 100)}% of sentences).`,
        confidence: 0.7,
        evidence: sentences.slice(0, 1).map((s) => ev(s.source, s.text)),
        data: { kind: 'passive', passiveRatio: Math.round(ratio * 100) / 100 },
      });
    }

    const all = sentences.map((s) => s.text).join(' ');
    const total = Math.max(1, words(all).length);
    const youRate = ((all.match(/\b(you|your|you're|yours)\b/gi) || []).length / total) * 100;
    const weRate = ((all.match(/\b(we|our|us|we're)\b/gi) || []).length / total) * 100;
    const exclaimRate = (all.match(/!/g) || []).length / sentences.length;
    const sample = (re) => sentences.filter((s) => re.test(s.text)).slice(0, 2).map((s) => ev(s.source, s.text));

    if (youRate >= 1.5) {
      observations.push({ type: 'voice', origin: 'inferred', observation: 'Speaks directly to the reader as "you".', confidence: 0.75, evidence: sample(/\byou(r)?\b/i), data: { kind: 'trait', trait: 'direct' } });
    }
    if (weRate >= 1.5) {
      observations.push({ type: 'voice', origin: 'inferred', observation: 'Uses "we" and "our", which sounds human and accountable.', confidence: 0.7, evidence: sample(/\b(we|our)\b/i), data: { kind: 'trait', trait: 'human' } });
    }
    if (exclaimRate >= 0.1) {
      observations.push({ type: 'voice', origin: 'inferred', observation: 'Uses exclamation marks often, which reads as energetic.', confidence: 0.6, evidence: sample(/!/), data: { kind: 'trait', trait: 'energetic' } });
    }
  }

  // ---- inferred: consistent spelling of common variants
  const corpus = sentences.map((s) => s.text).join('\n');
  for (const [preferred, variant] of VARIANTS) {
    const p = countOf(corpus, preferred);
    const v = countOf(corpus, variant);
    if (p >= 2 && v === 0) {
      observations.push({
        type: 'vocabulary',
        origin: 'inferred',
        observation: `Consistently writes "${preferred}" (${p} times, never "${variant}").`,
        confidence: Math.min(0.9, 0.5 + p / 10),
        evidence: sentences.filter((s) => countOf(s.text, preferred)).slice(0, 1).map((s) => ev(s.source, s.text)),
        data: { kind: 'preferred', preferred, term: variant },
      });
    }
  }

  // ---- inferred: key terms (frequent two-word phrases)
  const phraseCounts = new Map();
  for (const { text } of sentences) {
    const w = words(text).map((x) => x.toLowerCase());
    for (let i = 0; i < w.length - 1; i++) {
      if (STOPWORDS.has(w[i]) || STOPWORDS.has(w[i + 1]) || /^\d/.test(w[i]) || w[i].length < 3 || w[i + 1].length < 3) continue;
      const phrase = `${w[i]} ${w[i + 1]}`;
      phraseCounts.set(phrase, (phraseCounts.get(phrase) || 0) + 1);
    }
  }
  const keyTerms = [...phraseCounts.entries()].filter(([, n]) => n >= 3).sort((a, b) => b[1] - a[1]).slice(0, 8);
  for (const [term, n] of keyTerms) {
    observations.push({
      type: 'messaging',
      origin: 'inferred',
      observation: `Frequently mentions "${term}" (${n} times).`,
      confidence: Math.min(0.9, 0.4 + n / 20),
      evidence: sentences.filter((s) => s.text.toLowerCase().includes(term)).slice(0, 1).map((s) => ev(s.source, s.text)),
      data: { kind: 'keyTerm', term, count: n },
    });
  }

  return observations;
}

// Profile summary derived from observations (stored on the Brand).
export function profileFromObservations(observations) {
  const tone = observations.filter((o) => o.data.kind === 'tone' && o.data.share >= 0.25).map((o) => o.data.label);
  const traits = new Set();
  for (const o of observations) {
    if (o.data.kind === 'traits') o.data.traits.forEach((t) => traits.add(t));
    if (o.data.kind === 'trait') traits.add(o.data.trait);
  }
  const style = new Set();
  const length = observations.find((o) => o.data.kind === 'sentenceLength' && o.origin === 'inferred');
  if (length?.data.avgSentenceLength <= 18) style.add('concise');
  if (traits.has('direct')) style.add('direct');
  if (observations.some((o) => o.data.kind === 'passive')) style.add('active voice');

  return {
    voice: { traits: [...traits], tone, style: [...style] },
    keyTerms: observations.filter((o) => o.data.kind === 'keyTerm').map((o) => o.data.term),
  };
}
