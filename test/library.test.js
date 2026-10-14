// Course library: content rules for every shipped course (static), and the library behaviour end to end (spawned server, fake Anthropic API).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sync as syncReadme } from '../scripts/sync-library-docs.mjs';
import { loadBuiltin, validateCourse, matches, flatten, languages, THEMES, PROGRAMMES } from '../server/library.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..'), LIB = path.join(ROOT, 'server', 'library');
const courses = loadBuiltin(LIB), byId = Object.fromEntries(courses.map((c) => [c.id, c]));
const EXPECTED = ['starter-junior', 'starter-senior', 'storytelling-studio', 'science-explainers', 'ai-detective', 'trial-class'];

// every text in a course: [path, language, string]
function* texts(c) {
  for (const f of ['title', 'promise', 'description']) for (const [l, s] of Object.entries(c[f])) yield [f, l, s];
  for (const [l, list] of Object.entries(c.goals)) for (const [i, s] of list.entries()) yield [`goals[${i}]`, l, s];
  for (const [i, lv] of c.levels.entries()) for (const f of ['title', 'intro', 'task', 'ai_guide', 'criteria']) for (const [l, s] of Object.entries(lv[f])) yield [`level ${i + 1} ${f}`, l, s];
}

test('the six launch courses ship, with unique ids and files named after them', () => {
  assert.deepEqual(courses.map((c) => c.id).sort(), [...EXPECTED].sort());
  assert.deepEqual(courses.map((c) => c.id), ['trial-class', 'starter-junior', 'starter-senior', 'storytelling-studio', 'science-explainers', 'ai-detective'], 'catalogue order follows the year plan');
  assert.equal(new Set(courses.map((c) => c.id)).size, courses.length);
});

test('every course is complete in both Azerbaijani and English, in every field', () => {
  for (const c of courses) {
    assert.deepEqual(languages(c), ['az', 'en'], `${c.id}: complete in both languages`);
    for (const f of ['title', 'promise', 'description']) for (const l of ['az', 'en']) assert.ok(c[f][l], `${c.id}.${f}.${l}`);
    assert.equal(c.goals.az.length, c.goals.en.length, `${c.id}: same number of learning goals in both languages`);
    assert.ok(c.goals.en.length >= 4 && c.goals.en.length <= 6, `${c.id}: 4 to 6 plain-language goals`);
    c.levels.forEach((lv, i) => { for (const f of ['title', 'intro', 'task', 'ai_guide', 'criteria']) for (const l of ['az', 'en']) assert.ok(lv[f][l], `${c.id} level ${i + 1} ${f}.${l}`); });
  }
});

test('Azerbaijani is written, not copied: no text is identical in both languages, and the language is really Azerbaijani', () => {
  for (const c of courses) for (const f of ['title', 'promise', 'description']) assert.notEqual(c[f].az, c[f].en, `${c.id}.${f}`);
  for (const c of courses) for (const [where, l, s] of texts(c)) {
    if (l !== 'az' || s.length < 40) continue;
    assert.notEqual(s, (where.startsWith('goals') ? c.goals.en[+where.match(/\d+/)[0]] : null), where);
    assert.match(s, /[əöüığçş]/i, `${c.id} ${where} does not look Azerbaijani`); // every longer sentence has at least one of the language's letters
  }
});

test('content rules: no "yarat" for what children make in Azerbaijani, no dash punctuation, no links, nothing empty or untrimmed', () => {
  for (const c of courses) for (const [where, l, s] of texts(c)) {
    const id = `${c.id} ${where} (${l})`;
    assert.equal(s, s.trim(), `${id} has stray spaces`);
    assert.ok(!/[—–]/.test(s), `${id} contains an em or en dash`);
    assert.ok(!/https?:|www\./i.test(s), `${id} contains a link`);
    if (l === 'az') assert.ok(!/yarat|yaradıc/i.test(s), `${id} uses "yarat" (use düzəlt, qur, icad et, hazırla, yaz)`);
  }
});

test('structure: 8 to 10 levels (the trial 3 or 4), all three level types mixed, and the last level lets the child show their work', () => {
  for (const c of courses) {
    const trial = c.id === 'trial-class', n = c.levels.length;
    assert.ok(trial ? n >= 3 && n <= 4 : n >= 8 && n <= 10, `${c.id} has ${n} levels`);
    const types = new Set(c.levels.map((l) => l.output));
    assert.ok(trial ? types.has('game') && types.has('creation') : types.size === 3, `${c.id} mixes level types: ${[...types]}`);
    const last = c.levels.at(-1);
    assert.notEqual(last.output, 'chat', `${c.id}: the final level produces something to show`);
    assert.match(last.task.en, /\b(show|present|read|share|play|pitch)\b/i, `${c.id}: the final task is about showing or playing the work`);
    assert.ok(c.levels.every((l) => l.emoji && !/\s/.test(l.emoji)), `${c.id}: one emoji per level`);
  }
});

test('catalogue data: ages, themes, programmes, sessions, next adventures', () => {
  const ages = Object.fromEntries(courses.map((c) => [c.id, [c.age.min, c.age.max]]));
  assert.deepEqual(ages['starter-junior'], [8, 11]); assert.deepEqual(ages['starter-senior'], [12, 17]); assert.deepEqual(ages['trial-class'], [8, 17]);
  assert.equal(byId['trial-class'].sessions, 1);
  assert.deepEqual(byId['trial-class'].minutes, [45, 60]);
  assert.ok(byId['trial-class'].levels.length <= 4);
  for (const c of courses) {
    assert.ok(c.themes.every((x) => THEMES.includes(x)) && c.programmes.every((x) => PROGRAMMES.includes(x)), c.id);
    for (const n of c.next) assert.ok(byId[n] && n !== c.id, `${c.id}: next adventure "${n}" exists`);
    assert.ok(c.next.length > 0, `${c.id} leads somewhere (children who finish need a next adventure)`);
  }
  assert.ok(courses.some((c) => c.programmes.includes('term-1')) && courses.some((c) => c.programmes.includes('term-2')) && courses.some((c) => c.programmes.includes('holiday')), 'a year plan: term 1, term 2, holiday camp');
});

test('level texts fit the limits of the course editor, so nothing is cut when a course is copied', () => {
  for (const c of courses) for (const lang of ['az', 'en']) {
    const flat = flatten(c, lang), v = validateCourse({ ...c, levels: c.levels });
    assert.ok(v.course, `${c.id} validates`);
    flat.levels.forEach((l, i) => {
      assert.ok(l.title.length <= 100 && l.intro.length <= 1000 && l.task.length <= 2000 && l.ai_guide.length <= 2000 && l.criteria.length <= 1000, `${c.id} ${lang} level ${i + 1}`);
    });
  }
});

test('safety: guidance for the AI keeps made-up names, no personal data and gentle content where it matters', () => {
  const guide = (id, i) => byId[id].levels[i].ai_guide.en;
  assert.match(guide('ai-detective', 5), /fictional/i); assert.match(guide('ai-detective', 5), /never about the real student/i);
  assert.match(guide('ai-detective', 6), /Never ask for the student's own details/i);
  assert.match(guide('science-explainers', 4), /Never suggest fire, heat, sharp tools, chemicals/i);
  assert.match(guide('science-explainers', 4), /teacher or a grown-up/i);
  assert.match(guide('trial-class', 3), /no scary or violent imagery/i);
  // wherever a child invents or writes about characters, the tutor is told to use made-up names, in both languages
  for (const [id, levels] of [['starter-junior', [2]], ['starter-senior', [2]], ['storytelling-studio', [1, 5, 6]], ['trial-class', [1]]]) for (const i of levels) {
    assert.match(byId[id].levels[i].ai_guide.en, /made.up/i, `${id} level ${i + 1} (en)`);
    assert.match(byId[id].levels[i].ai_guide.az, /uydurma/i, `${id} level ${i + 1} (az)`);
  }
});

test('validation rejects bad library courses and normalises good ones', () => {
  const good = JSON.parse(fs.readFileSync(path.join(LIB, 'trial-class.json'), 'utf8'));
  assert.ok(validateCourse(good).course);
  const bad = (patch) => validateCourse({ ...good, ...patch }).error;
  assert.equal(bad({ id: 'Bad Id' }), 'id');
  assert.equal(bad({ title: {} }), 'title');
  assert.equal(bad({ age: { min: 12, max: 8 } }), 'age');
  assert.equal(bad({ themes: ['nonsense'] }), 'themes');
  assert.equal(bad({ programmes: ['nonsense'] }), 'programmes');
  assert.equal(bad({ sessions: 0 }), 'sessions');
  assert.equal(bad({ goals: {} }), 'goals');
  assert.equal(bad({ levels: [] }), 'levels');
  assert.equal(bad({ levels: [{ ...good.levels[0], output: 'video' }] }), 'levels');
  assert.equal(bad({ levels: [{ ...good.levels[0], task: { en: 'x'.repeat(2001) } }] }), 'levels');
  assert.equal(bad({ next: ['trial-class'] }), 'next', 'a course cannot lead to itself');
  const one = validateCourse({ ...good, title: 'Plain', promise: { en: 'Only English' }, levels: [{ title: 'L', task: 'T', output: 'chat' }], goals: { en: ['g'] } }).course;
  assert.deepEqual(one.title, { az: 'Plain', en: 'Plain' }, 'a plain string means the same text in both languages');
  assert.deepEqual(languages(one), ['en'], 'a course missing one language says so');
  assert.equal(flatten(one, 'az').levels[0].title, 'L', 'a missing language falls back to the other one');
});

test('filters: age group, theme, length, programme and search', () => {
  const ids = (f) => courses.filter((c) => matches(c, f)).map((c) => c.id).sort();
  assert.deepEqual(ids({ age: '8-11' }), ['ai-detective', 'science-explainers', 'starter-junior', 'storytelling-studio', 'trial-class']);
  assert.deepEqual(ids({ age: '12-17' }), ['ai-detective', 'science-explainers', 'starter-senior', 'storytelling-studio', 'trial-class']);
  assert.ok(!ids({ age: '12-17' }).includes('starter-junior') && !ids({ age: '8-11' }).includes('starter-senior'), 'the starter tracks do not mix ages');
  assert.deepEqual(ids({ age: '9' }).includes('starter-junior'), true);
  assert.deepEqual(ids({ theme: 'stories' }), ['storytelling-studio']);
  assert.deepEqual(ids({ length: 'one' }), ['trial-class']);
  assert.deepEqual(ids({ length: 'short' }), ['storytelling-studio']);
  assert.deepEqual(ids({ programme: 'trial' }), ['trial-class']);
  assert.deepEqual(ids({ q: 'detektiv' }), ['ai-detective'], 'search works in either language');
  assert.deepEqual(ids({ q: 'DETECTIVE' }), ['ai-detective']);
  assert.deepEqual(ids({ age: '12-17', theme: 'science' }), ['science-explainers']);
  assert.deepEqual(ids({ age: 'nonsense' }), []);
});

test('README lists every library course and explains how to add one', () => {
  const readme = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
  assert.match(readme, /## Course library/);
  for (const c of courses) assert.ok(readme.includes(c.title.en), `README mentions ${c.title.en}`);
  assert.match(readme, /How to add a library course/i);
  assert.match(readme, /native.speaker/i);
  assert.equal(syncReadme(readme), readme, 'the course list in README.md is out of date: run "npm run library:docs"');
});

// ---------- end to end ----------
const seen = [];
const fake = http.createServer((req, res) => {
  let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => {
    const body = JSON.parse(b || '{}'), usage = { input_tokens: 10, output_tokens: 5 };
    const base = { id: 'm', type: 'message', role: 'assistant', model: body.model, stop_reason: 'end_turn', stop_sequence: null, usage };
    const sys = String(body.system);
    if (sys.includes('safety filter') || sys.includes('level evaluator')) {
      res.setHeader('content-type', 'application/json');
      return res.end(JSON.stringify({ ...base, content: [{ type: 'text', text: sys.includes('safety filter') ? '{"ok":true}' : '{"pass":true,"stars":3,"feedback":"Great"}' }] }));
    }
    seen.push(sys);
    res.writeHead(200, { 'content-type': 'text/event-stream' });
    const ev = (type, data) => res.write(`event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`);
    ev('message_start', { message: { ...base, content: [], usage: { input_tokens: 10, output_tokens: 1 } } });
    ev('content_block_start', { index: 0, content_block: { type: 'text', text: '' } });
    ev('content_block_delta', { index: 0, delta: { type: 'text_delta', text: 'Salam!' } });
    ev('content_block_stop', { index: 0 });
    ev('message_delta', { delta: { stop_reason: 'end_turn', stop_sequence: null }, usage: { output_tokens: 5 } });
    ev('message_stop', {}); res.end();
  });
});

let server, base, dir;
const jar = {};
async function call(who, method, url, body) {
  const r = await fetch(base + url, { method, headers: { 'Content-Type': 'application/json', ...(jar[who] ? { cookie: jar[who] } : {}) }, body: body && JSON.stringify(body), signal: AbortSignal.timeout(8000) });
  const sc = r.headers.get('set-cookie'); if (sc) jar[who] = sc.split(';')[0];
  return { status: r.status, data: (r.headers.get('content-type') || '').includes('json') ? await r.json() : await r.text() };
}
before(async () => {
  await new Promise((r) => fake.listen(0, r));
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pp-lib-'));
  const port = 3600 + Math.floor(Math.random() * 300); base = `http://localhost:${port}`;
  server = spawn('node', ['server/index.js'], { cwd: ROOT, stdio: 'inherit', env: { ...process.env, PORT: port, DB_PATH: path.join(dir, 't.db'), ANTHROPIC_API_KEY: 'x',
    ANTHROPIC_BASE_URL: `http://localhost:${fake.address().port}`, ADMIN_EMAIL: 'a@x.com', ADMIN_PASSWORD: 'adminpw' } });
  for (let i = 0; i < 50; i++) { try { await fetch(base + '/api/me'); break; } catch { await new Promise((r) => setTimeout(r, 100)); } }
});
after(() => { server.kill(); fake.close(); fs.rmSync(dir, { recursive: true, force: true }); });

test('library: access, browsing, filters and preview', async () => {
  assert.equal((await call('x', 'GET', '/api/library')).status, 401, 'login needed');
  await call('adm', 'POST', '/api/login', { email: 'a@x.com', password: 'adminpw' });
  await call('adm', 'POST', '/api/admin/teachers', { name: 'T', email: 't@x.com', password: 'secret1' });
  await call('adm', 'POST', '/api/admin/teachers', { name: 'U', email: 'u@x.com', password: 'secret1' });
  await call('t', 'POST', '/api/login', { email: 't@x.com', password: 'secret1' });
  await call('u', 'POST', '/api/login', { email: 'u@x.com', password: 'secret1' });

  const all = (await call('t', 'GET', '/api/library')).data.courses;
  assert.deepEqual(all.map((c) => c.id).sort(), [...EXPECTED].sort());
  assert.deepEqual((await call('t', 'GET', '/api/library?age=12-17&theme=science')).data.courses.map((c) => c.id), ['science-explainers']);
  assert.deepEqual((await call('t', 'GET', '/api/library?length=one')).data.courses.map((c) => c.id), ['trial-class']);
  const s = all.find((c) => c.id === 'storytelling-studio');
  assert.equal(s.levels, 8); assert.deepEqual(s.languages, ['az', 'en']); assert.ok(s.title.az && s.title.en && s.promise.az);

  const d = (await call('t', 'GET', '/api/library/ai-detective')).data;
  assert.equal(d.course.levels.length, 9);
  assert.ok(d.course.levels.every((l) => l.intro.en && l.task.az && l.criteria.en && l.ai_guide.az), 'preview has intro, task, criteria and AI guide of every level');
  assert.ok(d.course.goals.en.length >= 4);
  assert.deepEqual(d.next.map((n) => n.id).sort(), ['science-explainers', 'storytelling-studio']);
  assert.equal((await call('t', 'GET', '/api/library/nope')).status, 404);
});

test('using a library course: copy to edit leaves the original and other teachers untouched; opening a room needs no writing', async () => {
  const before = JSON.stringify((await call('t', 'GET', '/api/library/storytelling-studio')).data.course);

  // customise: own copy, reword a task, drop a level, add one
  const copy = (await call('t', 'POST', '/api/library/storytelling-studio/copy', { lang: 'en' })).data.id;
  const c = (await call('t', 'GET', '/api/courses/' + copy)).data;
  assert.equal(c.levels.length, 8); assert.equal(c.title, 'Storytelling Studio'); assert.equal(c.library_slug, 'storytelling-studio');
  assert.ok(c.levels[0].ai_guide && c.levels[0].criteria && c.levels[0].intro, 'all parts of every level are copied');
  const levels = c.levels.slice(0, 7).map((l, i) => (i === 0 ? { ...l, task: 'My own wording of the task' } : l)).concat([{ title: 'Extra', task: 'Do more', output: 'chat' }]);
  assert.equal((await call('t', 'PUT', '/api/courses/' + copy, { title: 'My story course', description: c.description, levels })).status, 200);
  const mine = (await call('t', 'GET', '/api/courses/' + copy)).data;
  assert.equal(mine.levels.length, 8); assert.equal(mine.levels[0].task, 'My own wording of the task'); assert.equal(mine.levels[7].title, 'Extra');
  assert.equal(JSON.stringify((await call('t', 'GET', '/api/library/storytelling-studio')).data.course), before, 'the library course is unchanged');
  assert.equal((await call('u', 'GET', '/api/courses/' + copy)).status, 404, 'other teachers cannot see my copy');
  const fresh = (await call('u', 'POST', '/api/library/storytelling-studio/copy', { lang: 'en' })).data.id;
  assert.equal((await call('u', 'GET', '/api/courses/' + fresh)).data.levels[0].task, byId['storytelling-studio'].levels[0].task.en, 'another teacher still gets the original wording');
  assert.equal((await call('t', 'GET', '/api/courses')).data.find((x) => x.id === copy).edited, 1);

  // open a room in one request: no consent, no room
  const form = { lang: 'az', name: '5B', consent: true, daily_limit: 25, approval: 'ai' };
  assert.equal((await call('t', 'POST', '/api/library/trial-class/room', { ...form, consent: false })).data.error, 'consent');
  assert.equal((await call('t', 'POST', '/api/library/trial-class/room', { ...form, name: ' ' })).data.error, 'name');
  assert.equal((await call('t', 'GET', '/api/courses')).data.filter((x) => x.library_slug === 'trial-class').length, 0, 'a refused request creates nothing');
  const r1 = (await call('t', 'POST', '/api/library/trial-class/room', form)).data;
  const room = (await call('t', 'GET', '/api/classes/' + r1.id)).data;
  assert.equal(room.name, '5B'); assert.equal(room.levels.length, 4); assert.equal(room.daily_limit, 25);
  assert.equal(room.levels[0].title, byId['trial-class'].levels[0].title.az, 'the room runs in the chosen language');
  assert.ok(room.invite && room.code);
  // a second room from the same untouched course shares one copy; an English one is a separate copy
  const r2 = (await call('t', 'POST', '/api/library/trial-class/room', { ...form, name: '5C' })).data;
  assert.equal(r2.course_id, r1.course_id, 'untouched copies are reused');
  const r3 = (await call('t', 'POST', '/api/library/trial-class/room', { ...form, name: '5D', lang: 'en' })).data;
  assert.notEqual(r3.course_id, r1.course_id);
  assert.equal((await call('t', 'GET', '/api/classes/' + r3.id)).data.levels[0].title, 'Say It Clearly');
  // once the teacher edits the copy, a new room starts again from the pristine library course
  const cc = (await call('t', 'GET', '/api/courses/' + r1.course_id)).data;
  await call('t', 'PUT', '/api/courses/' + r1.course_id, { title: cc.title, description: cc.description, levels: cc.levels.slice(0, 3) });
  const r4 = (await call('t', 'POST', '/api/library/trial-class/room', { ...form, name: '5E' })).data;
  assert.notEqual(r4.course_id, r1.course_id);
  assert.equal((await call('t', 'GET', '/api/classes/' + r4.id)).data.levels.length, 4, 'not the edited version');
  assert.equal((await call('t', 'GET', '/api/classes/' + r1.id)).data.levels.length, 3, 'existing rooms follow their own course, as before');
});

test('a student plays a library course end to end and is pointed to the next adventure', async () => {
  const rooms = (await call('t', 'GET', '/api/classes')).data, room = rooms.find((r) => r.name === '5D'); // English trial class
  const full = (await call('t', 'GET', '/api/classes/' + room.id)).data;
  assert.ok(full.next.some((n) => n.id === 'starter-junior'), 'teacher sees what comes next');
  await call('t', 'PATCH', '/api/classes/' + room.id, { live: true });
  assert.equal((await call('s', 'POST', '/api/join', { invite: full.invite, nickname: 'Kamal', pin: '1234' })).status, 200);
  let me = (await call('s', 'GET', '/api/student/me')).data;
  assert.deepEqual(me.levels.map((l) => l.status), ['current', 'locked', 'locked', 'locked']);
  assert.deepEqual(me.next, [], 'nothing suggested before the course is finished');

  // the tutor gets the library level's own guidance (and the Azerbaijani wording rule)
  seen.length = 0;
  const lvl = (await call('s', 'GET', '/api/student/levels/' + me.levels[0].id)).data.level;
  assert.equal(lvl.title, 'Say It Clearly'); assert.ok(!('ai_guide' in lvl) && !('criteria' in lvl), 'hidden guidance never reaches the student');
  assert.equal((await call('s', 'POST', '/api/chat', { text: 'tell me a story', level_id: lvl.id })).status, 200);
  assert.ok(seen[0].includes(byId['trial-class'].levels[0].ai_guide.en) && seen[0].includes('Level 1: "Say It Clearly"'));
  assert.match(seen[0], /yaratmaq/, 'the tutor is told which Azerbaijani verb to avoid');
  assert.equal((await call('s', 'POST', `/api/levels/${lvl.id}/submit`)).data.pass, true, 'check my work works on a library level');

  const sid = (await call('t', 'GET', '/api/classes/' + room.id)).data.students[0].id;
  for (const l of me.levels.slice(1)) await call('t', 'POST', `/api/students/${sid}/progress`, { level_id: l.id, action: 'pass', stars: 3 });
  me = (await call('s', 'GET', '/api/student/me')).data;
  assert.ok(me.levels.every((l) => l.status === 'done'));
  assert.deepEqual(me.next.map((n) => n.id), ['starter-junior', 'starter-senior']);
  assert.ok(me.next[0].title.az && me.next[0].title.en);
});

test('the admin controls who sees which library course, and adds in-house courses', async () => {
  assert.equal((await call('t', 'PUT', '/api/admin/library/ai-detective/visibility', { visible: false })).status, 401, 'teachers cannot hide courses');
  assert.equal((await call('t', 'POST', '/api/admin/library', {})).status, 401);

  // hide: gone for teachers (list, preview, copy, room), still there for the admin and for rooms already made
  const roomBefore = (await call('t', 'POST', '/api/library/ai-detective/room', { lang: 'en', name: 'Det', consent: true })).data;
  assert.equal((await call('adm', 'PUT', '/api/admin/library/ai-detective/visibility', { visible: false })).status, 200);
  assert.ok(!(await call('t', 'GET', '/api/library')).data.courses.some((c) => c.id === 'ai-detective'));
  assert.equal((await call('t', 'GET', '/api/library/ai-detective')).status, 404);
  assert.equal((await call('t', 'POST', '/api/library/ai-detective/copy', { lang: 'en' })).status, 404);
  assert.equal((await call('t', 'POST', '/api/library/ai-detective/room', { lang: 'en', name: 'x', consent: true })).status, 404);
  assert.equal((await call('t', 'GET', '/api/classes/' + roomBefore.id)).data.levels.length, 9, 'a room made before keeps working');
  const adminView = (await call('adm', 'GET', '/api/library')).data.courses.find((c) => c.id === 'ai-detective');
  assert.equal(adminView.hidden, true);
  assert.equal((await call('adm', 'GET', '/api/library/ai-detective')).data.hidden, true);
  assert.ok(!(await call('t', 'GET', '/api/library/storytelling-studio')).data.next.some((n) => n.id === 'ai-detective'), 'hidden courses are not suggested as next adventure');
  await call('adm', 'PUT', '/api/admin/library/ai-detective/visibility', { visible: true });
  assert.equal((await call('t', 'GET', '/api/library/ai-detective')).status, 200);
  assert.equal((await call('adm', 'PUT', '/api/admin/library/nope/visibility', { visible: false })).status, 404);

  // in-house course
  const mine = { ...JSON.parse(fs.readFileSync(path.join(LIB, 'trial-class.json'), 'utf8')), id: 'our-holiday-camp', title: { az: 'Bizim düşərgə', en: 'Our holiday camp' }, programmes: ['holiday'], next: [] };
  assert.equal((await call('adm', 'POST', '/api/admin/library', { ...mine, themes: ['nope'] })).data.error, 'themes');
  assert.equal((await call('adm', 'POST', '/api/admin/library', { ...mine, id: 'trial-class' })).status, 409, 'a built-in course cannot be replaced');
  assert.equal((await call('adm', 'POST', '/api/admin/library', mine)).data.id, 'our-holiday-camp');
  const listed = (await call('t', 'GET', '/api/library?programme=holiday')).data.courses.find((c) => c.id === 'our-holiday-camp');
  assert.ok(listed && listed.builtin === false);
  const room = (await call('t', 'POST', '/api/library/our-holiday-camp/room', { lang: 'az', name: 'Camp', consent: true })).data;
  assert.equal((await call('t', 'GET', '/api/classes/' + room.id)).data.course.title, 'Bizim düşərgə', 'in-house courses open rooms like built-in ones');
  assert.equal((await call('adm', 'POST', '/api/admin/library', { ...mine, title: { az: 'Yeni ad', en: 'New name' } })).status, 200, 'uploading the same id again replaces an in-house course');
  assert.equal((await call('t', 'GET', '/api/library/our-holiday-camp')).data.course.title.en, 'New name');
  assert.equal((await call('adm', 'DELETE', '/api/admin/library/trial-class')).status, 403, 'built-in courses can only be hidden');
  assert.equal((await call('adm', 'DELETE', '/api/admin/library/our-holiday-camp')).status, 200);
  assert.equal((await call('t', 'GET', '/api/library/our-holiday-camp')).status, 404);
  assert.equal((await call('t', 'GET', '/api/classes/' + room.id)).data.levels.length, 4, 'rooms made from it keep working');
});

test('what must keep working: the starter course, own courses and JSON upload/download are unchanged', async () => {
  const starter = (await call('t', 'POST', '/api/courses/starter')).data.id;
  const s = (await call('t', 'GET', '/api/courses/' + starter)).data;
  assert.equal(s.levels.length, 10); assert.equal(s.library_slug, null);
  const upload = { title: 'Mine', description: 'd', levels: [{ title: 'A', emoji: '🙂', task: 'Do A', output: 'chat' }] };
  const up = (await call('t', 'POST', '/api/courses', upload)).data.id;
  const down = (await call('t', 'GET', '/api/courses/' + up)).data;
  assert.equal(down.title, 'Mine'); assert.equal(down.levels[0].task, 'Do A');
  const list = (await call('t', 'GET', '/api/courses')).data;
  assert.equal(list.find((c) => c.id === up).library_slug, null);
  const room = (await call('t', 'POST', '/api/classes', { name: 'Old way', consent: true, course_id: starter })).data;
  assert.ok(room.id, 'rooms are still created the old way');
  assert.equal((await call('t', 'POST', '/api/classes', { name: '', consent: true, course_id: starter })).data.error, 'name');
  assert.equal((await call('t', 'POST', '/api/classes', { name: 'x', consent: false, course_id: starter })).data.error, 'consent');
  assert.equal((await call('t', 'POST', '/api/classes', { name: 'x', consent: true, course_id: 99999 })).data.error, 'course');
  assert.equal((await call('t', 'DELETE', '/api/courses/' + starter)).status, 409, 'a course used by a room still cannot be deleted');
});
