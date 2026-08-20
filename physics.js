import { G } from './data.js';

export const dt = 1 / 2000; // 時間刻み [年]（約4.4時間）

/**
 * 全天体の加速度を計算して配列で返す。
 * Day1: 指数は2に固定（通常のニュートン重力）。
 */
export function computeAccel(bodies) {
  const n = bodies.length;
  const acc = bodies.map(() => ({ ax: 0, ay: 0 }));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) continue;

      const A = bodies[i], B = bodies[j];
      const dx = B.x - A.x;
      const dy = B.y - A.y;
      const r  = Math.sqrt(dx * dx + dy * dy) + 1e-9;  // 0除算よけ

      const a = G * B.m / (r * r);

      acc[i].ax += a * dx / r;
      acc[i].ay += a * dy / r;
    }
  }
  return acc;
}

/**
 * Leapfrog法で1ステップ進める。
 */
export function step(bodies) {
  let acc = computeAccel(bodies);

  for (let i = 0; i < bodies.length; i++) {
    bodies[i].vx += acc[i].ax * dt / 2;
    bodies[i].vy += acc[i].ay * dt / 2;
  }
  for (const b of bodies) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
  }
  acc = computeAccel(bodies);
  for (let i = 0; i < bodies.length; i++) {
    bodies[i].vx += acc[i].ax * dt / 2;
    bodies[i].vy += acc[i].ay * dt / 2;
  }
}
