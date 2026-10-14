// PromptPlay public home page: entry module.
// Language, top bar, player picker and scroll reveal live here; the scroll story (home-story.js) loads right after.
// The page is complete HTML without any of this, in Azerbaijani (the default language).
import { t, getLang, setLang, applyI18n, addStrings } from '/common.js';
import { HOME } from '/home-i18n.js';
import { $, $$, reduced, getAvatar, saveAvatar, applyAvatar } from '/home-fx.js';

addStrings(HOME);
const root = document.documentElement;

// ---------- language (same localStorage key "lang" as the rest of the app) ----------
function applyLang() {
  applyI18n();
  root.lang = getLang();
  $$('[data-meta]').forEach((m) => (m.content = t(m.dataset.meta)));
  const az = getLang() === 'az';
  $('meta[property="og:locale"]').content = az ? 'az_AZ' : 'en_US';
  $('meta[property="og:locale:alternate"]').content = az ? 'en_US' : 'az_AZ';
  dispatchEvent(new Event('homelang'));
}
$$('[data-lang]').forEach((b) => (b.onclick = () => { setLang(getLang() === 'az' ? 'en' : 'az'); applyLang(); }));
if (getLang() !== 'az') applyLang(); // the HTML is already Azerbaijani
root.classList.remove('pend');

// ---------- links whose destination is not decided yet ([CTA LINK], [PRIVACY POLICY LINK]) ----------
// They keep their bracket text in data-todo and point somewhere sensible until the real address is filled in.
$$('a[href^="["]').forEach((a) => { a.dataset.todo = a.getAttribute('href'); a.setAttribute('href', a.matches('[data-cta]') ? '#contact' : '#faq'); });

// ---------- top bar: a quiet strip once the page scrolls (IntersectionObserver on a marker at the top, no scroll listener) ----------
const bar = $('#bar');
new IntersectionObserver(([e]) => bar.classList.toggle('is-compact', !e.isIntersecting)).observe($('#topmark'));

// ---------- the player of the story: saved for the join page, shown on the stage ----------
const players = $$('#players input');
let avatar = getAvatar();
const select = () => players.forEach((i) => (i.checked = i.value === avatar));
applyAvatar(avatar); select();
players.forEach((i) => (i.onchange = () => {
  avatar = i.value; saveAvatar(avatar); applyAvatar(avatar);
  const kid = $('.kid'); kid.classList.remove('hop'); void kid.offsetWidth; kid.classList.add('hop');
}));
addEventListener('pageshow', () => { avatar = getAvatar(); applyAvatar(avatar); select(); }); // back from the join page

// ---------- after the story, blocks rise in as they arrive (skipped with reduced motion: the page is complete without it) ----------
if (!reduced() && 'IntersectionObserver' in window) {
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -10% 0px' });
  for (const sel of ['.story-h', '.skills h2, .skills .lead', '.pills li', '#fq-h', '.qa', '.final .wrap > *']) {
    $$(sel).forEach((el) => { el.classList.add('rv'); el.style.setProperty('--i', [...el.parentElement.children].indexOf(el) % 8); io.observe(el); });
  }
  root.classList.add('rv-on');
}

import('/home-story.js').then((m) => m.initStory());
