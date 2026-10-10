// The adventure map. A winding dotted path draws itself dot by dot as the visitor scrolls, level nodes pop in
// with their stars, and the chosen player travels to the newest node. Only transform and opacity animate.
// Without JavaScript, or with reduced motion, the finished map is shown.
import { $, $$, reduced, burst, getAvatar } from '/home-fx.js';

export function initMap() {
  const list = $('#mapList'); if (!list) return;
  const items = $$('.lvl', list), last = items.length - 1;
  const stars = items.map((li) => +li.dataset.stars);
  const hudLv = $('#hudLv'), hudSt = $('#hudSt');
  const tok = Object.assign(document.createElement('div'), { className: 'mtok', textContent: getAvatar() });
  tok.dataset.avatar = ''; tok.setAttribute('aria-hidden', 'true'); list.append(tok);
  list.classList.add('js');

  let seg = [], pos = [], shown = -1;
  const place = (j) => { const p = pos[j]; return `translate(${p.x + (j % 2 ? -30 : 30) - 19}px,${p.y - 46 - 19}px)`; };

  // dots between the centres of two neighbouring nodes: a Z-shaped curve, vertical at both ends, sweeping across the gap in between
  function layout() {
    seg.flat().forEach((d) => d.remove()); seg = []; pos = [];
    const base = list.getBoundingClientRect();
    items.forEach((li) => { const o = $('.orb', li), r = o.getBoundingClientRect(); pos.push({ x: r.left - base.left + r.width / 2, y: r.top - base.top + r.height / 2, r: o.offsetWidth / 2 }); }); // offsetWidth ignores the pop-in scale
    for (let j = 0; j < items.length; j++) {
      seg[j] = [];
      if (!j) continue;
      const a = pos[j - 1], b = pos[j], k = b.y - a.y, N = 90, pts = [];
      for (let i = 0; i <= N; i++) {
        const s = i / N, u = 1 - s;
        pts.push([u ** 3 * a.x + 3 * u * u * s * a.x + 3 * u * s * s * b.x + s ** 3 * b.x, u ** 3 * a.y + 3 * u * u * s * (a.y + k) + 3 * u * s * s * (b.y - k) + s ** 3 * b.y]);
      }
      let acc = 0, next = 0, n = 0; const gap = 17;
      for (let i = 1; i <= N; i++) {
        acc += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
        if (acc < next) continue;
        next = acc + gap;
        const [x, y] = pts[i];
        if (Math.hypot(x - a.x, y - a.y) < a.r + 12 || Math.hypot(x - b.x, y - b.y) < b.r + 12) continue;
        const d = document.createElement('i'); d.className = 'pip'; d.setAttribute('aria-hidden', 'true');
        d.style.cssText = `left:${x.toFixed(1)}px;top:${y.toFixed(1)}px;--d:${n++}`; seg[j].push(d); list.append(d);
      }
    }
    for (let j = 0; j <= shown; j++) seg[j].forEach((d) => { d.style.transitionDelay = '0s'; d.classList.add('in'); });
    if (shown >= 0) tok.style.transform = place(shown);
  }

  function reveal(j, animate) {
    const li = items[j], dots = seg[j] || [];
    dots.forEach((d) => { if (!animate) d.style.transitionDelay = '0s'; d.classList.add('in'); });
    setTimeout(() => li.classList.add('in'), animate ? Math.min(dots.length * 34 * 0.7 + 100, 700) : 0);
    if (j === 0) { tok.style.transform = place(0); tok.classList.add('on'); }
    else if (animate && tok.animate) {
      const from = place(j - 1), to = place(j), mid = dots.filter((_, i) => i % Math.ceil(dots.length / 5 || 1) === 0).map((d) => `translate(${parseFloat(d.style.left) + (j % 2 ? -30 : 30) * 0.4 - 19}px,${parseFloat(d.style.top) - 46 - 19}px)`);
      const a = tok.animate([{ transform: from }, ...mid.map((transform) => ({ transform })), { transform: to + ' scale(1.25)' }, { transform: to }], { duration: 750 + dots.length * 14, easing: 'ease-in-out' });
      a.onfinish = () => { tok.style.transform = to; };
    } else tok.style.transform = place(j);
    if (j === last && animate) burst(list, { n: 30, spread: 170, up: 100, x: pos[j].x + 'px', y: pos[j].y + 'px' });
  }
  function hud() {
    hudLv.textContent = shown + 1;
    hudSt.textContent = stars.slice(0, shown + 1).reduce((a, b) => a + b, 0);
  }
  // reveal everything up to node i; nodes the visitor already scrolled past appear without animation
  function mark(i, animate = true) {
    if (i <= shown) return;
    const from = shown + 1; shown = i;
    for (let j = from; j <= i; j++) reveal(j, animate && j === i);
    hud();
  }

  layout();
  hudLv.textContent = 0; hudSt.textContent = 0;
  new ResizeObserver(layout).observe(list);
  if (reduced() || !('IntersectionObserver' in window)) { mark(last, false); return; }
  items.forEach((li, i) => (li.dataset.i = i));
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting || e.boundingClientRect.top < 0) mark(+e.target.dataset.i); }), { rootMargin: '0px 0px -26% 0px' });
  items.forEach((li) => io.observe(li));
}
