// data.js(初期状態) → physics.js(1歩進める) → render.js(描く) をつなぐだけの層。
// このファイル以外はDOM(document/canvas)を直接触らない、という依存関係の向きを守っている。
import { createBodies } from './data.js';
import { step, dt, defaultLaw, totalEnergy } from './physics.js';
import { draw, drawEnergyGraph } from './render.js';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let bodies = createBodies();
let simYears = 0; // シミュレーション上の経過年数（現実の経過時間とは別）
let law = { ...defaultLaw }; // 法則パラメータ。リセットしても戻さない（decisions.md A-5）

// --- エネルギーグラフ（decisions.md A-7）。メインcanvasの残像処理と干渉しないよう別canvasに描く ---
const energyCanvas = document.getElementById('energy-graph');
const energyCtx = energyCanvas.getContext('2d');
const ENERGY_CAPACITY = 600; // 1フレーム1点で直近10秒ぶん。超えたら先頭を捨てる
let energyHistory = [];       // { value: 変化率 または null, marker: 法則を変えた瞬間か }
let energy0 = totalEnergy(bodies, law); // 変化率の基準。dimension ≠ 3 で始まったときはnullで、最初に定義された値を使う
let pendingMarker = false;    // スライダーが動いたら、次に記録する点に縦線マーカーを付ける（decisions.md A-6）

// 直近1秒（60点）の動きから、グラフの状態を一言で表す。グラフだけでは何を見ればいいか分かりにくいため。
// 「保存」の判定幅 1e-5（0.001%）は design.md 11章テスト2 の許容値。Leapfrogの正常なゆらぎはこの内側に収まる。
const STATUS_WINDOW = 60;
const CONSERVED_RANGE = 1e-5;
function energyStatus(history) {
  const recent = history.slice(-STATUS_WINDOW);
  const last = recent[recent.length - 1];
  if (!last || last.value === null) return { text: '定義されない（次元が3でない）', kind: 'undefined' };

  const values = recent.filter(p => p.value !== null).map(p => p.value);
  const range = Math.max(...values) - Math.min(...values);
  if (range < CONSERVED_RANGE) return { text: '保存されている', kind: 'ok' };

  // 窓の最初と最後の差が振れ幅の半分を超えていれば一方向の変化、そうでなければ上下に揺れているだけ。
  // 揺れは相対論（速度に依存する力）のほか、Gや太陽質量を上げて水星が太陽に近づいたときの
  // 積分誤差（dt固定のため。decisions.md A-4）でも出る。どちらも一方向には流れない
  const net = values[values.length - 1] - values[0];
  if (Math.abs(net) > range / 2) return { text: net < 0 ? '減っている' : '増えている', kind: 'broken' };
  return { text: '揺れている（増減の傾向なし）', kind: 'broken' };
}

// デバッグ用：URLパラメータでlawの値を直接指定する（decisions.md B-6）。
// 例: ?gr=1 とすると design.md 11章テスト4（水星の近日点移動42.98秒角）の検算ができる。
// スライダーの刻み幅では gr=1 を正確に入力できないための抜け道で、UIには出さない。
const debugParams = new URLSearchParams(location.search);
for (const key of ['gr', 'gw']) {
  if (debugParams.has(key)) law[key] = parseFloat(debugParams.get(key));
}

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

  // 全エネルギーを記録してグラフに描く。dimension ≠ 3 では定義されないのでnull（decisions.md B-4）
  const energy = totalEnergy(bodies, law);
  if (energy !== null && energy0 === null) energy0 = energy;
  energyHistory.push({
    value: energy === null ? null : (energy - energy0) / Math.abs(energy0),
    marker: pendingMarker,
  });
  pendingMarker = false;
  if (energyHistory.length > ENERGY_CAPACITY) energyHistory.shift();
  drawEnergyGraph(energyCtx, energyCanvas, energyHistory, ENERGY_CAPACITY, energyStatus(energyHistory));

  document.getElementById('year').textContent = simYears.toFixed(2);
  document.getElementById('energy').textContent =
    energy === null ? '—（定義されません）' : energy.toExponential(6);

  requestAnimationFrame(loop); // 次のフレームでまたloopを呼んでもらう（無限ループ）
}
loop();

// リセットボタン: 天体を初期状態に作り直し、経過年数もゼロに戻す（lawは維持する。decisions.md A-5）
document.getElementById('reset').onclick = () => {
  bodies = createBodies();
  simYears = 0;
  // エネルギーの履歴も全消去し、基準をリセット後の配置で取り直す（decisions.md A-7）
  energyHistory = [];
  energy0 = totalEnergy(bodies, law);
};

// どのスライダーを動かしても、エネルギーグラフに縦線マーカーを引く（decisions.md A-6）。
// inputイベントは#panelまで伝わってくるので、ここで1回受ければ全スライダーをまとめて拾える。
document.getElementById('panel').addEventListener('input', () => {
  pendingMarker = true;
});

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

// 相対論スライダー。太陽との相互作用にのみ近日点移動を発生させる（decisions.md B-5）
const grSlider = document.getElementById('gr');
const grVal = document.getElementById('gr-val');
grSlider.addEventListener('input', () => {
  law.gr = parseFloat(grSlider.value);
  grVal.textContent = law.gr.toFixed(0);
});

// 重力波スライダー。速度に比例する減衰で螺旋落下を起こす（design.md 7章）
const gwSlider = document.getElementById('gw');
const gwVal = document.getElementById('gw-val');
gwSlider.addEventListener('input', () => {
  law.gw = parseFloat(gwSlider.value);
  gwVal.textContent = law.gw.toFixed(2);
});
