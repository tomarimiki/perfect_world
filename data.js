export const G = 4 * Math.PI * Math.PI;   // 39.478
export const C_LIGHT = 63241.077;          // 光速 [AU/年]

// a: 軌道長半径[AU], e: 離心率, m: 質量[太陽質量]
const ELEMENTS = [
  { name: '地球', a: 1.00000, e: 0.01671, m: 3.0035e-6, color: '#5b9bd5', r: 5 },
];

export function createBodies() {
  const bodies = [{
    name: '太陽', x: 0, y: 0, vx: 0, vy: 0,
    m: 1.0, color: '#ffd75e', r: 12, trail: []
  }];

  for (const p of ELEMENTS) {
    bodies.push({
      name: p.name,
      x: p.a * (1 - p.e),
      y: 0,
      vx: 0,
      vy: Math.sqrt(G / p.a * (1 + p.e) / (1 - p.e)),
      m: p.m,
      color: p.color,
      r: p.r,
      trail: []
    });
  }
  return bodies;
}
