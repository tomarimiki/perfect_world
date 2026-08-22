import { G } from './data.js';

// 時間刻み[年]。水星の公転周期(0.24年)に対して1/2000なら1周あたり約480ステップになり、
// 後日GR補正を入れたときにも精度が足りる（design.md 6-3）。
export const dt = 1 / 2000; // 時間刻み [年]（約4.4時間）

// 「壊しどころ」をまとめたオブジェクト（design.md 6-3）。
// Day3では dimension だけを使う。G・gr・gw・lambda・yukawa・sunMass・dt は後日のDayで追加する。
export const defaultLaw = {
  dimension: 3.0, // 空間の次元。力の指数 = dimension - 1（3次元なら2乗で現実の重力）
};

/**
 * 全天体の加速度を計算して配列で返す。
 * 「法則を壊す」とはこの関数の中の力の式を書き換えること。
 * Day3から指数が law.dimension - 1 になり、3.0からずらすと閉軌道が壊れる。
 */
export function computeAccel(bodies, law) {
  const n = bodies.length;
  const acc = bodies.map(() => ({ ax: 0, ay: 0 }));
  const exponent = law.dimension - 1; // 3次元 → 2乗（現実の重力）

  // 総当たりで全ペアの重力を計算する（n体問題）。天体が5個程度ならこれで十分速い。
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) continue; // 自分自身からは力を受けない

      const A = bodies[i], B = bodies[j];
      const dx = B.x - A.x;
      const dy = B.y - A.y;
      const r  = Math.sqrt(dx * dx + dy * dy) + 1e-9;  // 0除算よけ（天体が重なるとr=0になりうる）

      // ニュートンの万有引力の一般化: a = G*m / r^(dimension-1)（Bがつくる重力加速度）
      const a = G * B.m / Math.pow(r, exponent);

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
 *
 * decisions.md B-3の決定により、太陽(bodies[0])は完全に固定する。
 * 太陽が及ぼす力は他の天体に働くが、太陽自身の速度・位置は更新しない（i=1から始める）。
 */
export function step(bodies, law) {
  let acc = computeAccel(bodies, law);

  // 1. 速度を半歩進める（kick）
  for (let i = 1; i < bodies.length; i++) {
    bodies[i].vx += acc[i].ax * dt / 2;
    bodies[i].vy += acc[i].ay * dt / 2;
  }
  // 2. 位置を1歩進める（drift）— このときの速度は半歩分の速度
  for (let i = 1; i < bodies.length; i++) {
    bodies[i].x += bodies[i].vx * dt;
    bodies[i].y += bodies[i].vy * dt;
  }
  // 3. 新しい位置で加速度を計算し直し、速度の残り半歩を進める（kick）
  acc = computeAccel(bodies, law);
  for (let i = 1; i < bodies.length; i++) {
    bodies[i].vx += acc[i].ax * dt / 2;
    bodies[i].vy += acc[i].ay * dt / 2;
  }
}
