// MINESWEEPER — classic logic puzzle
import { store } from '../store.js';
import { sfx } from '../audio.js';
import { burst, bigWin } from '../confetti.js';
import { animateNumber } from '../juice.js';
import { submitScore, mountLeaderboard } from '../scores.js';
import { maybeShowInterstitial } from '../ads.js';
import { ui } from '../app.js';

const BEST_KEY = 'minesweeper-best';
const DIFFS = { easy:{r:9,c:9,m:10}, medium:{r:16,c:16,m:40}, hard:{r:16,c:30,m:99} };

export function renderMinesweeper(view, registerCleanup){
  maybeShowInterstitial();
  view.innerHTML=`
    <div class="game-head">
      <button class="back-btn" data-nav href="/" aria-label="Back">←</button>
      <div class="game-title"><h2>💣 MINESWEEPER</h2><p>Flag mines, reveal safe cells.</p></div>
      <div class="stat-row">
        <div class="stat-chip hot"><b id="ms-time" data-test="score">0</b><span>sec</span></div>
        <div class="stat-chip"><b id="ms-best">${store.best(BEST_KEY)||'—'}</b><span>best</span></div>
      </div>
    </div>
    <section class="stage" style="padding:14px">
      <div style="display:flex;gap:8px;justify-content:center;margin-bottom:12px">
        <button class="btn ${'is-active'}" data-diff="easy" data-test="diff-easy">Easy</button>
        <button class="btn ghost" data-diff="medium" data-test="diff-medium">Medium</button>
        <button class="btn ghost" data-diff="hard" data-test="diff-hard">Hard</button>
      </div>
      <div style="display:flex;gap:12px;justify-content:center;align-items:center;margin-bottom:10px">
        <span>🚩 <b id="ms-flags">0/10</b></span>
        <span>⏱ <b id="ms-timer">0</b>s</span>
        <button class="btn lime" id="ms-reset" data-test="reset">↻ New</button>
      </div>
      <div id="ms-board" data-test="board" style="display:grid;gap:2px;justify-content:center;background:rgba(255,255,255,.06);padding:8px;border-radius:12px;user-select:none"></div>
      <div id="ms-ov" class="race-overlay" data-test="overlay"></div>
    </section>`;
  const boardEl=document.getElementById('ms-board'), flagsEl=document.getElementById('ms-flags'), timerEl=document.getElementById('ms-timer'), timeEl=document.getElementById('ms-time'), bestEl=document.getElementById('ms-best'), ov=document.getElementById('ms-ov');
  let diff='easy', rows, cols, mines, grid, revealed, flagged, firstClick=true, timer=null, sec=0, over=false;

  function setDiff(d){
    diff=d; view.querySelectorAll('[data-diff]').forEach(b=>b.className=b.dataset.diff===d?'btn':'btn ghost');
    start();
  }
  function start(){
    const cfg=DIFFS[diff]; rows=cfg.r; cols=cfg.c; mines=cfg.m;
    grid=Array(rows).fill(0).map(()=>Array(cols).fill(0));
    revealed=Array(rows).fill(0).map(()=>Array(cols).fill(false));
    flagged=Array(rows).fill(0).map(()=>Array(cols).fill(false));
    firstClick=true; over=false; sec=0; timerEl.textContent='0'; timeEl.textContent='0'; flagsEl.textContent=`0/${mines}`;
    clearInterval(timer); timer=null; ov.style.display='none';
    boardEl.style.gridTemplateColumns=`repeat(${cols}, 28px)`; boardEl.innerHTML='';
    for(let r=0;r<rows;r++) for(let c=0;c<cols;c++){
      const d=document.createElement('button'); d.dataset.r=r; d.dataset.c=c; d.dataset.test='cell';
      d.style.cssText='width:28px;height:28px;border-radius:6px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.08);font-weight:700;font-size:.9rem;cursor:pointer';
      d.addEventListener('click',()=>reveal(r,c)); d.addEventListener('contextmenu',e=>{e.preventDefault(); toggleFlag(r,c);});
      boardEl.appendChild(d);
    }
    draw();
  }
  function placeMines(sr,sc){
    let n=mines; while(n>0){ const r=(Math.random()*rows)|0, c=(Math.random()*cols)|0; if(grid[r][c]===-1) continue; if(Math.abs(r-sr)<=1&&Math.abs(c-sc)<=1) continue; grid[r][c]=-1; n--; }
    for(let r=0;r<rows;r++) for(let c=0;c<cols;c++) if(grid[r][c]!==-1){ let k=0; for(let dr=-1;dr<=1;dr++) for(let dc=-1;dc<=1;dc++){ const nr=r+dr,nc=c+dc; if(nr>=0&&nr<rows&&nc>=0&&nc<cols&&grid[nr][nc]===-1) k++; } grid[r][c]=k; }
  }
  function draw(){
    let f=0; for(let r=0;r<rows;r++) for(let c=0;c<cols;c++) if(flagged[r][c]) f++;
    flagsEl.textContent=`${f}/${mines}`;
    const cells=boardEl.children;
    for(let r=0;r<rows;r++) for(let c=0;c<cols;c++){
      const idx=r*cols+c, el=cells[idx];
      if(revealed[r][c]){
        if(grid[r][c]===-1){ el.textContent='💣'; el.style.background='#ef4444'; el.style.color='#fff'; }
        else { el.textContent=grid[r][c]||''; el.style.background='rgba(255,255,255,.03)'; el.style.color=['','#22d3ee','#22c55e','#f97316','#ef4444','#a855f7','#eab308','#000','#fff'][grid[r][c]]||'#fff'; }
        el.disabled=true;
      } else {
        el.textContent=flagged[r][c]?'🚩':''; el.disabled=false; el.style.background=flagged[r][c]?'rgba(250,204,21,.25)':'rgba(255,255,255,.08)';
      }
    }
  }
  function ensureTimer(){ if(timer) return; timer=setInterval(()=>{ sec++; timerEl.textContent=sec; timeEl.textContent=sec; },1000); registerCleanup(()=>clearInterval(timer)); }
  function reveal(r,c){
    if(over||flagged[r][c]||revealed[r][c]) return;
    if(firstClick){ placeMines(r,c); firstClick=false; ensureTimer(); }
    revealed[r][c]=true; sfx.click();
    if(grid[r][c]===-1) return lose();
    if(grid[r][c]===0){ for(let dr=-1;dr<=1;dr++) for(let dc=-1;dc<=1;dc++){ const nr=r+dr,nc=c+dc; if(nr>=0&&nr<rows&&nc>=0&&nc<cols&&!revealed[nr][nc]) reveal(nr,nc); } }
    draw(); checkWin();
  }
  function toggleFlag(r,c){ if(over||revealed[r][c]) return; flagged[r][c]=!flagged[r][c]; sfx.tick(); draw(); }
  function checkWin(){
    for(let r=0;r<rows;r++) for(let c=0;c<cols;c++) if(grid[r][c]!==-1&&!revealed[r][c]) return;
    win();
  }
  function win(){
    over=true; clearInterval(timer); sfx.win(); const best=store.best(BEST_KEY); const cur=sec; if(!best||cur<best) store.set(BEST_KEY,cur); bestEl.textContent=store.best(BEST_KEY);
    bigWin(); ov.style.display='flex'; ov.innerHTML=`<div class="result-wrap" data-test="result"><span class="result-emoji">💣🏆</span><h3 class="result-title" data-test="result-title">${sec}s</h3><p class="result-msg">Cleared ${diff}!</p><div class="stat-row" style="justify-content:center;margin-bottom:16px"><div class="stat-chip hot"><b data-test="score-final">0</b><span>sec</span></div><div class="stat-chip"><b>${store.best(BEST_KEY)}</b><span>best</span></div></div><div class="result-actions"><button class="btn cyan" id="ms-share">📤 Share</button><button class="btn lime" id="ms-again">↻ Again</button><a class="btn ghost" href="/" data-nav>🏠 Hub</a></div></div>`;
    animateNumber(ov.querySelector('[data-test="score-final"]'),sec); submitScore('minesweeper', Math.max(0,999-sec)); mountLeaderboard('minesweeper',ov.querySelector('.result-wrap'));
    ov.querySelector('#ms-again').addEventListener('click',start); ov.querySelector('#ms-share').addEventListener('click',()=>{sfx.click(); ui.openShareModal({title:'Minesweeper',grid:null,text:`💣 MINESWEEPER (${diff})\nTime: ${sec}s — beat that?\nPlay → https://dopaminegames.pages.dev`});});
  }
  function lose(){
    over=true; clearInterval(timer); sfx.lose(); for(let r=0;r<rows;r++) for(let c=0;c<cols;c++) if(grid[r][c]===-1) revealed[r][c]=true; draw(); burst(boardEl.getBoundingClientRect().right-60,boardEl.getBoundingClientRect().top+60,35,7);
    ov.style.display='flex'; ov.innerHTML=`<div class="result-wrap" data-test="result"><span class="result-emoji">💥</span><h3 class="result-title" data-test="result-title">BOOM</h3><p class="result-msg">Hit a mine on ${diff}</p><div class="result-actions"><button class="btn lime" id="ms-again2">↻ Again</button><a class="btn ghost" href="/" data-nav>🏠 Hub</a></div></div>`;
    ov.querySelector('#ms-again2').addEventListener('click',start);
  }
  view.querySelectorAll('[data-diff]').forEach(b=>b.addEventListener('click',()=>setDiff(b.dataset.diff)));
  document.getElementById('ms-reset').addEventListener('click',start);
  start();
}
