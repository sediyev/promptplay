// Shared helpers for the home page modules: reduced motion, timers, typewriter, star burst, player avatar.
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const mq = matchMedia('(prefers-reduced-motion: reduce)');
export const reduced = () => mq.matches;

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

// Star burst inside `host` (position:relative). Particles are removed when done; skipped for reduced motion.
export function burst(host, { n = 18, spread = 120, up = 60, x = '50%', y = '50%', duration = 1200 } = {}) {
  if (reduced() || !host) return;
  for (let i = 0; i < n; i++) {
    const p = document.createElement('i'); p.textContent = '★';
    p.style.cssText = `position:absolute;left:${x};top:${y};z-index:3;font:900 ${12 + (i % 3) * 5}px/1 system-ui;font-style:normal;color:var(--star);pointer-events:none`;
    host.append(p);
    const a = Math.random() * 6.283, d = spread * (0.4 + Math.random() * 0.6), dx = Math.cos(a) * d, dy = Math.sin(a) * d - up, rot = (Math.random() - 0.5) * 540;
    p.animate([
      { transform: 'translate(0,0) rotate(0) scale(.5)', opacity: 1 },
      { transform: `translate(${dx}px,${dy}px) rotate(${rot / 2}deg) scale(1)`, opacity: 1, offset: 0.45 },
      { transform: `translate(${dx * 1.15}px,${dy + 90}px) rotate(${rot}deg) scale(.9)`, opacity: 0 },
    ], { duration: duration * (0.8 + Math.random() * 0.4), easing: 'cubic-bezier(.2,.7,.4,1)', fill: 'forwards' }).onfinish = () => p.remove();
  }
}

// The player chosen in the story. Shared with the join page through localStorage key "avatar".
export const ALL_AVATARS = [...'🦊🐼🐯🦁🐸🐵🦄🐙🐧🐢🦉🐝🚀🤖👾🌟'];
export const getAvatar = () => { try { const a = localStorage.getItem('avatar'); if (ALL_AVATARS.includes(a)) return a; } catch {} return '🦊'; };
export const saveAvatar = (a) => { try { localStorage.setItem('avatar', a); } catch {} };
export const applyAvatar = (a) => $$('[data-avatar]').forEach((e) => (e.textContent = a));
