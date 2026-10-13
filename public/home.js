// PromptPlay public home page: entry module.
// Everything critical (language, top bar, player picker, sticky button) lives here; the interactive sections load
// when they come near the screen. The page is complete HTML without any of this, in Azerbaijani (the default language).
import { t, getLang, setLang, applyI18n, addStrings } from '/common.js';
import { HOME } from '/home-i18n.js';
import { $, $$, reduced, tilt, getAvatar, saveAvatar, applyAvatar } from '/home-fx.js';

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

// ---------- top bar: compact once the page scrolls (IntersectionObserver on a marker at the top, no scroll listener) ----------
const bar = $('#bar'), more = $('.more');
new IntersectionObserver(([e]) => bar.classList.toggle('is-compact', !e.isIntersecting)).observe($('#topmark'));
document.addEventListener('click', (e) => { if (more.open && !more.contains(e.target)) more.open = false; });
more.addEventListener('keydown', (e) => { if (e.key === 'Escape') { more.open = false; $('summary', more).focus(); } });

// ---------- phones: the main button moves to a bottom bar once the hero is out of view, and steps aside at the end ----------
const sticky = $('#stickyCta');
let heroGone = false, finalSeen = false;
const syncSticky = () => sticky.classList.toggle('show', heroGone && !finalSeen);
new IntersectionObserver(([e]) => { heroGone = !e.isIntersecting && e.boundingClientRect.top < 0; syncSticky(); }).observe($('#hero'));
new IntersectionObserver(([e]) => { finalSeen = e.isIntersecting; syncSticky(); }).observe($('#final'));

// ---------- choose your player: saved for the join page, shown in the demo, on the map and in the shield ----------
const players = $$('#players input');
let avatar = getAvatar();
const select = () => players.forEach((i) => (i.checked = i.value === avatar));
applyAvatar(avatar); select();
players.forEach((i) => (i.onchange = () => {
  avatar = i.value; saveAvatar(avatar); applyAvatar(avatar);
  $$('.pw-me, .hud-me').forEach((e) => { e.classList.remove('hop'); void e.offsetWidth; e.classList.add('hop'); });
}));
addEventListener('pageshow', () => { avatar = getAvatar(); applyAvatar(avatar); select(); }); // back from the join page

// ---------- layered shield assembles when it is seen ----------
const shield = $('#shield');
shield.classList.add('js');
if (reduced() || !('IntersectionObserver' in window)) shield.classList.add('in');
else new IntersectionObserver(([e], io) => { if (e.isIntersecting) { shield.classList.add('in'); io.disconnect(); } }, { threshold: 0.35 }).observe(shield);

$$('[data-tilt]').forEach((e) => tilt(e));

// ---------- motion extras (skipped entirely with reduced motion: the page is complete without them) ----------
if (!reduced() && 'IntersectionObserver' in window) {
  // scroll reveal: blocks rise in as they enter, siblings one after another
  const groups = ['.sec-h', '.pu-box', '.tile', '.layers > li', '.checks > li', '.how-steps > li', '.qa', '.ex-card', '.final-card'];
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -12% 0px' });
  for (const sel of groups) $$(sel).forEach((el) => { el.classList.add('rv'); el.style.setProperty('--i', [...el.parentElement.children].indexOf(el) % 6); io.observe(el); });
  io.observe($('.how-steps')); // its connecting line draws in
  root.classList.add('rv-on');

  // example prompts drift by in two rows; the copy that closes the loop is hidden from screen readers
  const mq = $('.mq');
  $$('.mq-row', mq).forEach((row) => { const copy = row.cloneNode(true); copy.setAttribute('aria-hidden', 'true'); $$('[data-t]', copy).forEach((e) => e.removeAttribute('data-t')); row.after(copy); });
  const pause = Object.assign(document.createElement('button'), { type: 'button', className: 'mq-pause' });
  const icon = (d) => (pause.innerHTML = `<svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path fill="currentColor" d="${d}"/></svg>`);
  const PAUSE = 'M2.5 1.5h2.5v9H2.5zM7 1.5h2.5v9H7z', PLAY = 'M3 1.5l7.5 4.5L3 10.5z';
  icon(PAUSE);
  const label = () => pause.setAttribute('aria-label', t('mq_pause'));
  pause.setAttribute('aria-pressed', 'false'); label();
  pause.onclick = () => { const on = mq.classList.toggle('paused'); pause.setAttribute('aria-pressed', String(on)); icon(on ? PLAY : PAUSE); };
  const head = $('.mq-h', mq), top = Object.assign(document.createElement('div'), { className: 'mq-top' });
  head.before(top); top.append(head, pause);
  mq.classList.add('js');
  addEventListener('homelang', () => { label(); $$('.mq-row[aria-hidden]', mq).forEach((copy) => { copy.innerHTML = copy.previousElementSibling.innerHTML; }); });

  // skill tiles: a soft light follows the pointer
  if (matchMedia('(hover:hover) and (pointer:fine)').matches) $$('.tile').forEach((el) => el.addEventListener('pointermove', (e) => {
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', e.clientX - r.left + 'px'); el.style.setProperty('--my', e.clientY - r.top + 'px');
  }));
}

// ---------- interactive sections load when they get close ----------
const lazy = (sel, load, margin = '700px') => {
  const el = $(sel); if (!el) return;
  if (!('IntersectionObserver' in window)) return void load();
  new IntersectionObserver(([e], io) => { if (e.isIntersecting) { io.disconnect(); load(); } }, { rootMargin: margin }).observe(el);
};
import('/home-hero.js').then((m) => m.initHero());
lazy('#power', () => import('/home-power.js').then((m) => m.initPower()));
lazy('#map', () => import('/home-map.js').then((m) => m.initMap()));
lazy('#made', () => import('/home-game.js').then((m) => m.initGame()));
