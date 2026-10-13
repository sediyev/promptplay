// The living product window in the hero. The HTML is already the finished scene (a still image that makes sense on its own).
// With motion allowed, this loops a ~16 second story of the core loop: the child describes a game, the safety check passes,
// the AI builds it and the game starts playing, the child asks for a change and sees it happen, "Check my work" gives stars
// and the next level unlocks. It pauses off screen and in background tabs. Reduced motion: the finished scene stays.
import { t } from '/common.js';
import { $, $$, reduced, sleep, viewGate, typeTo, burst } from '/home-fx.js';
import { mini } from '/home-mini.js';

const STOP = Symbol('stop');
const GAME = { theme: 'space', item: '⭐', gold: true };

export function initHero() {
  const pw = $('#pw'); if (!pw) return;
  const q = (s) => $(s, pw);
  const bubs = $$('.bub', pw), [you1, bot1, you2, bot2] = bubs, safe = q('.safe-ok'), badge = $('.hb1');
  const check = q('.pw-check'), stage = q('.pw-game'), meter = q('[data-live=stars]'), map = q('[data-live=map]'), toast = q('.pw-toast'), tok = q('.tok');
  const nodes = $$('.n', map), stars = $$('i', meter), gate = viewGate(pw), game = mini(q('#pwMini'), { ...GAME, speed: 1.9 });
  let run = 0, at = 3;

  const setNodes = (unlocked) => nodes.forEach((n, i) => { const done = unlocked ? 3 : 2; n.className = 'n ' + (i < done ? 'done' : i === done ? 'cur' : 'lock'); });
  const moveTok = (i) => { at = i; const w = map.clientWidth / 5; tok.style.transform = `translateX(${i * w + w / 2 - tok.offsetWidth / 2}px)`; };
  const clear = () => {
    for (const e of [...bubs, check, safe, badge]) e.classList.remove('show', 'think', 'press');
    for (const e of $$('.tw', pw)) { e.textContent = ''; e.classList.remove('caret'); }
    toast.classList.remove('show');
  };
  // finished scene: what the page shows before JavaScript, and when motion is reduced
  const poster = () => { pw.classList.remove('playing', 'fade'); stage.className = 'pw-game on'; clear(); stars.forEach((s) => (s.className = '')); setNodes(true); moveTok(3); };
  const reset = () => { pw.classList.add('playing'); stage.className = 'pw-game'; clear(); stars.forEach((s) => (s.className = 'o')); setNodes(false); moveTok(2); };

  async function play(my) {
    const stop = () => my !== run;
    const wait = async (ms) => { await sleep(ms); await gate(); if (stop()) throw STOP; };
    const type = async (bub, key, ms) => { await typeTo($('.tw', bub), t(key), { ms, stop }); if (stop()) throw STOP; $('.tw', bub).classList.remove('caret'); };
    pw.classList.add('fade'); await wait(260);
    reset(); pw.classList.remove('fade'); await wait(300);
    // 1. the child describes the game, and the safety check lets it through
    you1.classList.add('show'); await wait(120);
    await type(you1, 'pw_p1', 30); await wait(160);
    safe.classList.add('show'); badge.classList.add('show'); await wait(520);
    // 2. the AI builds it: code lines grow, then the game starts playing
    bot1.classList.add('show', 'think'); stage.classList.add('build'); await wait(1500);
    game.set(GAME, { fresh: true }); stage.className = 'pw-game on'; bot1.classList.remove('think');
    await type(bot1, 'pw_r1', 18); await wait(2300);
    // 3. the child improves it, and the change shows up in the running game
    you2.classList.add('show'); await wait(120);
    await type(you2, 'pw_p2', 30); await wait(200);
    bot2.classList.add('show', 'think'); await wait(650);
    bot2.classList.remove('think'); game.tune({ speed: 1.9 }); stage.classList.add('zap');
    await type(bot2, 'pw_r2', 18); await wait(1700);
    // 4. check my work, stars, next level
    check.classList.add('show'); await wait(420);
    check.classList.add('press'); await wait(200); check.classList.remove('press');
    for (const s of stars) { s.className = 'pop'; await wait(150); }
    burst(check, { n: 14, stars: true, spread: 70, up: 40, x: '85%', y: '50%' });
    await wait(450);
    setNodes(true); nodes[2].classList.add('pop'); nodes[3].classList.add('pop'); moveTok(3);
    await wait(300); toast.classList.add('show');
    await wait(2000); toast.classList.remove('show');
    await wait(900);
  }
  async function loop(my) {
    try { await sleep(1800); await gate(); if (my !== run) return; while (my === run) await play(my); } catch (e) { if (e !== STOP) throw e; }
  }
  const start = () => { poster(); game.set({ ...GAME, speed: 1.9 }); if (!reduced()) loop(++run); };

  new ResizeObserver(() => moveTok(at)).observe(map);
  addEventListener('homelang', () => { run++; start(); }); // new language: back to the still image, then play again
  start();
}
