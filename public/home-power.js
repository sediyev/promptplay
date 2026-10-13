// Prompt Power-Up: the core skill in ten seconds. Everything is scripted, no AI calls.
// "Watch" mode: three prompts (plain, better, super) type themselves and the game card upgrades with each one:
// a grey square becomes a star catching game, then a space game with golden stars, a timer and rising speed.
// "Your turn" mode: pick a world, something to catch and a twist; the prompt and the running game assemble live.
// The first time the section is seen it plays as a short trailer, until the visitor touches anything.
import { t } from '/common.js';
import { $, $$, reduced, sleep, say, typeTo, burst, tilt } from '/home-fx.js';
import { mini } from '/home-mini.js';

const STEPS = [
  { p: 'pu_p1', n: 'g1n', pic: '🎮', rows: [['g', 'g1g']], game: { theme: 'plain', square: true } },
  { p: 'pu_p2', n: 'g2n', pic: '⭐', rows: [['g', 'g2g'], ['w', 'g2w']], game: { theme: 'sky' } },
  { p: 'pu_p3', n: 'g3n', pic: '🚀', rows: [['g', 'g3g'], ['w', 'g3w'], ['t', 'g3t']], game: { theme: 'space', gold: true, ramp: true, timer: true } },
];
const WORLDS = ['space', 'ocean', 'jungle'], WORLD_PICS = ['🌌', '🌊', '🌴'], ITEMS = ['⭐', '🍎', '💎'];
const TWISTS = [{ ramp: true }, { gold: true }, { bombs: true }];

export function initPower() {
  const box = $('.pu-box'); if (!box) return;
  const text = $('#puText'), card = $('#puCard'), name = $('.pc-name', card), pic = $('.pc-pic', card), meter = $('#puStars'), stText = $('.pc-st', card), fx = $('.fx-host', card);
  const rows = Object.fromEntries($$('.r', card).map((r) => [r.dataset.r, r]));
  const steps = $$('.steps button'), go = $('#puGo'), goIcon = go.firstElementChild, goLabel = go.lastElementChild;
  const modeBtns = $$('.modes button'), watchPanel = $('#puWatch'), minePanel = $('#puMine');
  // These nodes are driven by the script from here on, so the language switch must not overwrite them.
  [name, stText, goLabel, ...$$('dd', card), ...$$('dt', card)].forEach((e) => e.removeAttribute('data-t'));
  meter.removeAttribute('data-aria');
  box.classList.add('live');
  tilt(card);
  const game = mini($('#puMini'), STEPS[2].game);

  let mode = 'watch', step = 3, token = 0, auto = !reduced(), wasComplete = false;
  const dd = (k) => $('dd', rows[k]);
  const LABEL = { g: 'lb_gg', w: 'lb_gw', c: 'lb_gc', t: 'lb_gt' };

  const labels = () => { for (const k in LABEL) $('dt', rows[k]).textContent = t(LABEL[k]); };
  function setStars(n, animate, stop) {
    const items = [...meter.children];
    items.forEach((s) => (s.className = 'o'));
    meter.setAttribute('aria-label', t('st' + n)); stText.textContent = n ? t('st' + n) : '';
    return (async () => {
      for (let i = 0; i < n; i++) {
        if (animate) { await sleep(150); if (stop?.()) return; }
        items[i].className = animate ? 'pop' : '';
      }
    })();
  }
  function syncControls() {
    steps.forEach((b) => { const on = +b.dataset.step === step; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
    const last = step === 3;
    goIcon.textContent = last ? '🎮' : '⚡'; goLabel.textContent = t(last ? 'pu_mine' : 'pu_go');
    go.classList.toggle('nudge', !last && !reduced());
  }
  // card with no content yet (before a step streams in)
  function emptyCard(lv) {
    card.dataset.lv = lv; name.textContent = ''; labels();
    for (const k in rows) { rows[k].classList.remove('show'); dd(k).textContent = ''; dd(k).classList.remove('empty'); }
    setStars(0);
  }

  async function runStep(n, { instant = false, fresh = false, quiet = false } = {}) {
    const my = ++token, stop = () => my !== token, S = STEPS[n - 1];
    step = n; syncControls(); labels();
    if (fresh) { text.textContent = ''; emptyCard(1); }
    const target = t(S.p), nameText = t(S.n);
    if (instant) text.textContent = target; else { await typeTo(text, target, { ms: Math.min(40, 1100 / target.length), stop }); if (stop()) return; text.classList.remove('caret'); await sleep(250); if (stop()) return; }
    emptyCard(n); pic.textContent = S.pic; game.set(S.game, { fresh: !instant });
    const used = Object.fromEntries(S.rows);
    for (const k in rows) rows[k].hidden = !used[k];
    if (instant) {
      name.textContent = nameText;
      for (const k in used) { dd(k).textContent = t(used[k]); rows[k].classList.add('show'); }
      setStars(n, false);
    } else {
      await typeTo(name, nameText, { ms: 26, stop }); if (stop()) return;
      for (const k in used) {
        rows[k].classList.add('show');
        await typeTo(dd(k), t(used[k]), { ms: 9, stop }); if (stop()) return;
      }
      await setStars(n, true, stop); if (stop()) return;
      if (n === 3) burst(fx, { n: 34, spread: 190, up: 120, y: '28%' });
    }
    if (!quiet) say(`${target}. ${nameText}: ${t('st' + n)}`);
  }

  // ----- your turn -----
  const val = (g) => +($(`input[name=y${g}]:checked`, minePanel)?.value || 0);
  async function renderMine({ instant = false, quiet = false } = {}) {
    const my = ++token, stop = () => my !== token;
    const pick = { w: val('w'), c: val('c'), x: val('x') }, n = Object.values(pick).filter(Boolean).length;
    let i = 0; const parts = ['w', 'c', 'x'].map((g) => (pick[g] ? t(`y${g}${pick[g]}f`) : '…'));
    const prompt = n ? t('yt_base').replace(/\{\}/g, () => parts[i++]) : t('pu_p1');
    card.dataset.lv = Math.max(1, n); labels();
    name.textContent = pick.c ? t(`yc${pick.c}n`) : pick.w ? t(`yw${pick.w}n`) : t('yt_n0');
    pic.textContent = pick.w ? WORLD_PICS[pick.w - 1] : pick.c ? ITEMS[pick.c - 1] : '🎮';
    for (const k in rows) { const on = k !== 'g'; rows[k].hidden = !on; rows[k].classList.toggle('show', on); }
    for (const [g, k] of [['w', 'w'], ['c', 'c'], ['x', 't']]) { const e = dd(k); e.textContent = pick[g] ? t(`y${g}${pick[g]}l`) : '?'; e.classList.toggle('empty', !pick[g]); }
    game.set(n ? { theme: pick.w ? WORLDS[pick.w - 1] : 'sky', item: ITEMS[(pick.c || 1) - 1], ...(pick.x ? TWISTS[pick.x - 1] : {}) } : STEPS[0].game, { fresh: true });
    const complete = n === 3;
    const stars = setStars(n, !instant, stop);
    if (instant) text.textContent = prompt; else await typeTo(text, prompt, { ms: 16, stop });
    await stars; if (stop()) return;
    text.classList.remove('caret');
    if (complete && !wasComplete && !instant) { burst(fx, { n: 34, spread: 190, up: 120, y: '28%' }); }
    if (!quiet) say(`${prompt}. ${name.textContent}: ${t('st' + n)}.${complete ? ' ' + t('yt_done') : ''}`);
    wasComplete = complete;
  }
  function setMode(m) {
    mode = m; token++; wasComplete = false;
    modeBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === m)));
    watchPanel.hidden = m !== 'watch'; minePanel.hidden = m !== 'mine';
    if (m === 'mine') { $$('input', minePanel).forEach((i) => (i.checked = false)); renderMine({ instant: true, quiet: true }); }
    else runStep(step, { instant: true, quiet: true });
  }

  // ----- wiring -----
  box.addEventListener('pointerdown', () => (auto = false), true);
  box.addEventListener('keydown', () => (auto = false), true);
  steps.forEach((b) => (b.onclick = () => runStep(+b.dataset.step)));
  go.onclick = () => (step < 3 ? runStep(step + 1) : setMode('mine'));
  modeBtns.forEach((b) => (b.onclick = () => b.dataset.mode !== mode && setMode(b.dataset.mode)));
  minePanel.addEventListener('change', () => renderMine());
  $('#ytReset').onclick = () => { $$('input', minePanel).forEach((i) => (i.checked = false)); wasComplete = false; renderMine({ quiet: true }); };
  $('#ytBack').onclick = () => setMode('watch');
  addEventListener('homelang', () => { if (mode === 'mine') renderMine({ instant: true, quiet: true }); else runStep(step, { instant: true, quiet: true }); });

  // first look: a short trailer (1, 2, 3) once the visitor sees it, unless they already play with it
  async function trailer() {
    for (const n of [1, 2, 3]) {
      if (!auto) return;
      await runStep(n, { fresh: n === 1 }); if (!auto) return;
      if (n < 3) await sleep(2400);
    }
  }
  if (reduced()) { runStep(3, { instant: true, quiet: true }); return; }
  step = 1; syncControls(); text.textContent = ''; emptyCard(1); game.set(STEPS[0].game); // ready for the trailer (the section is still off screen)
  new IntersectionObserver((es, io) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); if (auto) trailer(); else runStep(step, { instant: true, quiet: true }); } }, { threshold: 0.4 }).observe(box);
}
