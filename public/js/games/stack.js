// STACK 3D — Three.js tower
import { store } from '../store.js';
import { sfx } from '../audio.js';
import { burst, bigWin } from '../confetti.js';
import { animateNumber } from '../juice.js';
import { submitScore, mountLeaderboard } from '../scores.js';
import { maybeShowInterstitial } from '../ads.js';
import { ui } from '../app.js';
import * as THREE from 'three';
const BEST_KEY='stack-score';
export function renderStack(view, registerCleanup){
  maybeShowInterstitial();
  view.innerHTML=`
    <div class="game-head">
      <button class="back-btn" data-nav href="/" aria-label="Back">←</button>
      <div class="game-title"><h2>🧊 STACK 3D</h2><p>Tap to stack — true 3D</p></div>
      <div class="stat-row"><div class="stat-chip hot"><b id="st-score" data-test="score">0</b><span>score</span></div><div class="stat-chip"><b id="st-best">${store.best(BEST_KEY)}</b><span>best</span></div></div>
    </div>
    <section class="stage" style="padding:0"><div style="position:relative"><div id="st-wrap" data-test="canvas" style="width:100%;max-width:480px;height:560px;margin:0 auto;border-radius:16px;overflow:hidden;background:linear-gradient(#0b0b12,#1a1030)"></div><div id="st-ov" class="race-overlay" data-test="overlay"></div></div><div style="text-align:center;margin-top:10px"><button class="btn lime" id="st-tap" data-test="tap" style="min-width:180px;min-height:56px;font-size:1.15rem">TAP TO STACK</button></div></section>`;
  const wrap=document.getElementById('st-wrap'), ov=document.getElementById('st-ov'), scoreEl=document.getElementById('st-score'), bestEl=document.getElementById('st-best'), tapBtn=document.getElementById('st-tap');
  const scene=new THREE.Scene(); scene.background=new THREE.Color(0x0b0b12);
  const camera=new THREE.PerspectiveCamera(45, 480/560, 0.1, 100); camera.position.set(6,7,10); camera.lookAt(0,0,0);
  const renderer=new THREE.WebGLRenderer({antialias:true}); renderer.setSize(480,560); renderer.setPixelRatio(Math.min(2,devicePixelRatio)); wrap.appendChild(renderer.domElement);
  scene.add(new THREE.AmbientLight(0xffffff,.85)); const dir=new THREE.DirectionalLight(0xffffff,1); dir.position.set(5,10,7); scene.add(dir);
  let stack=[], cur=null, dirX=1, speed=0.06, score=0, over=false, running=false, raf;
  function colorFor(i){ return new THREE.Color(`hsl(${230+i*9} 78% 62%)`); }
  function addBlock(x,z,w,d,y){
    const g=new THREE.BoxGeometry(w,.6,d); const m=new THREE.MeshStandardMaterial({color:colorFor(stack.length)}); const b=new THREE.Mesh(g,m); b.position.set(x,y,z); scene.add(b); return b;
  }
  function reset(){
    stack.forEach(b=>scene.remove(b.mesh)); stack=[]; if(cur) scene.remove(cur.mesh);
    const base=addBlock(0,0,3,3,0); stack.push({mesh:base,x:0,z:0,w:3,d:3,y:0});
    cur={mesh:addBlock(-3,0,3,3,.6), x:-3,z:0,w:3,d:3,y:.6, dir:1}; score=0; scoreEl.textContent='0'; over=false; running=false; speed=0.06;
  }
  function draw(){ renderer.render(scene,camera); }
  function tick(){
    if(!running||over) return;
    cur.x+=dirX*speed;
    if(cur.x>3||cur.x<-3) dirX*=-1;
    cur.mesh.position.x=cur.x;
    // camera follow
    camera.position.y=7+stack.length*0.12; camera.lookAt(0, stack.length*0.3, 0);
    draw(); raf=requestAnimationFrame(tick);
  }
  function place(){
    if(over) return;
    if(!running){ running=true; tick(); sfx.click(); return; }
    const prev=stack[stack.length-1];
    const overlap=Math.max(0, Math.min(cur.x+cur.w/2, prev.x+prev.w/2) - Math.max(cur.x-cur.w/2, prev.x-prev.w/2));
    // simplified overlap on X only (alternating axis each level)
    const isX=stack.length%2===1;
    let newW=cur.w, newD=cur.d, newX=cur.x, newZ=cur.z;
    if(isX){
      const left=Math.max(cur.x-cur.w/2, prev.x-prev.w/2), right=Math.min(cur.x+cur.w/2, prev.x+prev.w/2);
      if(right-left<=0.15) return die();
      newW=right-left; newX=(left+right)/2;
    } else {
      const front=Math.max(cur.z-cur.d/2, prev.z-prev.d/2), back=Math.min(cur.z+cur.d/2, prev.z+prev.d/2);
      if(back-front<=0.15) return die();
      newD=back-front; newZ=(front+back)/2;
    }
    // perfect?
    const perfect=Math.abs(cur.w-newW)<0.12 && Math.abs(cur.d-newD)<0.12;
    if(perfect){ sfx.win(); newW=prev.w; newD=prev.d; newX=prev.x; newZ=prev.z; }
    else { sfx.correct(); if(Math.abs(overlap)<1) { /* small miss */ } }
    // cut cur
    cur.mesh.geometry.dispose(); cur.mesh.geometry=new THREE.BoxGeometry(newW,.6,newD);
    cur.mesh.position.set(newX,cur.mesh.position.y,newZ);
    stack.push({mesh:cur.mesh,x:newX,z:newZ,w:newW,d:newD,y:cur.mesh.position.y});
    score++; scoreEl.textContent=score; if(score%5===0) speed+=0.008;
    // next block
    const nextY=cur.mesh.position.y+0.6;
    const nextIsX=stack.length%2===0;
    const nx=nextIsX?-3:prev.x, nz=nextIsX?prev.z:-3;
    const nm=new THREE.Mesh(new THREE.BoxGeometry(newW,.6,newD), new THREE.MeshStandardMaterial({color:colorFor(stack.length)}));
    nm.position.set(nx,nextY,nz); scene.add(nm);
    cur={mesh:nm,x:nx,z:nz,w:newW,d:newD,y:nextY, dir:dirX};
    draw();
  }
  function die(){ over=true; running=false; cancelAnimationFrame(raf); sfx.lose(); const best=store.setBest(BEST_KEY,score); bestEl.textContent=best; if(score>=18) bigWin(); else burst(wrap.getBoundingClientRect().right-60,wrap.getBoundingClientRect().top+60,35,7);
    ov.style.display='flex'; ov.innerHTML=`<div class="result-wrap" data-test="result"><span class="result-emoji">${score>=18?'🧊👑':'🧊'}</span><h3 class="result-title" data-test="result-title">${score}</h3><p class="result-msg">${score>=18?'Sky high!':'Keep stacking!'}</p><div class="stat-row" style="justify-content:center;margin-bottom:16px"><div class="stat-chip hot"><b data-test="score-final">0</b><span>score</span></div><div class="stat-chip"><b>${best}</b><span>best</span></div></div><div class="result-actions"><button class="btn cyan" id="st-share">📤 Share</button><button class="btn lime" id="st-again">↻ Again</button><a class="btn ghost" href="/" data-nav>🏠 Hub</a></div></div>`;
    animateNumber(ov.querySelector('[data-test="score-final"]'),score); submitScore('stack',score); mountLeaderboard('stack',ov.querySelector('.result-wrap'));
    ov.querySelector('#st-again').addEventListener('click',start); ov.querySelector('#st-share').addEventListener('click',()=>{sfx.click(); ui.openShareModal({title:'Stack 3D',grid:null,text:`🧊 STACK 3D\nHeight: ${score} — beat that?\nPlay → https://dopaminegames.pages.dev`});});
  }
  function start(){ reset(); ov.style.display='none'; draw(); running=false; over=false; sfx.click();
    ov.style.display='flex'; ov.innerHTML=`<div class="result-wrap" style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:10px"><span class="result-emoji">🧊</span><h3 class="result-title" style="font-size:1.4rem">STACK 3D</h3><p class="result-msg">Tap / Space — 3D stacking</p><button class="btn lime" id="st-start">▶ START</button></div>`;
    ov.querySelector('#st-start').addEventListener('click',()=>{ov.style.display='none'; running=true; tick();});
  }
  function onKey(e){ if(e.code==='Space'){e.preventDefault(); place();} }
  document.addEventListener('keydown',onKey); wrap.addEventListener('pointerdown',place); tapBtn.addEventListener('click',place); wrap.style.touchAction='none';
  registerCleanup(()=>{document.removeEventListener('keydown',onKey); cancelAnimationFrame(raf); renderer.dispose();});
  reset(); draw(); start();
  new ResizeObserver(()=>{ const w=wrap.clientWidth; renderer.setSize(w,560); camera.aspect=w/560; camera.updateProjectionMatrix(); draw(); }).observe(wrap);
}
