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
    const isMod = String(body.system).includes('safety filter'), isEval = String(body.system).includes('level evaluator');
    const base = { id: 'msg_1', type: 'message', role: 'assistant', model: body.model, stop_reason: 'end_turn', stop_sequence: null, usage };
    if (isMod) {
      const bad = body.messages[0].content.includes('badword');
      res.setHeader('content-type', 'application/json');
      return res.end(JSON.stringify({ ...base, content: [{ type: 'text', text: bad ? '{"ok":false,"category":"sexual"}' : '{"ok":true}' }] }));
    }
    if (isEval) { // passes unless the student only said "lazy"
      const lazy = /STUDENT: lazy\n?(?!STUDENT)/.test(body.messages[0].content) && !/STUDENT: (?!lazy)/.test(body.messages[0].content);
      res.setHeader('content-type', 'application/json');
      return res.end(JSON.stringify({ ...base, content: [{ type: 'text', text: lazy ? '{"pass":false,"stars":0,"feedback":"Try more"}' : '{"pass":true,"stars":2,"feedback":"Great job"}' }] }));
    }
    const reply = String(body.system).includes('Making creations') ? 'Nice!\n```creation\nCaptain Cloud\nPowers: rain\n```' : 'Here you go!\n```html\n' + GAME + '\n```';
    res.writeHead(200, { 'content-type': 'text/event-stream' });
    const ev = (type, data) => res.write(`event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`);
    ev('message_start', { message: { ...base, content: [], usage: { input_tokens: 100, output_tokens: 1 } } });
    ev('content_block_start', { index: 0, content_block: { type: 'text', text: '' } });
    ev('content_block_delta', { index: 0, delta: { type: 'text_delta', text: reply } });
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
  server = spawn('node', ['server/index.js'], { env: { ...process.env, PORT: port, SESSION_GRACE_MS: '600', SUBMIT_COOLDOWN_MS: '1000', DB_PATH: path.join(dir, 't.db'), ANTHROPIC_API_KEY: 'x',
    ANTHROPIC_BASE_URL: `http://localhost:${fake.address().port}`, ADMIN_EMAIL: 'a@x.com', ADMIN_PASSWORD: 'adminpw' }, stdio: 'inherit' });
  for (let i = 0; i < 50; i++) { try { await fetch(base + '/api/me'); break; } catch { await new Promise((r) => setTimeout(r, 100)); } }
});
after(() => { server.kill(); fake.close(); fs.rmSync(dir, { recursive: true, force: true }); });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

test('home page links: /trial and /privacy are real pages, the trial form stores requests for the admin', async () => {
  for (const [url, marker] of [['/trial', /id="trial"/], ['/privacy', /pv_h1|Uşaqlar nə daxil edir/]]) {
    const r = await call('x', 'GET', url);
    assert.equal(r.status, 200, url); assert.match(r.data, marker, url);
  }
  const ok = { name: 'Aygun M.', contact: '+994 50 123 45 67', age: 10, note: 'weekends' };
  assert.equal((await call('p', 'POST', '/api/trial', { ...ok, name: '' })).data.error, 'trial_name');
  assert.equal((await call('p', 'POST', '/api/trial', { ...ok, contact: 'nope' })).data.error, 'trial_contact');
  assert.equal((await call('p', 'POST', '/api/trial', { ...ok, age: 30 })).data.error, 'trial_age');
  assert.equal((await call('p', 'POST', '/api/trial', { ...ok, website: 'http://spam', name: 'Bot' })).status, 200); // honeypot: pretends to succeed, stores nothing
  assert.equal((await call('p', 'POST', '/api/trial', ok)).status, 200);
  assert.equal((await call('p', 'POST', '/api/trial', { ...ok, name: 'Rauf', contact: 'rauf@example.com', age: '12', lang: 'en' })).status, 200);
  assert.equal((await call('p', 'GET', '/api/admin/trials')).status, 401, 'only the admin can read requests');
  await call('adm', 'POST', '/api/login', { email: 'a@x.com', password: 'adminpw' });
  const list = (await call('adm', 'GET', '/api/admin/trials')).data;
  assert.deepEqual(list.map((x) => [x.parent_name, x.child_age, x.lang]), [['Rauf', 12, 'en'], ['Aygun M.', 10, 'az']]);
  assert.equal((await call('adm', 'DELETE', '/api/admin/trials/' + list[0].id)).status, 200);
  assert.equal((await call('adm', 'GET', '/api/admin/trials')).data.length, 1);
  // a script cannot flood the table: five requests per hour per address
  let last; for (let i = 0; i < 5; i++) last = await call('p', 'POST', '/api/trial', ok);
  assert.equal(last.status, 429);
});

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
  for (const [url, type] of [['/home.css', /text\/css/], ['/home.js', /javascript/], ['/home-i18n.js', /javascript/], ['/home-hero.js', /javascript/], ['/home-power.js', /javascript/], ['/home-map.js', /javascript/], ['/home-game.js', /javascript/], ['/home-fx.js', /javascript/]]) {
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
  assert.equal((await join('s', 'Leyla', '12')).data.error, 'bad_pin_format');
  assert.equal((await join('s', 'Leyla', '1234')).status, 200);
  assert.equal((await join('s2', 'Leyla', '9999')).data.error, 'bad_pin', 'nickname is protected by its PIN');
  assert.equal((await join('s3', 'Leyla', '1234')).status, 200, 'same account from another device');
  assert.equal((await call('s', 'POST', '/api/join', { code: room.code, nickname: 'Leyla', pin: '1234' })).status, 200, 'class code still works');

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

  // PIN reset by teacher
  const pin = (await call('t', 'PATCH', '/api/students/' + leyla, { reset_pin: true })).data.pin;
  assert.equal((await join('s4', 'Leyla', '1234')).data.error, 'bad_pin');
  assert.equal((await join('s4', 'Leyla', pin)).status, 200);

  // ending the session logs everyone out (open student streams are hung up), progress is kept
  const sctl = new AbortController(), sev = [];
  const ses = await fetch(`${base}/api/student/events`, { headers: { cookie: jar.s }, signal: sctl.signal });
  const sdone = (async () => { const dec = new TextDecoder(); try { for await (const c of ses.body) sev.push(dec.decode(c)); } catch {} })();
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
