import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, now, getSetting, setSetting, hashPassword, checkPassword, newToken, dayStart, dayRange, newClassCode, purgeOld } from './db.js';
import { moderate, chat, systemPrompt, costOf } from './ai.js';

const app = express();
app.use(express.json({ limit: '300kb' }));
app.use(express.static(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public')));

// ---------- helpers ----------
const one = (sql, ...p) => db.prepare(sql).get(...p);
const all = (sql, ...p) => db.prepare(sql).all(...p);
const run = (sql, ...p) => db.prepare(sql).run(...p);
const fail = (res, status, error) => res.status(status).json({ error });

const subs = new Map(); // channel -> Set<res>   ("t:<class>" teacher, "s:<class>" students)
function subscribe(req, res, channel) {
  res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' }).flushHeaders();
  res.write(': ok\n\n');
  if (!subs.has(channel)) subs.set(channel, new Set());
  subs.get(channel).add(res);
  const ping = setInterval(() => res.write(': ping\n\n'), 25000);
  req.on('close', () => { clearInterval(ping); subs.get(channel)?.delete(res); });
}
const publish = (channel, ev) => subs.get(channel)?.forEach((r) => r.write(`data: ${JSON.stringify(ev)}\n\n`));

function cookie(req, name) {
  const m = (req.headers.cookie || '').match(new RegExp(`(?:^|; )${name}=([^;]+)`));
  return m && m[1];
}
function startSession(res, kind, ref) {
  const token = newToken();
  run('INSERT INTO sessions(token,kind,ref,created) VALUES(?,?,?,?)', token, kind, ref, now());
  res.append('Set-Cookie', `pp=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${30 * 86400}`);
}
function auth(req, _res, next) {
  const s = one('SELECT * FROM sessions WHERE token=?', cookie(req, 'pp') || '');
  if (s?.kind === 'user') req.user = one('SELECT id,email,name,role FROM users WHERE id=?', s.ref);
  if (s?.kind === 'student') req.student = one('SELECT * FROM students WHERE id=?', s.ref);
  next();
}
app.use(auth);
const needRole = (role) => (req, res, next) => (req.user?.role === role ? next() : fail(res, 401, 'auth'));
const needTeacher = needRole('teacher'), needAdmin = needRole('admin');
const needStudent = (req, res, next) => (req.student ? next() : fail(res, 401, 'auth'));

function ownClass(req, res, next) {
  req.cls = one('SELECT * FROM classes WHERE id=? AND teacher_id=?', +req.params.id, req.user.id);
  req.cls ? next() : fail(res, 404, 'not_found');
}
const spent = () => one('SELECT COALESCE(SUM(cost),0) c FROM usage').c;
const overBudget = () => { const cap = +getSetting('spend_cap', 0); return cap > 0 && spent() >= cap; };
const logUsage = (cls, stu, u) => u && run('INSERT INTO usage(class_id,student_id,tokens_in,tokens_out,cost,created) VALUES(?,?,?,?,?,?)',
  cls, stu, u.input_tokens, u.output_tokens, costOf(u), now());
const usedToday = (sid) => one("SELECT COUNT(*) n FROM messages WHERE student_id=? AND role='user' AND created>=?", sid, dayStart()).n;

// ---------- auth ----------
app.post('/api/login', (req, res) => {
  const u = one('SELECT * FROM users WHERE email=?', String(req.body.email || '').trim().toLowerCase());
  if (!u || !checkPassword(String(req.body.password || ''), u.pass)) return fail(res, 401, 'bad_login');
  startSession(res, 'user', u.id);
  res.json({ role: u.role });
});
app.post('/api/logout', (req, res) => {
  run('DELETE FROM sessions WHERE token=?', cookie(req, 'pp') || '');
  res.json({ ok: true });
});
app.get('/api/me', (req, res) => (req.user ? res.json(req.user) : fail(res, 401, 'auth')));

// ---------- teacher: classes ----------
app.post('/api/classes', needTeacher, (req, res) => {
  const { name, consent, daily_limit } = req.body;
  if (!String(name || '').trim()) return fail(res, 400, 'name');
  if (consent !== true) return fail(res, 400, 'consent');
  const r = run('INSERT INTO classes(teacher_id,name,code,consent_at,daily_limit,created) VALUES(?,?,?,?,?,?)',
    req.user.id, String(name).trim().slice(0, 60), newClassCode(), now(), Math.max(1, +daily_limit || 30), now());
  res.json({ id: +r.lastInsertRowid });
});
app.get('/api/classes', needTeacher, (req, res) =>
  res.json(all('SELECT id,name,code,paused FROM classes WHERE teacher_id=? ORDER BY id DESC', req.user.id)));

app.get('/api/classes/:id', needTeacher, ownClass, (req, res) => {
  const students = all(`SELECT s.id,s.nickname,s.paused,s.last_seen,
      (SELECT COUNT(*) FROM messages m WHERE m.student_id=s.id AND m.role='user' AND m.created>=?) used,
      (SELECT COUNT(*) FROM games g WHERE g.student_id=s.id) games
    FROM students s WHERE s.class_id=? ORDER BY s.nickname`, dayStart(), req.cls.id);
  res.json({ ...req.cls, students, lessons: all('SELECT * FROM lessons WHERE class_id=? ORDER BY id DESC', req.cls.id) });
});
app.patch('/api/classes/:id', needTeacher, ownClass, (req, res) => {
  const { paused, daily_limit, active_lesson } = req.body;
  if (paused !== undefined) run('UPDATE classes SET paused=? WHERE id=?', paused ? 1 : 0, req.cls.id);
  if (daily_limit !== undefined) run('UPDATE classes SET daily_limit=? WHERE id=?', Math.max(1, +daily_limit || 30), req.cls.id);
  if (active_lesson !== undefined && one('SELECT 1 FROM lessons WHERE id=? AND class_id=?', +active_lesson, req.cls.id))
    run('UPDATE classes SET active_lesson=? WHERE id=?', +active_lesson, req.cls.id);
  publish(`s:${req.cls.id}`, { type: 'state' });
  res.json({ ok: true });
});
app.post('/api/classes/:id/lessons', needTeacher, ownClass, (req, res) => {
  const title = String(req.body.title || '').trim().slice(0, 100), goal = String(req.body.goal || '').trim().slice(0, 1000);
  if (!title || !goal) return fail(res, 400, 'lesson');
  const r = run('INSERT INTO lessons(class_id,title,goal,created) VALUES(?,?,?,?)', req.cls.id, title, goal, now());
  run('UPDATE classes SET active_lesson=? WHERE id=?', +r.lastInsertRowid, req.cls.id); // newest lesson becomes active
  publish(`s:${req.cls.id}`, { type: 'state' });
  res.json({ id: +r.lastInsertRowid });
});

// ---------- teacher: students, messages, games ----------
function ownStudent(req, res, next) {
  req.stu = one('SELECT s.* FROM students s JOIN classes c ON c.id=s.class_id WHERE s.id=? AND c.teacher_id=?', +req.params.id, req.user.id);
  req.stu ? next() : fail(res, 404, 'not_found');
}
app.patch('/api/students/:id', needTeacher, ownStudent, (req, res) => {
  run('UPDATE students SET paused=? WHERE id=?', req.body.paused ? 1 : 0, req.stu.id);
  publish(`s:${req.stu.class_id}`, { type: 'state' });
  res.json({ ok: true });
});
app.delete('/api/students/:id', needTeacher, ownStudent, (req, res) => {
  run('DELETE FROM sessions WHERE kind=? AND ref=?', 'student', req.stu.id);
  run('DELETE FROM students WHERE id=?', req.stu.id);
  publish(`s:${req.stu.class_id}`, { type: 'state' });
  res.json({ ok: true });
});
app.get('/api/classes/:id/messages', needTeacher, ownClass, (req, res) => {
  const where = ['m.class_id=?'], p = [req.cls.id];
  if (req.query.student) { where.push('m.student_id=?'); p.push(+req.query.student); }
  if (req.query.date) { const [a, b] = dayRange(req.query.date); where.push('m.created>=? AND m.created<?'); p.push(a, b); }
  res.json(all(`SELECT m.id,m.student_id,s.nickname,m.role,m.content,m.flag,m.created,l.title lesson FROM messages m
    JOIN students s ON s.id=m.student_id LEFT JOIN lessons l ON l.id=m.lesson_id
    WHERE ${where.join(' AND ')} ORDER BY m.id DESC LIMIT 400`, ...p).reverse());
});
app.get('/api/classes/:id/events', needTeacher, ownClass, (req, res) => subscribe(req, res, `t:${req.cls.id}`));
app.get('/api/classes/:id/games', needTeacher, ownClass, (req, res) =>
  res.json(all(`SELECT g.id,g.title,g.html,g.shared,g.created,s.nickname FROM games g JOIN students s ON s.id=g.student_id
    WHERE g.class_id=? ORDER BY g.id DESC`, req.cls.id)));
app.post('/api/games/:id/showcase', needTeacher, (req, res) => {
  const g = one('SELECT g.title,g.html,s.nickname,g.class_id FROM games g JOIN students s ON s.id=g.student_id JOIN classes c ON c.id=g.class_id WHERE g.id=? AND c.teacher_id=?', +req.params.id, req.user.id);
  if (!g) return fail(res, 404, 'not_found');
  publish(`s:${g.class_id}`, { type: 'showcase', game: { title: g.title, html: g.html, nickname: g.nickname } });
  res.json({ ok: true });
});

// ---------- student ----------
app.post('/api/join', (req, res) => {
  const cls = one('SELECT * FROM classes WHERE code=?', String(req.body.code || '').trim().toUpperCase());
  const nick = String(req.body.nickname || '').trim().replace(/\s+/g, ' ').slice(0, 20);
  if (!cls) return fail(res, 404, 'bad_code');
  if (nick.length < 2) return fail(res, 400, 'bad_nick');
  let stu = one('SELECT * FROM students WHERE class_id=? AND nickname=?', cls.id, nick);
  if (stu) { // same nickname only allowed from the browser that created it
    if (req.student?.id !== stu.id) return fail(res, 409, 'nick_taken');
  } else {
    const r = run('INSERT INTO students(class_id,nickname,created,last_seen) VALUES(?,?,?,?)', cls.id, nick, now(), now());
    stu = { id: +r.lastInsertRowid, class_id: cls.id, nickname: nick };
    startSession(res, 'student', stu.id);
    publish(`t:${cls.id}`, { type: 'joined', student: { id: stu.id, nickname: nick } });
  }
  res.json({ ok: true });
});
function studentState(stu) {
  const cls = one('SELECT * FROM classes WHERE id=?', stu.class_id);
  const lesson = cls.active_lesson && one('SELECT id,title,goal FROM lessons WHERE id=?', cls.active_lesson);
  const used = usedToday(stu.id);
  return { cls, lesson, used, limit: cls.daily_limit, classPaused: !!cls.paused, paused: !!stu.paused, budget: overBudget() };
}
app.get('/api/student/me', needStudent, (req, res) => {
  const fresh = one('SELECT * FROM students WHERE id=?', req.student.id);
  run('UPDATE students SET last_seen=? WHERE id=?', now(), fresh.id);
  const st = studentState(fresh);
  const messages = st.lesson ? all("SELECT role,content FROM messages WHERE student_id=? AND lesson_id=? AND role IN ('user','assistant') ORDER BY id DESC LIMIT 60", fresh.id, st.lesson.id).reverse() : [];
  res.json({ nickname: fresh.nickname, className: st.cls.name, lesson: st.lesson, used: st.used, limit: st.limit,
    paused: st.paused, classPaused: st.classPaused, budget: st.budget, messages });
});
app.get('/api/student/events', needStudent, (req, res) => subscribe(req, res, `s:${req.student.class_id}`));

app.post('/api/chat', needStudent, async (req, res) => {
  const stu = one('SELECT * FROM students WHERE id=?', req.student.id);
  const text = String(req.body.text || '').trim().slice(0, 1500);
  if (!text) return fail(res, 400, 'empty');
  const st = studentState(stu);
  if (st.classPaused || st.paused) return fail(res, 403, 'paused');
  if (st.used >= st.limit) return fail(res, 429, 'limit');
  if (st.budget) return fail(res, 503, 'budget');
  if (!st.lesson) return fail(res, 409, 'no_lesson');
  const tch = `t:${stu.class_id}`;
  const save = (role, content, flag) => run('INSERT INTO messages(class_id,student_id,lesson_id,role,content,flag,created) VALUES(?,?,?,?,?,?,?)',
    stu.class_id, stu.id, st.lesson.id, role, content, flag || null, now());
  const emit = (role, content, flag) => publish(tch, { type: 'message', message: { student_id: stu.id, nickname: stu.nickname, role, content, flag, created: now() } });

  const mod = await moderate(text);
  logUsage(stu.class_id, stu.id, mod.usage);
  if (!mod.ok) {
    if (mod.category === 'error') return fail(res, 502, 'try_again');
    save('blocked', text, mod.category); emit('blocked', text, mod.category);
    return res.json({ blocked: true, category: mod.category });
  }
  save('user', text); emit('user', text);

  // conversation context: recent turns, merged so roles alternate and start with 'user'
  const msgs = [];
  for (const m of all("SELECT role,content FROM messages WHERE student_id=? AND lesson_id=? AND role IN ('user','assistant') ORDER BY id DESC LIMIT 16", stu.id, st.lesson.id).reverse()) {
    const last = msgs[msgs.length - 1];
    if (last?.role === m.role) last.content += '\n\n' + m.content; else msgs.push({ ...m });
  }
  while (msgs[0]?.role === 'assistant') msgs.shift();

  res.set({ 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no' }).flushHeaders();
  try {
    const { text: reply, usage } = await chat(systemPrompt(st.lesson), msgs, (t) => res.write(t));
    logUsage(stu.class_id, stu.id, usage);
    if (reply) { save('assistant', reply); emit('assistant', reply); }
    publish(tch, { type: 'usage' });
  } catch (e) {
    console.error('chat failed:', e.message);
    res.write('\u0000error');
  }
  res.end();
});

// ---------- games ----------
const gameOwner = (req, res, next) => {
  req.game = one('SELECT * FROM games WHERE id=? AND student_id=?', +req.params.id, req.student.id);
  req.game ? next() : fail(res, 404, 'not_found');
};
app.post('/api/games', needStudent, (req, res) => {
  const html = String(req.body.html || ''), title = String(req.body.title || '').trim().slice(0, 40) || 'Game';
  if (!html || html.length > 200000) return fail(res, 400, 'bad_game');
  const r = run('INSERT INTO games(class_id,student_id,title,html,created) VALUES(?,?,?,?,?)', req.student.class_id, req.student.id, title, html, now());
  publish(`t:${req.student.class_id}`, { type: 'usage' }); // teacher gallery refresh
  res.json({ id: +r.lastInsertRowid });
});
app.get('/api/games', needStudent, (req, res) =>
  res.json(all(`SELECT g.id,g.title,g.html,g.shared,g.student_id,s.nickname FROM games g JOIN students s ON s.id=g.student_id
    WHERE g.class_id=? AND (g.student_id=? OR g.shared=1) ORDER BY g.id DESC`, req.student.class_id, req.student.id)));
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
purgeOld();
setInterval(purgeOld, 3600000).unref();
const port = +process.env.PORT || 3000;
app.listen(port, () => console.log(`PromptPlay on http://localhost:${port}`));
