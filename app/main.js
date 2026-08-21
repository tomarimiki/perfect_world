// data.js(初期状態) → physics.js(1歩進める) → render.js(描く) をつなぐだけの層。
// このファイル以外はDOM(document/canvas)を直接触らない、という依存関係の向きを守っている。
import { createBodies } from './data.js';
import { step, dt } from './physics.js';
import { draw } from './render.js';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let bodies = createBodies();
let simYears = 0; // シミュレーション上の経過年数（現実の経過時間とは別）

// 1フレームあたり何ステップ計算するか（描画60fpsに対し物理は細かく回す）
// dt=1/2000年、STEPS_PER_FRAME=20 → 60fpsなら実時間1秒でシミュレーション0.6年進む。
const STEPS_PER_FRAME = 20;

// requestAnimationFrame でブラウザの描画タイミングに合わせて毎フレーム呼ばれるループ。
function loop() {
  // 物理は描画より細かい刻みで複数回進める（精度を保つため）
  for (let k = 0; k < STEPS_PER_FRAME; k++) {
    step(bodies);
    simYears += dt;
  }
  // 各天体の現在位置を軌跡履歴に追加。古いものは捨てて配列が際限なく伸びないようにする。
  for (const b of bodies) {
    b.trail.push({ x: b.x, y: b.y });
    if (b.trail.length > 3000) b.trail.shift();
  }

  draw(ctx, bodies, canvas);

  document.getElementById('year').textContent = simYears.toFixed(2);

  requestAnimationFrame(loop); // 次のフレームでまたloopを呼んでもらう（無限ループ）
}
loop();

// リセットボタン: 天体を初期状態に作り直し、経過年数もゼロに戻す
document.getElementById('reset').onclick = () => {
  bodies = createBodies();
  simYears = 0;
};
