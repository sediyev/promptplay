// A tiny playable example game, run through gameFrame() from common.js: a sandboxed iframe (scripts only, opaque origin)
// whose CSP blocks all network access, exactly like the games kids make in class.
import { t, getLang, gameFrame } from '/common.js';
import { $ } from '/home-fx.js';

// Tap the falling stars for 20 seconds; golden ones are worth 5 points and the stars speed up as the score grows. Strings arrive as JSON in S.
const GAME = `<!doctype html><html lang="{lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Star Catcher</title><style>
*{box-sizing:border-box}html,body{margin:0;height:100%;overflow:hidden}
body{font:700 16px/1.3 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#fff;background:radial-gradient(1.5px 1.5px at 20% 30%,#fff9,transparent),radial-gradient(1.5px 1.5px at 70% 60%,#fff8,transparent),radial-gradient(2px 2px at 45% 85%,#fff7,transparent),radial-gradient(1.5px 1.5px at 85% 20%,#fff9,transparent),linear-gradient(#17143d,#3b2f8f 70%,#4f3fae);touch-action:manipulation;-webkit-user-select:none;user-select:none}
#hud{position:absolute;left:14px;right:14px;top:10px;display:flex;justify-content:space-between;font-size:20px;pointer-events:none;z-index:2}
#bar{position:absolute;left:0;bottom:0;height:6px;width:100%;background:#f5a623;transform-origin:left;transform:scaleX(0)}
.s{position:absolute;left:0;top:0;width:64px;height:64px;display:grid;place-items:center;font-size:46px;cursor:pointer;will-change:transform}
.s.g{filter:drop-shadow(0 0 10px #ffd34d) saturate(1.6)}.s.g::after{content:'5';position:absolute;right:2px;bottom:2px;font:900 15px system-ui;color:#3a2600;background:#ffd34d;border-radius:9px;padding:1px 5px}
#o{position:absolute;inset:0;z-index:3;display:grid;place-content:center;justify-items:center;gap:6px;text-align:center;padding:16px;background:rgba(21,18,56,.62)}
#o[hidden]{display:none}#o big{font-size:48px;line-height:1}#o p{margin:0;font-size:17px;min-height:1.3em}
button{font:800 18px system-ui,sans-serif;margin-top:8px;background:#f5a623;color:#1b1e2e;border:0;border-radius:16px;padding:12px 26px;min-height:48px;cursor:pointer;box-shadow:0 4px 0 #b86e00}
button:active{transform:translateY(3px);box-shadow:0 1px 0 #b86e00}
</style></head><body>
<div id="hud"><span id="sc">⭐ 0</span><span id="tm">20</span></div><div id="bar"></div>
<div id="o"><big>⭐</big><p id="m1"></p><p id="m2"></p><button id="go"></button></div>
<script>
const S={json};
const $=s=>document.querySelector(s),sc=$('#sc'),tm=$('#tm'),bar=$('#bar'),ov=$('#o'),m1=$('#m1'),m2=$('#m2'),go=$('#go');
let score=0,left=20,on=false,last=0,gap=0,W=innerWidth,H=innerHeight,list=[];
addEventListener('resize',()=>{W=innerWidth;H=innerHeight});
m1.textContent=S.hint;go.textContent=S.play;
function add(){
  const e=document.createElement('div');e.className='s';e.textContent='⭐';
  const g=Math.random()<.15;if(g)e.classList.add('g');
  const o={e,g,x:Math.random()*(W-64),y:-70,v:80+Math.random()*90+score*2};
  e.addEventListener('pointerdown',ev=>{ev.preventDefault();if(!on||o.dead)return;o.dead=1;score+=o.g?5:1;sc.textContent='⭐ '+score;
    e.style.transition='transform .18s,opacity .18s';e.style.opacity=0;e.style.transform='translate('+o.x+'px,'+o.y+'px) scale(1.7)';setTimeout(()=>e.remove(),200)});
  document.body.append(e);list.push(o);
}
function tick(n){
  if(!on)return;const dt=Math.min(.05,(n-last)/1e3);last=n;left-=dt;gap-=dt;
  if(gap<=0){add();gap=Math.max(.32,.62-score*.008)}
  list=list.filter(o=>{if(o.dead)return false;o.y+=o.v*dt;if(o.y>H+10){o.e.remove();return false}o.e.style.transform='translate('+o.x+'px,'+o.y+'px)';return true});
  tm.textContent=Math.max(0,Math.ceil(left));bar.style.transform='scaleX('+Math.min(1,1-left/20)+')';
  if(left<=0)return end();requestAnimationFrame(tick);
}
function clear(){list.forEach(o=>o.e.remove());list=[]}
function start(){score=0;left=20;gap=0;on=true;clear();sc.textContent='⭐ 0';tm.textContent='20';ov.hidden=true;last=performance.now();requestAnimationFrame(tick)}
function end(){on=false;clear();m1.textContent=S.over;m2.textContent=score+' '+S.caught;go.textContent=S.again;ov.hidden=false}
go.onclick=start;
<\/script></body></html>`;

export function initGame() {
  const host = $('#gm'); if (!host) return;
  const build = () => {
    const s = { hint: t('gm_hint'), play: t('gm_play'), over: t('gm_over'), caught: t('gm_caught'), again: t('gm_again') };
    const f = gameFrame(GAME.replace('{lang}', getLang()).replace('{json}', JSON.stringify(s).replace(/</g, '\\u003c')));
    f.title = t('gm_title');
    host.replaceChildren(f);
  };
  build();
  addEventListener('homelang', build); // new language: a fresh game screen
}
