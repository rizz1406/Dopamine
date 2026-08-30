// AIM TRAINER — 30 targets, 30s, hit as fast as you can. Reflex + accuracy.
import { store } from '../store.js';
import { sfx } from '../audio.js';
import { bigWin } from '../confetti.js';
import { animateNumber } from '../juice.js';
import { submitScore, mountLeaderboard } from '../scores.js';
import { maybeShowInterstitial } from '../ads.js';
import { ui } from '../app.js';

const BEST_KEY = 'aim-best';
const DURATION = 30;
const TOTAL = 30;

export function renderAim(view, registerCleanup){
  maybeShowInterstitial();
  const state={ hits:0, idx:0, time:DURATION, timer:null, playing:false };

  view.innerHTML=`
    <div class="game-head">
      <button class="back-btn" data-nav href="/" aria-label="Back">←</button>
      <div class="game-title"><h2>🎯 AIM TRAINER</h2><p>${TOTAL} targets — ${DURATION}s — how fast can you click?</p></div>
      <div class="stat-row">
        <div class="stat-chip hot"><b id="aim-hits">0</b><span>hits</span></div>
        <div class="stat-chip"><b id="aim-time">${DURATION}</b><span>sec</span></div>
        <div class="stat-chip"><b id="aim-best">${store.best(BEST_KEY)}</b><span>best</span></div>
      </div>
    </div>
    <section class="stage" id="aim-stage" style="position:relative;min-height:340px;max-height:52vh;display:flex;align-items:center;justify-content:center;overflow:hidden;padding:0;background:#0a0a14;border-radius:18px">
      <div id="aim-area" style="position:absolute;inset:0"></div>
      <div class="race-overlay" id="aim-overlay" style="background:rgba(11,11,18,.88)"></div>
    </section>`;

  const area=document.getElementById('aim-area');
  const overlay=document.getElementById('aim-overlay');
  const hitsEl=document.getElementById('aim-hits');
  const timeEl=document.getElementById('aim-time');
  const bestEl=document.getElementById('aim-best');

  function spawn(){
    if(state.idx>=TOTAL||!state.playing) return;
    area.innerHTML='';
    const btn=document.createElement('button');
    const size= 52 - Math.min(16, state.idx*0.5);
    btn.style.cssText=`position:absolute;width:${size}px;height:${size}px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fde68a,#ef4444 55%,#991b1b);border:3px solid #fff;box-shadow:0 4px 18px rgba(239,68,68,.6),0 0 0 8px rgba(239,68,68,.15);cursor:pointer;transition:transform .08s`;
    const pad=12;
    const rect=area.getBoundingClientRect();
    const x=Math.random()*(rect.width - size - pad*2)+pad;
    const y=Math.random()*(rect.height - size - pad*2)+pad;
    btn.style.left=x+'px'; btn.style.top=y+'px';
    btn.addEventListener('click',()=>{
      state.hits++; hitsEl.textContent=state.hits; sfx.tick();
      btn.style.transform='scale(1.4)'; btn.style.opacity='0';
      setTimeout(()=>{ if(state.playing) spawn(); },80);
    });
    // also allow tap
    btn.addEventListener('touchstart',e=>{ e.preventDefault(); btn.click(); },{passive:false});
    area.appendChild(btn);
    state.idx++;
  }

  function start(){
    state.hits=0; state.idx=0; state.time=DURATION; state.playing=true;
    hitsEl.textContent='0'; timeEl.textContent=DURATION; overlay.style.display='none';
    spawn();
    clearInterval(state.timer);
    state.timer=setInterval(()=>{
      state.time--; timeEl.textContent=state.time;
      if(state.time<=0 || state.idx>=TOTAL) end();
    },1000);
  }

  function end(){
    clearInterval(state.timer); state.playing=false; area.innerHTML='';
    const score=Math.round(state.hits*100 + Math.max(0,state.time*5));
    sfx.win(); if(state.hits>=25) bigWin();
    const best=store.setBest(BEST_KEY, score); bestEl.textContent=best;
    overlay.style.display='flex';
    overlay.innerHTML=`<div class="result-wrap"><span class="result-emoji">${state.hits>=25?'🏆':'🎯'}</span><h3 class="result-title">${score}</h3><p class="result-msg">${state.hits}/${TOTAL} hits • ${state.time}s left</p><div class="stat-row" style="justify-content:center;margin-bottom:16px"><div class="stat-chip hot"><b data-test="score-final">0</b><span>score</span></div><div class="stat-chip"><b>${best}</b><span>best</span></div></div><div class="result-actions"><button class="btn lime" id="aim-again">↻ Again</button><a class="btn ghost" href="/" data-nav>🏠 Hub</a></div></div>`;
    animateNumber(overlay.querySelector('[data-test="score-final"]'), score);
    submitScore('aim', score); mountLeaderboard('aim', overlay.querySelector('.result-wrap'));
    overlay.querySelector('#aim-again').addEventListener('click', start);
  }

  overlay.innerHTML=`<div class="result-wrap" style="text-align:center"><span class="result-emoji">🎯</span><h3 class="result-title">AIM TRAINER</h3><p class="result-msg">Hit ${TOTAL} targets as fast as you can</p><button class="btn lime" id="aim-start">▶ START</button></div>`;
  overlay.style.display='flex';
  overlay.querySelector('#aim-start').addEventListener('click', start);
  registerCleanup(()=>clearInterval(state.timer));
}
