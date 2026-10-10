// Keeps the static Azerbaijani text in public/index.html in sync with public/home-i18n.js.
// The page paints in Azerbaijani (the default language) before any JavaScript runs, so there is no empty flash,
// no layout shift and search engines see real text. Run it after editing the az dictionary:
//   npm run home:sync            (rewrites public/index.html)
//   npm run home:sync -- --check (exit 1 if the HTML is out of date; test/home.test.js does the same)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { HOME } from '../public/home-i18n.js';

const file = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'index.html');
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escAttr = (s) => esc(s).replace(/"/g, '&quot;');
const az = HOME.az, missing = new Set();
const get = (k) => (k in az ? az[k] : (missing.add(k), `[[${k}]]`));

export function sync(html) {
  return html
    // <tag ... data-t="key" ...>text</tag>: leaf elements only
    .replace(/(<([a-z0-9]+)\b[^>]*\sdata-t="([\w]+)"[^>]*>)([^<]*)(<\/\2>)/g, (_, open, _tag, key, _old, close) => open + esc(get(key)) + close)
    // data-aria="key" -> aria-label, data-meta="key" -> content
    .replace(/<([a-z0-9]+)\b[^>]*>/g, (tag) => {
      const set = (name, attr) => {
        const m = tag.match(new RegExp(`\\sdata-${name}="([\\w]+)"`));
        if (!m) return;
        const val = ` ${attr}="${escAttr(get(m[1]))}"`;
        tag = new RegExp(`\\s${attr}="[^"]*"`).test(tag) ? tag.replace(new RegExp(`\\s${attr}="[^"]*"`), val) : tag.replace(/(\s*\/?>)$/, `${val}$1`);
      };
      set('aria', 'aria-label'); set('meta', 'content');
      return tag;
    });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const before = fs.readFileSync(file, 'utf8'), after = sync(before);
  if (missing.size) { console.error('Missing az strings: ' + [...missing].join(', ')); process.exit(1); }
  if (process.argv.includes('--check')) {
    if (before !== after) { console.error('public/index.html is out of date: run "npm run home:sync"'); process.exit(1); }
    console.log('public/index.html is in sync');
  } else { fs.writeFileSync(file, after); console.log(before === after ? 'already in sync' : 'public/index.html updated'); }
}
