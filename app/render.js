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

// エネルギーグラフの縦軸の最小幅（変化率。1e-5 = 0.001%）。
// min/maxで自動フィットすると、Leapfrogの正常な微小ゆらぎ（design.md 11章テスト2の許容範囲0.001%以下）まで
// 縦いっぱいに拡大され、壊していないのに激しく揺れて見えてしまう。それを防ぐための下限。
const MIN_ENERGY_SPAN = 1e-5;

// 変化率を「+0.0012 %」のような普通の%表記にする。桁数は縦軸の幅に合わせて、差が読める最小限にする。
function formatPercent(value, span) {
  const digits = Math.max(0, Math.ceil(-Math.log10(span * 100)) + 1);
  const s = (value * 100).toFixed(digits);
  return `${value > 0 ? '+' : ''}${s} %`;
}

// 状態ごとの文字色（main.js の energyStatus の kind に対応）
const STATUS_COLORS = { ok: '#6fdc6f', broken: '#ffa94d', undefined: '#888' };

/**
 * エネルギーグラフを描く（decisions.md A-7）。
 * history: { value: 初期エネルギーからの変化率 または null（定義されない）, marker: 法則を変えた瞬間か } の配列
 * capacity: 保持する最大点数。横軸はこの点数ぶんで固定し、左から右へ伸びていく。
 * status: { text, kind } グラフの状態を一言で表したもの（main.jsで判定）。タイトルの横に出す。
 * メインcanvasとは別のcanvasに描くので、残像処理はせず毎フレーム全消去する。
 */
export function drawEnergyGraph(ctx, canvas, history, capacity, status) {
  const w = canvas.width, h = canvas.height;
  const padTop = 24;    // 上の余白（タイトルと状態を置く）
  const padBottom = 14; // 下の余白（目盛りの文字を置く）
  ctx.fillStyle = '#05050f';
  ctx.fillRect(0, 0, w, h);

  // タイトルと状態。何のグラフで、今どうなっているかを一目で分かるようにする
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#aaa';
  const title = '全エネルギーの変化（平らなら保存）：';
  ctx.fillText(title, 6, 16);
  ctx.fillStyle = STATUS_COLORS[status.kind];
  ctx.fillText(status.text, 6 + ctx.measureText(title).width, 16);

  // 表示中のデータの min/max で自動フィット（nullは除外）
  let min = Infinity, max = -Infinity;
  for (const p of history) {
    if (p.value === null) continue;
    if (p.value < min) min = p.value;
    if (p.value > max) max = p.value;
  }
  const hasData = min <= max;
  if (hasData && max - min < MIN_ENERGY_SPAN) {
    const mid = (max + min) / 2;
    min = mid - MIN_ENERGY_SPAN / 2;
    max = mid + MIN_ENERGY_SPAN / 2;
  }
  const toX = i => i / (capacity - 1) * w;
  const toY = v => h - padBottom - (v - min) / (max - min) * (h - padTop - padBottom);

  // 法則を変えた瞬間の縦線マーカー（decisions.md A-6）
  ctx.strokeStyle = 'rgba(255, 120, 120, 0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  history.forEach((p, i) => {
    if (!p.marker) return;
    ctx.moveTo(toX(i), padTop);
    ctx.lineTo(toX(i), h);
  });
  ctx.stroke();

  if (!hasData) return;

  // 基準線（初期エネルギー = 変化率0）が範囲内にあれば点線で引く
  if (min <= 0 && 0 <= max) {
    ctx.strokeStyle = '#333';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, toY(0));
    ctx.lineTo(w, toY(0));
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // 折れ線本体。null（dimension ≠ 3 の区間）は線を途切れさせる
  ctx.strokeStyle = '#6fdc6f';
  ctx.beginPath();
  let penDown = false;
  history.forEach((p, i) => {
    if (p.value === null) { penDown = false; return; }
    penDown ? ctx.lineTo(toX(i), toY(p.value)) : ctx.moveTo(toX(i), toY(p.value));
    penDown = true;
  });
  ctx.stroke();

  // 縦軸の上端・下端の値（初期エネルギーからの変化率、%表示）。タイトルと重ならないよう右寄せ
  ctx.fillStyle = '#888';
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(formatPercent(max, max - min), w - 4, padTop - 2);
  ctx.fillText(formatPercent(min, max - min), w - 4, h - 3);
  ctx.textAlign = 'left';
}
