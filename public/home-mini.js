// A living preview of a tiny game, the same kind kids build in class: things fall, the player slides over to catch them
// and points pop up. Used by two chapters of the home page story: each better prompt visibly makes a better game, and the AI builds one.
// Plain DOM nodes that only move with transform and opacity. It runs only while on screen and the tab is visible;
// with reduced motion (or before any script runs) the host shows a still frame drawn by the HTML and CSS.
import { reduced } from '/home-fx.js';

const N = 6, CYCLE = 20; // falling items at most, seconds in a round when the game has a timer
const THEMES = ['plain', 'sky', 'space'];

// cfg: { theme, item, player, gold, bombs, ramp, timer, speed }
export function mini(host, cfg = {}) {
  host.classList.add('run');
  host.replaceChildren();
  const el = (tag, cls, text = '') => { const e = document.createElement(tag); e.className = cls; e.textContent = text; host.append(e); return e; };
  const sq = el('b', 'mn-sq'), items = Array.from({ length: N }, () => el('i', 'mn-it')), pops = Array.from({ length: 4 }, () => el('em', 'mn-pop'));
  const pl = el('b', 'mn-pl'), hud = el('span', 'mn-hud'), sc = document.createElement('b'), tm = document.createElement('u');
  sc.className = 'mn-sc'; tm.className = 'mn-tm'; hud.append(sc, tm); pl.dataset.avatar = '';
  pl.textContent = document.querySelector('[data-avatar]')?.textContent || '🦊';

  let W = 0, H = 0, S = 24, px = 0.5, score = 0, clock = 0, spawn = 0, pop = 0, last = 0, raf = 0, seen = false, off = false, c = {};
  const st = items.map(() => ({ on: false, x: 0, y: 0, v: 0, k: 'n' }));
  const show = (e, on) => (e.style.opacity = on ? '' : '0');

  function size() {
    W = host.clientWidth; H = host.clientHeight;
    S = Math.max(16, Math.min(34, Math.round(W * 0.1)));
    host.style.setProperty('--s', S + 'px');
  }
  const paintScore = () => (sc.textContent = '★ ' + score);
  function place(i) { const o = st[i]; items[i].style.transform = `translate(${(o.x * (W - S)).toFixed(1)}px,${o.y.toFixed(1)}px)`; }
  function placePl() { pl.style.transform = `translate(${(px * (W - S * 1.25)).toFixed(1)}px,${(H - S * 1.45).toFixed(1)}px)`; }
  function popAt(x, y, text) {
    const p = pops[pop++ % pops.length]; p.textContent = text;
    p.animate([{ transform: `translate(${x}px,${y}px) scale(.6)`, opacity: 1 }, { transform: `translate(${x}px,${y - S * 1.6}px) scale(1.1)`, opacity: 0 }], { duration: 700, easing: 'ease-out' });
  }

  // a frozen moment of the game: for reduced motion, and the first frame before the loop starts
  function still(fresh) {
    size(); score = fresh ? 0 : c.timer ? 23 : 12; clock = fresh ? 0 : CYCLE * 0.45; spawn = 0.4; px = 0.46; paintScore(); placePl();
    const at = [[0.18, 0.18], [0.72, 0.34], [0.44, 0.56], [0.86, 0.1]];
    st.forEach((o, i) => {
      o.on = i < at.length && !c.square; if (!o.on) return show(items[i], false);
      o.x = at[i][0]; o.y = at[i][1] * (H - S * 2) - (fresh ? H * 0.5 : 0); o.v = H * 0.36; o.k = c.bombs && i === 3 ? 'b' : c.gold && i === 1 ? 'g' : 'n';
      paint(i); show(items[i], true); place(i);
    });
    tm.style.transform = `scaleX(${1 - clock / CYCLE})`;
  }
  function paint(i) { const k = st[i].k; items[i].textContent = k === 'b' ? '💣' : c.item; items[i].className = 'mn-it' + (k === 'g' ? ' g' : ''); }

  function add() {
    const i = st.findIndex((o) => !o.on); if (i < 0) return;
    const o = st[i], r = Math.random();
    o.on = true; o.x = Math.random(); o.y = -S * 1.2; o.k = c.bombs && r < 0.22 ? 'b' : c.gold && r > 0.8 ? 'g' : 'n';
    o.v = H * (0.3 + Math.random() * 0.14);
    paint(i); show(items[i], true); place(i);
  }
  function tick(now) {
    raf = 0; if (!seen || off || document.hidden || c.square) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    clock += dt;
    if (c.timer && clock >= CYCLE) { clock = 0; score = 0; paintScore(); }
    const mul = (c.speed || 1) * (c.ramp ? 1 + 0.9 * ((clock % CYCLE) / CYCLE) : 1);
    if ((spawn -= dt * mul) <= 0) { add(); spawn = 0.62 + Math.random() * 0.3; }
    // the player heads for the lowest good item and steps away from bombs about to land
    let goal = null, danger = null;
    st.forEach((o) => { if (!o.on) return; if (o.k === 'b') { if (o.y > H * 0.45 && (!danger || o.y > danger.y)) danger = o; } else if (!goal || o.y > goal.y) goal = o; });
    let want = goal ? goal.x : 0.5;
    if (danger && Math.abs(danger.x - want) < 0.16) want = danger.x > 0.5 ? danger.x - 0.3 : danger.x + 0.3;
    px += Math.max(-1.3 * dt, Math.min(1.3 * dt, want - px)); px = Math.max(0, Math.min(1, px)); placePl();
    const line = H - S * 2.2;
    st.forEach((o, i) => {
      if (!o.on) return;
      o.y += o.v * mul * dt;
      if (o.y >= line && o.y < line + S && Math.abs(o.x * (W - S) - px * (W - S * 1.25)) < S * 0.9) {
        o.on = false; show(items[i], false);
        const pts = o.k === 'b' ? -3 : o.k === 'g' ? 5 : 1; score = Math.max(0, score + pts); paintScore();
        popAt(o.x * (W - S), line - S * 0.4, (pts > 0 ? '+' : '') + pts);
        if (o.k === 'b') pl.animate([{ translate: '0 0' }, { translate: '-4px 0' }, { translate: '4px 0' }, { translate: '0 0' }], { duration: 260 });
        return;
      }
      if (o.y > H) { o.on = false; show(items[i], false); return; }
      place(i);
    });
    if (c.timer) tm.style.transform = `scaleX(${(1 - clock / CYCLE).toFixed(4)})`;
    if (!c.timer && score > 99) score = 0;
    raf = requestAnimationFrame(tick);
  }
  const go = () => { if (!raf && seen && !off && !document.hidden && !reduced() && !c.square) { last = performance.now(); raf = requestAnimationFrame(tick); } };

  // a new game: fresh starts at zero with the first items still above the screen
  function set(next, { fresh = false } = {}) {
    c = { theme: 'sky', item: '⭐', player: true, ...next };
    host.dataset.theme = THEMES.includes(c.theme) ? c.theme : 'sky';
    host.classList.toggle('sq', !!c.square); host.classList.toggle('tmr', !!c.timer);
    show(pl, c.player && !c.square); show(sq, !!c.square); show(hud, true);
    if (c.square) { st.forEach((o, i) => { o.on = false; show(items[i], false); }); score = 0; paintScore(); }
    else still(fresh && !reduced());
    go();
  }
  // speed up the running game without starting a new round (the hero story's "make the stars fall faster")
  const tune = (more) => { c = { ...c, ...more }; st.forEach((o, i) => { if (o.on) paint(i); }); };
  // the story stage stacks scenes: a scene out of sight pauses its game
  const pause = (v) => { off = v; go(); };

  new ResizeObserver(() => { size(); if (!raf && !c.square) still(); placePl(); }).observe(host);
  new IntersectionObserver(([e]) => { seen = e.isIntersecting; go(); }, { threshold: 0.1 }).observe(host);
  document.addEventListener('visibilitychange', go);
  size(); set(cfg);
  return { set, tune, pause };
}
