// End-to-end API test against a real MongoDB, in a throwaway database, with a fake LanguageTool.
// Skipped automatically when MongoDB is not reachable.
//   TEST_MONGODB_URI=mongodb://127.0.0.1:27017/contentiq_test npm test
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { startFakeLanguageTool } from './fakeLanguageTool.js';

const languageTool = await startFakeLanguageTool();
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET ||= 'test-secret';
process.env.LANGUAGETOOL_URL = `http://127.0.0.1:${languageTool.address().port}`;
const { createApp } = await import('../src/app.js');

const uri = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/contentiq_test';
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
  server = createApp().listen(0);
  base = `http://127.0.0.1:${server.address().port}/api`;
});

after(async () => {
  server?.close();
  languageTool.close();
  if (available) await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

// Sends a request with the session cookie (if any) and returns { status, body, headers, cookie }.
async function call(method, path, { cookie, body, form } = {}) {
  const headers = cookie ? { Cookie: cookie } : {};
  if (body) headers['Content-Type'] = 'application/json';
  const res = await fetch(base + path, { method, headers, body: form ?? (body ? JSON.stringify(body) : undefined) });
  const type = res.headers.get('content-type') || '';
  const data = type.includes('application/json') ? await res.json() : Buffer.from(await res.arrayBuffer());
  const setCookie = res.headers.get('set-cookie');
  return { status: res.status, body: data, headers: res.headers, cookie: setCookie?.split(';')[0] };
}

const SIGNUP = { name: 'Test User', email: 'user@example.com', password: 'password123', confirmPassword: 'password123' };
const SAMPLE = 'We was happy with teh results. Please recieve the report in order to utilize it.';

async function registerUser(email) {
  const res = await call('POST', '/auth/register', { body: { ...SIGNUP, email } });
  assert.equal(res.status, 201);
  return res.cookie;
}

test('health reports the database and grammar service', async (t) => {
  if (!available) return t.skip('MongoDB not reachable');
  const res = await call('GET', '/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.database, 'up');
  assert.equal(res.body.grammarService, 'up');
});

test('register, login, me and logout with an HTTP-only cookie', async (t) => {
  if (!available) return t.skip('MongoDB not reachable');

  const signup = await call('POST', '/auth/register', { body: SIGNUP });
  assert.equal(signup.status, 201);
  assert.equal(signup.body.token, undefined);
  assert.equal(signup.body.user.email, SIGNUP.email);
  assert.equal(signup.body.user.passwordHash, undefined);
  const setCookie = signup.headers.get('set-cookie');
  assert.match(setCookie, /HttpOnly/);
  assert.match(setCookie, /SameSite=Strict/);

  assert.equal((await call('POST', '/auth/register', { body: SIGNUP })).status, 409);
  assert.equal((await call('POST', '/auth/login', { body: { email: SIGNUP.email, password: 'wrongpass1' } })).status, 401);

  const login = await call('POST', '/auth/login', { body: { email: SIGNUP.email, password: SIGNUP.password } });
  assert.equal(login.status, 200);
  assert.ok(login.cookie);

  const me = await call('GET', '/auth/me', { cookie: login.cookie });
  assert.equal(me.status, 200);
  assert.equal(me.body.user.name, SIGNUP.name);

  const logout = await call('POST', '/auth/logout', { cookie: login.cookie });
  assert.equal(logout.status, 200);
  assert.match(logout.headers.get('set-cookie'), /contentiq_token=;/);
});

test('signup validation and protected routes', async (t) => {
  if (!available) return t.skip('MongoDB not reachable');

  const weak = await call('POST', '/auth/register', { body: { ...SIGNUP, email: 'b@example.com', password: 'short', confirmPassword: 'short' } });
  assert.equal(weak.status, 400);
  const mismatch = await call('POST', '/auth/register', { body: { ...SIGNUP, email: 'c@example.com', confirmPassword: 'different1' } });
  assert.equal(mismatch.status, 400);

  assert.equal((await call('GET', '/auth/me')).status, 401);
  assert.equal((await call('GET', '/auth/me', { cookie: 'contentiq_token=bad.token' })).status, 401);
  assert.equal((await call('GET', '/documents')).status, 401);
});

test('content input validation', async (t) => {
  if (!available) return t.skip('MongoDB not reachable');
  const cookie = await registerUser('input@example.com');

  assert.equal((await call('POST', '/documents/from-text', { cookie, body: { text: '   ' } })).status, 400);
  assert.equal((await call('POST', '/documents/from-text', { cookie, body: { text: 'a '.repeat(15_000) } })).status, 400);
  assert.equal((await call('POST', '/documents/from-url', { cookie, body: { url: 'http://127.0.0.1/admin' } })).status, 400);

  const form = new FormData();
  form.append('file', new Blob(['not really a pdf']), 'fake.pdf');
  const fakePdf = await call('POST', '/documents/upload', { cookie, form });
  assert.equal(fakePdf.status, 400);
  assert.match(fakePdf.body.message, /not a valid PDF/);

  const exe = new FormData();
  exe.append('file', new Blob(['MZ']), 'tool.exe');
  assert.equal((await call('POST', '/documents/upload', { cookie, form: exe })).status, 400);
});

test('upload a TXT file', async (t) => {
  if (!available) return t.skip('MongoDB not reachable');
  const cookie = await registerUser('upload@example.com');

  const form = new FormData();
  form.append('file', new Blob([SAMPLE], { type: 'text/plain' }), 'Weekly notes.txt');
  const res = await call('POST', '/documents/upload', { cookie, form });
  assert.equal(res.status, 201);
  assert.equal(res.body.document.title, 'Weekly notes');
  assert.equal(res.body.document.sourceType, 'file');
  assert.equal(res.body.document.original.text, SAMPLE);
  assert.equal(res.body.document.status, 'draft');
});

test('analyze, optimize, edit, approve and export', async (t) => {
  if (!available) return t.skip('MongoDB not reachable');
  const cookie = await registerUser('flow@example.com');

  const created = await call('POST', '/documents/from-text', { cookie, body: { title: 'Report', text: SAMPLE } });
  assert.equal(created.status, 201);
  const id = created.body.document.id;

  // Nothing to download before approval
  assert.equal((await call('GET', `/documents/${id}/export?format=txt`, { cookie })).status, 409);

  // Analyze: real issues from (fake) LanguageTool + Flesch metrics
  const analyzed = await call('POST', `/documents/${id}/analyze`, { cookie });
  assert.equal(analyzed.status, 200);
  const original = analyzed.body.document.original.analysis;
  assert.equal(original.grammar.issueCount, 3);
  assert.deepEqual(original.grammar.issues.map((i) => i.text), ['teh', 'We was', 'recieve']);
  assert.equal(original.grammar.issues[0].start, SAMPLE.indexOf('teh'));
  assert.ok(original.grammar.score < 100);
  assert.equal(original.readability.wordCount, 15);
  assert.equal(typeof original.readability.fleschReadingEase, 'number');
  assert.equal(analyzed.body.document.status, 'analyzed');

  // Optimize: unambiguous fixes + plain wording; the ambiguous "recieve" is left alone
  const optimized = await call('POST', `/documents/${id}/optimize`, { cookie });
  assert.equal(optimized.status, 200);
  const doc = optimized.body.document;
  assert.equal(doc.original.text, SAMPLE);
  assert.equal(doc.optimized.text, 'We were happy with the results. Please recieve the report to use it.');
  assert.equal(doc.optimized.analysis.grammar.issueCount, 1);
  assert.ok(doc.optimized.analysis.grammar.score > original.grammar.score);
  assert.equal(doc.status, 'awaiting_review');
  assert.equal(optimized.body.optimization.skippedSuggestions, 1);

  // Approving a stale version is refused
  const stale = await call('PATCH', `/documents/${id}/review`, { cookie, body: { action: 'approve', versionId: '000000000000000000000000' } });
  assert.equal(stale.status, 409);

  // Approve the exact version shown
  const approved = await call('PATCH', `/documents/${id}/review`, { cookie, body: { action: 'approve', versionId: doc.optimized.versionId } });
  assert.equal(approved.status, 200);
  assert.equal(approved.body.document.status, 'approved');
  assert.equal(approved.body.document.approvedVersionId, doc.optimized.versionId);

  const txt = await call('GET', `/documents/${id}/export?format=txt`, { cookie });
  assert.equal(txt.status, 200);
  assert.equal(txt.body.toString('utf8'), doc.optimized.text);
  assert.match(txt.headers.get('content-disposition'), /Report-approved\.txt/);

  const docx = await call('GET', `/documents/${id}/export?format=docx`, { cookie });
  assert.equal(docx.status, 200);
  assert.equal(docx.body.subarray(0, 2).toString('latin1'), 'PK');

  assert.equal((await call('GET', `/documents/${id}/export?format=pdf`, { cookie })).status, 400);

  // Editing an approved document resets approval until the new version is reviewed
  const edited = await call('PUT', `/documents/${id}/draft`, { cookie, body: { text: 'We were happy with the results. Please receive the report.' } });
  assert.equal(edited.status, 200);
  assert.equal(edited.body.document.status, 'awaiting_review');
  assert.equal(edited.body.document.approvedVersionId, null);
  assert.equal(edited.body.document.optimized.source, 'edit');
  assert.equal(edited.body.document.optimized.analysis.grammar.issueCount, 0);
  assert.equal(edited.body.document.versions.length, 2);
  assert.equal((await call('GET', `/documents/${id}/export?format=txt`, { cookie })).status, 409);

  // Edit and approve in one step
  const editApprove = await call('PATCH', `/documents/${id}/review`, { cookie, body: { action: 'edit_approve', text: 'Final approved text.' } });
  assert.equal(editApprove.status, 200);
  assert.equal(editApprove.body.document.status, 'approved');
  assert.equal(editApprove.body.document.versions.length, 3);
  const finalTxt = await call('GET', `/documents/${id}/export?format=txt`, { cookie });
  assert.equal(finalTxt.body.toString('utf8'), 'Final approved text.');

  // Dashboard stats and history
  const list = await call('GET', '/documents', { cookie });
  assert.equal(list.status, 200);
  assert.equal(list.body.stats.total, 1);
  assert.equal(list.body.stats.approved, 1);
  assert.equal(list.body.documents[0].scores.originalGrammar, original.grammar.score);
  assert.equal(list.body.documents[0].original, undefined);
});

test('reject keeps the original and blocks download', async (t) => {
  if (!available) return t.skip('MongoDB not reachable');
  const cookie = await registerUser('reject@example.com');

  const { body } = await call('POST', '/documents/from-text', { cookie, body: { text: SAMPLE } });
  const id = body.document.id;
  assert.equal(body.document.title, 'We was happy with teh results Please recieve');

  // Review before optimizing is refused
  assert.equal((await call('PATCH', `/documents/${id}/review`, { cookie, body: { action: 'reject' } })).status, 409);

  await call('POST', `/documents/${id}/optimize`, { cookie });
  const rejected = await call('PATCH', `/documents/${id}/review`, { cookie, body: { action: 'reject' } });
  assert.equal(rejected.status, 200);
  assert.equal(rejected.body.document.status, 'rejected');
  assert.equal(rejected.body.document.original.text, SAMPLE);
  assert.equal((await call('GET', `/documents/${id}/export?format=txt`, { cookie })).status, 409);
  assert.equal((await call('PATCH', `/documents/${id}/review`, { cookie, body: { action: 'maybe' } })).status, 400);
});

test('users can only access their own documents', async (t) => {
  if (!available) return t.skip('MongoDB not reachable');
  const owner = await registerUser('owner@example.com');
  const other = await registerUser('other@example.com');

  const { body } = await call('POST', '/documents/from-text', { cookie: owner, body: { text: SAMPLE } });
  const id = body.document.id;

  assert.equal((await call('GET', `/documents/${id}`, { cookie: other })).status, 404);
  assert.equal((await call('POST', `/documents/${id}/analyze`, { cookie: other })).status, 404);
  assert.equal((await call('POST', `/documents/${id}/optimize`, { cookie: other })).status, 404);
  assert.equal((await call('PATCH', `/documents/${id}/review`, { cookie: other, body: { action: 'reject' } })).status, 404);
  assert.equal((await call('GET', `/documents/${id}/export?format=txt`, { cookie: other })).status, 404);
  assert.equal((await call('GET', '/documents/not-an-id', { cookie: other })).status, 404);

  const list = await call('GET', '/documents', { cookie: other });
  assert.equal(list.body.stats.total, 0);
  assert.equal((await call('GET', `/documents/${id}`, { cookie: owner })).status, 200);
});
