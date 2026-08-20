const SCALE = 220; // 1 AU = 220 px

function toScreen(x, y, canvas) {
  return {
    sx: canvas.width  / 2 + x * SCALE,
    sy: canvas.height / 2 - y * SCALE // 上下反転（数学のy軸は上向き）
  };
}

export function draw(ctx, bodies, canvas) {
  // 残像を残すため、完全な黒塗りではなく半透明で塗る
  ctx.fillStyle = 'rgba(0, 0, 8, 0.25)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (const b of bodies) {
    // 軌跡
    ctx.strokeStyle = b.color + '66';
    ctx.lineWidth = 1;
    ctx.beginPath();
    b.trail.forEach((p, i) => {
      const { sx, sy } = toScreen(p.x, p.y, canvas);
      i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
    });
    ctx.stroke();

    // 本体
    const { sx, sy } = toScreen(b.x, b.y, canvas);
    ctx.fillStyle = b.color;
    ctx.beginPath();
    ctx.arc(sx, sy, b.r, 0, Math.PI * 2);
    ctx.fill();
  }
}
