// Canvas confetti bursts — zero dependencies.

let canvas, particles = [], rafId = null;
const COLORS = ['#7c3aed', '#22d3ee', '#f472b6', '#a3e635', '#fbbf24', '#ffffff'];

function ensureCanvas() {
  if (canvas) return canvas;
  canvas = document.createElement('canvas');
  canvas.id = 'confetti-canvas';
  Object.assign(canvas.style, { position: 'fixed', inset: '0', pointerEvents: 'none', zIndex: '9999' });
  document.body.appendChild(canvas);
  resize();
  window.addEventListener('resize', resize);
  return canvas;
}

function resize() {
  if (!canvas) return;
  canvas.width = innerWidth * devicePixelRatio;
  canvas.height = innerHeight * devicePixelRatio;
  canvas.getContext('2d').scale(devicePixelRatio, devicePixelRatio);
}

export function burst(x = innerWidth / 2, y = innerHeight * 0.35, count = 90, power = 9) {
  ensureCanvas();
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = power * (0.35 + Math.random());
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - power * 0.45,
      size: 3 + Math.random() * 5,
      color: COLORS[(Math.random() * COLORS.length) | 0],
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.35,
      life: 1,
      decay: 0.008 + Math.random() * 0.012,
      shape: Math.random() > 0.5 ? 'rect' : 'circle'
    });
  }
  if (!rafId) rafId = requestAnimationFrame(tick);
}

export function bigWin() {
  burst(innerWidth * 0.25, innerHeight * 0.3, 110, 11);
  setTimeout(() => burst(innerWidth * 0.75, innerHeight * 0.3, 110, 11), 160);
  setTimeout(() => burst(innerWidth * 0.5, innerHeight * 0.25, 130, 12), 320);
}

function tick() {
  const c2d = canvas.getContext('2d');
  c2d.clearRect(0, 0, canvas.width, canvas.height);
  particles = particles.filter(p => p.life > 0);
  for (const p of particles) {
    p.x += p.vx; p.y += p.vy;
    p.vy += 0.18; p.vx *= 0.99; p.rot += p.vr;
    p.life -= p.decay;
    c2d.save();
    c2d.globalAlpha = Math.max(0, p.life);
    c2d.translate(p.x, p.y);
    c2d.rotate(p.rot);
    c2d.fillStyle = p.color;
    if (p.shape === 'rect') c2d.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
    else { c2d.beginPath(); c2d.arc(0, 0, p.size / 2, 0, 7); c2d.fill(); }
    c2d.restore();
  }
  if (particles.length) rafId = requestAnimationFrame(tick);
  else { rafId = null; c2d.clearRect(0, 0, canvas.width, canvas.height); }
}
