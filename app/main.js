// data.js(初期状態) → physics.js(1歩進める) → render.js(描く) をつなぐだけの層。
// このファイル以外はDOM(document/canvas)を直接触らない、という依存関係の向きを守っている。
import { createBodies } from './data.js';
import { step, dt, defaultLaw } from './physics.js';
import { draw } from './render.js';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let bodies = createBodies();
let simYears = 0; // シミュレーション上の経過年数（現実の経過時間とは別）
let law = { ...defaultLaw }; // 法則パラメータ。リセットしても戻さない（decisions.md A-5）

// 1フレームあたり何ステップ計算するか（描画60fpsに対し物理は細かく回す）
// dt=1/2000年、STEPS_PER_FRAME=20 → 60fpsなら実時間1秒でシミュレーション0.6年進む。
// decisions.md A-4の決定により「時間の流れ」スライダーの実体はこの値。
// dtそのものは変えず、速度だけをこの値で変える（法則を壊した結果と積分誤差を混同しないため）。
let stepsPerFrame = 20;

// requestAnimationFrame でブラウザの描画タイミングに合わせて毎フレーム呼ばれるループ。
function loop() {
  // 物理は描画より細かい刻みで複数回進める（精度を保つため）
  for (let k = 0; k < stepsPerFrame; k++) {
    step(bodies, law);
    simYears += dt * law.dtSign;
  }
  // 各天体の現在位置を軌跡履歴に追加。古いものは捨てて配列が際限なく伸びないようにする。
  for (const b of bodies) {
    b.trail.push({ x: b.x, y: b.y });
    if (b.trail.length > 1500) b.trail.shift();
  }

  draw(ctx, bodies, canvas);

  document.getElementById('year').textContent = simYears.toFixed(2);

  requestAnimationFrame(loop); // 次のフレームでまたloopを呼んでもらう（無限ループ）
}
loop();

// リセットボタン: 天体を初期状態に作り直し、経過年数もゼロに戻す（lawは維持する。decisions.md A-5）
document.getElementById('reset').onclick = () => {
  bodies = createBodies();
  simYears = 0;
};

// 空間の次元スライダー: 動かした瞬間からlawに反映される（decisions.md A-6）
const dimSlider = document.getElementById('dim');
const dimVal = document.getElementById('dim-val');
dimSlider.addEventListener('input', () => {
  law.dimension = parseFloat(dimSlider.value);
  dimVal.textContent = law.dimension.toFixed(2);
});

// 重力定数Gスライダー。data.jsのGとは独立で、リセットしても初期速度には影響しない（decisions.md B-2）
const gSlider = document.getElementById('g');
const gVal = document.getElementById('g-val');
gSlider.addEventListener('input', () => {
  law.G = parseFloat(gSlider.value);
  gVal.textContent = law.G.toFixed(3);
});

// 太陽質量スライダー。太陽が及ぼす力にだけ掛かる倍率（design.md 6-4, 7章）
const sunMassSlider = document.getElementById('sun-mass');
const sunMassVal = document.getElementById('sun-mass-val');
sunMassSlider.addEventListener('input', () => {
  law.sunMass = parseFloat(sunMassSlider.value);
  sunMassVal.textContent = law.sunMass.toFixed(2);
});

// 時間の流れスライダー。値の絶対値がstepsPerFrame（速さ）、符号がlaw.dtSign（順行/逆行）になる
// （decisions.md A-4：design.md 7章のdtスライダーはこの形に置き換える）
const timeSlider = document.getElementById('time');
const timeVal = document.getElementById('time-val');
timeSlider.addEventListener('input', () => {
  const v = parseFloat(timeSlider.value);
  law.dtSign = v < 0 ? -1 : 1;
  stepsPerFrame = Math.max(1, Math.abs(v)); // 0のときも1歩は進める
  timeVal.textContent = v.toFixed(0);
});
