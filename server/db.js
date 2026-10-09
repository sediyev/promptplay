import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';

export const db = new DatabaseSync(process.env.DB_PATH || 'promptplay.db');
db.exec(`
PRAGMA journal_mode=WAL;
CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, email TEXT UNIQUE, name TEXT, pass TEXT, role TEXT, created INTEGER);
CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, kind TEXT, ref INTEGER, created INTEGER);
CREATE TABLE IF NOT EXISTS classes (id INTEGER PRIMARY KEY, teacher_id INTEGER, name TEXT, code TEXT UNIQUE, consent_at INTEGER,
  daily_limit INTEGER DEFAULT 30, paused INTEGER DEFAULT 0, active_lesson INTEGER, created INTEGER);
CREATE TABLE IF NOT EXISTS lessons (id INTEGER PRIMARY KEY, class_id INTEGER, title TEXT, goal TEXT, created INTEGER);
CREATE TABLE IF NOT EXISTS students (id INTEGER PRIMARY KEY, class_id INTEGER, nickname TEXT, paused INTEGER DEFAULT 0, created INTEGER, last_seen INTEGER,
  UNIQUE(class_id, nickname));
CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY, class_id INTEGER, student_id INTEGER, lesson_id INTEGER,
  role TEXT, content TEXT, flag TEXT, created INTEGER);
CREATE INDEX IF NOT EXISTS msg_student ON messages(student_id, created);
CREATE INDEX IF NOT EXISTS msg_class ON messages(class_id, created);
CREATE TABLE IF NOT EXISTS games (id INTEGER PRIMARY KEY, class_id INTEGER, student_id INTEGER, title TEXT, html TEXT, shared INTEGER DEFAULT 0, created INTEGER);
CREATE TABLE IF NOT EXISTS usage (id INTEGER PRIMARY KEY, class_id INTEGER, student_id INTEGER, tokens_in INTEGER, tokens_out INTEGER, cost REAL, created INTEGER);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);
`);

export const now = () => Date.now();
export const getSetting = (k, d) => db.prepare('SELECT value FROM settings WHERE key=?').get(k)?.value ?? d;
export const setSetting = (k, v) => db.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(k, String(v));

export function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString('hex');
  return `${salt}:${crypto.scryptSync(pw, salt, 32).toString('hex')}`;
}
export function checkPassword(pw, stored) {
  const [salt, hash] = String(stored).split(':');
  if (!salt || !hash) return false;
  const h = crypto.scryptSync(pw, salt, 32);
  return crypto.timingSafeEqual(h, Buffer.from(hash, 'hex'));
}
export const newToken = () => crypto.randomBytes(24).toString('hex');

// Baku is UTC+4 with no DST; "today" for daily limits and history filters is a Baku day.
const DAY = 86400000, BAKU = 4 * 3600000;
export const dayStart = (t = now()) => Math.floor((t + BAKU) / DAY) * DAY - BAKU;
export const dayRange = (iso) => { const s = Date.parse(iso + 'T00:00:00Z') - BAKU; return [s, s + DAY]; };

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function newClassCode() {
  for (;;) {
    const code = Array.from({ length: 5 }, () => CODE_CHARS[crypto.randomInt(CODE_CHARS.length)]).join('');
    if (!db.prepare('SELECT 1 FROM classes WHERE code=?').get(code)) return code;
  }
}

export function purgeOld() {
  const days = +getSetting('retention_days', 30);
  const cutoff = now() - days * DAY;
  db.prepare('DELETE FROM messages WHERE created<?').run(cutoff);
  db.prepare('DELETE FROM games WHERE created<?').run(cutoff);
  db.prepare('DELETE FROM students WHERE last_seen<?').run(cutoff);
  db.prepare("DELETE FROM sessions WHERE kind='student' AND ref NOT IN (SELECT id FROM students)").run();
}
