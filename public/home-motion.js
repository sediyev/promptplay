// Pointer driven effects of the home page: the page answers the mouse.
// - the night sky (welcome and closing screens) drifts in layers towards the pointer, a soft light follows it and leaves a trail of sparkles
// - the mascot leans towards the pointer, hops with a burst of stars when clicked, and pops in as its section arrives
// - the mascot peeking over the story stage slides along the edge to stay near the pointer
// - cards light up under the pointer and tilt slightly; the main buttons pull gently towards it
// - the big numbers count up once
// Only transform and opacity change (through CSS custom properties and the translate property).
// Pointer effects need a mouse or trackpad (hover + fine pointer); with reduced motion nothing here runs and the page stays still.
import { $, $$, reduced, burst } from '/home-fx.js';

const fine = matchMedia('(hover:hover) and (pointer:fine)');
const root = document.documentElement;

// ---------- springs: a value that eases towards its target every frame; the loop sleeps once everything settles ----------
const live = new Set(); let raf = 0;
const kick = () => { if (!raf) raf = requestAnimationFrame(tick); };
function tick() {
  raf = 0;
  for (const s of live) {
    s.x += (s.tx - s.x) * s.k; s.y += (s.ty - s.y) * s.k;
    if (Math.abs(s.tx - s.x) < s.eps && Math.abs(s.ty - s.y) < s.eps) { s.x = s.tx; s.y = s.ty; live.delete(s); }
    s.apply(s.x, s.y);
  }
  if (live.size) kick();
}
function spring(apply, { k = 0.1, eps = 0.002, x = 0, y = 0 } = {}) {
  const s = { x, y, tx: x, ty: y, k, eps, apply, to(tx, ty) { s.tx = tx; s.ty = ty; live.add(s); kick(); } };
  return s;
}
const rel = (e, el) => { const r = el.getBoundingClientRect(); return { px: e.clientX - r.left, py: e.clientY - r.top, w: r.width, h: r.height }; };
const prop = (el, name, v) => el.style.setProperty(name, v);

// ---------- night sky: parallax layers, a light that follows the pointer, a trail of sparkles ----------
const SPARK = ['#ffe27a', '#7ff3ff', '#ff8fc7', '#c4baff'];
function sky(sec) {
  const lean = spring((x, y) => { prop(sec, '--mx', x.toFixed(4)); prop(sec, '--my', y.toFixed(4)); }, { k: 0.07 });
  const light = spring((x, y) => { prop(sec, '--sx', x.toFixed(1) + 'px'); prop(sec, '--sy', y.toFixed(1) + 'px'); }, { k: 0.16, eps: 0.5 });
  let lastX = 0, lastY = 0, sparks = 0;
  sec.addEventListener('pointerenter', (e) => { const { px, py } = rel(e, sec); light.x = light.tx = px; light.y = light.ty = py; light.apply(px, py); sec.classList.add('lit'); });
  sec.addEventListener('pointerleave', () => { sec.classList.remove('lit'); lean.to(0, 0); });
  sec.addEventListener('pointermove', (e) => {
    const { px, py, w, h } = rel(e, sec);
    lean.to((px / w) * 2 - 1, (py / h) * 2 - 1); light.to(px, py);
    if (Math.hypot(px - lastX, py - lastY) < 38 || sparks > 16 || e.target.closest('a,button')) return;
    lastX = px; lastY = py; sparks++;
    const p = document.createElement('i'); p.className = 'trail'; p.textContent = '✦';
    p.style.cssText = `left:${px}px;top:${py}px;color:${SPARK[sparks % SPARK.length]};font-size:${8 + Math.random() * 10}px`;
    sec.append(p);
    const dx = (Math.random() - 0.5) * 40, dy = 20 + Math.random() * 30;
    p.animate([{ transform: 'translate(-50%,-50%) scale(.3) rotate(0)', opacity: 0 }, { transform: 'translate(-50%,-50%) scale(1) rotate(45deg)', opacity: 1, offset: 0.2 },
      { transform: `translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(.2) rotate(140deg)`, opacity: 0 }], { duration: 900 + Math.random() * 500, easing: 'cubic-bezier(.2,.7,.4,1)' })
      .onfinish = () => { p.remove(); sparks--; };
  });
}

// ---------- cards: a light under the pointer, and a slight tilt ----------
function card(el) {
  const tilt = el.classList.contains('tilt') && spring((x, y) => { prop(el, '--tx', x.toFixed(4)); prop(el, '--ty', y.toFixed(4)); }, { k: 0.14 });
  el.addEventListener('pointermove', (e) => {
    const { px, py, w, h } = rel(e, el);
    prop(el, '--gx', px.toFixed(0) + 'px'); prop(el, '--gy', py.toFixed(0) + 'px');
    if (tilt) tilt.to((px / w) * 2 - 1, (py / h) * 2 - 1);
  });
  el.addEventListener('pointerleave', () => tilt && tilt.to(0, 0));
}

// ---------- magnetic buttons: pulled towards the pointer when it comes close ----------
function magnet(btn) {
  const area = btn.closest('section') || document.body;
  const pull = spring((x, y) => (btn.style.translate = `${x.toFixed(2)}px ${y.toFixed(2)}px`), { k: 0.18, eps: 0.05 });
  area.addEventListener('pointermove', (e) => {
    const r = btn.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, dx = e.clientX - cx, dy = e.clientY - cy;
    const reach = Math.max(r.width, r.height) * 0.5 + 70;
    if (Math.hypot(dx, dy) < reach) pull.to(dx * 0.22, dy * 0.3); else pull.to(0, 0);
  });
  area.addEventListener('pointerleave', () => pull.to(0, 0));
}

// ---------- the mascot peeking over the story stage follows the pointer along the edge ----------
function peek(img) {
  const stage = img.closest('.stage'), area = stage.closest('.story-grid');
  const home = () => (stage.clientWidth - img.offsetWidth) * 0.82;
  const slide = spring((x) => { img.style.translate = `${x.toFixed(1)}px 0`; prop(img, '--lean', ((slide.tx - x) / 40).toFixed(3)); }, { k: 0.06, eps: 0.3, x: home() });
  img.style.left = '0px'; img.style.right = 'auto'; slide.apply(home(), 0);
  area.addEventListener('pointermove', (e) => {
    const r = stage.getBoundingClientRect(), max = stage.clientWidth - img.offsetWidth;
    slide.to(Math.max(0, Math.min(max, e.clientX - r.left - img.offsetWidth / 2)), 0);
  });
  area.addEventListener('pointerleave', () => slide.to(home(), 0));
  addEventListener('resize', () => slide.to(home(), 0));
}

// ---------- mascots: pop in when their section arrives, hop with stars when clicked ----------
function mascots() {
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -12% 0px' });
  $$('.mascot').forEach((m) => {
    io.observe(m);
    m.addEventListener('animationend', (e) => /^(jump|wiggle)$/.test(e.animationName) && m.classList.remove('hop'));
    m.addEventListener('click', () => {
      m.classList.remove('hop'); void m.offsetWidth; m.classList.add('hop');
      burst(m, { n: 14, spread: 110, up: 70, x: '50%', y: '30%', duration: 1100 });
    });
  });
}

// ---------- big numbers count up once, from zero (a zero stays a zero) ----------
function counters() {
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return; io.unobserve(e.target);
    const el = e.target, to = +el.dataset.to, t0 = performance.now(), dur = 1100 + to * 40;
    const step = (now) => { const p = Math.min(1, (now - t0) / dur), v = Math.round(to * (1 - (1 - p) ** 3)); el.textContent = v; if (p < 1) requestAnimationFrame(step); };
    el.textContent = 0; requestAnimationFrame(step);
  }), { threshold: 0.6 });
  $$('[data-to]').forEach((el) => +el.dataset.to > 0 && io.observe(el));
}

export function initMotion() {
  if (reduced()) return;
  root.classList.add('mo');
  mascots(); counters();
  if (!fine.matches) return; // touch screens: the page still floats and twinkles, it just does not follow a pointer
  root.classList.add('mo-pointer');
  $$('.hero, .final').forEach(sky);
  $$('.glow').forEach(card);
  $$('[data-magnet]').forEach(magnet);
  const p = $('.peek'); if (p) peek(p);
}
