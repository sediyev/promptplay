// Shared helpers for the home page modules: reduced motion, timers, typewriter, confetti, card tilt, player avatar.
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const mq = matchMedia('(prefers-reduced-motion: reduce)');
export const reduced = () => mq.matches;

// Screen reader announcements (the page has one polite live region).
export function say(text) {
  const l = $('#live'); if (!l) return;
  l.textContent = ''; setTimeout(() => (l.textContent = text), 40);
}

// A promise-returning gate: resolves right away while `el` is on screen and the tab is visible, otherwise waits.
// Loops await it between steps, so nothing runs off screen or in a background tab.
export function viewGate(el) {
  let seen = false; const waiting = [];
  const flush = () => { if (seen && !document.hidden) waiting.splice(0).forEach((r) => r()); };
  new IntersectionObserver(([e]) => { seen = e.isIntersecting; flush(); }, { threshold: 0.15 }).observe(el);
  document.addEventListener('visibilitychange', flush);
  return () => (seen && !document.hidden ? Promise.resolve() : new Promise((r) => waiting.push(r)));
}

// Types `text` into el. Text that is already right is kept, so improving a prompt only types the new words.
// ms is the delay per character; stop() aborts (a newer run took over).
export async function typeTo(el, text, { ms = 40, stop = () => false } = {}) {
  const cur = el.textContent; let keep = 0;
  while (keep < cur.length && keep < text.length && cur[keep] === text[keep]) keep++;
  el.classList.add('caret');
  for (let k = cur.length; k > keep; k -= 4) { if (stop()) return; el.textContent = cur.slice(0, Math.max(keep, k - 4)); await sleep(10); }
  const chunk = Math.max(1, Math.ceil(14 / ms));
  for (let k = keep; k < text.length;) { if (stop()) return; k = Math.min(text.length, k + chunk); el.textContent = text.slice(0, k); await sleep(ms * chunk); }
  el.classList.remove('caret');
}

// Confetti or star burst inside `host` (position:relative). Particles are removed when done; skipped for reduced motion.
const COLORS = ['var(--brand)', 'var(--brand2)', 'var(--star)', 'var(--ok)', '#fff'];
export function burst(host, { n = 26, spread = 150, up = 80, x = '50%', y = '46%', stars = false, duration = 1300 } = {}) {
  if (reduced() || !host) return;
  for (let i = 0; i < n; i++) {
    const p = document.createElement('i'); p.className = 'fx';
    if (stars) { p.textContent = '★'; p.style.cssText = `left:${x};top:${y};width:auto;height:auto;background:none;font:900 ${12 + (i % 3) * 5}px/1 system-ui;color:var(--star)`; }
    else p.style.cssText = `left:${x};top:${y};background:${COLORS[i % COLORS.length]};` + (i % 3 === 0 ? 'width:8px;border-radius:50%;' : '');
    host.append(p);
    const a = Math.random() * 6.283, d = spread * (0.4 + Math.random() * 0.6), dx = Math.cos(a) * d, dy = Math.sin(a) * d - up, rot = (Math.random() - 0.5) * 720;
    p.animate([
      { transform: 'translate(0,0) rotate(0) scale(.5)', opacity: 1 },
      { transform: `translate(${dx}px,${dy}px) rotate(${rot / 2}deg) scale(1)`, opacity: 1, offset: 0.45 },
      { transform: `translate(${dx * 1.15}px,${dy + 110}px) rotate(${rot}deg) scale(.9)`, opacity: 0 },
    ], { duration: duration * (0.8 + Math.random() * 0.4), easing: 'cubic-bezier(.2,.7,.4,1)', fill: 'forwards' }).onfinish = () => p.remove();
  }
}

// Cards tilt towards a mouse pointer. Not for touch, not for reduced motion.
export function tilt(el, max = 7) {
  if (reduced() || !matchMedia('(hover:hover) and (pointer:fine)').matches) return;
  let raf = 0;
  el.addEventListener('pointermove', (e) => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--ry', (((e.clientX - r.left) / r.width - 0.5) * max * 2).toFixed(2) + 'deg');
      el.style.setProperty('--rx', ((0.5 - (e.clientY - r.top) / r.height) * max * 2).toFixed(2) + 'deg');
    });
  });
  el.addEventListener('pointerleave', () => { cancelAnimationFrame(raf); el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); });
}

// The player chosen in the hero. Shared with the join page through localStorage key "avatar".
export const ALL_AVATARS = [...'🦊🐼🐯🦁🐸🐵🦄🐙🐧🐢🦉🐝🚀🤖👾🌟'];
export const getAvatar = () => { try { const a = localStorage.getItem('avatar'); if (ALL_AVATARS.includes(a)) return a; } catch {} return '🦊'; };
export const saveAvatar = (a) => { try { localStorage.setItem('avatar', a); } catch {} };
export const applyAvatar = (a) => $$('[data-avatar]').forEach((e) => (e.textContent = a));
