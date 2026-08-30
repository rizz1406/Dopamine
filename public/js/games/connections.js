// CONNECTIONS — NYT viral: 16 words, 4 groups of 4, 4 mistakes.
import { store } from '../store.js';
import { sfx } from '../audio.js';
import { bigWin, burst } from '../confetti.js';
import { animateNumber } from '../juice.js';
import { submitScore, mountLeaderboard } from '../scores.js';
import { maybeShowInterstitial } from '../ads.js';
import { ui } from '../app.js';
import { dayNumber, mulberry32 } from '../rng.js';

const BEST_KEY = 'connections-best';

const PUZZLES = [
  { groups:[{name:'BERRIES',words:['BLUE','STRAW','BLACK','RASP']},{name:'CAR PARTS',words:['WHEEL','BRAKE','ENGINE','MIRROR']},{name:'FISH',words:['BASS','TUNA','SALMON','TROUT']},{name:'COLORS',words:['RED','BLUE','GREEN','YELLOW']}] },
  { groups:[{name:'METALS',words:['GOLD','SILVER','IRON','COPPER']},{name:'FRUITS',words:['APPLE','MANGO','PEACH','LEMON']},{name:'ANIMALS',words:['TIGER','ZEBRA','PANDA','KOALA']},{name:'PLANETS',words:['MARS','VENUS','EARTH','SATURN']}] },
  { groups:[{name:'SPORTS',words:['TENNIS','CRICKET','RUGBY','GOLF']},{name:'DRINKS',words:['WATER','JUICE','SODA','TEA']},{name:'TOOLS',words:['HAMMER','WRENCH','DRILL','SAW']},{name:'EMOTIONS',words:['HAPPY','ANGRY','SAD','CALM']}] },
];

export function renderConnections(view, registerCleanup){
  maybeShowInterstitial();
  const day=dayNumber();
  const rng=mulberry32(day*9999+7);
  const puzzle=PUZZLES[day%PUZZLES.length];
  const all=puzzle.groups.flatMap(g=>g.words.map(w=>({word:w, group:g.name})));
  for(let i=all.length-1;i>0;i--){ const j=Math.floor(rng()* (i+1)); [all[i],all[j]]=[all[j],all[i]]; }
  const state={ picked:new Set(), solved:new Set(), mistakes:0, over:false };

  view.innerHTML=`
    <div class="game-head">
      <button class="back-btn" data-nav href="/" aria-label="Back">←</button>
      <div class="game-title"><h2>🔗 CONNECTIONS</h2><p>Create 4 groups of 4 — 4 mistakes allowed</p></div>
      <div class="stat-row"><div class="stat-chip hot"><b id="c-mist">${state.mistakes}/4</b><span>mistakes</span></div><div class="stat-chip"><b id="c-best">${store.best(BEST_KEY)}</b><span>best</span></div></div>
    </div>
    <section class="stage">
      <div id="c-solved" style="display:grid;gap:8px;margin-bottom:12px"></div>
      <div id="c-grid" style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;max-width:460px;margin:0 auto"></div>
      <div style="display:flex;gap:10px;justify-content:center;margin-top:16px">
        <button class="btn ghost" id="c-shuffle">🔀 Shuffle</button>
        <button class="btn" id="c-submit" disabled>Submit</button>
        <button class="btn ghost" id="c-deselect">Clear</button>
      </div>
      <div class="race-overlay" id="c-overlay"></div>
    </section>`;

  const grid=document.getElementById('c-grid');
  const solvedEl=document.getElementById('c-solved');
  const submitBtn=document.getElementById('c-submit');
  const mistEl=document.getElementById('c-mist');
  const overlay=document.getElementById('c-overlay');
  const bestEl=document.getElementById('c-best');

  function paint(){
    const remaining=all.filter(x=>!state.solved.has(x.group));
    grid.innerHTML=remaining.map((x,i)=>{
      const sel=state.picked.has(x.word);
      return `<button data-w="${x.word}" style="padding:14px 6px;border-radius:12px;font-weight:800;font-size:.82rem;letter-spacing:.02em;border:2px solid ${sel?'var(--violet)':'var(--border)'};background:${sel?'rgba(124,58,237,.2)':'var(--surface)'};color:var(--text);cursor:pointer;transition:.15s">${x.word}</button>`;
    }).join('');
    grid.querySelectorAll('[data-w]').forEach(b=>b.addEventListener('click',()=>{
      const w=b.dataset.w;
      if(state.picked.has(w)) state.picked.delete(w);
      else if(state.picked.size<4) state.picked.add(w);
      sfx.tick(); paint();
    }));
    submitBtn.disabled=state.picked.size!==4;
    // solved groups
    solvedEl.innerHTML=[...state.solved].map(name=>{
      const g=puzzle.groups.find(x=>x.name===name);
      return `<div style="background:linear-gradient(135deg,rgba(124,58,237,.3),rgba(168,85,247,.2));border:1px solid rgba(168,85,247,.4);border-radius:12px;padding:12px;text-align:center"><b style="font-size:.75rem;letter-spacing:.08em">${g.name}</b><div style="font-size:.82rem;margin-top:4px;opacity:.9">${g.words.join(' • ')}</div></div>`;
    }).join('');
  }

  function submit(){
    if(state.picked.size!==4||state.over) return;
    const words=[...state.picked];
    const groups=words.map(w=>all.find(x=>x.word===w).group);
    const uniq=[...new Set(groups)];
    if(uniq.length===1){
      // correct
      state.solved.add(uniq[0]); state.picked.clear(); sfx.correct(); burst();
      if(state.solved.size===4) return win();
    } else {
      state.mistakes++; mistEl.textContent=state.mistakes+'/4'; sfx.wrong();
      if(groups.filter(g=>g===groups[0]).length===3) ui.toast('One away…');
      state.picked.clear();
      if(state.mistakes>=4) return lose();
    }
    paint();
  }

  function win(){
    state.over=true; const score=Math.max(0,1000 - state.mistakes*150); sfx.win(); bigWin();
    const best=store.setBest(BEST_KEY, score); bestEl.textContent=best;
    overlay.style.display='flex';
    overlay.innerHTML=`<div class="result-wrap"><span class="result-emoji">🏆</span><h3 class="result-title">${score}</h3><p class="result-msg">${state.mistakes} mistakes</p><div class="stat-row" style="justify-content:center;margin-bottom:16px"><div class="stat-chip hot"><b data-test="score-final">0</b><span>score</span></div><div class="stat-chip"><b>${best}</b><span>best</span></div></div><div class="result-actions"><button class="btn lime" id="c-again">↻ Again</button><a class="btn ghost" href="/" data-nav>🏠 Hub</a></div></div>`;
    animateNumber(overlay.querySelector('[data-test="score-final"]'), score);
    submitScore('connections', score); mountLeaderboard('connections', overlay.querySelector('.result-wrap'));
    overlay.querySelector('#c-again').addEventListener('click',()=>location.reload());
  }

  function lose(){
    state.over=true; sfx.lose();
    overlay.style.display='flex';
    overlay.innerHTML=`<div class="result-wrap"><span class="result-emoji">😵</span><h3 class="result-title">Game Over</h3><p class="result-msg">${state.solved.size}/4 groups</p><div class="result-actions"><button class="btn lime" id="c-again2">↻ Again</button><a class="btn ghost" href="/" data-nav>🏠 Hub</a></div></div>`;
    overlay.querySelector('#c-again2').addEventListener('click',()=>location.reload());
    submitScore('connections', state.solved.size*100);
  }

  document.getElementById('c-submit').addEventListener('click', submit);
  document.getElementById('c-deselect').addEventListener('click',()=>{ state.picked.clear(); paint(); });
  document.getElementById('c-shuffle').addEventListener('click',()=>{
    for(let i=all.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [all[i],all[j]]=[all[j],all[i]]; }
    sfx.click(); paint();
  });

  paint(); overlay.style.display='none';
}
