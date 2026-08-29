// BREAKOUT — brick breaker
import { store } from '../store.js';
import { sfx } from '../audio.js';
import { burst, bigWin } from '../confetti.js';
import { animateNumber } from '../juice.js';
import { submitScore, mountLeaderboard } from '../scores.js';
import { maybeShowInterstitial } from '../ads.js';
import { ui } from '../app.js';
const BEST_KEY='breakout-score';
export function renderBreakout(view, registerCleanup){
  maybeShowInterstitial();
  view.innerHTML=`
    <div class="game-head">
      <button class="back-btn" data-nav href="/" aria-label="Back">←</button>
      <div class="game-title"><h2>🎯 BREAKOUT</h2><p>Bounce, smash, clear the bricks.</p></div>
      <div class="stat-row"><div class="stat-chip hot"><b id="br-score" data-test="score">0</b><span>score</span></div><div class="stat-chip"><b id="br-best">${store.best(BEST_KEY)}</b><span>best</span></div></div>
    </div>
    <section class="stage" style="padding:14px"><div style="position:relative"><canvas id="br-cv" data-test="canvas" width="480" height="560" style="max-width:100%;border-radius:16px;display:block;margin:0 auto;background:#101018"></canvas><div id="br-ov" class="race-overlay" data-test="overlay"></div></div></section>`;
  const cv=document.getElementById('br-cv'), ctx=cv.getContext('2d'), ov=document.getElementById('br-ov'), scoreEl=document.getElementById('br-score'), bestEl=document.getElementById('br-best');
  let paddle, ball, bricks, score, lives, over, running, raf;
  function resetBricks(){ bricks=[]; const cols=8, rows=5, bw=52,bh=20,pad=6,offX=14,offY=50; const colors=['#ef4444','#f97316','#facc15','#22c55e','#22d3ee']; for(let r=0;r<rows;r++) for(let c=0;c<cols;c++) bricks.push({x:offX+c*(bw+pad),y:offY+r*(bh+pad),w:bw,h:bh,alive:true,col:colors[r]}); }
  function reset(){ paddle={x:200,w:80,h:12,y:520}; ball={x:240,y:300,vx:3,vy:-3,r:7}; score=0; lives=3; over=false; running=false; resetBricks(); scoreEl.textContent='0'; }
  function draw(){
    ctx.fillStyle='#101018'; ctx.fillRect(0,0,480,560);
    bricks.forEach(b=>{ if(!b.alive) return; ctx.fillStyle=b.col; ctx.fillRect(b.x,b.y,b.w,b.h); });
    ctx.fillStyle='#a3e635'; ctx.fillRect(paddle.x,paddle.y,paddle.w,paddle.h);
    ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(ball.x,ball.y,ball.r,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='rgba(255,255,255,.6)'; ctx.font='14px system-ui'; ctx.fillText(`Lives: ${lives}`,14,22); ctx.fillText(`Score: ${score}`,400,22);
  }
  function tick(){
    if(!running||over) return;
    ball.x+=ball.vx; ball.y+=ball.vy;
    if(ball.x-ball.r<0||ball.x+ball.r>480){ ball.vx*=-1; sfx.tick(); }
    if(ball.y-ball.r<0){ ball.vy*=-1; sfx.tick(); }
    if(ball.y+ball.r>paddle.y&&ball.x>paddle.x&&ball.x<paddle.x+paddle.w){ ball.vy=-Math.abs(ball.vy); ball.vx+=(ball.x-(paddle.x+paddle.w/2))*0.04; sfx.click(); }
    bricks.forEach(b=>{
      if(!b.alive) return;
      if(ball.x+ball.r>b.x&&ball.x-ball.r<b.x+b.w&&ball.y+ball.r>b.y&&ball.y-ball.r<b.y+b.h){
        b.alive=false; ball.vy*=-1; score+=10; scoreEl.textContent=score; sfx.correct();
      }
    });
    if(bricks.every(b=>!b.alive)){ resetBricks(); ball.y=300; ball.vy=-Math.abs(ball.vy)-0.5; }
    if(ball.y-ball.r>560){ lives--; if(lives<=0) return die(); ball.x=240; ball.y=300; ball.vx=3*(Math.random()>.5?1:-1); ball.vy=-3; sfx.wrong(); }
    draw(); raf=requestAnimationFrame(tick);
  }
  function die(){ over=true; running=false; cancelAnimationFrame(raf); sfx.lose(); const best=store.setBest(BEST_KEY,score); bestEl.textContent=best; if(score>=500) bigWin(); else burst(cv.getBoundingClientRect().right-60,cv.getBoundingClientRect().top+60,35,7);
    ov.style.display='flex'; ov.innerHTML=`<div class="result-wrap" data-test="result"><span class="result-emoji">${score>=500?'🎯👑':'🎯'}</span><h3 class="result-title" data-test="result-title">${score}</h3><p class="result-msg">${lives>0?'Level cleared!':'Out of lives'}</p><div class="stat-row" style="justify-content:center;margin-bottom:16px"><div class="stat-chip hot"><b data-test="score-final">0</b><span>score</span></div><div class="stat-chip"><b>${best}</b><span>best</span></div></div><div class="result-actions"><button class="btn cyan" id="br-share">📤 Share</button><button class="btn lime" id="br-again">↻ Again</button><a class="btn ghost" href="/" data-nav>🏠 Hub</a></div></div>`;
    animateNumber(ov.querySelector('[data-test="score-final"]'),score); submitScore('breakout',score); mountLeaderboard('breakout',ov.querySelector('.result-wrap'));
    ov.querySelector('#br-again').addEventListener('click',start); ov.querySelector('#br-share').addEventListener('click',()=>{sfx.click(); ui.openShareModal({title:'Breakout',grid:null,text:`🎯 BREAKOUT\nScore: ${score} — beat that?\nPlay → https://dopaminegames.pages.dev`});});
  }
  function start(){ reset(); ov.style.display='none'; draw(); sfx.click(); running=true; tick(); }
  function onKey(e){
    if(!running||over) return;
    if(e.key==='ArrowLeft'||e.key==='a'){e.preventDefault(); paddle.x=Math.max(0,paddle.x-18);}
    else if(e.key==='ArrowRight'||e.key==='d'){e.preventDefault(); paddle.x=Math.min(480-paddle.w,paddle.x+18);}
  }
  function onMove(e){ if(!running||over) return; const rect=cv.getBoundingClientRect(); const x=(e.touches?e.touches[0].clientX:e.clientX)-rect.left; const scale=480/rect.width; paddle.x=Math.max(0,Math.min(480-paddle.w,(x-paddle.w/2)*scale)); }
  document.addEventListener('keydown',onKey); cv.addEventListener('mousemove',onMove); cv.addEventListener('touchmove',onMove,{passive:true}); cv.addEventListener('pointerdown',()=>{ if(!running&&!over) start(); });
  registerCleanup(()=>{document.removeEventListener('keydown',onKey); cancelAnimationFrame(raf);});
  reset(); draw();
  ov.style.display='flex'; ov.innerHTML=`<div class="result-wrap" style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:10px"><span class="result-emoji">🎯</span><h3 class="result-title" style="font-size:1.4rem">BREAKOUT</h3><p class="result-msg">Arrows / drag paddle · Tap to start</p><button class="btn lime" id="br-start">▶ START</button></div>`;
  ov.querySelector('#br-start').addEventListener('click',start);
}
