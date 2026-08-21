// 距離は実スケールで描き、天体の半径だけ誇張する（design.md 8-1）。
// 実スケールのまま半径も描くと太陽が1px未満になって見えないため。
const SCALE = 220; // 1 AU = 220 px

// シミュレーション座標(AU、数学的にy軸は上向き)を画面座標(px、y軸は下向き)に変換する。
function toScreen(x, y, canvas) {
  return {
    sx: canvas.width  / 2 + x * SCALE,
    sy: canvas.height / 2 - y * SCALE // 上下反転（数学のy軸は上向き）
  };
}

export function draw(ctx, bodies, canvas) {
  // 完全な黒(fillRect)ではなく半透明の黒で塗りつぶすことで、前フレームの絵がうっすら残る。
  // これが「軌跡」の正体（trail配列を線で結ぶのと合わせて二重に効いている）。
  ctx.fillStyle = 'rgba(0, 0, 8, 0.25)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (const b of bodies) {
    // 軌跡: 天体ごとに保存してきた座標履歴(trail)を線でつなぐ
    ctx.strokeStyle = b.color + '66'; // 末尾66は16進数のアルファ値(半透明)
    ctx.lineWidth = 1;
    ctx.beginPath();
    b.trail.forEach((p, i) => {
      const { sx, sy } = toScreen(p.x, p.y, canvas);
      i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
    });
    ctx.stroke();

    // 本体: 現在位置に円を描く
    const { sx, sy } = toScreen(b.x, b.y, canvas);
    ctx.fillStyle = b.color;
    ctx.beginPath();
    ctx.arc(sx, sy, b.r, 0, Math.PI * 2);
    ctx.fill();
  }
}
