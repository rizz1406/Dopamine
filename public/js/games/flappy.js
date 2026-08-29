// FLAPPY 3D — Three.js bird
import { store } from '../store.js';
import { sfx } from '../audio.js';
import { burst, bigWin } from '../confetti.js';
import { animateNumber } from '../juice.js';
import { submitScore, mountLeaderboard } from '../scores.js';
import { maybeShowInterstitial } from '../ads.js';
import { ui } from '../app.js';
import * as THREE from 'three';
const BEST_KEY='flappy-score';
export function renderFlappy(view, registerCleanup){
  maybeShowInterstitial();
  view.innerHTML=`
    <div class="game-head">
      <button class="back-btn" data-nav href="/" aria-label="Back">←</button>
      <div class="game-title"><h2>🐦 FLAPPY 3D</h2><p>Tap / Space — true 3D flight</p></div>
      <div class="stat-row"><div class="stat-chip hot"><b id="fl-score" data-test="score">0</b><span>score</span></div><div class="stat-chip"><b id="fl-best">${store.best(BEST_KEY)}</b><span>best</span></div></div>
    </div>
    <section class="stage" style="padding:0"><div style="position:relative"><div id="fl-wrap" data-test="canvas" style="width:100%;max-width:480px;height:560px;margin:0 auto;border-radius:16px;overflow:hidden;background:#0ea5e9"></div><div id="fl-ov" class="race-overlay" data-test="overlay"></div></div></section>`;
  const wrap=document.getElementById('fl-wrap'), ov=document.getElementById('fl-ov'), scoreEl=document.getElementById('fl-score'), bestEl=document.getElementById('fl-best');
  const scene=new THREE.Scene(); scene.background=new THREE.Color(0x38bdf8);
  const camera=new THREE.PerspectiveCamera(65, 480/560, 0.1, 100); camera.position.set(0,2,9); camera.lookAt(0,0,0);
  const renderer=new THREE.WebGLRenderer({antialias:true, alpha:true}); renderer.setSize(480,560); renderer.setPixelRatio(Math.min(2,devicePixelRatio)); wrap.appendChild(renderer.domElement);
  const light=new THREE.DirectionalLight(0xffffff,1.1); light.position.set(4,8,6); scene.add(light, new THREE.AmbientLight(0xffffff,.65));
  // bird
  const bird=new THREE.Mesh(new THREE.SphereGeometry(.42,16,16), new THREE.MeshStandardMaterial({color:0xfacc15})); bird.position.set(-2,1,0); scene.add(bird);
  const beak=new THREE.Mesh(new THREE.ConeGeometry(.14,.3,8), new THREE.MeshStandardMaterial({color:0xf97316})); beak.rotation.z=-Math.PI/2; beak.position.set(.32,0,0); bird.add(beak);
  // ground
  const ground=new THREE.Mesh(new THREE.BoxGeometry(20,.6,6), new THREE.MeshStandardMaterial({color:0x22c55e})); ground.position.set(0,-3.2,0); scene.add(ground);
  let pipes=[], score=0, vy=0, over=false, running=false, raf, speed=0.07;
  function spawnPipe(){
    const gap=2.6, top=1+Math.random()*1.6;
    const make=(y,h)=>{
      const m=new THREE.Mesh(new THREE.BoxGeometry(.9,h,1.2), new THREE.MeshStandardMaterial({color:0x22c55e}));
      m.position.set(6,y,0); scene.add(m); pipes.push(m);
    };
    make(top/2+0.3, top); make(top+gap + (3 - (top+gap))/2, 6-(top+gap));
  }
  function reset(){ pipes.forEach(p=>scene.remove(p)); pipes=[]; score=0; vy=0; bird.position.set(-2,1,0); bird.rotation.z=0; scoreEl.textContent='0'; spawnPipe(); }
  function draw(){ renderer.render(scene,camera); }
  function tick(){
    if(!running||over) return;
    vy-=0.018; bird.position.y+=vy; bird.rotation.z=vy*0.6;
    pipes.forEach(p=>p.position.x-=speed);
    if(pipes[0]&&pipes[0].position.x<-6){ pipes.splice(0,2).forEach(p=>scene.remove(p)); score++; scoreEl.textContent=score; sfx.tick(); if(score%5===0) speed+=0.006; }
    if(pipes.length<2||pipes[pipes.length-1].position.x<1) spawnPipe();
    // collisions
    if(bird.position.y<-2.6||bird.position.y>3.4) return die();
    for(const p of pipes){
      if(Math.abs(bird.position.x-p.position.x)<0.7 && Math.abs(bird.position.y-p.position.y)<p.geometry.parameters.height/2+0.38) return die();
    }
    draw(); raf=requestAnimationFrame(tick);
  }
  function flap(){ if(over) return start(); if(!running){running=true; tick();} vy=0.22; sfx.click(); }
  function die(){ over=true; running=false; cancelAnimationFrame(raf); sfx.lose(); const best=store.setBest(BEST_KEY,score); bestEl.textContent=best; if(score>=20) bigWin(); else burst(wrap.getBoundingClientRect().right-60,wrap.getBoundingClientRect().top+60,35,7);
    ov.style.display='flex'; ov.innerHTML=`<div class="result-wrap" data-test="result"><span class="result-emoji">${score>=20?'🐦👑':'🐦'}</span><h3 class="result-title" data-test="result-title">${score}</h3><p class="result-msg">${score>=20?'Sky ruler!':'Nice flight'}</p><div class="stat-row" style="justify-content:center;margin-bottom:16px"><div class="stat-chip hot"><b data-test="score-final">0</b><span>score</span></div><div class="stat-chip"><b>${best}</b><span>best</span></div></div><div class="result-actions"><button class="btn cyan" id="fl-share">📤 Share</button><button class="btn lime" id="fl-again">↻ Again</button><a class="btn ghost" href="/" data-nav>🏠 Hub</a></div></div>`;
    animateNumber(ov.querySelector('[data-test="score-final"]'),score); submitScore('flappy',score); mountLeaderboard('flappy',ov.querySelector('.result-wrap'));
    ov.querySelector('#fl-again').addEventListener('click',start); ov.querySelector('#fl-share').addEventListener('click',()=>{sfx.click(); ui.openShareModal({title:'Flappy 3D',grid:null,text:`🐦 FLAPPY 3D\nScore: ${score} — beat that?\nPlay → https://dopaminegames.pages.dev`});});
  }
  function start(){ reset(); ov.style.display='none'; draw(); running=false; over=false; sfx.click();
    ov.style.display='flex'; ov.innerHTML=`<div class="result-wrap" style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:10px"><span class="result-emoji">🐦</span><h3 class="result-title" style="font-size:1.4rem">FLAPPY 3D</h3><p class="result-msg">Tap / Space — 3D flight</p><button class="btn lime" id="fl-start">▶ START</button></div>`;
    ov.querySelector('#fl-start').addEventListener('click',()=>{ov.style.display='none'; running=true; tick();});
  }
  function onKey(e){ if(e.code==='Space'){e.preventDefault(); flap();} }
  document.addEventListener('keydown',onKey); wrap.addEventListener('pointerdown',flap); wrap.style.touchAction='none';
  registerCleanup(()=>{document.removeEventListener('keydown',onKey); cancelAnimationFrame(raf); renderer.dispose();});
  reset(); draw(); start();
  new ResizeObserver(()=>{ const w=wrap.clientWidth; renderer.setSize(w,560); camera.aspect=w/560; camera.updateProjectionMatrix(); draw(); }).observe(wrap);
}
