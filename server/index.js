import express from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';
import { db, now, getSetting, setSetting, hashPassword, checkPassword, newToken, newInvite, dayStart, dayRange, newClassCode, purgeOld, migrateLessons } from './db.js';
import { moderate, chat, evaluate, systemPrompt, costOf } from './ai.js';

const HERE = path.dirname(fileURLToPath(import.meta.url)), PUBLIC = path.join(HERE, '..', 'public');
const STARTER = JSON.parse(fs.readFileSync(path.join(HERE, 'starter-course.json'), 'utf8'));
// A live room closes this long after the teacher's dashboard disconnects (closed tab, sleeping laptop).
const GRACE = +process.env.SESSION_GRACE_MS || 15 * 60000;
const SUBMIT_COOLDOWN = +process.env.SUBMIT_COOLDOWN_MS || 15000; // between two "check my work" presses

const app = express();
app.set('trust proxy', 'loopback'); // Caddy on the same host forwards the real protocol
app.use(express.json({ limit: '300kb' }));
app.use(express.static(PUBLIC));
// "/" is the public home page (public/index.html, served by express.static); joining and logging in live at /join.
app.get(['/join', '/join/:token'], (_req, res) => res.sendFile(path.join(PUBLIC, 'join.html')));

// ---------- helpers ----------
const one = (sql, ...p) => db.prepare(sql).get(...p);
const all = (sql, ...p) => db.prepare(sql).all(...p);
const run = (sql, ...p) => db.prepare(sql).run(...p);
const fail = (res, status, error) => res.status(status).json({ error });

// Channels: "t:<class>" teacher dashboard, "s:<class>" all students of a room, "u:<student>" one student.
const subs = new Map(); // channel -> Set<res>
function subscribe(req, res, channels, onClose) {
  res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' }).flushHeaders();
  res.write(': ok\n\n');
  for (const c of channels) { if (!subs.has(c)) subs.set(c, new Set()); subs.get(c).add(res); }
  const ping = setInterval(() => !res.writableEnded && res.write(': ping\n\n'), 25000);
  req.on('close', () => { clearInterval(ping); channels.forEach((c) => subs.get(c)?.delete(res)); onClose?.(); });
}
// A hung-up stream stays in its other channels until its 'close' event fires, so skip ended ones.
const publish = (channel, ev) => subs.get(channel)?.forEach((r) => !r.writableEnded && r.write(`data: ${JSON.stringify(ev)}\n\n`));
const hangUp = (channel) => subs.get(channel)?.forEach((r) => r.end());

// Presence: open dashboard tabs per room and open student tabs per student.
const teacherConns = new Map(), studentConns = new Map(), graceTimers = new Map();
const bump = (m, k, d) => { const n = (m.get(k) || 0) + d; n > 0 ? m.set(k, n) : m.delete(k); return n; };
function armGrace(classId) {
  clearTimeout(graceTimers.get(classId));
  graceTimers.set(classId, setTimeout(() => {
    graceTimers.delete(classId);
    if (!teacherConns.get(classId) && one('SELECT live FROM classes WHERE id=?', classId)?.live) closeRoom(classId);
  }, GRACE).unref());
}
// Ending a session logs every student out; accounts and progress stay for the next session.
function closeRoom(classId) {
  run('UPDATE classes SET live=0 WHERE id=?', classId);
  run("DELETE FROM sessions WHERE kind='student' AND ref IN (SELECT id FROM students WHERE class_id=?)", classId);
  publish(`s:${classId}`, { type: 'closed' }); hangUp(`s:${classId}`);
  publish(`t:${classId}`, { type: 'room' });
}

function cookie(req, name) {
  const m = (req.headers.cookie || '').match(new RegExp(`(?:^|; )${name}=([^;]+)`));
  return m && m[1];
}
// Separate cookies so a teacher and a student can use the same browser (e.g. a teacher testing).
const COOKIE = { user: 'pp_user', student: 'pp_student' };
function startSession(res, kind, ref) {
  const token = newToken();
  run('INSERT INTO sessions(token,kind,ref,created) VALUES(?,?,?,?)', token, kind, ref, now());
  res.append('Set-Cookie', `${COOKIE[kind]}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${30 * 86400}`);
}
function auth(req, _res, next) {
  const u = one("SELECT * FROM sessions WHERE token=? AND kind='user'", cookie(req, COOKIE.user) || '');
  if (u) req.user = one('SELECT id,email,name,role FROM users WHERE id=?', u.ref);
  const s = one("SELECT * FROM sessions WHERE token=? AND kind='student'", cookie(req, COOKIE.student) || '');
  if (s) req.student = one('SELECT * FROM students WHERE id=?', s.ref);
  next();
}
app.use(auth);
const needRole = (role) => (req, res, next) => (req.user?.role === role ? next() : fail(res, 401, 'auth'));
const needTeacher = needRole('teacher'), needAdmin = needRole('admin');
// A student account only works while the teacher keeps the room's session open.
function needStudent(req, res, next) {
  if (!req.student) return fail(res, 401, 'auth');
  req.room = one('SELECT * FROM classes WHERE id=?', req.student.class_id);
  req.room?.live ? next() : fail(res, 401, 'room_closed');
}

function ownClass(req, res, next) {
  req.cls = one('SELECT * FROM classes WHERE id=? AND teacher_id=?', +req.params.id, req.user.id);
  req.cls ? next() : fail(res, 404, 'not_found');
}
function ownCourse(req, res, next) {
  req.course = one('SELECT * FROM courses WHERE id=? AND teacher_id=?', +req.params.id, req.user.id);
  req.course ? next() : fail(res, 404, 'not_found');
}
const spent = () => one('SELECT COALESCE(SUM(cost),0) c FROM usage').c;
const overBudget = () => { const cap = +getSetting('spend_cap', 0); return cap > 0 && spent() >= cap; };
const logUsage = (cls, stu, u) => u && run('INSERT INTO usage(class_id,student_id,tokens_in,tokens_out,cost,created) VALUES(?,?,?,?,?,?)',
  cls, stu, u.input_tokens, u.output_tokens, costOf(u), now());
const usedToday = (sid) => one("SELECT COUNT(*) n FROM messages WHERE student_id=? AND role='user' AND created>=?", sid, dayStart()).n;

// Last complete ```html / ```creation block in an AI reply.
function extractOutput(text, kind) {
  const re = kind === 'game' ? /```html\s*([\s\S]*?)```/g : /```creation\s*([\s\S]*?)```/g;
  let m, last = null;
  while ((m = re.exec(text))) last = m[1].trim();
  return last;
}

// ---------- courses ----------
const OUTPUTS = ['game', 'creation', 'chat'];
const str = (v, max) => String(v ?? '').trim().slice(0, max);
function cleanLevels(levels) {
  if (!Array.isArray(levels) || levels.length > 100) return null;
  const out = levels.map((l) => ({
    id: +l?.id || null, title: str(l?.title, 100), emoji: str(l?.emoji, 8) || '⭐', intro: str(l?.intro, 1000), task: str(l?.task, 2000),
    ai_guide: str(l?.ai_guide, 2000), criteria: str(l?.criteria, 1000), output: OUTPUTS.includes(l?.output) ? l.output : 'game',
  }));
  return out.every((l) => l.title && l.task) ? out : null;
}
// Replace a course's levels with the given list: known ids are updated (keeping student progress), others inserted, missing ones removed.
function saveLevels(courseId, levels) {
  const keep = new Set();
  levels.forEach((l, i) => {
    const vals = [i + 1, l.title, l.emoji, l.intro, l.task, l.ai_guide, l.criteria, l.output];
    if (l.id && one('SELECT 1 FROM levels WHERE id=? AND course_id=?', l.id, courseId)) {
      run('UPDATE levels SET position=?,title=?,emoji=?,intro=?,task=?,ai_guide=?,criteria=?,output=? WHERE id=?', ...vals, l.id); keep.add(l.id);
    } else {
      keep.add(+run('INSERT INTO levels(position,title,emoji,intro,task,ai_guide,criteria,output,course_id,created) VALUES(?,?,?,?,?,?,?,?,?,?)', ...vals, courseId, now()).lastInsertRowid);
    }
  });
  for (const { id } of all('SELECT id FROM levels WHERE course_id=?', courseId)) if (!keep.has(id)) run('DELETE FROM levels WHERE id=?', id);
}
function createCourse(teacherId, body) {
  const title = str(body.title, 100), levels = cleanLevels(body.levels ?? []);
  if (!title) return { error: 'title' };
  if (!levels) return { error: 'levels' };
  const id = +run('INSERT INTO courses(teacher_id,title,description,created,updated) VALUES(?,?,?,?,?)', teacherId, title, str(body.description, 1000), now(), now()).lastInsertRowid;
  saveLevels(id, levels.map((l) => ({ ...l, id: null })));
  return { id };
}
const courseLevels = (courseId) => all('SELECT * FROM levels WHERE course_id=? ORDER BY position', courseId);

app.get('/api/courses', needTeacher, (req, res) => res.json(all(`SELECT c.id,c.title,c.description,c.updated,
    (SELECT COUNT(*) FROM levels l WHERE l.course_id=c.id) levels, (SELECT COUNT(*) FROM classes r WHERE r.course_id=c.id) rooms
  FROM courses c WHERE c.teacher_id=? ORDER BY c.id DESC`, req.user.id)));
app.post('/api/courses', needTeacher, (req, res) => {
  const r = createCourse(req.user.id, req.body || {});
  r.error ? fail(res, 400, r.error) : res.json(r);
});
app.post('/api/courses/starter', needTeacher, (req, res) => res.json(createCourse(req.user.id, STARTER)));
app.get('/api/courses/:id', needTeacher, ownCourse, (req, res) => res.json({ ...req.course, levels: courseLevels(req.course.id) }));
app.put('/api/courses/:id', needTeacher, ownCourse, (req, res) => {
  const title = str(req.body.title, 100), levels = cleanLevels(req.body.levels);
  if (!title) return fail(res, 400, 'title');
  if (!levels) return fail(res, 400, 'levels');
  run('UPDATE courses SET title=?,description=?,updated=? WHERE id=?', title, str(req.body.description, 1000), now(), req.course.id);
  saveLevels(req.course.id, levels);
  for (const { id } of all('SELECT id FROM classes WHERE course_id=?', req.course.id)) { publish(`s:${id}`, { type: 'state' }); publish(`t:${id}`, { type: 'room' }); }
  res.json({ ok: true });
});
app.delete('/api/courses/:id', needTeacher, ownCourse, (req, res) => {
  if (one('SELECT 1 FROM classes WHERE course_id=?', req.course.id)) return fail(res, 409, 'in_use');
  run('DELETE FROM levels WHERE course_id=?', req.course.id);
  run('DELETE FROM courses WHERE id=?', req.course.id);
  res.json({ ok: true });
});

// ---------- level progress ----------
// Levels unlock in order: everything done is replayable, the first unfinished level is "current", the rest are locked.
function levelMap(stu, courseId) {
  const prog = new Map(all('SELECT * FROM progress WHERE student_id=?', stu.id).map((p) => [p.level_id, p]));
  let current = false;
  return courseLevels(courseId).map((l) => {
    const p = prog.get(l.id);
    let status = p?.status === 'done' ? 'done' : 'locked';
    if (status !== 'done' && !current) { current = true; status = p?.status === 'pending' ? 'pending' : 'current'; }
    return { ...l, status, stars: p?.stars || 0, feedback: p?.feedback || '' };
  });
}
const openLevel = (stu, courseId, levelId) => levelMap(stu, courseId).find((l) => l.id === levelId && l.status !== 'locked');
function setProgress(sid, levelId, status, stars, feedback, outputId) {
  run(`INSERT INTO progress(student_id,level_id,status,stars,feedback,output_id,created) VALUES(?,?,?,?,?,?,?)
    ON CONFLICT(student_id,level_id) DO UPDATE SET status=excluded.status,stars=excluded.stars,feedback=excluded.feedback,
      output_id=COALESCE(excluded.output_id,output_id),created=excluded.created`, sid, levelId, status, stars, feedback, outputId ?? null, now());
}

// ---------- auth ----------
app.post('/api/login', (req, res) => {
  const u = one('SELECT * FROM users WHERE email=?', String(req.body.email || '').trim().toLowerCase());
  if (!u || !checkPassword(String(req.body.password || ''), u.pass)) return fail(res, 401, 'bad_login');
  startSession(res, 'user', u.id);
  res.json({ role: u.role });
});
app.post('/api/logout', (req, res) => {
  run('DELETE FROM sessions WHERE token=?', cookie(req, COOKIE.user) || '');
  res.json({ ok: true });
});
app.get('/api/me', (req, res) => (req.user ? res.json(req.user) : fail(res, 401, 'auth')));

// ---------- teacher: rooms ----------
const APPROVAL = ['ai', 'teacher'];
app.post('/api/classes', needTeacher, (req, res) => {
  const { name, consent, daily_limit, course_id, approval } = req.body;
  if (!String(name || '').trim()) return fail(res, 400, 'name');
  if (consent !== true) return fail(res, 400, 'consent');
  if (!one('SELECT 1 FROM courses WHERE id=? AND teacher_id=?', +course_id, req.user.id)) return fail(res, 400, 'course');
  const r = run('INSERT INTO classes(teacher_id,name,code,consent_at,daily_limit,course_id,invite,approval,live,created) VALUES(?,?,?,?,?,?,?,?,0,?)',
    req.user.id, String(name).trim().slice(0, 60), newClassCode(), now(), Math.max(1, +daily_limit || 30), +course_id, newInvite(),
    APPROVAL.includes(approval) ? approval : 'ai', now());
  res.json({ id: +r.lastInsertRowid });
});
app.get('/api/classes', needTeacher, (req, res) =>
  res.json(all(`SELECT c.id,c.name,c.code,c.paused,c.live,co.title course,(SELECT COUNT(*) FROM students s WHERE s.class_id=c.id) students
    FROM classes c LEFT JOIN courses co ON co.id=c.course_id WHERE c.teacher_id=? ORDER BY c.id DESC`, req.user.id)));

app.get('/api/classes/:id', needTeacher, ownClass, (req, res) => {
  const levels = courseLevels(req.cls.course_id), course = one('SELECT id,title FROM courses WHERE id=?', req.cls.course_id);
  const students = all(`SELECT s.id,s.nickname,s.avatar,s.paused,s.last_seen,
      (SELECT COUNT(*) FROM messages m WHERE m.student_id=s.id AND m.role='user' AND m.created>=?) used,
      (SELECT COUNT(*) FROM games g WHERE g.student_id=s.id) outputs
    FROM students s WHERE s.class_id=? ORDER BY s.nickname`, dayStart(), req.cls.id).map((s) => {
    const map = levelMap(s, req.cls.course_id), cur = map.find((l) => l.status !== 'done' && l.status !== 'locked');
    return { ...s, online: !!studentConns.get(s.id), level: cur?.id ?? null, done: map.filter((l) => l.status === 'done').length,
      stars: map.reduce((a, l) => a + l.stars, 0), pending: cur?.status === 'pending', progress: map.map((l) => ({ id: l.id, status: l.status, stars: l.stars })) };
  });
  const pending = all(`SELECT p.student_id,p.level_id,p.stars,p.feedback,p.output_id,p.created,s.nickname,s.avatar,l.title,l.position FROM progress p
    JOIN students s ON s.id=p.student_id JOIN levels l ON l.id=p.level_id WHERE s.class_id=? AND p.status='pending' ORDER BY p.created`, req.cls.id);
  res.json({ ...req.cls, course, levels, students, pending, teacherOnline: !!teacherConns.get(req.cls.id) });
});
app.patch('/api/classes/:id', needTeacher, ownClass, (req, res) => {
  const { paused, daily_limit, live, approval, regen_invite } = req.body;
  if (paused !== undefined) run('UPDATE classes SET paused=? WHERE id=?', paused ? 1 : 0, req.cls.id);
  if (daily_limit !== undefined) run('UPDATE classes SET daily_limit=? WHERE id=?', Math.max(1, +daily_limit || 30), req.cls.id);
  if (APPROVAL.includes(approval)) run('UPDATE classes SET approval=? WHERE id=?', approval, req.cls.id);
  if (regen_invite) run('UPDATE classes SET invite=? WHERE id=?', newInvite(), req.cls.id);
  if (live === true) run('UPDATE classes SET live=1 WHERE id=?', req.cls.id);
  if (live === false && req.cls.live) closeRoom(req.cls.id);
  publish(`s:${req.cls.id}`, { type: 'state' });
  res.json({ ok: true });
});
const joinUrl = (req, invite) => `${process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`}/join/${invite}`;
app.get('/api/classes/:id/qr.svg', needTeacher, ownClass, async (req, res) =>
  res.type('image/svg+xml').send(await QRCode.toString(joinUrl(req, req.cls.invite), { type: 'svg', margin: 1 })));

// ---------- teacher: students, progress, messages, outputs ----------
function ownStudent(req, res, next) {
  req.stu = one('SELECT s.* FROM students s JOIN classes c ON c.id=s.class_id WHERE s.id=? AND c.teacher_id=?', +req.params.id, req.user.id);
  req.stu ? next() : fail(res, 404, 'not_found');
}
const PIN_RE = /^\d{4}$/;
app.patch('/api/students/:id', needTeacher, ownStudent, (req, res) => {
  if (req.body.paused !== undefined) run('UPDATE students SET paused=? WHERE id=?', req.body.paused ? 1 : 0, req.stu.id);
  let pin;
  if (req.body.reset_pin) { // shown once to the teacher, who tells the student
    pin = String(crypto.randomInt(10000)).padStart(4, '0');
    run('UPDATE students SET pin=? WHERE id=?', hashPassword(pin), req.stu.id); pinFails.delete(req.stu.id);
  }
  publish(`s:${req.stu.class_id}`, { type: 'state' });
  res.json({ ok: true, pin });
});
app.delete('/api/students/:id', needTeacher, ownStudent, (req, res) => {
  run('DELETE FROM sessions WHERE kind=? AND ref=?', 'student', req.stu.id);
  run('DELETE FROM progress WHERE student_id=?', req.stu.id);
  run('DELETE FROM students WHERE id=?', req.stu.id);
  publish(`u:${req.stu.id}`, { type: 'closed' }); hangUp(`u:${req.stu.id}`);
  res.json({ ok: true });
});
// Teacher overrides: approve or reject a pending level, pass (skip) any level, or reset one so it is played again.
app.post('/api/students/:id/progress', needTeacher, ownStudent, (req, res) => {
  const levelId = +req.body.level_id, room = one('SELECT * FROM classes WHERE id=?', req.stu.class_id);
  if (!one('SELECT 1 FROM levels WHERE id=? AND course_id=?', levelId, room.course_id)) return fail(res, 404, 'not_found');
  const p = one('SELECT * FROM progress WHERE student_id=? AND level_id=?', req.stu.id, levelId), note = str(req.body.feedback, 500);
  if (req.body.action === 'pass') setProgress(req.stu.id, levelId, 'done', Math.min(3, Math.max(0, +(req.body.stars ?? p?.stars ?? 1) || 0)), note || p?.feedback || '', null);
  else if (req.body.action === 'reject' || req.body.action === 'reset') run('DELETE FROM progress WHERE student_id=? AND level_id=?', req.stu.id, levelId);
  else return fail(res, 400, 'action');
  publish(`u:${req.stu.id}`, { type: 'progress', level_id: levelId, action: req.body.action, feedback: note });
  publish(`t:${room.id}`, { type: 'room' });
  res.json({ ok: true });
});
app.get('/api/classes/:id/messages', needTeacher, ownClass, (req, res) => {
  const where = ['m.class_id=?'], p = [req.cls.id];
  if (req.query.student) { where.push('m.student_id=?'); p.push(+req.query.student); }
  if (req.query.level) { where.push('m.level_id=?'); p.push(+req.query.level); }
  if (req.query.date) { const [a, b] = dayRange(req.query.date); where.push('m.created>=? AND m.created<?'); p.push(a, b); }
  res.json(all(`SELECT m.id,m.student_id,s.nickname,s.avatar,m.role,m.content,m.flag,m.created,m.level_id,l.title level FROM messages m
    JOIN students s ON s.id=m.student_id LEFT JOIN levels l ON l.id=m.level_id
    WHERE ${where.join(' AND ')} ORDER BY m.id DESC LIMIT 400`, ...p).reverse());
});
app.get('/api/classes/:id/events', needTeacher, ownClass, (req, res) => {
  const id = req.cls.id;
  bump(teacherConns, id, 1); clearTimeout(graceTimers.get(id)); graceTimers.delete(id);
  subscribe(req, res, [`t:${id}`], () => { if (!bump(teacherConns, id, -1)) armGrace(id); });
});
app.get('/api/classes/:id/games', needTeacher, ownClass, (req, res) =>
  res.json(all(`SELECT g.id,g.title,g.html,g.kind,g.shared,g.created,g.student_id,g.level_id,s.nickname,s.avatar,l.title level FROM games g
    JOIN students s ON s.id=g.student_id LEFT JOIN levels l ON l.id=g.level_id WHERE g.class_id=? ORDER BY g.id DESC LIMIT 300`, req.cls.id)));
app.post('/api/games/:id/showcase', needTeacher, (req, res) => {
  const g = one('SELECT g.title,g.html,g.kind,s.nickname,g.class_id FROM games g JOIN students s ON s.id=g.student_id JOIN classes c ON c.id=g.class_id WHERE g.id=? AND c.teacher_id=?', +req.params.id, req.user.id);
  if (!g) return fail(res, 404, 'not_found');
  publish(`s:${g.class_id}`, { type: 'showcase', game: { title: g.title, html: g.html, kind: g.kind, nickname: g.nickname } });
  res.json({ ok: true });
});

// ---------- student: joining ----------
const AVATARS = ['🦊', '🐼', '🐯', '🦁', '🐸', '🐵', '🦄', '🐙', '🐧', '🐢', '🦉', '🐝', '🚀', '🤖', '👾', '🌟'];
const pinFails = new Map(); // student id -> {n, until}: slows down guessing a 4-digit PIN
const findRoom = (b) => b.invite ? one('SELECT * FROM classes WHERE invite=?', String(b.invite)) : one('SELECT * FROM classes WHERE code=?', String(b.code || '').trim().toUpperCase());
app.get('/api/invite/:token', (req, res) => {
  const c = one('SELECT c.name,c.live,co.title course FROM classes c LEFT JOIN courses co ON co.id=c.course_id WHERE c.invite=?', req.params.token);
  c ? res.json({ name: c.name, course: c.course, live: !!c.live, avatars: AVATARS }) : fail(res, 404, 'bad_invite');
});
app.get('/api/avatars', (_req, res) => res.json(AVATARS));
app.post('/api/join', (req, res) => {
  const cls = findRoom(req.body || {});
  const nick = String(req.body.nickname || '').trim().replace(/\s+/g, ' ').slice(0, 20), pin = String(req.body.pin || '');
  if (!cls) return fail(res, 404, req.body.invite ? 'bad_invite' : 'bad_code');
  if (!cls.live) return fail(res, 403, 'room_closed');
  if (nick.length < 2) return fail(res, 400, 'bad_nick');
  if (!PIN_RE.test(pin)) return fail(res, 400, 'bad_pin_format');
  let stu = one('SELECT * FROM students WHERE class_id=? AND nickname=?', cls.id, nick);
  if (stu) { // logging back in to an existing account
    const f = pinFails.get(stu.id);
    if (f?.until > now()) return fail(res, 429, 'pin_locked');
    const legacy = !stu.pin && req.student?.id === stu.id; // pilot accounts had no PIN: the original browser sets one
    if (!legacy && !(stu.pin && checkPassword(pin, stu.pin))) {
      const n = (f?.n || 0) + 1;
      pinFails.set(stu.id, n >= 5 ? { n: 0, until: now() + 5 * 60000 } : { n, until: 0 });
      return fail(res, stu.pin ? 401 : 409, stu.pin ? 'bad_pin' : 'nick_taken');
    }
    pinFails.delete(stu.id);
    if (legacy) run('UPDATE students SET pin=? WHERE id=?', hashPassword(pin), stu.id);
  } else {
    const avatar = AVATARS.includes(req.body.avatar) ? req.body.avatar : AVATARS[0];
    const r = run('INSERT INTO students(class_id,nickname,pin,avatar,created,last_seen) VALUES(?,?,?,?,?,?)', cls.id, nick, hashPassword(pin), avatar, now(), now());
    stu = { id: +r.lastInsertRowid };
  }
  startSession(res, 'student', stu.id);
  publish(`t:${cls.id}`, { type: 'room' });
  res.json({ ok: true });
});

// ---------- student: map and levels ----------
function studentState(stu, room) {
  const used = usedToday(stu.id);
  return { used, limit: room.daily_limit, classPaused: !!room.paused, paused: !!stu.paused, budget: overBudget() };
}
app.get('/api/student/me', needStudent, (req, res) => {
  const stu = req.student, room = req.room;
  run('UPDATE students SET last_seen=? WHERE id=?', now(), stu.id);
  const levels = levelMap(stu, room.course_id).map(({ id, position, title, emoji, output, status, stars }) => ({ id, position, title, emoji, output, status, stars }));
  res.json({ nickname: stu.nickname, avatar: stu.avatar, room: room.name, course: one('SELECT title FROM courses WHERE id=?', room.course_id)?.title,
    approval: room.approval, levels, ...studentState(stu, room) });
});
app.get('/api/student/levels/:id', needStudent, (req, res) => {
  const l = openLevel(req.student, req.room.course_id, +req.params.id);
  if (!l) return fail(res, 403, 'locked');
  const messages = all("SELECT role,content FROM messages WHERE student_id=? AND level_id=? AND role IN ('user','assistant') ORDER BY id DESC LIMIT 60", req.student.id, l.id).reverse();
  const { id, position, title, emoji, intro, task, output, status, stars, feedback } = l;
  res.json({ level: { id, position, title, emoji, intro, task, output, status, stars, feedback }, messages });
});
app.get('/api/student/events', needStudent, (req, res) => {
  const sid = req.student.id;
  if (bump(studentConns, sid, 1) === 1) publish(`t:${req.room.id}`, { type: 'presence', student_id: sid, online: true });
  subscribe(req, res, [`s:${req.room.id}`, `u:${sid}`], () => {
    if (!bump(studentConns, sid, -1)) publish(`t:${req.room.id}`, { type: 'presence', student_id: sid, online: false });
  });
});
const lastTyping = new Map();
app.post('/api/student/typing', needStudent, (req, res) => {
  if (now() - (lastTyping.get(req.student.id) || 0) > 2500) {
    lastTyping.set(req.student.id, now());
    publish(`t:${req.room.id}`, { type: 'typing', student_id: req.student.id });
  }
  res.json({ ok: true });
});

app.post('/api/chat', needStudent, async (req, res) => {
  const stu = req.student, room = req.room;
  const text = String(req.body.text || '').trim().slice(0, 1500);
  if (!text) return fail(res, 400, 'empty');
  const st = studentState(stu, room);
  if (st.classPaused || st.paused) return fail(res, 403, 'paused');
  if (st.used >= st.limit) return fail(res, 429, 'limit');
  if (st.budget) return fail(res, 503, 'budget');
  const level = openLevel(stu, room.course_id, +req.body.level_id);
  if (!level) return fail(res, 403, 'locked');
  const course = one('SELECT title FROM courses WHERE id=?', room.course_id);
  const tch = `t:${room.id}`;
  const save = (role, content, flag) => run('INSERT INTO messages(class_id,student_id,level_id,role,content,flag,created) VALUES(?,?,?,?,?,?,?)',
    room.id, stu.id, level.id, role, content, flag || null, now());
  const emit = (role, content, flag) => publish(tch, { type: 'message', message: { student_id: stu.id, nickname: stu.nickname, avatar: stu.avatar,
    role, content, flag, created: now(), level_id: level.id, level: level.title } });

  const mod = await moderate(text);
  logUsage(room.id, stu.id, mod.usage);
  if (!mod.ok) {
    if (mod.category === 'error') return fail(res, 502, 'try_again');
    save('blocked', text, mod.category); emit('blocked', text, mod.category);
    return res.json({ blocked: true, category: mod.category });
  }
  save('user', text); emit('user', text);

  // conversation context: recent turns of this level, merged so roles alternate and start with 'user'
  const msgs = [];
  for (const m of all("SELECT role,content FROM messages WHERE student_id=? AND level_id=? AND role IN ('user','assistant') ORDER BY id DESC LIMIT 16", stu.id, level.id).reverse()) {
    const last = msgs[msgs.length - 1];
    if (last?.role === m.role) last.content += '\n\n' + m.content; else msgs.push({ ...m });
  }
  while (msgs[0]?.role === 'assistant') msgs.shift();

  // The teacher watches the reply arrive live: chunks are batched every 250ms to keep the feed light.
  let pending = '', flushT = null;
  const flush = () => { flushT = null; if (pending) publish(tch, { type: 'delta', student_id: stu.id, text: pending }); pending = ''; };
  res.set({ 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no' }).flushHeaders();
  try {
    const { text: reply, usage } = await chat(systemPrompt(level, course), msgs, (t) => {
      res.write(t); pending += t; flushT ||= setTimeout(flush, 250);
    });
    clearTimeout(flushT); flush();
    logUsage(room.id, stu.id, usage);
    if (reply) { save('assistant', reply); emit('assistant', reply); }
    publish(tch, { type: 'usage' });
  } catch (e) {
    clearTimeout(flushT);
    console.error('chat failed:', e.message);
    publish(tch, { type: 'delta_end', student_id: stu.id });
    res.write('\u0000error');
  }
  res.end();
});

// "Check my work": saves the level's output to the gallery, then the evaluator (or the teacher) decides.
const lastSubmit = new Map();
app.post('/api/levels/:id/submit', needStudent, async (req, res) => {
  const stu = req.student, room = req.room, st = studentState(stu, room);
  if (st.classPaused || st.paused) return fail(res, 403, 'paused');
  if (st.budget) return fail(res, 503, 'budget');
  const level = openLevel(stu, room.course_id, +req.params.id);
  if (!level) return fail(res, 403, 'locked');
  if (level.status === 'pending') return fail(res, 409, 'pending');
  if (now() - (lastSubmit.get(stu.id) || 0) < SUBMIT_COOLDOWN) return fail(res, 429, 'too_fast');

  const msgs = all("SELECT role,content FROM messages WHERE student_id=? AND level_id=? AND role IN ('user','assistant') ORDER BY id DESC LIMIT 30", stu.id, level.id).reverse();
  if (!msgs.some((m) => m.role === 'user')) return fail(res, 400, 'no_work');
  let output = null;
  if (level.output !== 'chat') {
    output = msgs.filter((m) => m.role === 'assistant').map((m) => extractOutput(m.content, level.output)).filter(Boolean).pop();
    if (!output) return fail(res, 400, 'no_output');
  }
  lastSubmit.set(stu.id, now());
  const transcript = msgs.map((m) => `${m.role === 'user' ? 'STUDENT' : 'AI'}: ${m.content.replace(/```(html|creation)[\s\S]*?```/g, '[$1 shown on screen]')}`).join('\n').slice(-12000);

  let outputId = null;
  if (output) {
    const title = level.output === 'game' ? (output.match(/<title>([^<]*)<\/title>/i)?.[1].trim() || level.title) : output.split('\n')[0].replace(/[#*]/g, '').trim();
    outputId = +run('INSERT INTO games(class_id,student_id,level_id,kind,title,html,created) VALUES(?,?,?,?,?,?,?)',
      room.id, stu.id, level.id, level.output, title.slice(0, 40) || level.title, output.slice(0, 200000), now()).lastInsertRowid;
  }
  const r = await evaluate(level, transcript, level.output === 'game' ? output?.slice(0, 20000) : output);
  logUsage(room.id, stu.id, r.usage);
  if (r.error) return fail(res, 502, 'try_again');

  let result = { pass: r.pass, stars: r.stars, feedback: r.feedback };
  if (level.status === 'done') { // replaying to improve stars: never lose what was earned
    if (r.pass && r.stars > level.stars) setProgress(stu.id, level.id, 'done', r.stars, r.feedback, outputId);
  } else if (room.approval === 'teacher') {
    setProgress(stu.id, level.id, 'pending', r.stars, r.feedback, outputId); // AI suggestion shown to the teacher
    result = { pending: true };
  } else if (r.pass) setProgress(stu.id, level.id, 'done', r.stars, r.feedback, outputId);
  publish(`t:${room.id}`, { type: 'submit', student_id: stu.id, nickname: stu.nickname, avatar: stu.avatar, level: level.title, pass: r.pass, stars: r.stars, pending: !!result.pending });
  publish(`t:${room.id}`, { type: 'room' });
  res.json(result);
});

// ---------- student: gallery ----------
const gameOwner = (req, res, next) => {
  req.game = one('SELECT * FROM games WHERE id=? AND student_id=?', +req.params.id, req.student.id);
  req.game ? next() : fail(res, 404, 'not_found');
};
app.post('/api/games', needStudent, (req, res) => {
  const html = String(req.body.html || ''), title = String(req.body.title || '').trim().slice(0, 40) || 'Game';
  const kind = req.body.kind === 'creation' ? 'creation' : 'game';
  if (!html || html.length > 200000) return fail(res, 400, 'bad_game');
  const level = req.body.level_id && openLevel(req.student, req.room.course_id, +req.body.level_id);
  const r = run('INSERT INTO games(class_id,student_id,level_id,kind,title,html,created) VALUES(?,?,?,?,?,?,?)',
    req.student.class_id, req.student.id, level?.id ?? null, kind, title, html, now());
  publish(`t:${req.student.class_id}`, { type: 'usage' }); // teacher gallery refresh
  res.json({ id: +r.lastInsertRowid });
});
app.get('/api/games', needStudent, (req, res) =>
  res.json(all(`SELECT g.id,g.title,g.html,g.kind,g.shared,g.student_id,s.nickname,s.avatar FROM games g JOIN students s ON s.id=g.student_id
    WHERE g.class_id=? AND (g.student_id=? OR g.shared=1) ORDER BY g.id DESC LIMIT 100`, req.student.class_id, req.student.id)));
app.patch('/api/games/:id', needStudent, gameOwner, (req, res) => {
  run('UPDATE games SET shared=? WHERE id=?', req.body.shared ? 1 : 0, req.game.id);
  res.json({ ok: true });
});
app.delete('/api/games/:id', needStudent, gameOwner, (req, res) => {
  run('DELETE FROM games WHERE id=?', req.game.id);
  res.json({ ok: true });
});

// ---------- admin ----------
app.get('/api/admin/teachers', needAdmin, (_req, res) => res.json(all("SELECT id,email,name FROM users WHERE role='teacher' ORDER BY id")));
app.post('/api/admin/teachers', needAdmin, (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase(), name = String(req.body.name || '').trim(), pw = String(req.body.password || '');
  if (!email.includes('@') || !name || pw.length < 6) return fail(res, 400, 'invalid');
  if (one('SELECT 1 FROM users WHERE email=?', email)) return fail(res, 409, 'exists');
  run("INSERT INTO users(email,name,pass,role,created) VALUES(?,?,?, 'teacher',?)", email, name, hashPassword(pw), now());
  res.json({ ok: true });
});
app.get('/api/admin/usage', needAdmin, (_req, res) => {
  const classes = all(`SELECT c.id,c.name,u.name teacher,
      COALESCE((SELECT SUM(cost) FROM usage x WHERE x.class_id=c.id),0) cost,
      COALESCE((SELECT SUM(tokens_in+tokens_out) FROM usage x WHERE x.class_id=c.id),0) tokens,
      (SELECT COUNT(*) FROM students s WHERE s.class_id=c.id) students
    FROM classes c JOIN users u ON u.id=c.teacher_id ORDER BY cost DESC`);
  const teachers = Object.values(classes.reduce((a, c) => {
    const t = (a[c.teacher] ||= { teacher: c.teacher, classes: 0, cost: 0, tokens: 0 });
    t.classes++; t.cost += c.cost; t.tokens += c.tokens; return a;
  }, {}));
  res.json({ total: spent(), cap: +getSetting('spend_cap', 0), retention_days: +getSetting('retention_days', 30), classes, teachers });
});
app.put('/api/admin/settings', needAdmin, (req, res) => {
  if (req.body.spend_cap !== undefined) setSetting('spend_cap', Math.max(0, +req.body.spend_cap || 0));
  if (req.body.retention_days !== undefined) setSetting('retention_days', Math.max(1, Math.floor(+req.body.retention_days) || 30));
  res.json({ ok: true });
});

// ---------- startup ----------
if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
  const email = process.env.ADMIN_EMAIL.toLowerCase();
  if (one('SELECT 1 FROM users WHERE email=?', email)) run('UPDATE users SET pass=?, role=? WHERE email=?', hashPassword(process.env.ADMIN_PASSWORD), 'admin', email);
  else run("INSERT INTO users(email,name,pass,role,created) VALUES(?, 'Admin', ?, 'admin', ?)", email, hashPassword(process.env.ADMIN_PASSWORD), now());
} else if (!one("SELECT 1 FROM users WHERE role='admin'")) console.warn('No admin yet: set ADMIN_EMAIL and ADMIN_PASSWORD.');
if (!process.env.ANTHROPIC_API_KEY) console.warn('ANTHROPIC_API_KEY is not set; chat will fail.');
migrateLessons();
for (const { id } of all('SELECT id FROM classes WHERE live=1')) armGrace(id); // after a restart, give teachers time to reconnect
purgeOld();
setInterval(purgeOld, 3600000).unref();
const port = +process.env.PORT || 3000;
app.listen(port, () => console.log(`PromptPlay on http://localhost:${port}`));
