// End-to-end API test against a real MongoDB, in a throwaway database.
// Skipped automatically when MongoDB is not reachable.
//   TEST_MONGODB_URI=mongodb://127.0.0.1:27017/ai_content_assurance_test npm test
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';

process.env.JWT_SECRET ||= 'test-secret';
const { createApp } = await import('../src/app.js');
const { loadModels } = await import('../src/services/modelService.js');

const uri = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/ai_content_assurance_test';
let server;
let base;
let available = true;

before(async () => {
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 2000 });
    await mongoose.connection.dropDatabase();
  } catch {
    available = false;
    return;
  }
  await loadModels();
  server = createApp().listen(0);
  base = `http://127.0.0.1:${server.address().port}/api`;
});

after(async () => {
  server?.close();
  if (available) await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

async function call(method, path, { token, body } = {}) {
  const res = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: await res.json() };
}

async function signup(email) {
  const res = await call('POST', '/auth/signup', {
    body: { name: 'Test User', email, password: 'password123', confirmPassword: 'password123' },
  });
  assert.equal(res.status, 201);
  return res.body.token;
}

test('health reports database and models', async (t) => {
  if (!available) return t.skip('MongoDB not reachable');
  const res = await call('GET', '/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.database, 'up');
});

test('document -> analysis -> optimization -> review -> final content', async (t) => {
  if (!available) return t.skip('MongoDB not reachable');
  const token = await signup('flow@example.com');
  const other = await signup('other@example.com');

  // create (normalization + blocks)
  const created = await call('POST', '/documents', {
    token,
    body: {
      title: 'Launch post',
      contentType: 'blog',
      sourceType: 'paste',
      content: '# Launch\n\nOur revolutionary platform helps teams utilize data.\n\nWe was ready for launch.',
    },
  });
  assert.equal(created.status, 201);
  const doc = created.body.document;
  assert.deepEqual(doc.blocks.map((b) => b.type), ['heading', 'paragraph', 'paragraph']);
  assert.equal(doc.originalContent, doc.currentContent);

  // ownership
  assert.equal((await call('GET', `/documents/${doc.id}`, { token: other })).status, 404);
  assert.equal((await call('GET', '/documents', { token: other })).body.documents.length, 0);
  assert.equal((await call('GET', `/documents/${doc.id}`)).status, 401);

  // optimize before analyze -> 409
  assert.equal((await call('POST', `/documents/${doc.id}/optimize`, { token })).status, 409);

  // analyze
  const analyzed = await call('POST', `/documents/${doc.id}/analyze`, { token, body: {} });
  assert.equal(analyzed.status, 201);
  const checks = analyzed.body.analysis.findings.map((f) => f.check);
  assert.ok(checks.includes('vocabulary.forbidden_term'));
  assert.ok(checks.includes('grammar.subject_verb_agreement'));
  assert.ok(analyzed.body.analysis.overallScore < 100);

  // unchanged content -> cached result
  const again = await call('POST', `/documents/${doc.id}/analyze`, { token, body: {} });
  assert.equal(again.body.cached, true);

  // optimize
  const optimized = await call('POST', `/documents/${doc.id}/optimize`, { token });
  assert.equal(optimized.status, 201);
  const opt = optimized.body.optimization;
  assert.equal(opt.changes.length, 2);

  // apply with pending changes -> 409
  assert.equal((await call('POST', `/optimizations/${opt.id}/apply`, { token })).status, 409);

  // review: approve the first, edit the second
  const [first, second] = opt.changes;
  await call('PATCH', `/optimizations/${opt.id}/changes/${first.changeId}`, { token, body: { status: 'approved' } });
  const edited = await call('POST', `/optimizations/${opt.id}/review`, {
    token,
    body: { changes: [{ changeId: second.changeId, status: 'edited', editedText: 'We were ready to launch.' }] },
  });
  assert.equal(edited.status, 200);
  assert.equal((await call('POST', `/optimizations/${opt.id}/apply`, { token: other })).status, 404);

  // apply
  const applied = await call('POST', `/optimizations/${opt.id}/apply`, { token });
  assert.equal(applied.status, 200);
  const final = applied.body.document;
  assert.equal(final.status, 'approved');
  assert.equal(final.currentContent, `# Launch\n\n${first.proposedText}\n\nWe were ready to launch.`);
  assert.equal(final.originalContent, doc.originalContent, 'original content is never overwritten');

  // a second apply is refused
  assert.equal((await call('POST', `/optimizations/${opt.id}/apply`, { token })).status, 409);

  // downloads: applied document in the source format (paste -> docx), PDF, one section, original, change report
  const download = (path, t = token) => fetch(base + path, { headers: { Authorization: `Bearer ${t}` } });
  const docx = await download(`/documents/${doc.id}/export?format=source`);
  assert.equal(docx.status, 200);
  assert.match(docx.headers.get('content-disposition'), /Launch post\.docx/);
  assert.equal(Buffer.from(await docx.arrayBuffer()).subarray(0, 2).toString(), 'PK');
  const pdf = await download(`/documents/${doc.id}/export?format=pdf`);
  assert.equal(Buffer.from(await pdf.arrayBuffer()).subarray(0, 4).toString(), '%PDF');
  const section = await (await download(`/documents/${doc.id}/export?format=md&section=sec_01`)).text();
  assert.equal(section, final.currentContent);
  const original = await (await download(`/documents/${doc.id}/export?format=md&version=original`)).text();
  assert.equal(original, doc.originalContent);
  assert.equal((await download(`/documents/${doc.id}/export?format=pdf`, other)).status, 404);
  const report = await (await download(`/optimizations/${opt.id}/report?format=md`)).text();
  assert.match(report, /# Change report: Launch post/);
  assert.match(report, /## Launch/);
  assert.match(report, /After: We were ready to launch\./);
});

test('brand: sources -> learn -> approve rules -> brand-aware analysis with claims', async (t) => {
  if (!available) return t.skip('MongoDB not reachable');
  const token = await signup('brand@example.com');

  const brand = (await call('POST', '/brands', { token, body: { name: 'Acme' } })).body.brand;
  const source = await call('POST', `/brands/${brand.id}/sources`, {
    token,
    body: {
      type: 'text',
      name: 'Brand guide',
      content:
        'Avoid buzzwords such as "synergy" and "leverage". Use "customers" instead of "clients".\n\n' +
        'Customers experienced a 37% improvement in efficiency after adopting the product.\n\n' +
        'We write for you and we keep it simple, so you always know what to do next.',
    },
  });
  assert.equal(source.status, 201);
  assert.equal(source.body.source.status, 'processed');

  const learned = await call('POST', `/brands/${brand.id}/learn`, { token });
  assert.equal(learned.status, 200);
  assert.ok(learned.body.observations.some((o) => o.origin === 'explicit'));
  const suggested = learned.body.suggestedRules;
  assert.ok(suggested.every((r) => r.status === 'suggested'));

  // learning again does not duplicate suggestions
  assert.equal((await call('POST', `/brands/${brand.id}/learn`, { token })).body.suggestedRules.length, 0);

  // approve the vocabulary rules
  for (const rule of suggested.filter((r) => r.category === 'vocabulary')) {
    const res = await call('PATCH', `/brands/${brand.id}/rules/${rule.id}`, { token, body: { status: 'active' } });
    assert.equal(res.body.rule.status, 'active');
  }
  // invalid manual rule is rejected with a clear message
  const bad = await call('POST', `/brands/${brand.id}/rules`, { token, body: { name: 'x', type: 'tone', configuration: { allowed: ['angry'] } } });
  assert.equal(bad.status, 400);

  const doc = (
    await call('POST', '/documents', {
      token,
      body: { title: 'Pitch', content: 'Our clients love the synergy. Our product improves efficiency by 50%.', brandId: brand.id },
    })
  ).body.document;

  const analysis = (await call('POST', `/documents/${doc.id}/analyze`, { token, body: {} })).body.analysis;
  const byCheck = (c) => analysis.findings.filter((f) => f.check === c);
  assert.ok(byCheck('vocabulary.forbidden_term').some((f) => f.text === 'synergy' && f.ruleId));
  assert.ok(byCheck('vocabulary.preferred_term').some((f) => f.replacement === 'customers'));
  assert.equal(byCheck('claim.mismatch').length, 1);
  assert.equal(analysis.brandId, brand.id);
});
