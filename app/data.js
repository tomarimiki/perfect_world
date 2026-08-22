// 単位系: 距離=AU、時間=年、質量=太陽質量（SI単位は使わない。design.md 5-1）。
// この単位系だとケプラーの第三法則(T^2 = a^3)から、重力定数が G = 4π^2 というきれいな値になる。
export const G = 4 * Math.PI * Math.PI;   // 39.478
export const C_LIGHT = 63241.077;          // 光速 [AU/年]（Day1では未使用。相対論補正用に後で使う）

// a: 軌道長半径[AU], e: 離心率, m: 質量[太陽質量]
const ELEMENTS = [
  { name: '水星', a: 0.38710, e: 0.20563, m: 1.6601e-7, color: '#a89078', r: 3 },
  { name: '金星', a: 0.72333, e: 0.00677, m: 2.4478e-6, color: '#e8c07a', r: 5 },
  { name: '地球', a: 1.00000, e: 0.01671, m: 3.0035e-6, color: '#5b9bd5', r: 5 },
  { name: '火星', a: 1.52368, e: 0.09340, m: 3.2271e-7, color: '#c1502e', r: 4 },
];

export function createBodies() {
  // 太陽は原点に固定した初期状態から始める（Day1では動かないが、力は受ける）。
  const bodies = [{
    name: '太陽', x: 0, y: 0, vx: 0, vy: 0,
    m: 1.0, color: '#ffd75e', r: 12, trail: []
  }];

  for (const p of ELEMENTS) {
    bodies.push({
      name: p.name,
      // 初期位置は近日点（太陽に最も近い点）に置く: x = a(1-e), y = 0
      x: p.a * (1 - p.e),
      y: 0,
      // 近日点でのx方向速度は0。y方向速度はビス・ビバの式 v=√(G/a・(1+e)/(1-e)) で計算する。
      // 全惑星がこの1つの式で初期化できるので、初期条件の実装が楽になる。
      vx: 0,
      vy: Math.sqrt(G / p.a * (1 + p.e) / (1 - p.e)),
      m: p.m,
      color: p.color,
      r: p.r,
      trail: [] // 軌跡描画用の座標履歴（render.js が使う）
    });
  }
  return bodies;
}
