// The scroll story: five chapters scroll by while one stage stays in view and plays the chapter being read.
// 1 a kid with ideas, 2 the prompt gets better (and so does the game), 3 the AI builds it and the kid asks for a change,
// 4 "Check my work", stars and the next level, 5 the layers of protection around the child.
// Each scene starts over when its chapter becomes current and pauses while the story is off screen or the tab is hidden.
// The HTML already shows every scene's finished state, which is what reduced motion keeps.
import { t } from '/common.js';
import { $, $$, sleep, reduced, typeTo, burst } from '/home-fx.js';
import { mini } from '/home-mini.js';

const STOP = Symbol('stop');
const SPACE = { theme: 'space', item: '⭐', gold: true };

// ---------- 1. a curious kid: ideas pop up in a thought bubble ----------
function idea(el) {
  const bubble = $('.think', el), emoji = $('.think-e', el), text = $('.think-t', el);
  const IDEAS = [['🦸', 'mq2'], ['🐉', 'mq3'], ['🗺️', 'mq4'], ['🕹️', 'mq1']];
  return {
    still() { bubble.classList.remove('hide'); emoji.textContent = IDEAS[0][0]; text.textContent = t(IDEAS[0][1]); },
    async play({ wait, type }) {
      for (let k = 0; ; k = (k + 1) % IDEAS.length) {
        bubble.classList.add('hide'); await wait(320);
        emoji.textContent = IDEAS[k][0]; text.textContent = ''; bubble.classList.remove('hide'); await wait(280);
        await type(text, IDEAS[k][1], 34); await wait(2400);
      }
    },
  };
}

// ---------- 2. the prompt gets better, and each better prompt makes a better game ----------
function prompt(el) {
  const text = $('.prompt-t', el), tiers = $$('.tiers li', el), host = $('#miniPrompt'), game = mini(host, { ...SPACE, ramp: true, timer: true });
  const STEPS = [
    ['pu_p1', { theme: 'plain', square: true, player: false }],
    ['pu_p2', { theme: 'sky', item: '⭐' }],
    ['pu_p3', { ...SPACE, ramp: true, timer: true }],
  ];
  const tier = (i) => tiers.forEach((li, j) => li.classList.toggle('on', j === i));
  return {
    still() { text.textContent = t('pu_p3'); tier(2); game.set(STEPS[2][1]); game.pause(false); },
    leave() { game.pause(true); },
    async play({ wait, type }) {
      game.pause(false); text.textContent = ''; tier(-1); game.set(STEPS[0][1]); await wait(500);
      for (const [i, [key, cfg]] of STEPS.entries()) {
        tier(i); await type(text, key, i ? 26 : 50); await wait(260);
        game.set(cfg, { fresh: true }); host.classList.remove('pop'); void host.offsetWidth; host.classList.add('pop');
        if (i < 2) await wait(2300);
      }
    },
  };
}

// ---------- 3. the AI builds the game, the child asks for a change and sees it happen ----------
function build(el) {
  const usr = $('.bub.usr', el), bot = $('.bub.bot', el), safe = $('.safe-ok', el), screen = $('.screen', el);
  const [usrT, botT] = [$('.bub-t', usr), $('.bub-t', bot)], game = mini($('#miniBuild'), { ...SPACE, speed: 1.9 });
  const show = (...e) => e.forEach((x) => x.classList.add('show'));
  return {
    still() {
      el.classList.remove('playing'); bot.classList.remove('think'); screen.className = 'screen on';
      usrT.textContent = t('pw_p2'); botT.textContent = t('pw_r2'); game.set({ ...SPACE, speed: 1.9 }); game.pause(false);
    },
    leave() { game.pause(true); },
    async play({ wait, type }) {
      el.classList.add('playing'); [usr, bot, safe].forEach((x) => x.classList.remove('show', 'think'));
      screen.className = 'screen'; usrT.textContent = botT.textContent = ''; game.pause(false); await wait(450);
      // the child describes the game, and the safety check lets it through
      show(usr); await type(usrT, 'pw_p1', 30); await wait(150);
      show(safe); await wait(450);
      // the AI builds it: code lines grow, then the game starts playing
      show(bot); bot.classList.add('think'); screen.classList.add('build'); await wait(1500);
      game.set(SPACE, { fresh: true }); screen.className = 'screen on'; bot.classList.remove('think');
      await type(botT, 'pw_r1', 18); await wait(2200);
      // the child asks for a change, and it shows up in the running game
      safe.classList.remove('show'); await type(usrT, 'pw_p2', 30); await wait(150);
      show(safe); bot.classList.add('think'); await wait(700);
      bot.classList.remove('think'); botT.textContent = ''; game.tune({ speed: 1.9 });
      screen.classList.remove('zap'); void screen.offsetWidth; screen.classList.add('zap');
      await type(botT, 'pw_r2', 18);
    },
  };
}

// ---------- 4. check my work, stars, and the token walks on to the next level ----------
function stars(el) {
  const check = $('.check', el), meter = $$('.check .meter i', el), nodes = $$('.path li', el), tok = $('.tok', el), tally = $('.tally b', el), toast = $('.toast', el);
  const EARNED = [3, 2, 3, 3, 2, 3, 3, 2, 3, 3]; // 27 in total, the same example progress on every visit
  let at = nodes.length - 1;
  // node position inside the scene, from layout offsets (not affected by the scene's enter transition)
  const spot = (n) => ({ x: n.offsetParent.offsetLeft + n.offsetLeft, y: n.offsetParent.offsetTop + n.offsetTop, w: n.offsetWidth });
  const moveTo = (i) => { at = i; const p = spot(nodes[i]); tok.style.transform = `translate(${p.x + p.w - tok.offsetWidth * 0.7}px,${p.y - tok.offsetHeight * 0.45}px)`; };
  const paint = (done) => nodes.forEach((n, j) => (n.className = j < done ? 'done' : j === done ? 'cur' : 'lock'));
  new ResizeObserver(() => moveTo(at)).observe(el);
  return {
    still() { paint(nodes.length); meter.forEach((s) => (s.className = '')); tally.textContent = 27; toast.classList.remove('show'); moveTo(nodes.length - 1); },
    async play({ wait }) {
      paint(0); meter.forEach((s) => (s.className = 'o')); tally.textContent = 0; toast.classList.remove('show'); moveTo(0); await wait(700);
      let sum = 0;
      for (let i = 0; i < nodes.length; i++) {
        const slow = i < 2, beat = slow ? 1 : 0.55;
        check.classList.add('press'); await wait(160); check.classList.remove('press');
        for (let s = 0; s < EARNED[i]; s++) { meter[s].className = 'pop'; await wait(130 * beat); }
        tally.textContent = sum += EARNED[i];
        nodes[i].className = 'done pop';
        if (i === nodes.length - 1) break;
        nodes[i + 1].className = 'cur'; moveTo(i + 1);
        if (slow) { toast.classList.add('show'); await wait(1100); toast.classList.remove('show'); }
        await wait(520 * beat); meter.forEach((s) => (s.className = 'o'));
      }
      const p = spot(nodes.at(-1));
      burst(el, { x: p.x + p.w / 2 + 'px', y: p.y + p.w / 2 + 'px' });
    },
  };
}

// ---------- 5. the layers of protection close around the child, one by one ----------
function safe(el) {
  const badges = $$('.hb', el);
  return {
    still() { el.classList.remove('assemble', 'closed'); },
    async play({ wait }) {
      badges.forEach((b) => b.classList.remove('show')); el.classList.add('assemble', 'closed'); await wait(380);
      el.classList.remove('closed'); await wait(1000);
      badges[0].classList.add('show'); await wait(600); badges[1].classList.add('show');
    },
  };
}

export function initStory() {
  const story = $('#story'); if (!story) return;
  const steps = $$('.step', story), scenes = $$('.scene', story), dots = $$('.dots-nav i', story), stage = $('.stage', story);
  const SC = [idea, prompt, build, stars, safe].map((make, i) => make(scenes[i]));
  let cur = -1, run = 0, seen = false;
  new IntersectionObserver(([e]) => (seen = e.isIntersecting)).observe(story);

  // helpers for one run of a scene: wait() holds while the story is out of view or the tab is hidden,
  // and throws STOP when the reader has moved on to another chapter (a newer run took over)
  const tools = (my) => {
    const stop = () => my !== run;
    const wait = async (ms) => { await sleep(ms); while (!seen || document.hidden) { if (stop()) throw STOP; await sleep(250); } if (stop()) throw STOP; };
    const type = async (el, key, ms) => { await typeTo(el, t(key), { ms, stop }); if (stop()) throw STOP; };
    return { wait, type };
  };

  function show(i, again = false) {
    if (i === cur && !again) return;
    cur = i; const my = ++run;
    steps.forEach((s, j) => s.classList.toggle('on', j === i));
    scenes.forEach((s, j) => s.classList.toggle('on', j === i));
    dots.forEach((d, j) => d.classList.toggle('on', j === i));
    SC.forEach((s, j) => j !== i && s.leave?.());
    if (reduced()) return SC[i].still();
    SC[i].play(tools(my)).catch((e) => { if (e !== STOP) throw e; });
  }

  // the chapter being read is the last one whose top has passed the middle of the reading area
  // (on phones that area starts below the sticky stage)
  let raf = 0;
  const narrow = matchMedia('(max-width: 899.98px)');
  const pick = () => {
    raf = 0;
    const top = narrow.matches ? Math.max(0, stage.getBoundingClientRect().bottom) : 0, line = (top + innerHeight) / 2;
    let i = 0; steps.forEach((el, j) => { if (el.getBoundingClientRect().top < line) i = j; });
    show(i);
  };
  const soon = () => { if (!raf) raf = requestAnimationFrame(pick); };
  addEventListener('scroll', soon, { passive: true });
  addEventListener('resize', soon);
  addEventListener('homelang', () => show(cur, true)); // new language: the current scene starts over in it

  SC.forEach((s) => s.still());
  story.classList.add('live');
  pick();
}
