// FLAPPY — tap to fly
import { store } from '../store.js';
import { sfx } from '../audio.js';
import { burst, bigWin } from '../confetti.js';
import { animateNumber } from '../juice.js';
import { submitScore, mountLeaderboard } from '../scores.js';
import { maybeShowInterstitial } from '../ads.js';
import { ui } from '../app.js';
const BEST_KEY='flappy-score';
export function renderFlappy(view, registerCleanup){
  maybeShowInterstitial();
  view.innerHTML=`
    <div class="game-head">
      <button class="back-btn" data-nav href="/" aria-label="Back">←</button>
      <div class="game-title"><h2>🐦 FLAPPY</h2><p>Tap / Space to flap.</p></div>
      <div class="stat-row"><div class="stat-chip hot"><b id="fl-score" data-test="score">0</b><span>score</span></div><div class="stat-chip"><b id="fl-best">${store.best(BEST_KEY)}</b><span>best</span></div></div>
    </div>
    <section class="stage" style="padding:14px"><div style="position:relative"><canvas id="fl-cv" data-test="canvas" width="360" height="640" style="max-width:100%;border-radius:16px;display:block;margin:0 auto;background:linear-gradient(#38bdf8,#0ea5e9)"></canvas><div id="fl-ov" class="race-overlay" data-test="overlay"></div></div></section>`;
  const cv=document.getElementById('fl-cv'), ctx=cv.getContext('2d'), ov=document.getElementById('fl-ov'), scoreEl=document.getElementById('fl-score'), bestEl=document.getElementById('fl-best');
  let bird, pipes, score, over, running, raf, speed=2;
  function reset(){ bird={x:80,y:200,vy:0,r:14}; pipes=[]; score=0; over=false; running=false; speed=2; scoreEl.textContent='0'; }
  function spawnPipe(){ const gap=140, top=60+Math.random()*280; pipes.push({x:360,y:0,w:52,h:top},{x:360,y:top+gap,w:52,h:640-top-gap}); }
  function draw(){
    ctx.fillStyle='#38bdf8'; ctx.fillRect(0,0,360,640);
    ctx.fillStyle='#22c55e'; pipes.forEach(p=>{ ctx.fillRect(p.x,p.y,p.w,p.h); ctx.fillStyle='rgba(0,0,0,.12)'; ctx.fillRect(p.x,p.y,6,p.h); ctx.fillStyle='#22c55e'; });
    ctx.fillStyle='#facc15'; ctx.beginPath(); ctx.arc(bird.x,bird.y,bird.r,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#000'; ctx.fillRect(bird.x+6,bird.y-4,6,6);
    ctx.fillStyle='#15803d'; ctx.fillRect(0,620,360,20);
    ctx.fillStyle='#fff'; ctx.font='700 42px system-ui'; ctx.textAlign='center'; ctx.fillText(score,180,90);
  }
  function tick(){
    if(!running||over) return;
    bird.vy+=0.5; bird.y+=bird.vy;
    if(bird.y-bird.r<0||bird.y+bird.r>620) return die();
    pipes.forEach(p=>p.x-=speed);
    if(pipes.length&&pipes[0].x+52<0){ pipes.splice(0,2); score++; scoreEl.textContent=score; sfx.tick(); if(score%5===0) speed+=0.2; }
    if(pipes.length===0||pipes[pipes.length-1].x<220) spawnPipe();
    for(const p of pipes){ if(bird.x+bird.r>p.x&&bird.x-bird.r<p.x+p.w&&bird.y+bird.r>p.y&&bird.y-bird.r<p.y+p.h) return die(); }
    draw(); raf=requestAnimationFrame(tick);
  }
  function flap(){ if(over){start(); return;} if(!running){running=true; raf=requestAnimationFrame(tick);} bird.vy=-8.5; sfx.click(); }
  function die(){ over=true; running=false; cancelAnimationFrame(raf); sfx.lose(); const best=store.setBest(BEST_KEY,score); bestEl.textContent=best; if(score>=20) bigWin(); else burst(cv.getBoundingClientRect().right-60,cv.getBoundingClientRect().top+60,35,7);
    ov.style.display='flex'; ov.innerHTML=`<div class="result-wrap" data-test="result"><span class="result-emoji">${score>=20?'🐦👑':'🐦'}</span><h3 class="result-title" data-test="result-title">${score}</h3><p class="result-msg">${score===0?'Flap harder.':score>=20?'Sky ruler!':'Nice flight.'}</p><div class="stat-row" style="justify-content:center;margin-bottom:16px"><div class="stat-chip hot"><b data-test="score-final">0</b><span>score</span></div><div class="stat-chip"><b>${best}</b><span>best</span></div></div><div class="result-actions"><button class="btn cyan" id="fl-share">📤 Share</button><button class="btn lime" id="fl-again">↻ Again</button><a class="btn ghost" href="/" data-nav>🏠 Hub</a></div></div>`;
    animateNumber(ov.querySelector('[data-test="score-final"]'),score); submitScore('flappy',score); mountLeaderboard('flappy',ov.querySelector('.result-wrap'));
    ov.querySelector('#fl-again').addEventListener('click',start); ov.querySelector('#fl-share').addEventListener('click',()=>{sfx.click(); ui.openShareModal({title:'Flappy',grid:null,text:`🐦 FLAPPY\nScore: ${score} — beat that?\nPlay → https://dopaminegames.pages.dev`});});
  }
  function start(){ reset(); ov.style.display='none'; draw(); spawnPipe(); running=false; over=false; sfx.click();
    ov.style.display='flex'; ov.innerHTML=`<div class="result-wrap" style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:10px"><span class="result-emoji">🐦</span><h3 class="result-title" style="font-size:1.4rem">FLAPPY</h3><p class="result-msg">Tap / Space to flap</p><button class="btn lime" id="fl-start">▶ START</button></div>`;
    ov.querySelector('#fl-start').addEventListener('click',()=>{ov.style.display='none'; running=true; tick();});
  }
  function onKey(e){ if(e.code==='Space'){e.preventDefault(); flap();} }
  document.addEventListener('keydown',onKey); cv.addEventListener('pointerdown',flap);
  registerCleanup(()=>{document.removeEventListener('keydown',onKey); cancelAnimationFrame(raf);});
  reset(); draw(); start();
}
