// Course library: validation, filtering and flattening of bilingual library courses.
// A library course is a JSON file (see README "Course library") in which every piece of text is {"az": "...", "en": "..."}.
// A teacher's own course is single-language, so using a library course means flattening it to one language.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const LANGS = ['az', 'en'];
export const OUTPUTS = ['game', 'creation', 'chat'];
export const THEMES = ['starter', 'stories', 'science', 'ai-literacy', 'games', 'trial'];
export const PROGRAMMES = ['trial', 'term-1', 'term-2', 'term-3', 'holiday'];
export const AGE_GROUPS = { '8-11': [8, 11], '12-17': [12, 17] };
export const LENGTHS = ['one', 'short', 'long']; // one session, 2 to 4 sessions, 5 or more

// Same limits as the course editor (server/index.js cleanLevels), so a flattened library course is never truncated.
const LIMIT = { title: 100, promise: 200, description: 1000, goal: 200, intro: 1000, task: 2000, ai_guide: 2000, criteria: 1000 };
const SLUG = /^[a-z0-9][a-z0-9-]{2,39}$/;

const text = (v) => (typeof v === 'string' ? v.trim() : '');
// Pick a language, falling back so a course that only exists in one language still works in the other.
export const loc = (v, lang) => text(v?.[lang]) || text(v?.[lang === 'az' ? 'en' : 'az']);

// {az, en} object -> trimmed copy with only known languages, or null when it has no text or a part is too long.
function locField(v, max, required) {
  if (typeof v === 'string') v = { az: v, en: v }; // a plain string means the same text in both languages
  const out = {};
  for (const l of LANGS) {
    const s = text(v?.[l]);
    if (s.length > max) return null;
    if (s) out[l] = s;
  }
  return Object.keys(out).length || !required ? out : null;
}

// Returns {course} (normalised) or {error: '<field>'} naming the first problem.
export function validateCourse(raw) {
  const bad = (field) => ({ error: field });
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return bad('course');
  const id = text(raw.id);
  if (!SLUG.test(id)) return bad('id');
  const title = locField(raw.title, LIMIT.title, true); if (!title) return bad('title');
  const promise = locField(raw.promise, LIMIT.promise, true); if (!promise) return bad('promise');
  const description = locField(raw.description, LIMIT.description, false); if (!description) return bad('description');
  const age = { min: +raw.age?.min, max: +raw.age?.max };
  if (!(Number.isInteger(age.min) && Number.isInteger(age.max) && age.min >= 4 && age.max <= 19 && age.min <= age.max)) return bad('age');
  const themes = Array.isArray(raw.themes) ? [...new Set(raw.themes)] : [];
  if (!themes.length || !themes.every((x) => THEMES.includes(x))) return bad('themes');
  const programmes = Array.isArray(raw.programmes) ? [...new Set(raw.programmes)] : [];
  if (!programmes.every((x) => PROGRAMMES.includes(x))) return bad('programmes');
  const sessions = +raw.sessions;
  if (!(Number.isInteger(sessions) && sessions >= 1 && sessions <= 60)) return bad('sessions');
  const mins = Array.isArray(raw.minutes) ? raw.minutes.map(Number) : [+raw.minutes, +raw.minutes];
  if (mins.length !== 2 || !mins.every((m) => Number.isInteger(m) && m >= 10 && m <= 240) || mins[0] > mins[1]) return bad('minutes');
  const next = Array.isArray(raw.next) ? [...new Set(raw.next.map(text))] : [];
  if (next.length > 5 || !next.every((s) => SLUG.test(s) && s !== id)) return bad('next');
  const goals = {};
  for (const l of LANGS) {
    const list = Array.isArray(raw.goals?.[l]) ? raw.goals[l].map(text) : [];
    if (list.length > 8 || list.some((g) => g.length > LIMIT.goal || !g)) return bad('goals');
    if (list.length) goals[l] = list;
  }
  if (!Object.keys(goals).length) return bad('goals');
  if (!Array.isArray(raw.levels) || !raw.levels.length || raw.levels.length > 100) return bad('levels');
  const levels = [];
  for (const l of raw.levels) {
    const lv = {
      emoji: text(l?.emoji).slice(0, 8) || '⭐', output: OUTPUTS.includes(l?.output) ? l.output : null,
      title: locField(l?.title, LIMIT.title, true), task: locField(l?.task, LIMIT.task, true),
      intro: locField(l?.intro, LIMIT.intro, false), ai_guide: locField(l?.ai_guide, LIMIT.ai_guide, false), criteria: locField(l?.criteria, LIMIT.criteria, false),
    };
    if (Object.values(lv).some((x) => x === null)) return bad('levels');
    levels.push(lv);
  }
  return {
    course: {
      id, emoji: text(raw.emoji).slice(0, 8) || '📚', title, promise, description, age, themes, programmes, sessions, minutes: mins, next, goals, levels,
      az_reviewed: raw.az_reviewed === true,
    },
  };
}

// Languages in which the course is complete enough to use: title, promise, goals and every level's title and task.
export function languages(c) {
  return LANGS.filter((l) => c.title[l] && c.promise[l] && c.goals[l]?.length && c.levels.every((lv) => lv.title[l] && lv.task[l]));
}

// Catalogue order: the year plan (trial, term 1, 2, 3, holiday), then the younger age group first.
const rank = (c) => Math.min(99, ...c.programmes.map((p) => PROGRAMMES.indexOf(p)));
export const sortCourses = (list) => [...list].sort((a, b) => rank(a) - rank(b) || a.age.min - b.age.min || a.id.localeCompare(b.id));

// Built-in courses ship as files next to the code and cannot be edited from the app; they can only be hidden.
export function loadBuiltin(dir) {
  if (!fs.existsSync(dir)) return [];
  return sortCourses(fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort().map((f) => {
    const r = validateCourse(JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
    if (r.error) throw new Error(`library course ${f} is invalid: ${r.error}`);
    if (f !== r.course.id + '.json') throw new Error(`library course ${f} must be named ${r.course.id}.json`);
    return { ...r.course, builtin: true };
  }));
}

// One-language course in the format teachers' own courses use ({title, description, levels}).
export function flatten(c, lang) {
  return {
    title: loc(c.title, lang), description: loc(c.description, lang) || loc(c.promise, lang),
    levels: c.levels.map((l) => ({ title: loc(l.title, lang), emoji: l.emoji, output: l.output, intro: loc(l.intro, lang), task: loc(l.task, lang),
      ai_guide: loc(l.ai_guide, lang), criteria: loc(l.criteria, lang) })),
  };
}
// Identifies the exact content a teacher's copy was made from, so an untouched copy is only reused while the library course is unchanged.
export const contentHash = (flat) => crypto.createHash('sha1').update(JSON.stringify(flat)).digest('hex').slice(0, 16);

export function summary(c, hidden = false) {
  const mix = { game: 0, creation: 0, chat: 0 };
  for (const l of c.levels) mix[l.output]++;
  return { id: c.id, emoji: c.emoji, title: c.title, promise: c.promise, age: c.age, themes: c.themes, programmes: c.programmes, sessions: c.sessions, minutes: c.minutes,
    levels: c.levels.length, mix, languages: languages(c), builtin: !!c.builtin, hidden, az_reviewed: c.az_reviewed, next: c.next };
}

export const lengthOf = (c) => (c.sessions <= 1 ? 'one' : c.sessions <= 4 ? 'short' : 'long');
function ageRange(v) {
  if (AGE_GROUPS[v]) return AGE_GROUPS[v];
  const m = String(v).match(/^(\d{1,2})(?:-(\d{1,2}))?$/);
  return m ? [+m[1], +(m[2] ?? m[1])] : null;
}
// Filters used by the library page: age group (a course matches when its range overlaps), theme, length, programme and a search word.
export function matches(c, f = {}) {
  if (f.age) { const r = ageRange(f.age); if (!r || c.age.max < r[0] || c.age.min > r[1]) return false; }
  if (f.theme && !c.themes.includes(f.theme)) return false;
  if (f.length && lengthOf(c) !== f.length) return false;
  if (f.programme && !c.programmes.includes(f.programme)) return false;
  const q = text(f.q).toLowerCase();
  if (q && ![...Object.values(c.title), ...Object.values(c.promise)].some((s) => s.toLowerCase().includes(q))) return false;
  return true;
}
