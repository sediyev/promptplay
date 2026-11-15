import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Fake Anthropic API so the whole pipeline runs offline.
const GAME = '<!doctype html><html><head><title>Tap</title></head><body><button onclick="1">tap</button></body></html>';
let turnAuth = null; // what the fake Cloudflare TURN API was sent
let lastChat = null; // the last tutor request the fake Anthropic API was sent
const fake = http.createServer((req, res) => {
  if (req.url.startsWith('/v1/turn/keys/')) { // fake Cloudflare TURN: short-lived credentials, including a port 53 address browsers refuse
    turnAuth = [req.method, req.url, req.headers.authorization];
    res.setHeader('content-type', 'application/json');
    return res.end(JSON.stringify({ iceServers: [{ urls: ['stun:stun.cloudflare.com:3478', 'stun:stun.cloudflare.com:53'] },
      { urls: ['turn:turn.cloudflare.com:3478?transport=udp', 'turn:turn.cloudflare.com:53?transport=udp', 'turns:turn.cloudflare.com:443?transport=tcp'], username: 'u1', credential: 'c1' }] }));
  }
  let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => {
    const body = JSON.parse(b || '{}'), usage = { input_tokens: 100, output_tokens: 50 };
    const isMod = String(body.system).includes('safety filter'), isEval = String(body.system).includes('level evaluator');
    const base = { id: 'msg_1', type: 'message', role: 'assistant', model: body.model, stop_reason: 'end_turn', stop_sequence: null, usage };
    if (isMod) {
      const bad = body.messages[0].content.includes('badword');
      res.setHeader('content-type', 'application/json');
      if (body.messages[0].content.includes('modrefuse')) return res.end(JSON.stringify({ ...base, stop_reason: 'refusal', content: [] })); // the model's own safeguards
      return res.end(JSON.stringify({ ...base, content: [{ type: 'text', text: bad ? '{"ok":false,"category":"sexual"}' : '{"ok":true}' }] }));
    }
    if (isEval) { // passes unless the student only said "lazy"
      const lazy = /STUDENT: lazy\n?(?!STUDENT)/.test(body.messages[0].content) && !/STUDENT: (?!lazy)/.test(body.messages[0].content);
      res.setHeader('content-type', 'application/json');
      return res.end(JSON.stringify({ ...base, content: [{ type: 'text', text: lazy ? '{"pass":false,"stars":0,"feedback":"Try more"}' : '{"pass":true,"stars":2,"feedback":"Great job"}' }] }));
    }
    lastChat = body;
    const said = String(body.messages[body.messages.length - 1].content);
    // "hugegame": the reply runs out of room in the middle of the game file; "refuseme": the model declines; "justtalk": no game
    const stop = said.includes('hugegame') ? 'max_tokens' : said.includes('refuseme') ? 'refusal' : 'end_turn';
    const reply = stop === 'max_tokens' ? 'Here it comes!\n```html\n<!doctype html><html><body><p>half a ga' : stop === 'refusal' ? '' : said.includes('justtalk') ? 'Sure, tell me more.'
      : said.includes('unsafereply') ? 'Here is something with a badword in it.' // the tutor itself says something the filter stops
      : String(body.system).includes('Making creations') ? 'Nice!\n```creation\nCaptain Cloud\nPowers: rain\n```' : 'Here you go!\n```html\n' + GAME + '\n```';
    res.writeHead(200, { 'content-type': 'text/event-stream' });
    const ev = (type, data) => res.write(`event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`);
    ev('message_start', { message: { ...base, stop_reason: null, content: [], usage: { input_tokens: 100, output_tokens: 1 } } });
    if (reply) {
      ev('content_block_start', { index: 0, content_block: { type: 'text', text: '' } });
      ev('content_block_delta', { index: 0, delta: { type: 'text_delta', text: reply } });
      ev('content_block_stop', { index: 0 });
    }
    ev('message_delta', { delta: { stop_reason: stop, stop_sequence: null }, usage: { output_tokens: 50 } });
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
  server = spawn('node', ['server/index.js'], { env: { ...process.env, PORT: port, SESSION_GRACE_MS: '600', SUBMIT_COOLDOWN_MS: '1000', DB_PATH: path.join(dir, 't.db'), ANTHROPIC_API_KEY: 'x',
    ANTHROPIC_BASE_URL: `http://localhost:${fake.address().port}`, CLOUDFLARE_TURN_API: `http://localhost:${fake.address().port}`,
    CLOUDFLARE_TURN_KEY_ID: 'key1', CLOUDFLARE_TURN_API_TOKEN: 'tok1', ADMIN_EMAIL: 'a@x.com', ADMIN_PASSWORD: 'adminpw' }, stdio: 'inherit' });
  for (let i = 0; i < 50; i++) { try { await fetch(base + '/api/me'); break; } catch { await new Promise((r) => setTimeout(r, 100)); } }
});
after(() => { server.kill(); fake.close(); fs.rmSync(dir, { recursive: true, force: true }); });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

test('pages: / is the public home page, /join and /join/<token> are the join and login page', async () => {
  const home = await call('x', 'GET', '/');
  assert.equal(home.status, 200);
  assert.match(home.data, /<h1 id="h1"/, '/ serves the home page');
  assert.match(home.data, /href="\/home\.css"/);
  assert.doesNotMatch(home.data, /id="join"|id="login"/, 'the home page has no join or login form');
  assert.match(home.data, /href="\/join"/, '"Enter class" goes to /join');
  assert.match(home.data, /href="\/join#teacher"/, '"Teacher login" goes to /join#teacher');
  for (const url of ['/join', '/join/', '/join/some-invite-token', '/join.html']) {
    const r = await call('x', 'GET', url);
    assert.equal(r.status, 200, url);
    assert.match(r.data, /id="join"/, url + ' serves the join page');
    assert.match(r.data, /id="login"/, url + ' has the teacher login form');
  }
  // the home page loads from same-origin files only, served with usable content types
  for (const [url, type] of [['/home.css', /text\/css/], ['/home.js', /javascript/], ['/home-i18n.js', /javascript/], ['/home-story.js', /javascript/], ['/home-mini.js', /javascript/], ['/home-fx.js', /javascript/], ['/home-motion.js', /javascript/], ['/mascot/hero.svg', /image\/svg\+xml/]]) {
    const r = await fetch(base + url);
    assert.equal(r.status, 200, url);
    assert.match(r.headers.get('content-type'), type, url);
  }
});

test('courses, rooms, live sessions and levels', async () => {
  assert.equal((await call('t', 'POST', '/api/login', { email: 'a@x.com', password: 'nope' })).status, 401);
  assert.equal((await call('adm', 'POST', '/api/login', { email: 'a@x.com', password: 'adminpw' })).data.role, 'admin');
  assert.equal((await call('adm', 'POST', '/api/admin/teachers', { name: 'T', email: 't@x.com', password: 'secret1' })).status, 200);
  assert.equal((await call('t', 'POST', '/api/login', { email: 't@x.com', password: 'secret1' })).data.role, 'teacher');
  assert.equal((await call('t', 'GET', '/api/admin/usage')).status, 401, 'teacher cannot see admin');

  // course: uploaded as JSON, validated, editable, starter available
  assert.equal((await call('t', 'POST', '/api/courses', { title: 'X', levels: [{ title: 'no task' }] })).status, 400, 'level needs a task');
  const course = (await call('t', 'POST', '/api/courses', { title: 'Mini', levels: [
    { title: 'Hero', emoji: '🦸', task: 'Invent a superhero', criteria: 'has a power', output: 'creation' },
    { title: 'Game', task: 'Build a game', output: 'game' },
    { title: 'Talk', task: 'Share tips', output: 'chat' },
  ] })).data.id;
  const starter = (await call('t', 'POST', '/api/courses/starter')).data.id;
  assert.equal((await call('t', 'GET', '/api/courses/' + starter)).data.levels.length, 10);
  const lv = (await call('t', 'GET', '/api/courses/' + course)).data.levels;
  assert.deepEqual(lv.map((l) => l.output), ['creation', 'game', 'chat']);

  // rooms: many instances of one course, each with its own invite link
  assert.equal((await call('t', 'POST', '/api/classes', { name: 'A', consent: true, course_id: 999 })).status, 400, 'course required');
  assert.equal((await call('t', 'POST', '/api/classes', { name: 'A', consent: false, course_id: course })).status, 400, 'consent required');
  const id = (await call('t', 'POST', '/api/classes', { name: 'A', consent: true, daily_limit: 20, course_id: course })).data.id;
  const id2 = (await call('t', 'POST', '/api/classes', { name: 'B', consent: true, course_id: course })).data.id;
  const room = (await call('t', 'GET', '/api/classes/' + id)).data;
  assert.notEqual(room.invite, (await call('t', 'GET', '/api/classes/' + id2)).data.invite);
  assert.equal((await call('t', 'DELETE', '/api/courses/' + course)).status, 409, 'course in use');
  assert.match((await call('t', 'GET', `/api/classes/${id}/qr.svg`)).data, /<svg/);
  assert.equal((await call('x', 'GET', '/api/invite/' + room.invite)).data.live, false);
  const invitePage = await call('x', 'GET', '/join/' + room.invite);
  assert.equal(invitePage.status, 200);
  assert.match(invitePage.data, /id="join"/, 'a real invite link still serves the join page');

  // students can only join while the session is live
  const join = (who, nickname, pin, extra = {}) => call(who, 'POST', '/api/join', { invite: room.invite, nickname, pin, avatar: '🐼', ...extra });
  assert.equal((await join('s', 'Leyla', '1234')).data.error, 'room_closed');
  await call('t', 'PATCH', '/api/classes/' + id, { live: true });
  const byCode = (who, nickname, pin) => call(who, 'POST', '/api/join', { code: room.code, nickname, pin });
  assert.equal((await byCode('s', 'Leyla', '12')).data.error, 'bad_pin_format', 'the class code needs a PIN');
  assert.equal((await join('s', 'Leyla', '1234')).status, 200);
  assert.equal((await byCode('s2', 'Leyla', '9999')).data.error, 'bad_pin', 'with the class code the nickname is protected by its PIN');
  assert.equal((await join('s3', 'Leyla', '1234')).status, 200, 'same account from another device');
  assert.equal((await byCode('s', 'Leyla', '1234')).status, 200, 'class code still works');
  // with the invite link a nickname is enough, for new and returning students
  const byLink = (who, nickname) => call(who, 'POST', '/api/join', { invite: room.invite, nickname });
  assert.equal((await byLink('z', 'Zaur')).status, 200, 'new student with only a nickname');
  assert.equal((await call('z', 'GET', '/api/student/me')).data.nickname, 'Zaur');
  assert.equal((await byLink('z2', 'Zaur')).status, 200, 'coming back with the same nickname on another device');
  assert.equal((await byLink('z3', 'Leyla')).status, 200, 'link works for an account that has a PIN');
  assert.equal((await byCode('z5', 'Zaur', '1234')).data.error, 'use_link', 'an account without a PIN is told to use the link');

  // level map: first level current, rest locked
  let me = (await call('s', 'GET', '/api/student/me')).data;
  assert.deepEqual(me.levels.map((l) => l.status), ['current', 'locked', 'locked']);
  assert.equal((await call('s', 'GET', '/api/student/levels/' + lv[1].id)).status, 403, 'locked level hidden');
  assert.equal((await call('s', 'POST', '/api/chat', { text: 'hi', level_id: lv[1].id })).data.error, 'locked');
  assert.equal((await call('s', 'POST', `/api/levels/${lv[0].id}/submit`)).data.error, 'no_work');

  // teacher sees the reply stream live
  const ctl = new AbortController(), events = [];
  const es = await fetch(`${base}/api/classes/${id}/events`, { headers: { cookie: jar.t }, signal: ctl.signal });
  (async () => { const dec = new TextDecoder(); try { for await (const c of es.body) events.push(dec.decode(c)); } catch {} })();
  const r1 = await call('s', 'POST', '/api/chat', { text: 'a hero who controls clouds', level_id: lv[0].id });
  assert.match(r1.data, /```creation/);
  await sleep(400);
  assert.ok(events.join('').includes('"type":"delta"'), 'teacher got streaming deltas');
  assert.ok(events.join('').includes('Captain Cloud'), 'teacher got the reply');
  assert.deepEqual((await call('s', 'POST', '/api/chat', { text: 'badword', level_id: lv[0].id })).data, { blocked: true, category: 'sexual' });

  // check my work: AI passes, next level unlocks, output lands in the teacher gallery
  const sub = (await call('s', 'POST', `/api/levels/${lv[0].id}/submit`)).data;
  assert.deepEqual(sub, { pass: true, stars: 2, feedback: 'Great job' });
  me = (await call('s', 'GET', '/api/student/me')).data;
  assert.deepEqual(me.levels.map((l) => l.status), ['done', 'current', 'locked']);
  const outs = (await call('t', 'GET', `/api/classes/${id}/games`)).data;
  assert.equal(outs[0].kind, 'creation'); assert.equal(outs[0].title, 'Captain Cloud');
  assert.equal((await call('s', 'POST', `/api/levels/${lv[0].id}/submit`)).data.error, 'too_fast');

  // teacher approval mode: submission waits for the teacher
  await call('t', 'PATCH', '/api/classes/' + id, { approval: 'teacher' });
  await call('s', 'POST', '/api/chat', { text: 'make a tap game', level_id: lv[1].id });
  await sleep(1100);
  assert.deepEqual((await call('s', 'POST', `/api/levels/${lv[1].id}/submit`)).data, { pending: true });
  let cls = (await call('t', 'GET', '/api/classes/' + id)).data;
  assert.equal(cls.pending.length, 1);
  const leyla = cls.students[0].id;
  assert.equal((await call('s', 'POST', `/api/levels/${lv[1].id}/submit`)).data.error, 'pending');
  await call('t', 'POST', `/api/students/${leyla}/progress`, { level_id: lv[1].id, action: 'pass', stars: 3 });
  me = (await call('s', 'GET', '/api/student/me')).data;
  assert.deepEqual(me.levels.map((l) => [l.status, l.stars]), [['done', 2], ['done', 3], ['current', 0]]);
  await call('t', 'POST', `/api/students/${leyla}/progress`, { level_id: lv[0].id, action: 'reset' });
  me = (await call('s', 'GET', '/api/student/me')).data;
  assert.deepEqual(me.levels.map((l) => l.status), ['current', 'done', 'locked'], 'reset level is played again');

  // student view: the teacher reads the same page data the student sees, read-only, and only for their own students
  const view = (await call('t', 'GET', `/api/students/${leyla}/view`)).data;
  assert.equal(view.nickname, 'Leyla'); assert.equal(view.class_id, id);
  assert.deepEqual(view.levels, me.levels, 'same level map as the student');
  const vlv = (await call('t', 'GET', `/api/students/${leyla}/view/levels/${lv[0].id}`)).data;
  assert.deepEqual(vlv, (await call('s', 'GET', '/api/student/levels/' + lv[0].id)).data, 'same chat as the student');
  assert.ok(vlv.messages.some((m) => m.content === 'a hero who controls clouds'));
  assert.equal((await call('t', 'GET', `/api/students/${leyla}/view/levels/${lv[2].id}`)).status, 403, 'locked level stays locked');
  assert.ok((await call('t', 'GET', `/api/students/${leyla}/view/games`)).data.some((g) => g.title === 'Captain Cloud'));
  assert.equal((await call('s', 'GET', `/api/students/${leyla}/view`)).status, 401, 'students cannot use it');
  await call('adm', 'POST', '/api/admin/teachers', { name: 'T2', email: 't2@x.com', password: 'secret2' });
  await call('t2', 'POST', '/api/login', { email: 't2@x.com', password: 'secret2' });
  assert.equal((await call('t2', 'GET', `/api/students/${leyla}/view`)).status, 404, 'another teacher cannot open it');
  assert.match(events.join(''), /"type":"delta","student_id":\d+,"level_id":\d+/, 'deltas say which level they belong to');

  // PIN reset by teacher
  const pin = (await call('t', 'PATCH', '/api/students/' + leyla, { reset_pin: true })).data.pin;
  assert.equal((await byCode('s4', 'Leyla', '1234')).data.error, 'bad_pin');
  assert.equal((await byCode('s4', 'Leyla', pin)).status, 200);

  // ending the session logs everyone out (open student streams are hung up), progress is kept
  const sctl = new AbortController(), sev = [];
  const ses = await fetch(`${base}/api/student/events`, { headers: { cookie: jar.s }, signal: sctl.signal });
  const sdone = (async () => { const dec = new TextDecoder(); try { for await (const c of ses.body) sev.push(dec.decode(c)); } catch {} })();
  await sleep(100);
  assert.equal((await byLink('z4', 'Leyla')).data.error, 'nick_online', 'nobody takes over a nickname that is in the lesson');
  assert.equal((await byLink('s', 'Leyla')).status, 200, 'the same student can always join again');
  await call('t', 'PATCH', '/api/classes/' + id, { live: false });
  await call('t', 'PATCH', '/api/classes/' + id, { daily_limit: 20 }); // broadcasts to the room right after the hang-up
  await sdone; sctl.abort();
  assert.ok(sev.join('').includes('"type":"closed"'), 'student told the session ended');
  assert.equal((await call('s', 'GET', '/api/student/me')).status, 401, 'logged out');
  assert.equal((await join('s', 'Leyla', pin)).data.error, 'room_closed', 'cannot log back in while closed');
  await call('t', 'PATCH', '/api/classes/' + id, { live: true });
  assert.equal((await call('s', 'GET', '/api/student/me')).status, 401, 'old session is gone');
  assert.equal((await join('s', 'Leyla', pin)).status, 200);
  assert.deepEqual((await call('s', 'GET', '/api/student/me')).data.levels.map((l) => l.status), ['current', 'done', 'locked']);

  // the room closes by itself when the teacher dashboard is gone for the grace period
  ctl.abort();
  await sleep(1000);
  assert.equal((await call('t', 'GET', '/api/classes/' + id)).data.live, 0, 'auto-closed after teacher left');

  // limits, pause and spend cap still apply
  await call('t', 'PATCH', '/api/classes/' + id2, { live: true, daily_limit: 1 });
  const r2 = (await call('t', 'GET', '/api/classes/' + id2)).data;
  await call('k', 'POST', '/api/join', { invite: r2.invite, nickname: 'Kamal', pin: '4321' });
  await call('t', 'PATCH', '/api/classes/' + id2, { paused: true });
  assert.equal((await call('k', 'POST', '/api/chat', { text: 'x', level_id: lv[0].id })).data.error, 'paused');
  await call('t', 'PATCH', '/api/classes/' + id2, { paused: false });
  assert.equal((await call('k', 'POST', '/api/chat', { text: 'x', level_id: lv[0].id })).status, 200);
  assert.equal((await call('k', 'POST', '/api/chat', { text: 'y', level_id: lv[0].id })).data.error, 'limit');
  const u = (await call('adm', 'GET', '/api/admin/usage')).data;
  assert.ok(u.total > 0);
  await call('adm', 'PUT', '/api/admin/settings', { spend_cap: 0.000001 });
  await call('t', 'PATCH', '/api/classes/' + id2, { daily_limit: 50 });
  assert.equal((await call('k', 'POST', '/api/chat', { text: 'z', level_id: lv[0].id })).data.error, 'budget', 'spend cap enforced');
  await call('adm', 'PUT', '/api/admin/settings', { spend_cap: 0 }); // the tests below chat again
});

// An open event stream that collects its "data:" events as objects.
function stream(who, url) {
  const ctl = new AbortController(), evs = [];
  let connected; const ready = new Promise((r) => (connected = r)); // the server subscribes the stream before it answers
  const done = fetch(base + url, { headers: { cookie: jar[who] }, signal: ctl.signal }).then(async (r) => {
    connected();
    const dec = new TextDecoder(); let buf = '';
    try {
      for await (const c of r.body) {
        buf += dec.decode(c, { stream: true });
        for (let i; (i = buf.indexOf('\n\n')) >= 0; buf = buf.slice(i + 2)) { const m = buf.slice(0, i).match(/^data: (.*)$/m); if (m) evs.push(JSON.parse(m[1])); }
      }
    } catch {}
  });
  const next = async (type, where = () => true) => {
    for (let i = 0; i < 75; i++) { const e = evs.find((x) => x.type === type && !x.seen && where(x)); if (e) { e.seen = true; return e; } await sleep(40); }
    throw new Error(`no "${type}" event on ${url}`);
  };
  return { evs, done, ready, next, close: () => ctl.abort() };
}

test('video call: teacher opens it, up to 4 people, setup messages relayed, teacher controls', async () => {
  await call('adm', 'POST', '/api/login', { email: 'a@x.com', password: 'adminpw' });
  await call('adm', 'POST', '/api/admin/teachers', { name: 'Vera', email: 'v@x.com', password: 'secret3' });
  await call('tv', 'POST', '/api/login', { email: 'v@x.com', password: 'secret3' });
  const course = (await call('tv', 'POST', '/api/courses/starter')).data.id;
  const id = (await call('tv', 'POST', '/api/classes', { name: 'Call room', consent: true, course_id: course })).data.id;
  const room = (await call('tv', 'GET', '/api/classes/' + id)).data;
  assert.deepEqual(room.call, { open: false, max: 4, peers: [] });
  assert.equal((await call('tv', 'POST', `/api/classes/${id}/call`, { open: true })).data.error, 'room_closed', 'no call while the room is closed');
  await call('tv', 'PATCH', '/api/classes/' + id, { live: true });
  for (const [who, nickname] of [['va', 'Aysel'], ['vb', 'Babek'], ['vc', 'Cavid'], ['vd', 'Dilara']])
    assert.equal((await call(who, 'POST', '/api/join', { invite: room.invite, nickname, pin: '1111' })).status, 200);

  // students cannot be in a call the teacher has not opened
  const early = stream('va', '/api/student/call/events');
  await early.next('ended'); await early.done;
  assert.equal((await call('va', 'GET', '/api/student/me')).data.call.open, false);

  const teacherFeed = stream('tv', `/api/classes/${id}/events`), roomFeed = stream('vb', '/api/student/events');
  await Promise.all([teacherFeed.ready, roomFeed.ready]); // listening before the call starts, or the news is missed
  assert.equal((await call('tv', 'POST', `/api/classes/${id}/call`, { open: true })).data.open, true);
  assert.equal((await roomFeed.next('call')).call.open, true, 'students are told a call started');
  const T = stream('tv', `/api/classes/${id}/call/events`), tw = await T.next('welcome');
  assert.deepEqual(tw.peers, []);
  assert.ok(tw.iceServers.some((s) => String(s.urls).startsWith('stun:')), 'browsers get a STUN server');
  // the relay: the server asks Cloudflare for credentials with its own token, and browsers only get the short-lived ones
  assert.deepEqual(turnAuth, ['POST', '/v1/turn/keys/key1/credentials/generate-ice-servers', 'Bearer tok1']);
  const turn = tw.iceServers.find((s) => s.username);
  assert.deepEqual([turn.username, turn.credential], ['u1', 'c1']);
  assert.deepEqual(turn.urls, ['turn:turn.cloudflare.com:3478?transport=udp', 'turns:turn.cloudflare.com:443?transport=tcp'], 'port 53 is left out');
  assert.ok(!JSON.stringify(tw.iceServers).includes('tok1'), 'the API token never reaches a browser');
  assert.equal(tw.relay, true, 'browsers know a relay is there');

  const A = stream('va', '/api/student/call/events'), aw = await A.next('welcome');
  assert.deepEqual(aw.peers.map((p) => [p.kind, p.name]), [['teacher', 'Vera']], 'the newcomer learns who is already in');
  assert.equal((await T.next('join')).peer.name, 'Aysel');

  // setup messages go to the named person only, and only from the browser that holds that place in the call
  const offer = { sdp: { type: 'offer', sdp: 'v=0 fake' } };
  assert.equal((await call('va', 'POST', '/api/call/signal', { peer: aw.id, to: tw.id, data: offer })).status, 200);
  const sig = await T.next('signal');
  assert.equal(sig.from, aw.id); assert.deepEqual(sig.data, offer);
  assert.equal((await call('vb', 'POST', '/api/call/signal', { peer: aw.id, to: tw.id, data: offer })).status, 404, 'another student cannot speak for Aysel');
  assert.equal((await call('tv', 'POST', '/api/call/signal', { peer: aw.id, to: tw.id, data: offer })).status, 404, 'nor can the teacher');
  assert.equal((await call('va', 'POST', '/api/call/signal', { peer: aw.id, to: 'nobody', data: offer })).status, 404);

  // microphone and camera state reach the others and the dashboard
  await call('va', 'POST', '/api/call/state', { peer: aw.id, mic: true, cam: false });
  const st = (await T.next('peer')).peer;
  assert.deepEqual([st.name, st.mic, st.cam], ['Aysel', true, false]);
  await teacherFeed.next('call', (e) => e.call.peers.some((p) => p.name === 'Aysel' && p.mic));
  const live = (await call('tv', 'GET', '/api/classes/' + id)).data.call;
  assert.deepEqual(live.peers.map((p) => [p.kind, p.name, p.mic]), [['teacher', 'Vera', false], ['student', 'Aysel', true]]);
  assert.deepEqual((await call('vb', 'GET', '/api/student/me')).data.call, { open: true, max: 4, count: 2, full: false });

  // at most 4 people: the teacher and 3 students
  const B = stream('vb', '/api/student/call/events'), bw = await B.next('welcome');
  const C = stream('vc', '/api/student/call/events'), cw = await C.next('welcome');
  assert.equal(cw.peers.length, 3);
  const D = stream('vd', '/api/student/call/events');
  await D.next('full'); await D.done;
  assert.equal((await call('vd', 'GET', '/api/student/me')).data.call.full, true);

  // the same student in a second tab takes over their own place
  const A2 = stream('va', '/api/student/call/events');
  await A.next('replaced'); const a2w = await A2.next('welcome');
  assert.equal(a2w.peers.length, 3, 'still four people');

  // teacher controls: ask to mute, take out of the call (no coming back until the next call)
  assert.equal((await call('tv', 'POST', `/api/classes/${id}/call/peers/${bw.id}`, { action: 'mute' })).status, 200);
  await B.next('mute');
  assert.equal((await call('vb', 'POST', `/api/classes/${id}/call/peers/${cw.id}`, { action: 'remove' })).status, 401, 'students cannot');
  await call('tv', 'POST', `/api/classes/${id}/call/peers/${cw.id}`, { action: 'remove' });
  await C.next('removed'); await C.done;
  assert.equal((await T.next('leave', (e) => e.id === cw.id)).id, cw.id, 'the others are told who left');
  const C2 = stream('vc', '/api/student/call/events');
  await C2.next('removed'); await C2.done;

  // closing the tab leaves the call
  B.close();
  await T.next('leave', (e) => e.id === bw.id);

  // ending the session ends the call for everyone
  await call('tv', 'PATCH', '/api/classes/' + id, { live: false });
  await T.next('ended'); await A2.next('ended');
  await T.done; await A2.done;
  assert.deepEqual((await call('tv', 'GET', '/api/classes/' + id)).data.call, { open: false, max: 4, peers: [] });
  teacherFeed.close(); roomFeed.close(); A.close();
});

test('video meeting room: no course needed, the call opens with the session and takes more people', async () => {
  await call('adm', 'POST', '/api/admin/teachers', { name: 'Zoya', email: 'z@x.com', password: 'secret4' });
  await call('tz', 'POST', '/api/login', { email: 'z@x.com', password: 'secret4' });
  assert.deepEqual((await call('tz', 'GET', '/api/courses')).data, [], 'this teacher never made a course');
  assert.equal((await call('tz', 'POST', '/api/classes', { kind: 'meeting', name: 'Maths club', consent: false })).data.error, 'consent');
  const id = (await call('tz', 'POST', '/api/classes', { kind: 'meeting', name: 'Maths club', consent: true })).data.id;
  let room = (await call('tz', 'GET', '/api/classes/' + id)).data;
  assert.deepEqual([room.kind, room.course_id, room.levels, room.call], ['meeting', null, [], { open: false, max: 8, peers: [] }]);
  assert.equal((await call('tz', 'GET', '/api/classes')).data[0].kind, 'meeting');
  assert.equal((await call('x', 'GET', '/api/invite/' + room.invite)).data.kind, 'meeting', 'the join page can say what it is');

  // starting the meeting opens its call; students come in with the link and a nickname, as in any room
  await call('tz', 'PATCH', '/api/classes/' + id, { live: true });
  assert.equal((await call('tz', 'GET', '/api/classes/' + id)).data.call.open, true);
  const who = ['m1', 'm2', 'm3', 'm4', 'm5'];
  for (const [i, w] of who.entries()) assert.equal((await call(w, 'POST', '/api/join', { invite: room.invite, nickname: 'Kid' + i })).status, 200);
  const me = (await call('m1', 'GET', '/api/student/me')).data;
  assert.deepEqual([me.kind, me.levels, me.call], ['meeting', [], { open: true, max: 8, count: 0, full: false }]);
  assert.equal((await call('m1', 'POST', '/api/chat', { text: 'hi', level_id: 1 })).data.error, 'locked', 'there is no AI chat in a meeting');

  // more people than a course room's call: the teacher and five students here
  const T = stream('tz', `/api/classes/${id}/call/events`);
  assert.equal((await T.next('welcome')).max, 8);
  const S = who.map((w) => stream(w, '/api/student/call/events'));
  for (const x of S) await x.next('welcome');
  room = (await call('tz', 'GET', '/api/classes/' + id)).data;
  assert.equal(room.call.peers.length, 6);
  assert.equal((await call('m1', 'GET', '/api/student/me')).data.call.count, 6);

  // "End meeting for everyone" in the call ends the session too: a meeting is its call
  const page = stream('m1', '/api/student/events'); await page.ready;
  await call('tz', 'POST', `/api/classes/${id}/call`, { open: false });
  await T.next('ended'); await S[0].next('ended'); await page.next('closed');
  room = (await call('tz', 'GET', '/api/classes/' + id)).data;
  assert.deepEqual([room.live, room.call.open], [0, false]);
  assert.equal((await call('m1', 'GET', '/api/student/me')).status, 401, 'students are logged out');
  T.close(); for (const x of S) x.close(); page.close();
});

test('tutor replies: old games are not sent again, cut-off and declined replies are handled', async () => {
  await call('th', 'POST', '/api/login', { email: 'z@x.com', password: 'secret4' });
  const course = (await call('th', 'POST', '/api/courses', { title: 'One game', levels: [{ title: 'Tap', task: 'Make a tap game', output: 'game' }] })).data.id;
  const lv = (await call('th', 'GET', '/api/courses/' + course)).data.levels[0].id;
  const id = (await call('th', 'POST', '/api/classes', { name: 'G', consent: true, daily_limit: 60, course_id: course })).data.id;
  const { invite } = (await call('th', 'GET', '/api/classes/' + id)).data;
  await call('th', 'PATCH', '/api/classes/' + id, { live: true });
  await call('hs', 'POST', '/api/join', { invite, nickname: 'Hasan' });
  const say = (text) => call('hs', 'POST', '/api/chat', { text, level_id: lv });
  const sent = () => lastChat.messages.map((m) => m.content).join('\n');
  const count = (text, part) => text.split(part).length - 1;

  // three versions of the game: the third request carries only the newest one, the older one is a short note
  await say('make a tap game'); await say('make it blue');
  assert.equal(count(sent(), '```html'), 1, 'the second request has the one game so far');
  await say('add a score');
  assert.equal(count(sent(), '```html'), 1, 'only the newest game is sent again');
  assert.equal(count(sent(), 'an older version was here'), 1);
  assert.match(lastChat.system, /never write it yourself/, 'the tutor is told what the note means');
  assert.equal(lastChat.model, 'claude-haiku-5-5');
  assert.deepEqual(lastChat.output_config, { effort: 'medium' }, 'game levels think a little more');
  assert.ok(lastChat.max_tokens >= 16000, 'room for a whole game and the thinking before it');

  // a reply that ran out of room: the half game is dropped, the student is told, and nothing broken is stored
  const cut = (await say('hugegame please')).data;
  assert.equal(cut, 'Here it comes!\n```html\n<!doctype html><html><body><p>half a ga\u0000cut');
  let msgs = (await call('hs', 'GET', '/api/student/levels/' + lv)).data.messages;
  assert.equal(msgs.at(-1).content, 'Here it comes!', 'the unfinished file is not kept');
  assert.equal((await call('th', 'GET', `/api/classes/${id}/messages`)).data.at(-1).flag, 'cut', 'the teacher can see it was cut off');

  // a reply the model declined: nothing is kept, the student gets a kind note
  const n = msgs.length;
  assert.equal((await say('refuseme')).data, '\u0000refused');
  msgs = (await call('hs', 'GET', '/api/student/levels/' + lv)).data.messages;
  assert.deepEqual([msgs.length, msgs.at(-1).role], [n + 1, 'user']);
  await say('justtalk');
  assert.ok(!sent().includes('refuseme'), 'a declined question is not sent again with the next one');
  assert.deepEqual((await say('modrefuse')).data, { blocked: true, category: 'other' }, 'a declined safety check blocks the message');

  // the game is still there after a long talk: once it is older than the turns that are sent, it rides in the system prompt
  for (let i = 0; i < 9; i++) await say('justtalk ' + i);
  assert.equal(count(sent(), '```html'), 0, 'the game is older than the turns sent');
  assert.match(lastChat.system, /The student's current game/);
  assert.ok(lastChat.system.includes(GAME), 'so the tutor can still change it');
  assert.equal(lastChat.messages[0].role, 'user');
  await call('th', 'PATCH', '/api/classes/' + id, { live: false });
});

test('safety: only the tutor\'s work can be saved and shared, replies and nicknames are filtered, limits cannot be raced', async () => {
  await call('ts', 'POST', '/api/login', { email: 'z@x.com', password: 'secret4' });
  const course = (await call('ts', 'POST', '/api/courses', { title: 'Safe', levels: [{ title: 'Tap', task: 'Make a tap game', output: 'game' }, { title: 'Talk', task: 'Talk', output: 'chat' }] })).data.id;
  const lv = (await call('ts', 'GET', '/api/courses/' + course)).data.levels[0].id;
  const id = (await call('ts', 'POST', '/api/classes', { name: 'S', consent: true, daily_limit: 8, course_id: course })).data.id;
  const { invite } = (await call('ts', 'GET', '/api/classes/' + id)).data;
  await call('ts', 'PATCH', '/api/classes/' + id, { live: true });

  // a nickname the whole class will see goes through the filter; a harmless one gets in
  assert.equal((await call('s1', 'POST', '/api/join', { invite, nickname: 'badword kid' })).data.error, 'bad_nick_words');
  assert.equal((await call('s1', 'POST', '/api/join', { invite, nickname: 'Samir' })).status, 200);
  assert.equal((await call('s2', 'POST', '/api/join', { invite, nickname: 'Nigar' })).status, 200);
  const say = (text) => call('s1', 'POST', '/api/chat', { text, level_id: lv });

  // "Save" takes the tutor's newest game, never what the browser sends
  assert.equal((await call('s1', 'POST', '/api/games', { level_id: lv, html: '<h1>anything</h1>', title: 'mine' })).data.error, 'no_output', 'nothing to save yet');
  await say('make a tap game');
  const saved = (await call('s1', 'POST', '/api/games', { level_id: lv, html: '<h1>anything</h1>', title: 'mine', kind: 'game' })).data.id;
  let mine = (await call('s1', 'GET', '/api/games')).data;
  assert.deepEqual(mine.map((g) => [g.id, g.title, g.html]), [[saved, 'Tap', GAME]], 'the tutor\'s game, with its own title');
  assert.equal((await call('s1', 'POST', '/api/games', { level_id: lv })).data.id, saved, 'saving twice keeps one copy');

  // sharing shows it to the class; the teacher can take it back out
  await call('s1', 'PATCH', '/api/games/' + saved, { shared: true });
  assert.equal((await call('s2', 'GET', '/api/games')).data.length, 1);
  assert.equal((await call('s2', 'POST', `/api/games/${saved}/unshare`)).status, 401, 'students cannot');
  assert.equal((await call('ts', 'POST', `/api/games/${saved}/unshare`)).status, 200);
  assert.equal((await call('s2', 'GET', '/api/games')).data.length, 0);
  assert.equal((await call('s1', 'GET', '/api/games')).data.length, 1, 'the student keeps their own');

  // an answer of the tutor's that the filter stops is taken back, kept out of the chat and shown to the teacher
  assert.equal((await say('unsafereply')).data, 'Here is something with a badword in it.\u0000withdrawn');
  const chat = (await call('s1', 'GET', '/api/student/levels/' + lv)).data.messages;
  assert.ok(!chat.some((m) => m.content.includes('badword')), 'the student never gets it back');
  const feed = (await call('ts', 'GET', `/api/classes/${id}/messages`)).data.at(-1);
  assert.deepEqual([feed.role, feed.flag, feed.content], ['withheld', 'sexual', 'Here is something with a badword in it.']);

  // one message at a time: a burst cannot slip past the daily limit, and blocked messages count against it
  assert.equal((await call('s1', 'GET', '/api/student/me')).data.used, 2);
  const burst = await Promise.all(Array.from({ length: 12 }, () => say('quick')));
  assert.ok(burst.filter((r) => r.status === 200).length <= 6 && burst.some((r) => r.data.error === 'busy'), 'the rest are told to wait');
  for (let i = 0; i < 8; i++) await say(i % 2 ? 'badword' : 'more');
  assert.equal((await call('s1', 'GET', '/api/student/me')).data.used, 8, 'never more than the limit of 8');
  assert.equal((await say('one more')).data.error, 'limit');
  assert.ok((await call('ts', 'GET', `/api/classes/${id}/messages`)).data.some((m) => m.role === 'blocked'), 'blocked ones were among them');

  // removing a student removes what they wrote and made; deleting the room removes the rest
  const sid = (await call('ts', 'GET', '/api/classes/' + id)).data.students.find((x) => x.nickname === 'Samir').id;
  await call('ts', 'DELETE', '/api/students/' + sid);
  assert.equal((await call('ts', 'GET', `/api/classes/${id}/messages`)).data.length, 0);
  assert.equal((await call('ts', 'GET', `/api/classes/${id}/games`)).data.length, 0);
  assert.equal((await call('tv', 'DELETE', '/api/classes/' + id)).status, 404, 'another teacher cannot delete the room');
  assert.equal((await call('ts', 'DELETE', '/api/classes/' + id)).status, 200);
  assert.equal((await call('ts', 'GET', '/api/classes/' + id)).status, 404);
  assert.equal((await call('s2', 'GET', '/api/student/me')).status, 401, 'its students are logged out');
  assert.ok((await call('ts', 'GET', '/api/courses/' + course)).data.title, 'the course stays');
});

test('accounts: password guessing is slowed down, logins end, the admin can reset or remove a teacher', async () => {
  const login = (ip, email, password, extra = {}) => fetch(base + '/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': ip, ...extra }, body: JSON.stringify({ email, password }) });
  await call('adm', 'POST', '/api/admin/teachers', { name: 'Gone', email: 'gone@x.com', password: 'secret5' });

  // ten wrong passwords from one address: it has to wait, even with the right one; other people are not affected
  for (let i = 0; i < 10; i++) assert.equal((await login('203.0.113.9', 'gone@x.com', 'wrong' + i)).status, 401);
  const locked = await login('203.0.113.9', 'gone@x.com', 'secret5');
  assert.deepEqual([locked.status, (await locked.json()).error], [429, 'login_locked']);
  const ok = await login('203.0.113.10', 'gone@x.com', 'secret5', { 'X-Forwarded-Proto': 'https' });
  assert.equal(ok.status, 200);
  assert.match(ok.headers.get('set-cookie'), /HttpOnly; SameSite=Lax;.*; Secure/, 'over https the cookie is never sent in the clear');
  assert.equal(ok.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(ok.headers.get('x-frame-options'), 'SAMEORIGIN');
  jar.g = ok.headers.get('set-cookie').split(';')[0];
  assert.doesNotMatch((await fetch(base + '/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'gone@x.com', password: 'secret5' }) })).headers.get('set-cookie'), /Secure/, 'plain http on a developer\'s machine still works');

  // a login ends on the server after 30 days, whatever the browser still holds
  assert.equal((await call('g', 'GET', '/api/me')).data.email, 'gone@x.com');
  const { DatabaseSync } = await import('node:sqlite');
  const direct = new DatabaseSync(path.join(dir, 't.db'));
  direct.prepare('UPDATE sessions SET created=? WHERE token=?').run(Date.now() - 31 * 86400000, jar.g.split('=')[1]);
  direct.close();
  assert.equal((await call('g', 'GET', '/api/me')).status, 401);

  // the admin gives a teacher a new password: the old one and every old login stop working
  await call('g', 'POST', '/api/login', { email: 'gone@x.com', password: 'secret5' });
  const room = (await call('g', 'POST', '/api/classes', { kind: 'meeting', name: 'Bye', consent: true })).data.id;
  await call('g', 'POST', '/api/courses/starter');
  const t = (await call('adm', 'GET', '/api/admin/teachers')).data.find((x) => x.email === 'gone@x.com');
  assert.deepEqual([t.rooms, t.courses], [1, 1]);
  assert.equal((await call('g', 'PATCH', '/api/admin/teachers/' + t.id, { password: 'hacked1' })).status, 401, 'only the admin');
  assert.equal((await call('adm', 'PATCH', '/api/admin/teachers/' + t.id, { password: 'short' })).data.error, 'invalid');
  assert.equal((await call('adm', 'PATCH', '/api/admin/teachers/' + t.id, { password: 'newsecret' })).status, 200);
  assert.equal((await call('g', 'GET', '/api/me')).status, 401, 'logged out everywhere');
  assert.equal((await call('g', 'POST', '/api/login', { email: 'gone@x.com', password: 'secret5' })).status, 401);
  assert.equal((await call('g', 'POST', '/api/login', { email: 'gone@x.com', password: 'newsecret' })).status, 200);

  // removing a teacher removes their rooms and courses with them; the admin cannot be removed this way
  const admin = (await call('adm', 'GET', '/api/me')).data.id;
  assert.equal((await call('adm', 'DELETE', '/api/admin/teachers/' + admin)).status, 404);
  assert.equal((await call('adm', 'DELETE', '/api/admin/teachers/' + t.id)).status, 200);
  assert.equal((await call('g', 'GET', '/api/me')).status, 401);
  assert.equal((await call('g', 'POST', '/api/login', { email: 'gone@x.com', password: 'newsecret' })).status, 401);
  assert.ok(!(await call('adm', 'GET', '/api/admin/usage')).data.classes.some((c) => c.id === room));
});

test('retention: chats go after the set days, a student\'s work stays while they keep coming', async () => {
  const out = await new Promise((resolve, reject) => {
    const p = spawn('node', ['-e', `import('./server/db.js').then(({ db, purgeOld, now }) => {
      const old = now() - 40 * 86400000, add = (sql, ...a) => db.prepare(sql).run(...a);
      add('INSERT INTO students(id,class_id,nickname,last_seen) VALUES(1,1,?,?),(2,1,?,?)', 'Active', now(), 'Idle', old);
      for (const sid of [1, 2]) {
        add('INSERT INTO games(class_id,student_id,title,html,created) VALUES(1,?,?,?,?)', sid, 'Old game', '<p>', old);
        add('INSERT INTO messages(class_id,student_id,role,content,created) VALUES(1,?,?,?,?)', sid, 'user', 'old words', old);
        add('INSERT INTO progress(student_id,level_id,status,created) VALUES(?,1,?,?)', sid, 'done', old);
        add('INSERT INTO sessions(token,kind,ref,created) VALUES(?,?,?,?)', 'tok' + sid, 'student', sid, now());
      }
      add('INSERT INTO messages(class_id,student_id,role,content,created) VALUES(1,1,?,?,?)', 'user', 'new words', now());
      add('INSERT INTO sessions(token,kind,ref,created) VALUES(?,?,?,?)', 'stale', 'user', 9, old);
      purgeOld();
      const n = (t) => db.prepare('SELECT student_id s FROM ' + t + ' ORDER BY rowid').all().map((r) => r.s);
      console.log(JSON.stringify({ students: db.prepare('SELECT nickname n FROM students').all().map((r) => r.n), games: n('games'), progress: n('progress'),
        messages: db.prepare('SELECT content c FROM messages').all().map((r) => r.c), sessions: db.prepare('SELECT token t FROM sessions').all().map((r) => r.t) })); })`],
      { env: { ...process.env, DB_PATH: path.join(dir, 'keep.db') } });
    let s = ''; p.stdout.on('data', (d) => (s += d)); p.on('close', (code) => (code ? reject(new Error('exit ' + code)) : resolve(JSON.parse(s))));
  });
  assert.deepEqual(out.students, ['Active'], 'a student who stopped coming is removed');
  assert.deepEqual(out.games, [1], 'the active student keeps a game made 40 days ago; the idle student\'s work is gone');
  assert.deepEqual(out.progress, [1]);
  assert.deepEqual(out.messages, ['new words'], 'old chat messages go, whoever wrote them');
  assert.deepEqual(out.sessions, ['tok1'], 'logins older than 30 days and logins of removed students are gone');
});

test('attention: the teacher sees when a student is away from the page, as a status for this session', async () => {
  await call('tw', 'POST', '/api/login', { email: 'v@x.com', password: 'secret3' });
  const course = (await call('tw', 'POST', '/api/courses/starter')).data.id;
  const id = (await call('tw', 'POST', '/api/classes', { name: 'Focus room', consent: true, course_id: course })).data.id;
  const { invite } = (await call('tw', 'GET', '/api/classes/' + id)).data;
  await call('tw', 'PATCH', '/api/classes/' + id, { live: true });
  await call('fa', 'POST', '/api/join', { invite, nickname: 'Elnur', pin: '2222' });
  const student = () => call('tw', 'GET', '/api/classes/' + id).then((r) => r.data.students[0]);
  assert.deepEqual(await student().then(({ away, away_count, away_ms }) => ({ away, away_count, away_ms })), { away: null, away_count: 0, away_ms: 0 });

  const feed = stream('tw', `/api/classes/${id}/events`), page = stream('fa', '/api/student/events');
  await feed.next('presence');
  assert.equal((await call('fa', 'POST', '/api/student/attention', { away: 'somewhere' })).status, 400);
  await call('fa', 'POST', '/api/student/attention', { away: 'tab' });
  const ev = await feed.next('attention');
  assert.deepEqual([ev.away, ev.away_count], ['tab', 1], 'the dashboard hears it at once');
  await call('fa', 'POST', '/api/student/attention', { away: 'window' }); // still away: not a second time
  await sleep(150);
  await call('fa', 'POST', '/api/student/attention', { away: null });
  const back = await feed.next('attention', (e) => e.away === null);
  assert.equal(back.away_count, 1); assert.ok(back.away_ms >= 150, 'time away adds up');
  assert.equal((await student()).away_count, 1);
  assert.equal((await call('tw', 'POST', '/api/student/attention', { away: 'tab' })).status, 401, 'only students report it');

  // closing the page is "offline", not "away"; ending the session starts the next one fresh
  await call('fa', 'POST', '/api/student/attention', { away: 'tab' });
  page.close();
  await feed.next('attention', (e) => e.away === null && e.away_count === 2);
  await call('tw', 'PATCH', '/api/classes/' + id, { live: false });
  assert.equal((await student()).away_count, 0);
  feed.close();
});

test('pilot database: lessons become a course, history keeps its level', async () => {
  const { DatabaseSync } = await import('node:sqlite');
  const file = path.join(dir, 'pilot.db'), old = new DatabaseSync(file);
  old.exec(`CREATE TABLE classes (id INTEGER PRIMARY KEY, teacher_id INTEGER, name TEXT, code TEXT UNIQUE, consent_at INTEGER,
      daily_limit INTEGER DEFAULT 30, paused INTEGER DEFAULT 0, active_lesson INTEGER, created INTEGER);
    CREATE TABLE lessons (id INTEGER PRIMARY KEY, class_id INTEGER, title TEXT, goal TEXT, created INTEGER);
    CREATE TABLE students (id INTEGER PRIMARY KEY, class_id INTEGER, nickname TEXT, paused INTEGER DEFAULT 0, created INTEGER, last_seen INTEGER, UNIQUE(class_id, nickname));
    CREATE TABLE messages (id INTEGER PRIMARY KEY, class_id INTEGER, student_id INTEGER, lesson_id INTEGER, role TEXT, content TEXT, flag TEXT, created INTEGER);
    CREATE TABLE games (id INTEGER PRIMARY KEY, class_id INTEGER, student_id INTEGER, title TEXT, html TEXT, shared INTEGER DEFAULT 0, created INTEGER);
    INSERT INTO classes(id,teacher_id,name,code) VALUES(1,7,'Old','ABCDE');
    INSERT INTO lessons(id,class_id,title,goal) VALUES(1,1,'Guess','Build a guessing game'),(2,1,'Quiz','Build a quiz');
    INSERT INTO messages(class_id,student_id,lesson_id,role,content,created) VALUES(1,1,2,'user','hi',${Date.now()});`);
  old.close();
  const out = await new Promise((resolve, reject) => {
    const p = spawn('node', ['-e', `import('./server/db.js').then(({ db, migrateLessons }) => { migrateLessons(); migrateLessons();
      console.log(JSON.stringify({ c: db.prepare('SELECT course_id, invite FROM classes').get(), l: db.prepare('SELECT title, task, position FROM levels ORDER BY position').all(),
        m: db.prepare('SELECT level_id FROM messages').get(), n: db.prepare('SELECT COUNT(*) n FROM courses').get().n })); })`], { env: { ...process.env, DB_PATH: file } });
    let s = ''; p.stdout.on('data', (d) => (s += d)); p.on('close', (code) => (code ? reject(new Error('exit ' + code)) : resolve(JSON.parse(s))));
  });
  assert.equal(out.n, 1, 'migration is idempotent');
  assert.ok(out.c.course_id && out.c.invite);
  assert.deepEqual(out.l, [{ title: 'Guess', task: 'Build a guessing game', position: 1 }, { title: 'Quiz', task: 'Build a quiz', position: 2 }]);
  assert.ok(out.m.level_id, 'old messages point at the new level');
});
