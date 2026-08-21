import { G } from './data.js';

// 時間刻み[年]。水星の公転周期(0.24年)に対して1/2000なら1周あたり約480ステップになり、
// 後日GR補正を入れたときにも精度が足りる（design.md 6-3）。
export const dt = 1 / 2000; // 時間刻み [年]（約4.4時間）

/**
 * 全天体の加速度を計算して配列で返す。
 * 「法則を壊す」とはこの関数の中の力の式を書き換えること。Day1は指数2固定のニュートン重力のみ。
 */
export function computeAccel(bodies) {
  const n = bodies.length;
  const acc = bodies.map(() => ({ ax: 0, ay: 0 }));

  // 総当たりで全ペアの重力を計算する（n体問題）。天体が5個程度ならこれで十分速い。
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) continue; // 自分自身からは力を受けない

      const A = bodies[i], B = bodies[j];
      const dx = B.x - A.x;
      const dy = B.y - A.y;
      const r  = Math.sqrt(dx * dx + dy * dy) + 1e-9;  // 0除算よけ（天体が重なるとr=0になりうる）

      // ニュートンの万有引力: a = G*m / r^2（Bがつくる重力加速度）
      const a = G * B.m / (r * r);

      // 加速度ベクトルはAからBへ向く単位ベクトル(dx/r, dy/r)にaを掛けたもの
      acc[i].ax += a * dx / r;
      acc[i].ay += a * dy / r;
    }
  }
  return acc;
}

/**
 * Leapfrog法（蛙跳び法）で1ステップ進める。
 *
 * 通常のオイラー法(v+=a*dt; x+=v*dt)はエネルギーが徐々に増えて軌道が壊れてしまい、
 * 「法則を壊したから軌道が乱れた」のか「積分の誤差で乱れた」のか区別できなくなる。
 * Leapfrogは速度を半歩→位置を1歩→（新しい位置で加速度を計算し直して）速度を残り半歩、
 * という順序で更新することでエネルギーが長期間ほぼ保存される（design.md 6-2）。
 */
export function step(bodies) {
  let acc = computeAccel(bodies);

  // 1. 速度を半歩進める（kick）
  for (let i = 0; i < bodies.length; i++) {
    bodies[i].vx += acc[i].ax * dt / 2;
    bodies[i].vy += acc[i].ay * dt / 2;
  }
  // 2. 位置を1歩進める（drift）— このときの速度は半歩分の速度
  for (const b of bodies) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
  }
  // 3. 新しい位置で加速度を計算し直し、速度の残り半歩を進める（kick）
  acc = computeAccel(bodies);
  for (let i = 0; i < bodies.length; i++) {
    bodies[i].vx += acc[i].ax * dt / 2;
    bodies[i].vy += acc[i].ay * dt / 2;
  }
}
