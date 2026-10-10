import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Fake Anthropic API so the whole pipeline runs offline.
const GAME = '<!doctype html><html><head><title>Tap</title></head><body><button onclick="1">tap</button></body></html>';
const fake = http.createServer((req, res) => {
  let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => {
    const body = JSON.parse(b || '{}'), usage = { input_tokens: 100, output_tokens: 50 };
    const isMod = String(body.system).includes('safety filter');
    const base = { id: 'msg_1', type: 'message', role: 'assistant', model: body.model, stop_reason: 'end_turn', stop_sequence: null, usage };
    if (isMod) {
      const bad = body.messages[0].content.includes('badword');
      res.setHeader('content-type', 'application/json');
      return res.end(JSON.stringify({ ...base, content: [{ type: 'text', text: bad ? '{"ok":false,"category":"sexual"}' : '{"ok":true}' }] }));
    }
    res.writeHead(200, { 'content-type': 'text/event-stream' });
    const ev = (type, data) => res.write(`event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`);
    ev('message_start', { message: { ...base, content: [], usage: { input_tokens: 100, output_tokens: 1 } } });
    ev('content_block_start', { index: 0, content_block: { type: 'text', text: '' } });
    ev('content_block_delta', { index: 0, delta: { type: 'text_delta', text: 'Here you go!\n```html\n' + GAME + '\n```' } });
    ev('content_block_stop', { index: 0 });
    ev('message_delta', { delta: { stop_reason: 'end_turn', stop_sequence: null }, usage: { output_tokens: 50 } });
    ev('message_stop', {}); res.end();
  });
});

let server, base, dir;
const jar = {}; // name -> cookie
async function call(who, method, url, body) {
  const r = await fetch(base + url, { method, headers: { 'Content-Type': 'application/json', ...(jar[who] ? { cookie: jar[who] } : {}) }, body: body && JSON.stringify(body), signal: AbortSignal.timeout(8000) })
    .catch((e) => { throw new Error(`${method} ${url}: ${e.message}`); });
  const sc = r.headers.get('set-cookie'); if (sc) jar[who] = sc.split(';')[0];
  const ct = r.headers.get('content-type') || '';
  return { status: r.status, data: ct.includes('json') ? await r.json() : await r.text() };
}

before(async () => {
  await new Promise((r) => fake.listen(0, r));
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pp-'));
  const port = 3100 + Math.floor(Math.random() * 500); base = `http://localhost:${port}`;
  server = spawn('node', ['server/index.js'], { env: { ...process.env, PORT: port, DB_PATH: path.join(dir, 't.db'), ANTHROPIC_API_KEY: 'x',
    ANTHROPIC_BASE_URL: `http://localhost:${fake.address().port}`, ADMIN_EMAIL: 'a@x.com', ADMIN_PASSWORD: 'adminpw' }, stdio: 'inherit' });
  for (let i = 0; i < 50; i++) { try { await fetch(base + '/api/me'); break; } catch { await new Promise((r) => setTimeout(r, 100)); } }
});
after(() => { server.kill(); fake.close(); fs.rmSync(dir, { recursive: true, force: true }); });

test('full classroom flow', async () => {
  assert.equal((await call('t', 'POST', '/api/login', { email: 'a@x.com', password: 'nope' })).status, 401);
  assert.equal((await call('adm', 'POST', '/api/login', { email: 'a@x.com', password: 'adminpw' })).data.role, 'admin');
  assert.equal((await call('adm', 'POST', '/api/admin/teachers', { name: 'T', email: 't@x.com', password: 'secret1' })).status, 200);
  assert.equal((await call('t', 'POST', '/api/login', { email: 't@x.com', password: 'secret1' })).data.role, 'teacher');
  assert.equal((await call('t', 'GET', '/api/admin/usage')).status, 401, 'teacher cannot see admin');

  assert.equal((await call('t', 'POST', '/api/classes', { name: 'C', consent: false })).status, 400, 'consent required');
  const { id } = (await call('t', 'POST', '/api/classes', { name: 'C', consent: true, daily_limit: 2 })).data;
  const code = (await call('t', 'GET', '/api/classes/' + id)).data.code;

  assert.equal((await call('s', 'POST', '/api/join', { code: 'NOPE1', nickname: 'Leyla' })).status, 404);
  assert.equal((await call('s', 'POST', '/api/join', { code, nickname: 'Leyla' })).status, 200);
  assert.equal((await call('s2', 'POST', '/api/join', { code, nickname: 'Leyla' })).status, 409, 'nickname taken from another browser');
  assert.equal((await call('s', 'POST', '/api/join', { code, nickname: 'Leyla' })).status, 200, 'rejoin same browser');

  assert.equal((await call('s', 'POST', '/api/chat', { text: 'hi' })).data.error, 'no_lesson');
  await call('t', 'POST', `/api/classes/${id}/lessons`, { title: 'Guess', goal: 'Build a guessing game' });

  const ok = await call('s', 'POST', '/api/chat', { text: 'make a tap game' });
  assert.match(ok.data, /```html/);
  const bad = await call('s', 'POST', '/api/chat', { text: 'badword' });
  assert.deepEqual(bad.data, { blocked: true, category: 'sexual' });

  let msgs = (await call('t', 'GET', `/api/classes/${id}/messages`)).data;
  assert.deepEqual(msgs.map((m) => m.role), ['user', 'assistant', 'blocked'], 'blocked message logged, never answered');

  await call('t', 'PATCH', `/api/classes/${id}`, { paused: true });
  assert.equal((await call('s', 'POST', '/api/chat', { text: 'again' })).data.error, 'paused');
  await call('t', 'PATCH', `/api/classes/${id}`, { paused: false });
  assert.equal((await call('s', 'POST', '/api/chat', { text: 'second' })).status, 200);
  assert.equal((await call('s', 'POST', '/api/chat', { text: 'third' })).data.error, 'limit', 'daily limit of 2 enforced');

  const g = await call('s', 'POST', '/api/games', { title: 'Tap', html: GAME });
  await call('s', 'PATCH', '/api/games/' + g.data.id, { shared: true });
  assert.equal((await call('t', 'GET', `/api/classes/${id}/games`)).data.length, 1);

  const u = (await call('adm', 'GET', '/api/admin/usage')).data;
  assert.ok(u.total > 0 && u.classes[0].cost > 0);
  await call('adm', 'PUT', '/api/admin/settings', { spend_cap: 0.000001 });
  await call('t', 'PATCH', `/api/classes/${id}`, { daily_limit: 50 });
  assert.equal((await call('s', 'POST', '/api/chat', { text: 'x' })).data.error, 'budget', 'spend cap enforced');
});
