// Copies the database to one file that is safe to keep or move, while the app keeps running: npm run backup
// SQLite writes the copy itself (VACUUM INTO), so it is complete and consistent even in the middle of a lesson.
// BACKUP_DIR (default "backups") is where copies go; BACKUP_KEEP (default 14) is how many of the newest are kept.
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

const source = process.env.DB_PATH || 'promptplay.db', dir = process.env.BACKUP_DIR || 'backups', keep = Math.max(1, +process.env.BACKUP_KEEP || 14);
if (!fs.existsSync(source)) { console.error(`No database at ${source}`); process.exit(1); }
fs.mkdirSync(dir, { recursive: true });
const stamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15); // 20260115-093000
const target = path.join(dir, `promptplay-${stamp}.db`);
const db = new DatabaseSync(source, { readOnly: true });
db.prepare('VACUUM INTO ?').run(target);
db.close();
// the copy must open and hold the tables before older copies are let go
const copy = new DatabaseSync(target, { readOnly: true });
const ok = copy.prepare('PRAGMA integrity_check').get().integrity_check === 'ok' && copy.prepare("SELECT COUNT(*) n FROM sqlite_master WHERE name='classes'").get().n === 1;
copy.close();
if (!ok) { console.error(`The copy at ${target} did not pass its check; older copies were kept.`); process.exit(1); }
const copies = fs.readdirSync(dir).filter((f) => /^promptplay-\d{8}-\d{6}\.db$/.test(f)).sort();
for (const f of copies.slice(0, -keep)) fs.unlinkSync(path.join(dir, f));
console.log(`Saved ${target} (${Math.round(fs.statSync(target).size / 1024)} KB), keeping the newest ${Math.min(keep, copies.length)} of ${copies.length}.`);
