// COLOR SORT — water sort trending puzzle. 6 tubes, 4 colors, sort them.
import { store } from '../store.js';
import { sfx } from '../audio.js';
import { bigWin } from '../confetti.js';
import { animateNumber } from '../juice.js';
import { submitScore, mountLeaderboard } from '../scores.js';
import { maybeShowInterstitial } from '../ads.js';

const BEST_KEY='sort-best';
const COLORS={ R:'#ef4444', G:'#22c55e', B:'#3b82f6', Y:'#eab308', P:'#a855f7', O:'#f97316' };
const COLOR_KEYS=['R','G','B','Y'];

export function renderSort(view, registerCleanup){
  maybeShowInterstitial();
  const state={ tubes:[], sel:-1, moves:0, over:false };

  view.innerHTML=`
    <div class="game-head">
      <button class="back-btn" data-nav href="/" aria-label="Back">←</button>
      <div class="game-title"><h2>🧪 COLOR SORT</h2><p>Sort colors — tap tube to pour</p></div>
      <div class="stat-row"><div class="stat-chip hot"><b id="sort-moves">0</b><span>moves</span></div><div class="stat-chip"><b id="sort-best">${store.best(BEST_KEY)}</b><span>best</span></div></div>
    </div>
    <section class="stage" style="padding:16px;min-height:320px;display:flex;flex-direction:column;align-items:center;justify-content:center">
      <div id="sort-board" style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;max-width:380px"></div>
      <div style="display:flex;gap:10px;margin-top:16px"><button class="btn ghost" id="sort-undo">↩ Undo</button><button class="btn" id="sort-reset">🔄 Reset</button></div>
      <div class="race-overlay" id="sort-overlay"></div>
    </section>`;

  const board=document.getElementById('sort-board');
  const movesEl=document.getElementById('sort-moves');
  const bestEl=document.getElementById('sort-best');
  const overlay=document.getElementById('sort-overlay');
  let history=[];

  function gen(){
    // create solvable puzzle: fill 4 tubes with 4 random colors mixed, 2 empty
    const pool=[]; COLOR_KEYS.forEach(k=>{ for(let i=0;i<4;i++) pool.push(k); });
    for(let i=pool.length-1;i>0;i--){ const j=Math.random()* (i+1)|0; [pool[i],pool[j]]=[pool[j],pool[i]]; }
    state.tubes=[]; let idx=0;
    for(let t=0;t<6;t++){
      if(t<4) state.tubes.push(pool.slice(idx,idx+4)); else state.tubes.push([]);
      idx+=4;
    }
    state.sel=-1; state.moves=0; state.over=false; history=[];
    // ensure not already solved
    if(checkWin()) gen();
  }

  function canPour(from,to){
    if(from===to) return false;
    const f=state.tubes[from], t=state.tubes[to];
    if(!f.length) return false;
    if(t.length>=4) return false;
    if(!t.length) return true;
    return f[f.length-1]===t[t.length-1];
  }

  function pour(from,to){
    if(!canPour(from,to)) { sfx.wrong(); return; }
    history.push(JSON.parse(JSON.stringify(state.tubes)));
    const color=state.tubes[from][state.tubes[from].length-1];
    let cnt=0; for(let i=state.tubes[from].length-1;i>=0 && state.tubes[from][i]===color;i--) cnt++;
    // count empty in dest
    let space=4 - state.tubes[to].length;
    let move=Math.min(cnt, space);
    for(let i=0;i<move;i++) state.tubes[to].push(state.tubes[from].pop());
    state.moves++; movesEl.textContent=state.moves; sfx.tick();
    if(checkWin()) win();
    paint();
  }

  function checkWin(){
    return state.tubes.every(t=> !t.length || (t.length===4 && t.every(c=>c===t[0])));
  }

  function paint(){
    board.innerHTML=state.tubes.map((tube,idx)=>{
      const sel=state.sel===idx;
      return `<button data-tube="${idx}" style="width:56px;height:160px;border-radius:14px 14px 18px 18px;background:rgba(255,255,255,.06);border:2px solid ${sel?'var(--violet)':'var(--border)'};display:flex;flex-direction:column-reverse;overflow:hidden;cursor:pointer;transform:${sel?'translateY(-8px)':''};transition:.15s;box-shadow:${sel?'0 8px 20px rgba(124,58,237,.4)':''}">
        ${Array.from({length:4},(_,i)=>{
          const c=tube[i];
          return `<div style="flex:1;margin:2px;border-radius:8px;background:${c?COLORS[c]:'transparent'};border:${c?'1px solid rgba(255,255,255,.2)':''}">${c?'':''}</div>`;
        }).join('')}
      </button>`;
    }).join('');
    board.querySelectorAll('[data-tube]').forEach(b=>b.addEventListener('click',()=>{
      const idx=+b.dataset.tube;
      if(state.sel===-1){ if(state.tubes[idx].length){ state.sel=idx; sfx.click(); paint(); } }
      else { const from=state.sel; state.sel=-1; pour(from, idx); paint(); }
    }));
  }

  function win(){
    state.over=true; sfx.win(); bigWin();
    const score=Math.max(100, 1000 - state.moves*10);
    const best=store.setBest(BEST_KEY, score); bestEl.textContent=best;
    overlay.style.display='flex';
    overlay.innerHTML=`<div class="result-wrap"><span class="result-emoji">🏆</span><h3 class="result-title">${score}</h3><p class="result-msg">${state.moves} moves</p><div class="stat-row" style="justify-content:center;margin-bottom:16px"><div class="stat-chip hot"><b data-test="score-final">0</b><span>score</span></div><div class="stat-chip"><b>${best}</b><span>best</span></div></div><div class="result-actions"><button class="btn lime" id="sort-again">↻ Again</button><a class="btn ghost" href="/" data-nav>🏠 Hub</a></div></div>`;
    animateNumber(overlay.querySelector('[data-test="score-final"]'), score);
    submitScore('sort', score); mountLeaderboard('sort', overlay.querySelector('.result-wrap'));
    overlay.querySelector('#sort-again').addEventListener('click',()=>{ gen(); paint(); overlay.style.display='none'; });
  }

  document.getElementById('sort-reset').addEventListener('click',()=>{ gen(); paint(); sfx.click(); });
  document.getElementById('sort-undo').addEventListener('click',()=>{
    if(history.length){ state.tubes=history.pop(); state.moves=Math.max(0,state.moves-1); movesEl.textContent=state.moves; paint(); sfx.click(); }
  });

  gen(); paint(); overlay.style.display='none';
}
