// WHACK-A-MOLE — 30s speed tap
import { store } from '../store.js';
import { sfx } from '../audio.js';
import { burst, bigWin } from '../confetti.js';
import { animateNumber } from '../juice.js';
import { submitScore, mountLeaderboard } from '../scores.js';
import { maybeShowInterstitial } from '../ads.js';
import { ui } from '../app.js';
const BEST_KEY='whack-score';
export function renderWhack(view, registerCleanup){
  maybeShowInterstitial();
  view.innerHTML=`
    <div class="game-head">
      <button class="back-btn" data-nav href="/" aria-label="Back">←</button>
      <div class="game-title"><h2>🔨 WHACK-A-MOLE</h2><p>30 seconds, 9 holes — hammer time.</p></div>
      <div class="stat-row"><div class="stat-chip hot"><b id="wh-score" data-test="score">0</b><span>score</span></div><div class="stat-chip"><b id="wh-best">${store.best(BEST_KEY)}</b><span>best</span></div><div class="stat-chip"><b id="wh-time">30</b><span>sec</span></div></div>
    </div>
    <section class="stage" style="padding:14px"><div id="wh-grid" data-test="board" style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;max-width:360px;margin:0 auto"></div><div id="wh-ov" class="race-overlay" data-test="overlay"></div></section>`;
  const grid=document.getElementById('wh-grid'), ov=document.getElementById('wh-ov'), scoreEl=document.getElementById('wh-score'), bestEl=document.getElementById('wh-best'), timeEl=document.getElementById('wh-time');
  let score, time, timer, moleTimer, over, running, active=-1;
  function buildGrid(){ grid.innerHTML=''; for(let i=0;i<9;i++){ const d=document.createElement('button'); d.dataset.i=i; d.dataset.test='hole'; d.style.cssText='height:110px;border-radius:16px;border:none;background:radial-gradient(ellipse at 50% 70%, #1a1a24 0%, #0b0b12 70%);font-size:2.2rem;cursor:pointer;position:relative;overflow:hidden'; d.textContent='🕳️'; d.addEventListener('click',()=>whack(i)); grid.appendChild(d);} }
  function spawn(){
    if(over) return; const holes=[...grid.children]; if(active!==-1) { holes[active].textContent='🕳️'; holes[active].style.background=''; }
    active=(Math.random()*9)|0; const golden=Math.random()<0.12;
    holes[active].textContent=golden?'✨🐹':'🐹'; holes[active].dataset.golden=golden?'1':'0';
    holes[active].style.background='radial-gradient(ellipse at 50% 30%, #facc15 0%, #1a1a24 60%)';
    moleTimer=setTimeout(spawn, 650+Math.random()*450);
  }
  function whack(i){
    if(!running||over||i!==active) return;
    const el=grid.children[i]; const golden=el.dataset.golden==='1'; score+=golden?3:1; scoreEl.textContent=score; if(golden) sfx.win(); else sfx.correct();
    el.textContent='💥'; setTimeout(()=>{ if(!over&&active===i) el.textContent='🕳️'; },120);
    active=-1; clearTimeout(moleTimer); setTimeout(spawn, 180);
  }
  function tickTime(){
    time--; timeEl.textContent=time;
    if(time<=0) return gameOver();
  }
  function start(){
    sfx.click(); buildGrid(); score=0; time=30; over=false; running=true; active=-1; scoreEl.textContent='0'; timeEl.textContent='30'; ov.style.display='none';
    clearInterval(timer); clearTimeout(moleTimer); timer=setInterval(tickTime,1000); spawn();
    registerCleanup(()=>{clearInterval(timer); clearTimeout(moleTimer);});
  }
  function gameOver(){
    over=true; running=false; clearInterval(timer); clearTimeout(moleTimer); if(active!==-1) grid.children[active].textContent='🕳️';
    sfx.lose(); const best=store.setBest(BEST_KEY,score); bestEl.textContent=best; if(score>=30) bigWin(); else burst(grid.getBoundingClientRect().right-60,grid.getBoundingClientRect().top+60,35,7);
    ov.style.display='flex'; ov.innerHTML=`<div class="result-wrap" data-test="result"><span class="result-emoji">${score>=30?'🔨👑':'🔨'}</span><h3 class="result-title" data-test="result-title">${score}</h3><p class="result-msg">${score>=30?'Mole destroyer!':score>=15?'Quick hands!':'Keep hammering!'}</p><div class="stat-row" style="justify-content:center;margin-bottom:16px"><div class="stat-chip hot"><b data-test="score-final">0</b><span>score</span></div><div class="stat-chip"><b>${best}</b><span>best</span></div></div><div class="result-actions"><button class="btn cyan" id="wh-share">📤 Share</button><button class="btn lime" id="wh-again">↻ Again</button><a class="btn ghost" href="/" data-nav>🏠 Hub</a></div></div>`;
    animateNumber(ov.querySelector('[data-test="score-final"]'),score); submitScore('whack',score); mountLeaderboard('whack',ov.querySelector('.result-wrap'));
    ov.querySelector('#wh-again').addEventListener('click',start); ov.querySelector('#wh-share').addEventListener('click',()=>{sfx.click(); ui.openShareModal({title:'Whack-a-Mole',grid:null,text:`🔨 WHACK-A-MOLE\nScore: ${score}/30s — beat that?\nPlay → https://dopaminegames.pages.dev`});});
  }
  buildGrid();
  ov.style.display='flex'; ov.innerHTML=`<div class="result-wrap" style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:10px"><span class="result-emoji">🔨</span><h3 class="result-title" style="font-size:1.4rem">WHACK-A-MOLE</h3><p class="result-msg">Tap the moles — golden = 3 points!</p><button class="btn lime" id="wh-start">▶ START</button></div>`;
  ov.querySelector('#wh-start').addEventListener('click',start);
}
