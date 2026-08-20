import { createBodies } from './data.js';
import { step, dt } from './physics.js';
import { draw } from './render.js';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let bodies = createBodies();
let simYears = 0;

// 1フレームあたり何ステップ計算するか（描画60fpsに対し物理は細かく回す）
const STEPS_PER_FRAME = 20;

function loop() {
  for (let k = 0; k < STEPS_PER_FRAME; k++) {
    step(bodies);
    simYears += dt;
  }
  for (const b of bodies) {
    b.trail.push({ x: b.x, y: b.y });
    if (b.trail.length > 3000) b.trail.shift();
  }

  draw(ctx, bodies, canvas);

  document.getElementById('year').textContent = simYears.toFixed(2);

  requestAnimationFrame(loop);
}
loop();

document.getElementById('reset').onclick = () => {
  bodies = createBodies();
  simYears = 0;
};
