// TETRIS — classic stacking puzzle
import { store } from '../store.js';
import { sfx } from '../audio.js';
import { burst, bigWin } from '../confetti.js';
import { animateNumber } from '../juice.js';
import { submitScore, mountLeaderboard } from '../scores.js';
import { maybeShowInterstitial } from '../ads.js';
import { ui } from '../app.js';

const BEST_KEY = 'tetris-score';
const COLS = 10, ROWS = 20, CS = 24;
const COLORS = { I:'#22d3ee',J:'#3b82f6',L:'#f97316',O:'#facc15',S:'#22c55e',T:'#a855f7',Z:'#ef4444' };
const SHAPES = {
  I:[[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
  J:[[1,0,0],[1,1,1],[0,0,0]],
  L:[[0,0,1],[1,1,1],[0,0,0]],
  O:[[1,1],[1,1]],
  S:[[0,1,1],[1,1,0],[0,0,0]],
  T:[[0,1,0],[1,1,1],[0,0,0]],
  Z:[[1,1,0],[0,1,1],[0,0,0]]
};
const BAG = Object.keys(SHAPES);

function rot(m){ const n=m.length; const r=Array(n).fill(0).map(()=>Array(n).fill(0)); for(let y=0;y<n;y++) for(let x=0;x<n;x++) r[x][n-1-y]=m[y][x]; return r; }

export function renderTetris(view, registerCleanup){
  maybeShowInterstitial();
  const W=COLS*CS, H=ROWS*CS;
  view.innerHTML=`
    <div class="game-head">
      <button class="back-btn" data-nav href="/" aria-label="Back">←</button>
      <div class="game-title"><h2>🧱 TETRIS</h2><p>Stack, clear lines, survive.</p></div>
      <div class="stat-row">
        <div class="stat-chip hot"><b id="tet-score" data-test="score">0</b><span>score</span></div>
        <div class="stat-chip"><b id="tet-best">${store.best(BEST_KEY)}</b><span>best</span></div>
      </div>
    </div>
    <section class="stage" style="padding:14px">
      <div style="display:flex;gap:14px;justify-content:center;flex-wrap:wrap">
        <div style="position:relative"><canvas id="tet-cv" data-test="canvas" width="${W}" height="${H}" style="border-radius:12px;display:block;background:#101018"></canvas><div id="tet-ov" class="race-overlay" data-test="overlay"></div></div>
        <div style="min-width:110px">
          <div style="background:rgba(255,255,255,.06);border-radius:12px;padding:10px;margin-bottom:10px"><div style="font-size:.75rem;opacity:.7">NEXT</div><canvas id="tet-next" width="80" height="80"></canvas></div>
          <div style="background:rgba(255,255,255,.06);border-radius:12px;padding:10px"><div>Lines: <b id="tet-lines">0</b></div><div>Level: <b id="tet-level">1</b></div></div>
        </div>
      </div>
      <div class="race-controls" data-test="controls" style="margin-top:12px">
        <button class="race-btn" data-test="btn-left" aria-label="Left">◀</button>
        <button class="race-btn" data-test="btn-rotate" aria-label="Rotate">↻</button>
        <button class="race-btn" data-test="btn-right" aria-label="Right">▶</button>
        <button class="race-btn" data-test="btn-down" aria-label="Down">▼</button>
        <button class="race-btn" data-test="btn-drop" aria-label="Drop">⤓</button>
      </div>
    </section>`;
  const cv=document.getElementById('tet-cv'), ctx=cv.getContext('2d');
  const nc=document.getElementById('tet-next'), nctx=nc.getContext('2d');
  const ov=document.getElementById('tet-ov');
  const scoreEl=document.getElementById('tet-score'), bestEl=document.getElementById('tet-best');
  const linesEl=document.getElementById('tet-lines'), levelEl=document.getElementById('tet-level');
  let board, cur, next, bag, score, lines, level, dropMs, timer, over=false, running=false;

  function newBag(){ bag=[...BAG].sort(()=>Math.random()-.5); }
  function take(){ if(!bag.length) newBag(); const k=bag.pop(); return {k, m:SHAPES[k].map(r=>[...r]), x:4, y:0}; }
  function coll(m,x,y){ for(let r=0;r<m.length;r++) for(let c=0;c<m[r].length;c++) if(m[r][c]){ const nx=x+c, ny=y+r; if(nx<0||nx>=COLS||ny>=ROWS) return true; if(ny>=0&&board[ny][nx]) return true; } return false; }
  function merge(){ cur.m.forEach((r,y)=>r.forEach((v,x)=>{ if(v&&cur.y+y>=0) board[cur.y+y][cur.x+x]=cur.k; })); }
  function clearLines(){ let n=0; for(let y=ROWS-1;y>=0;y--) if(board[y].every(v=>v)){ board.splice(y,1); board.unshift(Array(COLS).fill(0)); n++; y++; } return n; }
  function drawCell(ctx2,x,y,k,cs2){ ctx2.fillStyle=COLORS[k]; ctx2.fillRect(x*cs2+1,y*cs2+1,cs2-2,cs2-2); ctx2.fillStyle='rgba(255,255,255,.18)'; ctx2.fillRect(x*cs2+1,y*cs2+1,cs2-2,4); }
  function draw(){
    ctx.fillStyle='#101018'; ctx.fillRect(0,0,W,H);
    for(let y=0;y<ROWS;y++) for(let x=0;x<COLS;x++) if(board[y][x]) drawCell(ctx,x,y,board[y][x],CS);
    if(cur) cur.m.forEach((r,y)=>r.forEach((v,x)=>{ if(v) drawCell(ctx,cur.x+x,cur.y+y,cur.k,CS); }));
    // ghost
    if(cur){ let gy=cur.y; while(!coll(cur.m,cur.x,gy+1)) gy++; cur.m.forEach((r,y)=>r.forEach((v,x)=>{ if(v){ ctx.fillStyle='rgba(255,255,255,.12)'; ctx.fillRect((cur.x+x)*CS+1,(gy+y)*CS+1,CS-2,CS-2);} })); }
    // next
    nctx.clearRect(0,0,80,80); if(next){ const s=14; const off=(4-next.m.length)*s/2+6; next.m.forEach((r,y)=>r.forEach((v,x)=>{ if(v) drawCell(nctx,x,y,next.k,s); })); }
  }
  function spawn(){
    cur=next; next=take();
    if(coll(cur.m,cur.x,cur.y)){ return gameOver(); }
  }
  function scoreLines(n){
    const pts=[0,100,300,500,800][n]||0; const add=pts*(level); score+=add; lines+=n; level=(lines/10|0)+1; dropMs=Math.max(80,400-level*30);
    scoreEl.textContent=score; linesEl.textContent=lines; levelEl.textContent=level;
    if(n) sfx.correct(); if(n===4) bigWin();
  }
  function tick(){
    if(!running||over) return;
    if(coll(cur.m,cur.x,cur.y+1)){ merge(); const n=clearLines(); scoreLines(n); spawn(); draw(); timer=setTimeout(tick,dropMs); }
    else { cur.y++; draw(); timer=setTimeout(tick,dropMs); }
  }
  function move(dx){ if(coll(cur.m,cur.x+dx,cur.y)) return; cur.x+=dx; draw(); sfx.tick(); }
  function rotate(){ const r=rot(cur.m); if(!coll(r,cur.x,cur.y)) cur.m=r; else if(!coll(r,cur.x-1,cur.y)) {cur.x--; cur.m=r;} else if(!coll(r,cur.x+1,cur.y)) {cur.x++; cur.m=r;} draw(); }
  function soft(){ if(coll(cur.m,cur.x,cur.y+1)) return; cur.y++; score+=1; scoreEl.textContent=score; draw(); }
  function hard(){ let d=0; while(!coll(cur.m,cur.x,cur.y+1)){cur.y++; d++;} score+=d*2; scoreEl.textContent=score; merge(); const n=clearLines(); scoreLines(n); spawn(); draw(); sfx.whoosh(); }
  function onKey(e){
    if(!running||over) return;
    const k=e.key; if(k==='ArrowLeft'||k==='a') {e.preventDefault(); move(-1);} else if(k==='ArrowRight'||k==='d'){e.preventDefault(); move(1);} else if(k==='ArrowDown'||k==='s'){e.preventDefault(); soft();} else if(k==='ArrowUp'||k==='w'||k==='x'){e.preventDefault(); rotate();} else if(k===' '){e.preventDefault(); hard();}
  }
  document.addEventListener('keydown',onKey);
  registerCleanup(()=>{document.removeEventListener('keydown',onKey); clearTimeout(timer);});

  function start(){
    sfx.click(); board=Array(ROWS).fill(0).map(()=>Array(COLS).fill(0)); newBag(); next=take(); cur=take(); score=0; lines=0; level=1; dropMs=400; over=false; running=true;
    scoreEl.textContent='0'; linesEl.textContent='0'; levelEl.textContent='1'; ov.style.display='none'; draw(); clearTimeout(timer); timer=setTimeout(tick,dropMs);
  }
  function gameOver(){
    running=false; over=true; clearTimeout(timer); sfx.lose(); const best=store.setBest(BEST_KEY,score); bestEl.textContent=best;
    if(score>=2000) bigWin(); else burst(cv.getBoundingClientRect().right-60,cv.getBoundingClientRect().top+60,45,8);
    ov.style.display='flex'; ov.innerHTML=`
      <div class="result-wrap" data-test="result">
        <span class="result-emoji">${score>=2000?'🧱👑':'🧱'}</span>
        <h3 class="result-title" data-test="result-title">${score}</h3>
        <p class="result-msg">${lines} lines · level ${level}</p>
        <div class="stat-row" style="justify-content:center;margin-bottom:16px">
          <div class="stat-chip hot"><b data-test="score-final">0</b><span>score</span></div>
          <div class="stat-chip"><b>${best}</b><span>best</span></div>
        </div>
        <div class="result-actions">
          <button class="btn cyan" id="tet-share">📤 Share</button>
          <button class="btn lime" id="tet-again">↻ Again</button>
          <a class="btn ghost" href="/" data-nav>🏠 Hub</a>
        </div>
      </div>`;
    animateNumber(ov.querySelector('[data-test="score-final"]'),score);
    submitScore('tetris',score); mountLeaderboard('tetris',ov.querySelector('.result-wrap'));
    ov.querySelector('#tet-again').addEventListener('click',start);
    ov.querySelector('#tet-share').addEventListener('click',()=>{sfx.click(); ui.openShareModal({title:'Tetris',grid:null,text:`🧱 TETRIS\nScore: ${score} (${lines} lines) — beat that?\nPlay → https://dopaminegames.pages.dev`});});
  }
  ov.innerHTML=`<div class="result-wrap" style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:10px"><span class="result-emoji">🧱</span><h3 class="result-title" style="font-size:1.4rem">TETRIS</h3><p class="result-msg">Arrows/WASD + Space hard drop</p><button class="btn lime" id="tet-start">▶ START</button></div>`;
  ov.style.display='flex'; document.getElementById('tet-start').addEventListener('click',start);
  view.querySelector('[data-test="btn-left"]').addEventListener('click',()=>move(-1));
  view.querySelector('[data-test="btn-right"]').addEventListener('click',()=>move(1));
  view.querySelector('[data-test="btn-rotate"]').addEventListener('click',rotate);
  view.querySelector('[data-test="btn-down"]').addEventListener('click',soft);
  view.querySelector('[data-test="btn-drop"]').addEventListener('click',hard);
  board=Array(ROWS).fill(0).map(()=>Array(COLS).fill(0)); newBag(); next=take(); cur=take(); draw();
}
