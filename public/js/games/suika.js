// SUIKA MERGE — viral fruit drop & merge. 6 columns, 8 tiers, chain reactions.
import { store } from '../store.js';
import { sfx } from '../audio.js';
import { bigWin } from '../confetti.js';
import { animateNumber } from '../juice.js';
import { submitScore, mountLeaderboard } from '../scores.js';
import { maybeShowInterstitial } from '../ads.js';
import { ui } from '../app.js';

const BEST_KEY = 'suika-best';
const COLS = 6, ROWS = 8;
const FRUITS = [
  { e:'🫐', c:'#6366f1', s:1, pts:2 },
  { e:'🍒', c:'#ef4444', s:1.1, pts:4 },
  { e:'🍓', c:'#f43f5e', s:1.2, pts:8 },
  { e:'🍋', c:'#eab308', s:1.35, pts:16 },
  { e:'🍊', c:'#f97316', s:1.5, pts:32 },
  { e:'🍎', c:'#dc2626', s:1.65, pts:64 },
  { e:'🍐', c:'#84cc16', s:1.85, pts:128 },
  { e:'🍈', c:'#22c55e', s:2.1, pts:256 },
];

export function renderSuika(view, registerCleanup) {
  maybeShowInterstitial();
  const state={ board:Array.from({length:ROWS},()=>Array(COLS).fill(-1)), score:0, next:randTier(), over:false, busy:false };

  view.innerHTML=`
    <div class="game-head">
      <button class="back-btn" data-nav href="/" aria-label="Back">←</button>
      <div class="game-title"><h2>🍉 SUIKA MERGE</h2><p>Drop fruits — same merge into bigger! Don't fill up</p></div>
      <div class="stat-row">
        <div class="stat-chip hot"><b id="suika-score">0</b><span>score</span></div>
        <div class="stat-chip"><b id="suika-best">${store.best(BEST_KEY)}</b><span>best</span></div>
      </div>
    </div>
    <section class="stage" style="padding:14px">
      <div style="display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:10px">
        <span style="font-size:.82rem;color:var(--muted)">Next:</span>
        <span id="suika-next" style="font-size:1.8rem;filter:drop-shadow(0 4px 10px rgba(0,0,0,.4))"></span>
      </div>
      <div id="suika-board" style="display:grid;grid-template-columns:repeat(6,1fr);gap:6px;background:#0f0f1a;border-radius:16px;padding:10px;max-width:360px;margin:0 auto;position:relative"></div>
      <div class="race-overlay" id="suika-overlay"></div>
      <p class="hint-line" style="margin-top:10px">Tap a column to drop</p>
    </section>`;

  const boardEl=document.getElementById('suika-board');
  const nextEl=document.getElementById('suika-next');
  const scoreEl=document.getElementById('suika-score');
  const bestEl=document.getElementById('suika-best');
  const overlay=document.getElementById('suika-overlay');

  function randTier(){ return Math.random()<0.7 ? (Math.random()<0.5?0:1) : 2; }

  function paint(){
    nextEl.textContent=FRUITS[state.next].e;
    boardEl.innerHTML=state.board.map((row,r)=>row.map((v,c)=>{
      if(v===-1) return `<div data-col="${c}" data-test="cell" style="aspect-ratio:1;border-radius:12px;background:rgba(255,255,255,.04);border:1px dashed rgba(255,255,255,.06);cursor:pointer"></div>`;
      const f=FRUITS[v];
      return `<div data-col="${c}" data-test="cell" style="aspect-ratio:1;border-radius:12px;background:${f.c};display:flex;align-items:center;justify-content:center;font-size:1.6rem;box-shadow:inset 0 2px 0 rgba(255,255,255,.35),0 4px 12px rgba(0,0,0,.4);cursor:pointer;border:2px solid rgba(255,255,255,.15)">${f.e}</div>`;
    }).join('')).join('');
    boardEl.querySelectorAll('[data-col]').forEach(el=>el.addEventListener('click',()=>drop(+el.dataset.col)));
  }

  function drop(col){
    if(state.over||state.busy) return;
    let row=ROWS-1;
    while(row>=0 && state.board[row][col]!==-1) row--;
    if(row<0){ sfx.wrong(); return; }
    state.board[row][col]=state.next;
    state.next=randTier();
    sfx.tick();
    let merged=true;
    while(merged){
      merged=false;
      for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
        const v=state.board[r][c]; if(v===-1||v>=FRUITS.length-1) continue;
        const n=[[r-1,c],[r+1,c],[r,c-1],[r,c+1]];
        for(const [nr,nc] of n){
          if(nr<0||nr>=ROWS||nc<0||nc>=COLS) continue;
          if(state.board[nr][nc]===v){
            state.board[r][c]=v+1; state.board[nr][nc]=-1;
            state.score+=FRUITS[v+1].pts;
            scoreEl.textContent=state.score;
            sfx.correct();
            if(v+1>=5) bigWin();
            gravity(); merged=true; break;
          }
        }
        if(merged) break;
      }
      if(merged) break;
    }
    paint();
    if(state.board[0].some(v=>v!==-1)) return gameOver();
  }

  function gravity(){
    for(let c=0;c<COLS;c++){
      const col=[]; for(let r=ROWS-1;r>=0;r--) if(state.board[r][c]!==-1) col.push(state.board[r][c]);
      for(let r=ROWS-1,i=0;r>=0;r--,i++) state.board[r][c]= i<col.length?col[i]:-1;
    }
  }

  function gameOver(){
    state.over=true; sfx.lose();
    const best=store.setBest(BEST_KEY, state.score); bestEl.textContent=best;
    overlay.style.display='flex';
    overlay.innerHTML=`<div class="result-wrap">
      <span class="result-emoji">${state.score>500?'🏆':'🍉'}</span>
      <h3 class="result-title">${state.score}</h3>
      <p class="result-msg">Top fruit: ${FRUITS[Math.max(...state.board.flat())]?.e||'—'}</p>
      <div class="stat-row" style="justify-content:center;margin-bottom:16px"><div class="stat-chip hot"><b data-test="score-final">0</b><span>score</span></div><div class="stat-chip"><b>${best}</b><span>best</span></div></div>
      <div class="result-actions"><button class="btn lime" id="suika-again">↻ Again</button><a class="btn ghost" href="/" data-nav>🏠 Hub</a></div>
    </div>`;
    animateNumber(overlay.querySelector('[data-test="score-final"]'), state.score);
    submitScore('suika', state.score); mountLeaderboard('suika', overlay.querySelector('.result-wrap'));
    overlay.querySelector('#suika-again').addEventListener('click', reset);
  }

  function reset(){
    state.board=Array.from({length:ROWS},()=>Array(COLS).fill(-1));
    state.score=0; state.over=false; scoreEl.textContent='0'; overlay.style.display='none'; paint();
  }

  paint();
  overlay.style.display='none';
}
