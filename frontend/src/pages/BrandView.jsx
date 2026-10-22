import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { BrainCircuit, Check, FileText, Globe, Loader2, Plus, Sparkles, Trash2, Upload, X } from 'lucide-react';
import AppShell from './AppShell.jsx';
import { api, getErrorMessage } from '../api/client.js';
import { FormField } from '../components/FormField.jsx';
import { BackLink, Badge, ErrorAlert, Section, Select, Spinner } from '../components/ui.jsx';
import { formatDateTime, validateFile } from '../utils/format.js';

const TONES = ['formal', 'conversational', 'promotional', 'technical'];
const SEVERITIES = ['critical', 'warning', 'info'];

// Starting configuration for each rule type in the "add rule" form.
const RULE_TEMPLATES = {
  forbidden_term: { terms: ['synergy', 'leverage'] },
  preferred_term: { preferred: 'customers', alternatives: ['clients'] },
  required_term: { terms: ['Acme'] },
  sentence_length: { maxWords: 20 },
  passive_voice: {},
  pattern: { pattern: '\\bASAP\\b', flags: 'i', message: 'Give a concrete date instead of ASAP.' },
  tone: { allowed: ['conversational'], minConfidence: 0.6 },
  claim: {},
  custom_semantic: { keywords: ['guarantee'], message: 'Legal must approve any guarantee.' },
};

const csv = (list) => (list || []).join(', ');
const parseCsv = (s) => s.split(',').map((x) => x.trim()).filter(Boolean);

function ProfileEditor({ brand, onSave }) {
  const [tone, setTone] = useState(brand.voice.tone);
  const [traits, setTraits] = useState(csv(brand.voice.traits));
  const [style, setStyle] = useState(csv(brand.voice.style));
  const [keyMessages, setKeyMessages] = useState((brand.messaging.keyMessages || []).join('\n'));
  const [description, setDescription] = useState(brand.description);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTone(brand.voice.tone);
    setTraits(csv(brand.voice.traits));
    setStyle(csv(brand.voice.style));
  }, [brand.voice]);

  async function save() {
    setSaving(true);
    await onSave({
      description,
      voice: { tone, traits: parseCsv(traits), style: parseCsv(style) },
      messaging: { keyMessages: keyMessages.split('\n').map((s) => s.trim()).filter(Boolean) },
    });
    setSaving(false);
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-1.5 text-sm font-medium text-slate-300">Tone (checked by the tone model)</p>
        <div className="flex flex-wrap gap-2">
          {TONES.map((t) => (
            <label key={t} className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-charcoal-600 px-3 py-1.5 text-sm capitalize text-slate-300">
              <input type="checkbox" checked={tone.includes(t)} onChange={(e) => setTone((v) => (e.target.checked ? [...v, t] : v.filter((x) => x !== t)))} />
              {t}
            </label>
          ))}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Traits" id="traits" value={traits} onChange={(e) => setTraits(e.target.value)} placeholder="clear, confident, human" />
        <FormField label="Style" id="style" value={style} onChange={(e) => setStyle(e.target.value)} placeholder="direct, concise" />
      </div>
      <div>
        <label htmlFor="description" className="mb-1.5 block text-sm font-medium text-slate-300">
          Description
        </label>
        <textarea id="description" className="input min-h-[4rem]" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div>
        <label htmlFor="messages" className="mb-1.5 block text-sm font-medium text-slate-300">
          Key messages (one per line)
        </label>
        <textarea id="messages" className="input min-h-[4rem]" value={keyMessages} onChange={(e) => setKeyMessages(e.target.value)} />
      </div>
      {brand.vocabulary.keyTerms?.length > 0 && (
        <p className="text-xs text-slate-400">
          Learned key terms: <span className="text-slate-300">{brand.vocabulary.keyTerms.join(', ')}</span>
        </p>
      )}
      <button type="button" className="btn-primary" onClick={save} disabled={saving}>
        {saving && <Loader2 size={16} className="animate-spin" />} Save profile
      </button>
    </div>
  );
}

function SourceForm({ brandId, onAdded }) {
  const [mode, setMode] = useState('text');
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      let res;
      if (mode === 'file') {
        if (!file) throw new Error('Choose a file.');
        const problem = validateFile(file);
        if (problem) throw new Error(problem);
        const form = new FormData();
        if (name) form.append('name', name);
        form.append('file', file);
        res = await api.post(`/brands/${brandId}/sources`, form);
      } else {
        res = await api.post(`/brands/${brandId}/sources`, mode === 'url' ? { type: 'url', url, name } : { type: 'text', name, content });
      }
      onAdded(res.data.source);
      setName('');
      setContent('');
      setUrl('');
      setFile(null);
    } catch (err) {
      setError(err.response ? getErrorMessage(err) : err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border border-charcoal-700 p-4" noValidate>
      <div className="flex gap-1">
        {[
          ['text', 'Text', FileText],
          ['file', 'File', Upload],
          ['url', 'URL', Globe],
        ].map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            onClick={() => setMode(id)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm ${mode === id ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>
      <FormField label={mode === 'text' ? 'Name' : 'Name (optional)'} id="source-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Brand guidelines 2026" />
      {mode === 'text' && (
        <textarea
          className="input min-h-[8rem] text-sm"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={'Paste brand guidelines or approved content.\n\ne.g. Our voice is clear and friendly. Avoid "synergy". Use "customers" instead of "clients".'}
          aria-label="Source text"
        />
      )}
      {mode === 'url' && <FormField label="URL" id="source-url" type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/about" />}
      {mode === 'file' && (
        <input type="file" accept=".pdf,.docx,.txt" onChange={(e) => setFile(e.target.files?.[0] || null)} className="block text-sm text-slate-300" aria-label="Source file" />
      )}
      <ErrorAlert>{error}</ErrorAlert>
      <button type="submit" className="btn-secondary" disabled={saving}>
        {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Add source
      </button>
    </form>
  );
}

function RuleCard({ rule, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [config, setConfig] = useState(JSON.stringify(rule.configuration, null, 2));
  const [severity, setSeverity] = useState(rule.severity);
  const [error, setError] = useState('');

  async function save() {
    let parsed;
    try {
      parsed = JSON.parse(config);
    } catch {
      return setError('Configuration must be valid JSON.');
    }
    const err = await onUpdate(rule.id, { configuration: parsed, severity });
    if (err) setError(err);
    else {
      setError('');
      setEditing(false);
    }
  }

  return (
    <li className="rounded-lg border border-charcoal-700 bg-charcoal-950/50 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="mr-auto text-sm font-medium text-slate-100">{rule.name}</p>
        <span className="text-xs text-slate-500">{rule.type}</span>
        <Badge value={rule.status} />
      </div>
      {rule.description && <p className="mt-1.5 text-xs text-slate-400">{rule.description}</p>}

      {editing ? (
        <div className="mt-3 space-y-2">
          <select className="input w-auto py-1.5 text-xs" value={severity} onChange={(e) => setSeverity(e.target.value)} aria-label="Severity">
            {SEVERITIES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <textarea className="input min-h-[6rem] font-mono text-xs" value={config} onChange={(e) => setConfig(e.target.value)} aria-label="Rule configuration (JSON)" />
          <ErrorAlert>{error}</ErrorAlert>
          <div className="flex gap-2">
            <button type="button" className="btn-primary px-3 py-1.5 text-xs" onClick={save}>
              Save
            </button>
            <button type="button" className="btn-secondary px-3 py-1.5 text-xs" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <pre className="mt-2 overflow-auto rounded bg-charcoal-800/60 px-2 py-1 text-[11px] text-slate-400">
          {rule.severity} · {JSON.stringify(rule.configuration)}
        </pre>
      )}

      {!editing && (
        <div className="mt-3 flex flex-wrap gap-2">
          {rule.status !== 'active' && (
            <button type="button" className="btn-secondary px-3 py-1.5 text-xs text-emerald-300" onClick={() => onUpdate(rule.id, { status: 'active' })}>
              <Check size={14} /> Accept
            </button>
          )}
          {rule.status !== 'rejected' && (
            <button type="button" className="btn-secondary px-3 py-1.5 text-xs text-red-300" onClick={() => onUpdate(rule.id, { status: 'rejected' })}>
              <X size={14} /> Reject
            </button>
          )}
          <button
            type="button"
            className="btn-secondary px-3 py-1.5 text-xs"
            onClick={() => {
              setConfig(JSON.stringify(rule.configuration, null, 2));
              setSeverity(rule.severity);
              setEditing(true);
            }}
          >
            Edit
          </button>
          {rule.status === 'active' && (
            <label className="inline-flex items-center gap-2 px-2 text-xs text-slate-400">
              <input type="checkbox" checked={rule.enabled} onChange={(e) => onUpdate(rule.id, { enabled: e.target.checked })} />
              Enabled
            </label>
          )}
          <button type="button" className="ml-auto text-slate-500 hover:text-red-300" onClick={() => onDelete(rule.id)} aria-label={`Delete rule ${rule.name}`}>
            <Trash2 size={15} />
          </button>
        </div>
      )}
    </li>
  );
}

function NewRuleForm({ onCreate }) {
  const [type, setType] = useState('forbidden_term');
  const [name, setName] = useState('');
  const [severity, setSeverity] = useState('warning');
  const [config, setConfig] = useState(JSON.stringify(RULE_TEMPLATES.forbidden_term, null, 2));
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    let configuration;
    try {
      configuration = JSON.parse(config);
    } catch {
      return setError('Configuration must be valid JSON.');
    }
    const err = await onCreate({ type, name, severity, configuration });
    if (err) setError(err);
    else {
      setError('');
      setName('');
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border border-charcoal-700 p-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Select
          label="Type"
          id="rule-type"
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            setConfig(JSON.stringify(RULE_TEMPLATES[e.target.value], null, 2));
          }}
        >
          {Object.keys(RULE_TEMPLATES).map((t) => (
            <option key={t}>{t}</option>
          ))}
        </Select>
        <FormField label="Name" id="rule-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Avoid jargon" />
        <Select label="Severity" id="rule-severity" value={severity} onChange={(e) => setSeverity(e.target.value)}>
          {SEVERITIES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </Select>
      </div>
      <textarea className="input min-h-[6rem] font-mono text-xs" value={config} onChange={(e) => setConfig(e.target.value)} aria-label="Configuration (JSON)" />
      <ErrorAlert>{error}</ErrorAlert>
      <button type="submit" className="btn-secondary">
        <Plus size={16} /> Add active rule
      </button>
    </form>
  );
}

export default function BrandView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [brand, setBrand] = useState(null);
  const [sources, setSources] = useState([]);
  const [observations, setObservations] = useState([]);
  const [rules, setRules] = useState([]);
  const [ruleTab, setRuleTab] = useState('suggested');
  const [loading, setLoading] = useState(true);
  const [learning, setLearning] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [b, s, o, r] = await Promise.all([
        api.get(`/brands/${id}`),
        api.get(`/brands/${id}/sources`),
        api.get(`/brands/${id}/observations`),
        api.get(`/brands/${id}/rules`),
      ]);
      setBrand(b.data.brand);
      setSources(s.data.sources);
      setObservations(o.data.observations);
      setRules(r.data.rules);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load this brand.'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveProfile(body) {
    try {
      setBrand((await api.patch(`/brands/${id}`, body)).data.brand);
      setNotice('Profile saved.');
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function learn() {
    setLearning(true);
    setError('');
    setNotice('');
    try {
      const res = await api.post(`/brands/${id}/learn`);
      setBrand(res.data.brand);
      setObservations(res.data.observations);
      setRules((await api.get(`/brands/${id}/rules`)).data.rules);
      setRuleTab('suggested');
      setNotice(`Learned ${res.data.observations.length} observations and suggested ${res.data.suggestedRules.length} new rules. Review them below.`);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLearning(false);
    }
  }

  async function deleteSource(sourceId) {
    try {
      await api.delete(`/brands/${id}/sources/${sourceId}`);
      setSources((s) => s.filter((x) => x.id !== sourceId));
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function updateRule(ruleId, body) {
    try {
      const res = await api.patch(`/brands/${id}/rules/${ruleId}`, body);
      setRules((list) => list.map((r) => (r.id === ruleId ? res.data.rule : r)));
      return null;
    } catch (err) {
      return getErrorMessage(err);
    }
  }

  async function createRule(body) {
    try {
      const res = await api.post(`/brands/${id}/rules`, body);
      setRules((list) => [res.data.rule, ...list]);
      setRuleTab('active');
      return null;
    } catch (err) {
      return getErrorMessage(err);
    }
  }

  async function deleteRule(ruleId) {
    try {
      await api.delete(`/brands/${id}/rules/${ruleId}`);
      setRules((list) => list.filter((r) => r.id !== ruleId));
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function deleteBrand() {
    if (!window.confirm('Delete this brand with its sources, observations and rules?')) return;
    try {
      await api.delete(`/brands/${id}`);
      navigate('/brands', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  if (loading)
    return (
      <AppShell wide>
        <Spinner />
      </AppShell>
    );
  if (!brand)
    return (
      <AppShell wide>
        <BackLink to="/brands">Back to brands</BackLink>
        <div className="mt-6">
          <ErrorAlert>{error || 'Brand not found.'}</ErrorAlert>
        </div>
      </AppShell>
    );

  const shownRules = rules.filter((r) => r.status === ruleTab);
  const processed = sources.filter((s) => s.status === 'processed').length;

  return (
    <AppShell wide>
      <BackLink to="/brands">Back to brands</BackLink>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">{brand.name}</h1>
          <p className="mt-1 text-sm text-slate-400">
            {brand.learnedAt ? `Last learned ${formatDateTime(brand.learnedAt)}` : 'Add sources, then select Learn to build the brand profile.'}
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn-primary" onClick={learn} disabled={learning || !processed} title={processed ? '' : 'Add a source first'}>
            {learning ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} Learn from sources
          </button>
          <button type="button" className="btn-danger" onClick={deleteBrand}>
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <ErrorAlert>{error}</ErrorAlert>
        {notice && <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">{notice}</p>}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Section title="Sources">
          <SourceForm brandId={id} onAdded={(s) => setSources((list) => [s, ...list])} />
          <ul className="mt-4 space-y-2">
            {sources.map((s) => (
              <li key={s.id} className="flex items-center gap-3 rounded-lg border border-charcoal-700 p-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-slate-200">{s.name}</p>
                  <p className="text-xs text-slate-500">
                    {s.type.toUpperCase()} · {s.wordCount} words{s.error ? ` · ${s.error}` : ''}
                  </p>
                </div>
                <Badge value={s.status} />
                <button type="button" className="text-slate-500 hover:text-red-300" onClick={() => deleteSource(s.id)} aria-label={`Delete source ${s.name}`}>
                  <Trash2 size={15} />
                </button>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Brand profile">
          <ProfileEditor brand={brand} onSave={saveProfile} />
        </Section>

        <Section title={`Observations (${observations.length})`}>
          {observations.length === 0 ? (
            <p className="text-sm text-slate-400">Nothing learned yet.</p>
          ) : (
            <ul className="max-h-[32rem] space-y-2 overflow-auto pr-1">
              {observations.map((o) => (
                <li key={o.id} className="rounded-lg border border-charcoal-700 bg-charcoal-950/50 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge value={o.origin} />
                    <span className="text-xs capitalize text-slate-500">{o.type}</span>
                    {o.type === 'tone' && (
                      <span className="inline-flex items-center gap-1 text-xs text-indigo-300">
                        <BrainCircuit size={12} /> model
                      </span>
                    )}
                    <span className="ml-auto text-xs text-slate-500">{Math.round(o.confidence * 100)}% confidence</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-200">{o.observation}</p>
                  {o.evidence.map((e, i) => (
                    <p key={i} className="mt-1.5 border-l-2 border-indigo-400/40 pl-2 text-xs text-slate-400">
                      {e.text}
                    </p>
                  ))}
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Rules">
          <div className="mb-3 flex gap-1">
            {['suggested', 'active', 'rejected'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setRuleTab(t)}
                className={`rounded-lg px-3 py-1.5 text-sm capitalize ${ruleTab === t ? 'bg-charcoal-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              >
                {t} ({rules.filter((r) => r.status === t).length})
              </button>
            ))}
          </div>
          {shownRules.length === 0 ? (
            <p className="mb-4 text-sm text-slate-400">No {ruleTab} rules.</p>
          ) : (
            <ul className="mb-4 max-h-[28rem] space-y-2 overflow-auto pr-1">
              {shownRules.map((r) => (
                <RuleCard key={r.id} rule={r} onUpdate={updateRule} onDelete={deleteRule} />
              ))}
            </ul>
          )}
          <NewRuleForm onCreate={createRule} />
          <p className="mt-3 text-xs text-slate-500">
            Only active, enabled rules are used when analyzing documents for this brand.{' '}
            <Link to="/dashboard" className="text-indigo-300">
              Pick this brand on a document
            </Link>{' '}
            to use them.
          </p>
        </Section>
      </div>
    </AppShell>
  );
}
