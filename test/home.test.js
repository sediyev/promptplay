// Static checks for the public home page: no server, no browser.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { HOME } from '../public/home-i18n.js';
import { sync } from '../scripts/sync-home.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..'), PUB = path.join(ROOT, 'public');
const read = (f) => fs.readFileSync(path.join(PUB, f), 'utf8');
const html = read('index.html'), css = read('home.css'), join = read('join.html');
const JS = fs.readdirSync(PUB).filter((f) => /^home.*\.js$/.test(f));
const keysUsedInHtml = () => [...html.matchAll(/data-(?:t|aria|meta)="(\w+)"/g)].map((m) => m[1]);

test('both languages have exactly the same strings, none empty', () => {
  const en = Object.keys(HOME.en), az = Object.keys(HOME.az);
  assert.deepEqual(en.filter((k) => !(k in HOME.az)), [], 'missing in az');
  assert.deepEqual(az.filter((k) => !(k in HOME.en)), [], 'missing in en');
  for (const lang of ['en', 'az']) for (const [k, v] of Object.entries(HOME[lang])) {
    assert.ok(typeof v === 'string' && v.trim() === v && v.length > 0, `${lang}.${k} is empty or has stray spaces`);
    assert.ok(!/[—–]/.test(v), `${lang}.${k} contains a dash used as punctuation`);
  }
  // [PLACEHOLDERS] and {} templates must match across languages
  for (const k of en) {
    assert.deepEqual(HOME.en[k].match(/\[[A-Z ]+\]|\{\}/g) || [], HOME.az[k].match(/\[[A-Z ]+\]|\{\}/g) || [], `${k}: placeholders differ between languages`);
  }
  // an identical string in both languages is only fine for names and placeholders (it would mean an untranslated copy)
  const same = en.filter((k) => HOME.en[k] === HOME.az[k]).sort();
  assert.deepEqual(same, ['a8', 'a9', 'pl2', 'pl8', 'pu_s3'], 'untranslated strings');
});

test('every string the HTML asks for exists in both languages', () => {
  const used = [...new Set(keysUsedInHtml())];
  assert.ok(used.length > 80, 'the page is expected to use well over 80 strings, found ' + used.length);
  for (const k of used) for (const lang of ['en', 'az']) assert.ok(k in HOME[lang], `index.html uses "${k}", missing in ${lang}`);
  // literal t('key') calls in the scripts, plus the families built from numbers
  for (const f of JS) for (const m of read(f).matchAll(/\bt\('(\w+)'\)/g)) for (const lang of ['en', 'az']) assert.ok(m[1] in HOME[lang], `${f} uses t('${m[1]}'), missing in ${lang}`);
  // keys the story scenes type out by name (home-story.js)
  const story = read('home-story.js');
  for (const m of story.matchAll(/'((?:mq|pu_p|pw_[pr])\d)'/g)) for (const lang of ['en', 'az']) assert.ok(m[1] in HOME[lang], `home-story.js uses '${m[1]}', missing in ${lang}`);
  // every chapter of the story has a heading and a text, and the stage has one scene per chapter
  const chapters = [...html.matchAll(/<li class="step[^"]*">/g)].length, scenes = [...html.matchAll(/<div class="scene sc-/g)].length;
  assert.equal(chapters, 5); assert.equal(scenes, chapters, 'one stage scene per chapter');
  for (let i = 1; i <= chapters; i++) assert.match(html, new RegExp(`data-t="c${i}_h"[^]*data-t="c${i}_p"`), `chapter ${i}`);
});

test('the static Azerbaijani text in index.html is in sync with the dictionary (run "npm run home:sync")', () => {
  assert.equal(sync(html), html);
  assert.ok(!html.includes('[['), 'a key is missing from the az dictionary');
});

test('the ten starter levels are exactly the ones in server/starter-course.json, in order', () => {
  const starter = JSON.parse(fs.readFileSync(path.join(ROOT, 'server', 'starter-course.json'), 'utf8')).levels;
  assert.equal(starter.length, 10);
  const nodes = [...html.matchAll(/<li class="lvl[^"]*"[^>]*><span class="orb"[^>]*>([^<]+)<\/span>.*?data-t="lv(\d+)t"/g)];
  assert.deepEqual([...html.matchAll(/<ol class="path">([^]*?)<\/ol>/g)][0][1].match(/<li[^>]*>([^<]+)<\/li>/g).map((l) => l.replace(/<[^>]+>/g, '')), starter.map((l) => l.emoji), 'the stage path shows the same ten levels');
  assert.equal(nodes.length, 10);
  nodes.forEach(([, emoji, n], i) => {
    assert.equal(+n, i + 1);
    assert.equal(emoji, starter[i].emoji, `level ${i + 1} emoji`);
    assert.equal(HOME.en[`lv${n}t`], starter[i].title, `level ${i + 1} title`);
  });
});

test('business details are clearly marked placeholders, and listed in one place', () => {
  for (const ph of ['[ORG NAME]', '[CONTACT]', '[CTA LINK]', '[PRIVACY POLICY LINK]', '[OG IMAGE]']) assert.ok(html.includes(ph), ph + ' missing from index.html');
  for (const ph of ['[PRICE]', '[LOCATIONS AND SCHEDULE]', '[PRIVACY POLICY LINK]']) assert.ok(HOME.en.a7.includes(ph) || Object.values(HOME.en).includes(ph), ph + ' missing from the dictionary');
  assert.match(html, /<section class="sec" id="proof" hidden><\/section>/, 'hidden social proof placeholder');
  assert.match(html, /TODO social proof/);
  assert.match(HOME.en.cta, /free trial/i); // [PRIMARY CTA] shows an example label until the real one is decided
});

test('structure: one h1, landmarks, meta tags, language', () => {
  assert.equal((html.match(/<h1[\s>]/g) || []).length, 1, 'exactly one h1');
  assert.match(html, /<html lang="az">/);
  assert.match(html, /<header class="bar"/); assert.match(html, /<main id="main">/); assert.match(html, /<footer class="foot">/);
  for (const m of ['name="description"', 'property="og:title"', 'property="og:description"', 'property="og:image" content="\\[OG IMAGE\\]"', 'name="twitter:card"', 'name="twitter:title"', 'name="twitter:description"', 'name="twitter:image" content="\\[OG IMAGE\\]"']) assert.match(html, new RegExp('<meta [^>]*' + m), m);
  assert.match(html, /<meta name="viewport" content="width=device-width,initial-scale=1">/);
  // headings never skip a level
  const levels = [...html.matchAll(/<h([1-6])[\s>]/g)].map((m) => +m[1]);
  levels.forEach((l, i) => assert.ok(i === 0 || l <= levels[i - 1] + 1, `heading level jumps to h${l}`));
  // decorative emoji are hidden from screen readers: every emoji in markup sits inside an aria-hidden element or an element with a text alternative
  assert.ok(!/<(?:span|div|b|i)(?![^>]*aria-hidden)[^>]*class="(?:ico|orb|pl-b|pc-pic)"/.test(html), 'decorative emoji must be aria-hidden');
  for (const c of ['hero-bg', 'stage', 'wave', 'final-e']) assert.match(html, new RegExp(`class="${c}"[^>]*aria-hidden="true"`), c + ' is decorative');
  assert.equal([...html.matchAll(/<li><span aria-hidden="true">[^<]+<\/span> <span data-t="sk\dt"/g)].length, 6, 'emoji in the six skills are hidden');
  // the welcome screen: one message, one primary button
  const hero = html.match(/<section class="hero"[^]*?<\/section>/)[0];
  assert.equal((hero.match(/data-cta/g) || []).length, 1, 'one button on the welcome screen');
  assert.match(hero, /data-t="hr_hi"/);
});

test('zero third-party requests: only same-origin files, no network calls in the scripts', () => {
  const allowed = new Set(['http://www.w3.org/2000/svg']); // SVG namespace in the inline favicon, not a request
  for (const [name, text] of [['index.html', html], ['home.css', css], ['join.html', join], ...JS.map((f) => [f, read(f)])]) {
    for (const m of text.matchAll(/https?:\/\/[^\s"'`)<>]+/g)) assert.ok(allowed.has(m[0]) || /^https?:\/\/(www\.w3\.org)\//.test(m[0]), `${name} mentions ${m[0]}`);
  }
  assert.ok(!/@import|@font-face|url\(/.test(css), 'no imports, web fonts or images in home.css');
  assert.ok(!/<img|<link[^>]*rel="(?:preconnect|dns-prefetch)"|<script[^>]*src="(?!\/)/.test(html), 'no images, no external scripts');
  for (const f of JS) assert.ok(!/\bfetch\(|XMLHttpRequest|WebSocket|EventSource|sendBeacon|navigator\.serviceWorker/.test(read(f)), `${f} makes a network call`);
});

test('page weight stays within budget', () => {
  const size = (f) => fs.statSync(path.join(PUB, f)).size, gz = (f) => zlib.gzipSync(fs.readFileSync(path.join(PUB, f)), { level: 9 }).length;
  const files = ['index.html', 'style.css', 'home.css', 'common.js', 'home-i18n.js', 'home.js', 'home-fx.js', 'home-story.js', 'home-mini.js'];
  assert.deepEqual(JS.sort(), files.filter((f) => f.startsWith('home') && f.endsWith('.js')).sort(), 'every home page script is counted');
  const raw = files.reduce((a, f) => a + size(f), 0), zipped = files.reduce((a, f) => a + gz(f), 0);
  assert.ok(raw < 130 * 1000, `the home page is ${raw} bytes, the budget is about 130 KB`);
  assert.ok(zipped < 44 * 1000, `gzipped total is ${zipped} bytes`);
});

test('every redirect that used to go to "/" now goes to the join and login page', () => {
  for (const f of ['teacher.html', 'admin.html', 'course.html']) {
    const text = read(f);
    assert.ok(!/location = '\/'/.test(text), f + ' still redirects to /');
    assert.ok(text.includes("location = '/join#teacher'"), f + ' should send people to /join#teacher');
  }
  assert.match(read('teacher.html'), /await api\('\/api\/logout', 'POST'\); location = '\/join#teacher'/);
  const student = read('student.html');
  assert.ok(!/location = '\/'|: '\/'\)/.test(student), 'student.html still redirects to /');
  assert.match(student, /'\/join\/' \+ encodeURIComponent\(inv\) : '\/join'\) \+ '\?closed=1'/);
  assert.match(student, /location = '\/join'/);
  assert.match(join, /<a href="\/join" data-t="haveCode">/);
  assert.match(join, /location\.hash === '#teacher'/);
  assert.match(join, /localStorage\.getItem\('avatar'\)/);
});

// ---------- WCAG AA contrast of the colour tokens, light and dark ----------
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lum = (h) => { const [r, g, b] = hex(h).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const darken = (h, p) => '#' + hex(h).map((v) => Math.round(v * p).toString(16).padStart(2, '0')).join('');
function tokens() {
  const full = (h) => (h.length === 4 ? '#' + [...h.slice(1)].map((c) => c + c).join('') : h); // #fff -> #ffffff
  const grab = (text) => Object.fromEntries([...text.matchAll(/(--[\w-]+):\s*(#[0-9a-fA-F]{3,6})\b/g)].map((m) => [m[1], full(m[2])]));
  const style = fs.readFileSync(path.join(PUB, 'style.css'), 'utf8');
  const [lightStyle, darkStyle] = [style.match(/:root \{([^}]*)\}/)[1], style.match(/prefers-color-scheme: dark\) \{ :root \{([^}]*)\}/)[1]];
  const [lightHome, darkHome] = [css.match(/:root \{([^}]*)\}/)[1], css.match(/prefers-color-scheme:dark\) \{ :root \{([^}]*)\}/)[1]];
  const light = { ...grab(lightStyle), ...grab(lightHome) };
  const dark = { ...light, ...grab(darkStyle), ...grab(darkHome) };
  dark['--muted-h'] = dark['--muted']; // home.css: dark mode reuses --muted
  return { light, dark };
}
test('text and graphics meet WCAG AA in light and dark mode', () => {
  const { light, dark } = tokens();
  for (const [theme, t] of Object.entries({ light, dark })) {
    const g1 = darken(t['--brand'], 0.88), g2 = darken(t['--brand2'], 0.74); // button gradient behind white text
    const text = [['--ink', '--bg'], ['--ink', '--card'], ['--ink', '--brand-soft'], ['--muted-h', '--bg'], ['--muted-h', '--card'], ['--muted-h', '--brand-soft'],
      ['--link', '--bg'], ['--link', '--card'], ['--link', '--brand-soft'], ['--tg1', '--bg'], ['--tg2', '--bg'], ['--tg1', '--card'], ['--tg2', '--card'],
      ['--warn-ink', '--warn'], ['--ok-ink', '--bg'], ['--ok-ink', '--card']];
    for (const [fg, bg] of text) assert.ok(ratio(t[fg], t[bg]) >= 4.5, `${theme}: ${fg} on ${bg} is ${ratio(t[fg], t[bg]).toFixed(2)}, needs 4.5`);
    for (const g of [g1, g2]) assert.ok(ratio('#ffffff', g) >= 4.5, `${theme}: white on ${g} is ${ratio('#ffffff', g).toFixed(2)}`);
    assert.ok(ratio('#3b2fa8', '#ffffff') >= 4.5, 'white button label');
    // graphics (stars, empty stars, the check mark) need 3:1
    const star = theme === 'light' ? t['--star-line'] : t['--star'];
    assert.ok(ratio(star, t['--card']) >= 3, `${theme}: star outline ${ratio(star, t['--card']).toFixed(2)}`);
    assert.ok(ratio(t['--muted-h'], t['--card']) >= 3, `${theme}: empty star outline`);
    assert.ok(ratio('#0b2a1b', t['--ok']) >= 4.5, `${theme}: check mark on green`);
  }
});

test('the inline module script of every page parses (page scripts are not otherwise executed by these tests)', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pp-pages-'));
  try {
    for (const f of fs.readdirSync(PUB).filter((n) => n.endsWith('.html'))) {
      [...read(f).matchAll(/<script type="module">([\s\S]*?)<\/script>/g)].forEach((m, i) => {
        const file = path.join(tmp, `${f}-${i}.mjs`); fs.writeFileSync(file, m[1]);
        const r = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
        assert.equal(r.status, 0, `${f} has a syntax error:\n${r.stderr}`);
      });
    }
    for (const f of JS.concat(['common.js'])) {
      const r = spawnSync(process.execPath, ['--check', path.join(PUB, f)], { encoding: 'utf8' });
      assert.equal(r.status, 0, `${f} has a syntax error:\n${r.stderr}`);
    }
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});
