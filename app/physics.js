import { G, C_LIGHT } from './data.js';

// 時間刻み[年]。水星の公転周期(0.24年)に対して1/2000なら1周あたり約480ステップになり、
// 後日GR補正を入れたときにも精度が足りる（design.md 6-3）。
// decisions.md A-4の決定により、dtの大きさ自体は固定。符号だけをlaw.dtSignで反転する。
export const dt = 1 / 2000; // 時間刻み [年]（約4.4時間）

// 「壊しどころ」をまとめたオブジェクト（design.md 6-3）。
// Day5で gr・gw を追加。lambda・yukawa は後日のDayで追加する。
export const defaultLaw = {
  dimension: 3.0, // 空間の次元。力の指数 = dimension - 1（3次元なら2乗で現実の重力）
  G: G,           // 重力定数。data.jsのGとは別物（decisions.md B-2）。初期速度の計算には使わない
  sunMass: 1.0,   // 太陽質量の倍率。相手が太陽(j===0)のときだけ掛かる
  dtSign: 1,      // 時間の流れの符号。-1にすると時間が逆行する（decisions.md A-4）
  gr: 0,          // 相対論補正の増幅率（0 = オフ）。太陽との相互作用にのみ適用（decisions.md B-5）
  gw: 0,          // 重力波減衰の強さ（0 = オフ）。design.md 7章
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

      // 相手が太陽(j===0)のときだけ質量倍率law.sunMassを掛ける（design.md 6-4）
      const mB = (j === 0) ? B.m * law.sunMass : B.m;

      // ニュートンの万有引力の一般化: a = G*m / r^(dimension-1)（Bがつくる重力加速度）
      // law.G はスライダーで変更可能。data.jsのG（初期速度計算用）とは独立している（decisions.md B-2）
      let a = law.G * mB / Math.pow(r, exponent);

      // --- 一般相対論補正：近日点移動を生む（design.md 7章） ---
      // decisions.md B-5の決定により、相手が太陽(j===0)のときだけ適用する。
      // hはAの太陽まわりの比角運動量なので、相手が惑星のときは物理的な意味を持たない。
      if (law.gr > 0 && j === 0) {
        const h = A.x * A.vy - A.y * A.vx; // 比角運動量
        const corr = 3 * h * h / (C_LIGHT * C_LIGHT * r * r);
        a *= (1 + law.gr * corr);
      }

      // 加速度ベクトルはAからBへ向く単位ベクトル(dx/r, dy/r)にaを掛けたもの
      acc[i].ax += a * dx / r;
      acc[i].ay += a * dy / r;
    }

    // --- 重力波：速度に比例する減衰。螺旋を描いて太陽へ落下する（design.md 7章） ---
    // 太陽(i===0)は decisions.md B-3により固定なので対象外。
    if (law.gw > 0 && i > 0) {
      acc[i].ax -= law.gw * bodies[i].vx;
      acc[i].ay -= law.gw * bodies[i].vy;
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
 *
 * law.dtSignが-1のとき、dtの符号が反転し時間が逆行する（decisions.md A-4）。
 * Leapfrogは時間反転対称なので、符号を反転するだけで正確に逆再生できる。
 */
export function step(bodies, law) {
  const signedDt = dt * law.dtSign;
  let acc = computeAccel(bodies, law);

  // 1. 速度を半歩進める（kick）
  for (let i = 1; i < bodies.length; i++) {
    bodies[i].vx += acc[i].ax * signedDt / 2;
    bodies[i].vy += acc[i].ay * signedDt / 2;
  }
  // 2. 位置を1歩進める（drift）— このときの速度は半歩分の速度
  for (let i = 1; i < bodies.length; i++) {
    bodies[i].x += bodies[i].vx * signedDt;
    bodies[i].y += bodies[i].vy * signedDt;
  }
  // 3. 新しい位置で加速度を計算し直し、速度の残り半歩を進める（kick）
  acc = computeAccel(bodies, law);
  for (let i = 1; i < bodies.length; i++) {
    bodies[i].vx += acc[i].ax * signedDt / 2;
    bodies[i].vy += acc[i].ay * signedDt / 2;
  }
}
