// STACK — 3D tower stack, timing is everything
import { store } from '../store.js';
import { sfx } from '../audio.js';
import { burst, bigWin } from '../confetti.js';
import { animateNumber } from '../juice.js';
import { shake, sparks } from '../juice.js';
import { submitScore, mountLeaderboard } from '../scores.js';
import { maybeShowInterstitial } from '../ads.js';
import { ui } from '../app.js';
const BEST_KEY='stack-score';
export function renderStack(view, registerCleanup){
  maybeShowInterstitial();
  view.innerHTML=`
    <div class="game-head">
      <button class="back-btn" data-nav href="/" aria-label="Back">←</button>
      <div class="game-title"><h2>🧊 STACK 3D</h2><p>Time the drop — build the tower.</p></div>
      <div class="stat-row"><div class="stat-chip hot"><b id="st-score" data-test="score">0</b><span>score</span></div><div class="stat-chip"><b id="st-best">${store.best(BEST_KEY)}</b><span>best</span></div></div>
    </div>
    <section class="stage" style="padding:14px"><div style="position:relative"><canvas id="st-cv" data-test="canvas" width="360" height="520" style="max-width:100%;border-radius:16px;display:block;margin:0 auto;background:linear-gradient(#0b0b12,#1e1b2e)"></canvas><div id="st-ov" class="race-overlay" data-test="overlay"></div></div><div style="text-align:center;margin-top:12px"><button class="btn lime" id="st-tap" data-test="tap" style="min-width:160px;min-height:56px;font-size:1.2rem">TAP TO STACK</button></div></section>`;
  const cv=document.getElementById('st-cv'), ctx=cv.getContext('2d'), ov=document.getElementById('st-ov'), scoreEl=document.getElementById('st-score'), bestEl=document.getElementById('st-best'), tapBtn=document.getElementById('st-tap');
  let stack, cur, dir, speed, score, over, running, raf, perfect=0;
  const BW=80, BH=16;
  function reset(){ stack=[{x:140,y:400,w:80,h:16}]; cur={x:0,y:384,w:80,h:16}; dir=1; speed=2.2; score=0; perfect=0; over=false; running=false; scoreEl.textContent='0'; }
  function draw(){
    ctx.fillStyle='#0b0b12'; ctx.fillRect(0,0,360,520);
    // tower
    stack.forEach((b,i)=>{
      const hue=230+i*8; ctx.fillStyle=`hsl(${hue} 70% ${58-i}% )`;
      ctx.fillRect(b.x,b.y,b.w,b.h);
      ctx.fillStyle='rgba(255,255,255,.18)'; ctx.fillRect(b.x,b.y,b.w,4);
      // 3D side
      ctx.fillStyle='rgba(0,0,0,.35)'; ctx.beginPath(); ctx.moveTo(b.x+b.w,b.y); ctx.lineTo(b.x+b.w+8,b.y-8); ctx.lineTo(b.x+b.w+8,b.y+b.h-8); ctx.lineTo(b.x+b.w,b.y+b.h); ctx.closePath(); ctx.fill();
      ctx.fillStyle='rgba(255,255,255,.08)'; ctx.beginPath(); ctx.moveTo(b.x,b.y); ctx.lineTo(b.x+8,b.y-8); ctx.lineTo(b.x+8+b.w,b.y-8); ctx.lineTo(b.x+b.w,b.y); ctx.closePath(); ctx.fill();
    });
    // current
    if(cur){
      const hue=230+stack.length*8; ctx.fillStyle=`hsl(${hue} 80% 62%)`;
      ctx.fillRect(cur.x,cur.y,cur.w,cur.h);
      ctx.fillStyle='rgba(255,255,255,.25)'; ctx.fillRect(cur.x,cur.y,cur.w,4);
    }
    ctx.fillStyle='#fff'; ctx.font='700 28px system-ui'; ctx.textAlign='center'; ctx.fillText(score,180,34);
  }
  function tick(){
    if(!running||over) return;
    cur.x+=dir*speed;
    if(cur.x<=0||cur.x+cur.w>=360) dir*=-1;
    draw(); raf=requestAnimationFrame(tick);
  }
  function place(){
    if(over) return;
    if(!running){ running=true; tick(); sfx.click(); return; }
    const prev=stack[stack.length-1];
    const overlap=Math.max(0, Math.min(cur.x+cur.w, prev.x+prev.w) - Math.max(cur.x, prev.x));
    const miss=cur.w-overlap;
    if(overlap<=0){ return die(); }
    // cut
    cur.w=overlap; cur.x=Math.max(cur.x,prev.x);
    if(miss<4){ // perfect
      perfect++; sfx.win(); sparks(prev.x+prev.w/2, prev.y, {color:'#a3e635', count:12}); if(perfect>=3) shake(5);
      cur.w=prev.w; // perfect keeps width
    } else { perfect=0; sfx.correct(); if(miss>12) shake(3); }
    stack.push({x:cur.x,y:cur.y,w:cur.w,h:cur.h});
    score++; scoreEl.textContent=score; if(score%5===0) speed+=0.18;
    // new cur
    const nextY=cur.y-16; cur={x: dir>0?0:360-cur.w, y:nextY, w:cur.w, h:16};
    if(nextY<60){ // camera up
      stack.forEach(b=>b.y+=16); cur.y+=16;
    }
    draw();
    if(overlap<=0) die();
  }
  function die(){ over=true; running=false; cancelAnimationFrame(raf); sfx.lose(); const best=store.setBest(BEST_KEY,score); bestEl.textContent=best; if(score>=25) bigWin(); else burst(cv.getBoundingClientRect().right-60,cv.getBoundingClientRect().top+60,35,7);
    ov.style.display='flex'; ov.innerHTML=`<div class="result-wrap" data-test="result"><span class="result-emoji">${score>=25?'🧊👑':'🧊'}</span><h3 class="result-title" data-test="result-title">${score}</h3><p class="result-msg">${score>=25?'Sky high!':score>=10?'Solid stack':'Keep stacking!'}</p><div class="stat-row" style="justify-content:center;margin-bottom:16px"><div class="stat-chip hot"><b data-test="score-final">0</b><span>score</span></div><div class="stat-chip"><b>${best}</b><span>best</span></div></div><div class="result-actions"><button class="btn cyan" id="st-share">📤 Share</button><button class="btn lime" id="st-again">↻ Again</button><a class="btn ghost" href="/" data-nav>🏠 Hub</a></div></div>`;
    animateNumber(ov.querySelector('[data-test="score-final"]'),score); submitScore('stack',score); mountLeaderboard('stack',ov.querySelector('.result-wrap'));
    ov.querySelector('#st-again').addEventListener('click',start); ov.querySelector('#st-share').addEventListener('click',()=>{sfx.click(); ui.openShareModal({title:'Stack 3D',grid:null,text:`🧊 STACK 3D\nHeight: ${score} — beat that?\nPlay → https://dopaminegames.pages.dev`});});
  }
  function start(){ reset(); ov.style.display='none'; draw(); sfx.click(); running=false; over=false; cur.x=0; dir=1; tick(); }
  function onKey(e){ if(e.code==='Space'){e.preventDefault(); place();} }
  document.addEventListener('keydown',onKey); cv.addEventListener('pointerdown',place); tapBtn.addEventListener('click',place);
  registerCleanup(()=>{document.removeEventListener('keydown',onKey); cancelAnimationFrame(raf);});
  reset(); draw();
  ov.style.display='flex'; ov.innerHTML=`<div class="result-wrap" style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:10px"><span class="result-emoji">🧊</span><h3 class="result-title" style="font-size:1.4rem">STACK 3D</h3><p class="result-msg">Tap / Space to stack</p><button class="btn lime" id="st-start">▶ START</button></div>`;
  ov.querySelector('#st-start').addEventListener('click',start);
}
