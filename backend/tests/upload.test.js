import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET ||= 'test-secret';
const { createApp } = await import('../src/app.js');

let server;
let base;

before(async () => {
  server = createApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => new Promise((resolve) => server.close(resolve)));

test('upload requires a logged-in user', async () => {
  const form = new FormData();
  form.append('file', new Blob(['hello'], { type: 'text/plain' }), 'hello.txt');
  const res = await fetch(`${base}/api/documents/upload`, { method: 'POST', body: form });
  assert.equal(res.status, 401);
});

test('document list requires a logged-in user', async () => {
  const res = await fetch(`${base}/api/documents`);
  assert.equal(res.status, 401);
});
