// The living product window in the hero. The HTML is already the finished scene (a still image that makes sense on its own).
// With motion allowed, this loops a ~9 second story: the child types, the AI replies, the hero card flips in,
// "Check my work" gives stars, and the next level unlocks. It pauses off screen and in background tabs.
// Reduced motion: the finished scene stays, nothing loops.
import { t } from '/common.js';
import { $, $$, reduced, sleep, viewGate, typeTo, burst } from '/home-fx.js';

const STOP = Symbol('stop');

export function initHero() {
  const pw = $('#pw'); if (!pw) return;
  const q = (s) => $(s, pw);
  const you = q('.bub.usr'), bot = q('.bub.bot'), prompt = q('[data-live=prompt]'), reply = q('[data-live=reply]');
  const check = q('.pw-check'), card = q('.pw-card'), meter = q('[data-live=stars]'), map = q('[data-live=map]'), toast = q('.pw-toast'), tok = q('.tok');
  const nodes = $$('.n', map), stars = $$('i', meter), gate = viewGate(pw);
  let run = 0, at = 3;

  const setNodes = (unlocked) => nodes.forEach((n, i) => { const done = unlocked ? 3 : 2; n.className = 'n ' + (i < done ? 'done' : i === done ? 'cur' : 'lock'); });
  const moveTok = (i) => { at = i; const w = map.clientWidth / 5; tok.style.transform = `translateX(${i * w + w / 2 - tok.offsetWidth / 2}px)`; };
  const clear = () => {
    for (const e of [you, bot, check]) e.classList.remove('show', 'think', 'press');
    prompt.textContent = reply.textContent = ''; prompt.classList.remove('caret'); reply.classList.remove('caret'); toast.classList.remove('show');
  };
  // finished scene: what the page shows before JavaScript, and when motion is reduced
  const poster = () => { pw.classList.remove('playing', 'fade'); clear(); card.classList.add('on'); stars.forEach((s) => (s.className = '')); setNodes(true); moveTok(3); };
  const reset = () => { pw.classList.add('playing'); clear(); card.classList.remove('on'); stars.forEach((s) => (s.className = 'o')); setNodes(false); moveTok(2); };

  async function play(my) {
    const stop = () => my !== run;
    const wait = async (ms) => { await sleep(ms); await gate(); if (stop()) throw STOP; };
    pw.classList.add('fade'); await wait(260);
    reset(); pw.classList.remove('fade'); await wait(300);
    you.classList.add('show'); await wait(120);
    await typeTo(prompt, t('pw_prompt'), { ms: 32, stop }); if (stop()) throw STOP;
    prompt.classList.remove('caret'); await wait(220);
    bot.classList.add('show', 'think'); await wait(560);
    bot.classList.remove('think');
    await typeTo(reply, t('pw_reply'), { ms: 18, stop }); if (stop()) throw STOP;
    await wait(260);
    card.classList.add('on'); await wait(820);
    check.classList.add('show'); await wait(420);
    check.classList.add('press'); await wait(200); check.classList.remove('press');
    for (const s of stars) { s.className = 'pop'; await wait(150); }
    burst(card, { n: 14, stars: true, spread: 70, up: 40, y: '88%' });
    await wait(450);
    setNodes(true); nodes[2].classList.add('pop'); nodes[3].classList.add('pop'); moveTok(3);
    await wait(300); toast.classList.add('show');
    await wait(1700); toast.classList.remove('show');
    await wait(900);
  }
  async function loop(my) {
    try { await sleepGate(1800, my); while (my === run) await play(my); } catch (e) { if (e !== STOP) throw e; }
  }
  const sleepGate = async (ms, my) => { await sleep(ms); await gate(); if (my !== run) throw STOP; }; // hold the still image first
  const start = () => { poster(); if (!reduced()) loop(++run); };

  new ResizeObserver(() => moveTok(at)).observe(map);
  addEventListener('homelang', () => { run++; start(); }); // new language: back to the still image, then play again
  start();
}
