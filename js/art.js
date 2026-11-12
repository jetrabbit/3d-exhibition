// 程序化「油畫筆觸」材質與展板畫面（全部即時繪製，無外部圖片）。
import * as THREE from 'three';

const SERIF = '"Noto Serif TC", "Libre Baskerville", serif';
const DISPLAY = '"Libre Baskerville", "Noto Serif TC", serif';

// 可重現的亂數
export function rng(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function jitter(hex, amt, r) {
  const [a, b, c] = hexToRgb(hex);
  const j = () => (r() - 0.5) * 2 * amt;
  const k = j();
  return `rgb(${clamp(a + k + j() * 0.4)},${clamp(b + k + j() * 0.4)},${clamp(c + k + j() * 0.4)})`;
}
const clamp = (v) => Math.max(0, Math.min(255, v | 0));

// 在 ctx 上塗抹筆觸
export function brush(ctx, w, h, base, { count = 900, amt = 28, len = [20, 90], width = [4, 16], alpha = [0.08, 0.3], seed = 3, angle = null, area = null } = {}) {
  const r = rng(seed);
  const [x0, y0, aw, ah] = area || [0, 0, w, h];
  ctx.save();
  ctx.lineCap = 'round';
  for (let i = 0; i < count; i++) {
    const x = x0 + r() * aw, y = y0 + r() * ah;
    const L = len[0] + r() * (len[1] - len[0]);
    const a = angle === null ? r() * Math.PI : angle + (r() - 0.5) * 0.5;
    ctx.strokeStyle = jitter(Array.isArray(base) ? base[(r() * base.length) | 0] : base, amt, r);
    ctx.globalAlpha = alpha[0] + r() * (alpha[1] - alpha[0]);
    ctx.lineWidth = width[0] + r() * (width[1] - width[0]);
    ctx.beginPath();
    ctx.moveTo(x, y);
    const cx = x + Math.cos(a) * L * 0.5 + (r() - 0.5) * 10, cy = y + Math.sin(a) * L * 0.5 + (r() - 0.5) * 10;
    ctx.quadraticCurveTo(cx, cy, x + Math.cos(a) * L, y + Math.sin(a) * L);
    ctx.stroke();
  }
  ctx.restore();
}

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}

export function toTexture(c, repeat) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  return t;
}

// 牆面 / 地面 / 天花板材質
export function paintedSurface(base, { seed = 1, size = 512, angle = null, amt = 24, repeat = [1, 1], dark = 0 } = {}) {
  const [c, ctx] = canvas(size, size);
  ctx.fillStyle = base; ctx.fillRect(0, 0, size, size);
  brush(ctx, size, size, base, { count: 1400, amt, seed, angle, len: [30, 140], width: [6, 22], alpha: [0.08, 0.28] });
  brush(ctx, size, size, base, { count: 500, amt: amt * 1.6, seed: seed + 7, angle, len: [10, 40], width: [2, 6], alpha: [0.1, 0.35] });
  if (dark) { ctx.fillStyle = `rgba(0,0,0,${dark})`; ctx.fillRect(0, 0, size, size); }
  return toTexture(c, repeat);
}

// ───────── 文字工具 ─────────
function wrapText(ctx, text, x, y, maxW, lh) {
  let line = '';
  for (const ch of text) {
    const test = line + ch;
    if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line, x, y); line = ch; y += lh; }
    else line = test;
  }
  if (line) ctx.fillText(line, x, y);
  return y + lh;
}

// ───────── 展板 ─────────
// 每塊展板：上方畫作區 + 下方標題列
export function panelTexture(ex, hall) {
  const W = 1024, H = Math.round(1024 * ex.size[1] / ex.size[0]);
  const [c, ctx] = canvas(W, H);
  const seed = [...ex.id].reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7);
  const pal = hall.palette;

  // 底色畫布
  ctx.fillStyle = '#e8dfcc'; ctx.fillRect(0, 0, W, H);
  brush(ctx, W, H, ['#e8dfcc', '#d8ccb2'], { count: 700, amt: 12, seed, alpha: [0.1, 0.25] });

  const capH = ex.kind === 'timeline' ? 300 : 190;
  const art = { x: 0, y: 0, w: W, h: H - capH };
  ctx.save();
  ctx.beginPath(); ctx.rect(art.x, art.y, art.w, art.h); ctx.clip();
  (ARTS[ex.art] || ARTS.default)(ctx, art, seed, pal, ex);
  ctx.restore();

  // 標題列
  ctx.fillStyle = '#1c1a17'; ctx.fillRect(0, H - capH, W, capH);
  brush(ctx, W, capH, ['#1c1a17', '#2a2520'], { count: 160, amt: 10, seed: seed + 3, area: [0, H - capH, W, capH], alpha: [0.2, 0.4] });
  ctx.fillStyle = pal.accent;
  ctx.font = `700 34px ${DISPLAY}`;
  ctx.textBaseline = 'top';
  if (ex.kind === 'timeline') {
    ctx.font = `700 92px ${DISPLAY}`;
    ctx.fillText(ex.year, 48, H - capH + 26);
    ctx.font = `italic 34px ${DISPLAY}`;
    ctx.fillStyle = '#d8d0bf';
    ctx.fillText(ex.title, 50, H - capH + 136);
    ctx.font = `600 40px ${SERIF}`;
    ctx.fillStyle = '#f1ead9';
    ctx.fillText(ex.zh.replace(/^.*?｜/, ''), 50, H - capH + 196);
  } else {
    ctx.fillText(`№ ${ex.no}　${ex.title}`, 48, H - capH + 34);
    ctx.font = `600 52px ${SERIF}`;
    ctx.fillStyle = '#f1ead9';
    ctx.fillText(ex.zh, 48, H - capH + 92);
  }
  // 點擊提示
  ctx.font = `28px ${SERIF}`; ctx.fillStyle = 'rgba(241,234,217,.55)';
  ctx.textAlign = 'right'; ctx.fillText('點擊閱讀 ▸', W - 40, H - 52); ctx.textAlign = 'left';
  return toTexture(c);
}

// 地板上的小說明牌（立體展品用）
export function plaqueTexture(ex, hall) {
  const [c, ctx] = canvas(512, 256);
  ctx.fillStyle = '#1c1a17'; ctx.fillRect(0, 0, 512, 256);
  brush(ctx, 512, 256, ['#1c1a17', '#2b2621'], { count: 120, amt: 8, seed: 9, alpha: [0.2, 0.4] });
  ctx.strokeStyle = hall.palette.accent; ctx.lineWidth = 4; ctx.strokeRect(12, 12, 488, 232);
  ctx.textBaseline = 'top';
  ctx.fillStyle = hall.palette.accent; ctx.font = `700 30px ${DISPLAY}`;
  ctx.fillText(`№ ${ex.no}  ${ex.title}`, 36, 40);
  ctx.fillStyle = '#f1ead9'; ctx.font = `600 44px ${SERIF}`;
  wrapText(ctx, ex.zh, 36, 92, 440, 54);
  ctx.font = `24px ${SERIF}`; ctx.fillStyle = 'rgba(241,234,217,.55)';
  ctx.fillText('點擊展品閱讀 ▸', 36, 200);
  return toTexture(c);
}

// 大字標牌（展廳名稱、旅館招牌）
export function signTexture(lines, { w = 1024, h = 256, bg = '#1c1a17', fg = '#f1ead9', accent = '#c9b27a', seed = 5 } = {}) {
  const [c, ctx] = canvas(w, h);
  ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
  brush(ctx, w, h, [bg], { count: 200, amt: 14, seed, alpha: [0.15, 0.35] });
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const n = lines.length;
  lines.forEach((ln, i) => {
    ctx.fillStyle = i === 0 ? accent : fg;
    ctx.font = ln.font;
    ctx.fillText(ln.text, w / 2, h * (i + 0.5) / n + (ln.dy || 0));
  });
  return toTexture(c);
}

// ───────── 原創畫面 ─────────
function sky(ctx, a, top, bot) {
  const g = ctx.createLinearGradient(0, a.y, 0, a.y + a.h);
  g.addColorStop(0, top); g.addColorStop(1, bot);
  ctx.fillStyle = g; ctx.fillRect(a.x, a.y, a.w, a.h);
}

function blob(ctx, cx, cy, rx, ry, r, pts = 14) {
  ctx.beginPath();
  for (let i = 0; i <= pts; i++) {
    const t = (i / pts) * Math.PI * 2;
    const k = 0.75 + r() * 0.45;
    const x = cx + Math.cos(t) * rx * k, y = cy + Math.sin(t) * ry * k;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function silhouette(ctx, x, y, s, color, { coat = true, hat = false, glasses = false } = {}) {
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.ellipse(x, y - 160 * s, 26 * s, 32 * s, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - 30 * s, y - 128 * s);
  ctx.lineTo(x + 30 * s, y - 128 * s);
  ctx.lineTo(x + (coat ? 52 : 40) * s, y);
  ctx.lineTo(x - (coat ? 52 : 40) * s, y);
  ctx.closePath(); ctx.fill();
  if (glasses) {
    ctx.strokeStyle = 'rgba(240,230,200,.7)'; ctx.lineWidth = 3 * s;
    ctx.strokeRect(x - 20 * s, y - 166 * s, 15 * s, 9 * s); ctx.strokeRect(x + 5 * s, y - 166 * s, 15 * s, 9 * s);
  }
  if (hat) { ctx.fillRect(x - 36 * s, y - 190 * s, 72 * s, 8 * s); }
}

const ARTS = {
  default(ctx, a, seed) {
    sky(ctx, a, '#6d7a80', '#2f3436');
    brush(ctx, a.w, a.h, ['#6d7a80', '#4a5256'], { count: 900, seed });
  },

  prologue(ctx, a, seed) {
    sky(ctx, a, '#7a8a90', '#2c2e2c');
    brush(ctx, a.w, a.h, ['#8b9aa0', '#5b666a', '#b9b1a0'], { count: 1200, seed, angle: 0.1, area: [0, 0, a.w, a.h] });
    // 地平線上的城市剪影
    const r = rng(seed);
    ctx.fillStyle = '#1e2221';
    let x = 0; const base = a.h * 0.72;
    while (x < a.w) {
      const bw = 30 + r() * 70, bh = 30 + r() * 140;
      ctx.fillRect(x, base - bh, bw, bh + 400); x += bw - 4;
    }
    brush(ctx, a.w, a.h, ['#1e2221', '#2c3130'], { count: 300, seed: seed + 2, area: [0, base - 60, a.w, a.h], alpha: [0.2, 0.4] });
    ctx.fillStyle = '#f1ead9'; ctx.textAlign = 'center';
    ctx.font = `700 96px ${DISPLAY}`; ctx.fillText('ELYSIUM', a.w / 2, a.h * 0.32);
    ctx.font = `600 40px ${SERIF}`; ctx.fillText('一座世界的背景故事', a.w / 2, a.h * 0.32 + 66);
    ctx.textAlign = 'left';
  },

  isolas(ctx, a, seed) {
    ctx.fillStyle = '#9da3a3'; ctx.fillRect(a.x, a.y, a.w, a.h);
    brush(ctx, a.w, a.h, ['#a9afae', '#8d9393', '#c0c3bf'], { count: 1600, seed, len: [40, 160], alpha: [0.08, 0.25] });
    const r = rng(seed + 1);
    const cx = a.w / 2, cy = a.h / 2;
    const isles = [
      ['Mundi', 0, -0.32, 150, 70],
      ['Katla', 0.12, -0.44, 70, 26],
      ['Graad', 0.3, -0.18, 90, 48],
      ['Seol', -0.34, 0.02, 70, 50],
      ['Samara', 0.36, 0.14, 80, 46],
      ['Iilmaraa', -0.22, 0.3, 80, 40],
      ['Insulinde', 0.04, 0.1, 110, 55],
    ];
    for (const [name, dx, dy, rx, ry] of isles) {
      const x = cx + dx * a.w, y = cy + dy * a.h;
      blob(ctx, x, y, rx, ry, r);
      ctx.fillStyle = name === 'Insulinde' ? '#4f6b5d' : '#6a6450'; ctx.fill();
      ctx.save(); ctx.clip();
      brush(ctx, a.w, a.h, name === 'Insulinde' ? ['#4f6b5d', '#6f8a6e'] : ['#6a6450', '#857b5d'], { count: 120, seed: seed + rx, area: [x - rx, y - ry, rx * 2, ry * 2] });
      ctx.restore();
      ctx.fillStyle = '#1b1b19'; ctx.textAlign = 'center';
      ctx.font = `${name === 'Insulinde' ? 700 : 400} ${name === 'Insulinde' ? 34 : 28}px ${DISPLAY}`;
      ctx.fillText(name, x, y + ry + 34);
    }
    ctx.textAlign = 'left';
    ctx.font = `italic 22px ${DISPLAY}`; ctx.fillStyle = '#2b2b29';
    ctx.fillText('schematic — not to scale / 示意圖', 24, a.h - 22);
  },

  exposure(ctx, a, seed) {
    sky(ctx, a, '#b8bcbc', '#80878a');
    brush(ctx, a.w, a.h, ['#c4c8c6', '#9aa0a2'], { count: 1400, seed, alpha: [0.1, 0.3] });
    silhouette(ctx, a.w * 0.5, a.h * 0.92, 2.6, '#2a2d2e', { coat: true });
    // 人形逐漸溶解成灰
    const r = rng(seed + 4);
    ctx.save();
    for (let i = 0; i < 2600; i++) {
      const x = a.w * 0.5 + (r() - 0.2) * 520, y = a.h * (0.15 + r() * 0.8);
      ctx.globalAlpha = 0.55 * r();
      ctx.fillStyle = r() > 0.5 ? '#c6cac8' : '#a3a9aa';
      ctx.fillRect(x, y, 4 + r() * 10, 3 + r() * 6);
    }
    ctx.restore();
    ctx.fillStyle = '#1c1a17'; ctx.font = `700 120px ${DISPLAY}`; ctx.fillText('6', 60, 170);
    ctx.font = `600 34px ${SERIF}`; ctx.fillText('天／年', 140, 170);
  },

  radio(ctx, a, seed) {
    sky(ctx, a, '#7c8487', '#3c4143');
    brush(ctx, a.w, a.h, ['#8a9295', '#5f6669'], { count: 1200, seed, angle: 0 });
    const bx = a.w * 0.5, by = a.h * 0.72;
    ctx.strokeStyle = '#e6d9b0'; ctx.lineWidth = 5;
    for (let i = 1; i < 9; i++) {
      ctx.globalAlpha = 0.7 - i * 0.07;
      ctx.beginPath(); ctx.arc(bx, by - 120, i * 48, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#1e2121';
    ctx.fillRect(bx - 6, by - 130, 12, 130);
    ctx.beginPath(); ctx.moveTo(bx - 70, by); ctx.lineTo(bx + 70, by); ctx.lineTo(bx + 40, by + 50); ctx.lineTo(bx - 40, by + 50); ctx.fill();
    ctx.fillStyle = '#d65a3a'; ctx.beginPath(); ctx.arc(bx, by - 134, 9, 0, Math.PI * 2); ctx.fill();
  },

  dolores(ctx, a, seed) {
    sky(ctx, a, '#253447', '#0f141c');
    brush(ctx, a.w, a.h, ['#2c3e57', '#1b2635', '#3d5677'], { count: 1300, seed });
    const cx = a.w / 2, cy = a.h * 0.42;
    const g = ctx.createRadialGradient(cx, cy, 10, cx, cy, a.w * 0.45);
    g.addColorStop(0, 'rgba(210,230,255,.95)'); g.addColorStop(0.35, 'rgba(120,160,220,.45)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, a.w, a.h);
    brush(ctx, a.w, a.h, ['#cfe0f5', '#8fb0d8', '#ffffff'], { count: 380, seed: seed + 1, area: [cx - 220, cy - 220, 440, 440], alpha: [0.08, 0.3] });
    // 抽象人形：以光柱表現
    ctx.fillStyle = 'rgba(240,246,255,.85)';
    ctx.beginPath(); ctx.ellipse(cx, cy - 40, 40, 52, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(cx - 46, cy + 10); ctx.quadraticCurveTo(cx, cy - 10, cx + 46, cy + 10);
    ctx.lineTo(cx + 120, a.h); ctx.lineTo(cx - 120, a.h); ctx.closePath(); ctx.fill();
    // 海平線上的船
    ctx.fillStyle = '#0b0f15';
    ctx.fillRect(0, a.h * 0.86, a.w, a.h);
    ctx.beginPath(); ctx.moveTo(a.w * 0.72, a.h * 0.86); ctx.lineTo(a.w * 0.86, a.h * 0.86); ctx.lineTo(a.w * 0.84, a.h * 0.88); ctx.lineTo(a.w * 0.74, a.h * 0.88); ctx.fill();
    ctx.fillRect(a.w * 0.785, a.h * 0.78, 4, a.h * 0.08);
  },

  coalition(ctx, a, seed) {
    sky(ctx, a, '#c9a46e', '#5e4a3a');
    brush(ctx, a.w, a.h, ['#d2b07a', '#a88660', '#7e6a55'], { count: 1300, seed, angle: 0.05 });
    const r = rng(seed);
    ctx.fillStyle = '#2a211b';
    let x = 0; const base = a.h * 0.8;
    while (x < a.w) { const bw = 40 + r() * 60, bh = 40 + r() * 160; ctx.fillRect(x, base - bh, bw, bh + 300); x += bw - 6; }
    for (const [px, py, s] of [[0.25, 0.25, 1], [0.62, 0.16, 0.7], [0.82, 0.36, 0.5]]) {
      ctx.save(); ctx.translate(a.w * px, a.h * py); ctx.scale(s, s);
      ctx.fillStyle = '#3a2f27';
      ctx.beginPath(); ctx.ellipse(0, 0, 160, 46, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(-40, 40, 80, 22);
      ctx.beginPath(); ctx.moveTo(140, 0); ctx.lineTo(200, -40); ctx.lineTo(200, 40); ctx.fill();
      ctx.restore();
    }
  },

  martinaise(ctx, a, seed) {
    // 示意地圖：海灣、道路、港口
    ctx.fillStyle = '#c9c0a6'; ctx.fillRect(a.x, a.y, a.w, a.h);
    brush(ctx, a.w, a.h, ['#cfc6ab', '#b8ad8f'], { count: 1200, seed });
    // 海
    ctx.fillStyle = '#5b7378';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(a.w, 0); ctx.lineTo(a.w, a.h * 0.18);
    ctx.bezierCurveTo(a.w * 0.75, a.h * 0.22, a.w * 0.68, a.h * 0.55, a.w * 0.5, a.h * 0.52);
    ctx.bezierCurveTo(a.w * 0.34, a.h * 0.5, a.w * 0.3, a.h * 0.2, 0, a.h * 0.24);
    ctx.closePath(); ctx.fill();
    ctx.save(); ctx.clip();
    brush(ctx, a.w, a.h, ['#5b7378', '#6f8a8c', '#4a5f63'], { count: 500, seed: seed + 3, angle: 0 });
    ctx.restore();
    // 小島與堡壘
    ctx.fillStyle = '#7c735d'; ctx.beginPath(); ctx.ellipse(a.w * 0.52, a.h * 0.3, 40, 20, 0, 0, Math.PI * 2); ctx.fill();
    // 道路
    ctx.strokeStyle = '#2b2722'; ctx.lineWidth = 12; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(a.w * 0.08, a.h * 0.42);
    ctx.bezierCurveTo(a.w * 0.3, a.h * 0.66, a.w * 0.7, a.h * 0.68, a.w * 0.92, a.h * 0.4); ctx.stroke();
    // 高架公路
    ctx.strokeStyle = '#7a3d2c'; ctx.lineWidth = 10; ctx.setLineDash([22, 14]);
    ctx.beginPath(); ctx.moveTo(0, a.h * 0.9); ctx.lineTo(a.w, a.h * 0.82); ctx.stroke(); ctx.setLineDash([]);
    // 標記
    const mark = (x, y, t, c = '#1c1a17') => {
      ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2); ctx.fill();
      ctx.font = `600 26px ${DISPLAY}`; ctx.fillText(t, x + 16, y + 9);
    };
    mark(a.w * 0.3, a.h * 0.62, 'Whirling-in-Rags', '#8a3b2a');
    mark(a.w * 0.82, a.h * 0.5, 'Harbour (Terminal B)');
    mark(a.w * 0.5, a.h * 0.68, 'Rue de Saint-Ghislaine');
    ctx.fillStyle = '#7a3d2c'; ctx.font = `italic 24px ${DISPLAY}`; ctx.fillText('8/81 motor tract', a.w * 0.06, a.h * 0.86);
    ctx.fillStyle = '#e8e2d0'; ctx.font = `italic 26px ${DISPLAY}`; ctx.fillText('Martinaise Inlet', a.w * 0.4, a.h * 0.14);
    ctx.fillStyle = '#2b2b29'; ctx.font = `italic 22px ${DISPLAY}`; ctx.fillText('schematic / 示意圖', 24, a.h - 22);
  },

  detectives(ctx, a, seed) {
    sky(ctx, a, '#5f6f6b', '#22282a');
    brush(ctx, a.w, a.h, ['#6c7c78', '#44504e', '#8a8466'], { count: 1300, seed });
    // 路燈光
    const g = ctx.createRadialGradient(a.w * 0.5, 0, 10, a.w * 0.5, 0, a.h);
    g.addColorStop(0, 'rgba(255,220,150,.55)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, a.w, a.h);
    silhouette(ctx, a.w * 0.38, a.h * 0.98, 2.2, '#151817', { coat: true });
    silhouette(ctx, a.w * 0.64, a.h * 0.98, 1.9, '#1d2120', { coat: false, glasses: true });
  },

  // 年表畫面
  'tl-dolores'(ctx, a, seed) { tl(ctx, a, seed, '#2f4560', '#a9c4e4', 'ship'); },
  'tl-crown'(ctx, a, seed) { tl(ctx, a, seed, '#6a5131', '#e0bb6a', 'crown'); },
  'tl-decree'(ctx, a, seed) { tl(ctx, a, seed, '#7a2b22', '#e0634a', 'star'); },
  'tl-deathblow'(ctx, a, seed) { tl(ctx, a, seed, '#3c3533', '#d0573c', 'waves'); },
  'tl-surrender'(ctx, a, seed) { tl(ctx, a, seed, '#4a4642', '#d9d2c3', 'flag'); },
  'tl-zones'(ctx, a, seed) { tl(ctx, a, seed, '#4a4f53', '#c8b27a', 'grid'); },
  'tl-present'(ctx, a, seed) { tl(ctx, a, seed, '#334a46', '#c7b27a', 'lamp'); },
};

// 年表展板：上方一條貫穿的時間線
function tl(ctx, a, seed, base, accent, icon) {
  ctx.fillStyle = base; ctx.fillRect(a.x, a.y, a.w, a.h);
  brush(ctx, a.w, a.h, [base, accent], { count: 1100, seed, amt: 20, alpha: [0.05, 0.22] });
  const ly = a.h * 0.18;
  ctx.strokeStyle = '#f1ead9'; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(0, ly); ctx.lineTo(a.w, ly); ctx.stroke();
  ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(a.w / 2, ly, 22, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#f1ead9'; ctx.lineWidth = 4; ctx.stroke();
  const cx = a.w / 2, cy = a.h * 0.6;
  ctx.fillStyle = accent; ctx.strokeStyle = accent; ctx.lineWidth = 10;
  const r = rng(seed);
  switch (icon) {
    case 'ship':
      ctx.beginPath(); ctx.moveTo(cx - 200, cy + 60); ctx.lineTo(cx + 200, cy + 60); ctx.lineTo(cx + 150, cy + 120); ctx.lineTo(cx - 150, cy + 120); ctx.fill();
      ctx.fillRect(cx - 6, cy - 160, 12, 220);
      ctx.beginPath(); ctx.moveTo(cx + 10, cy - 150); ctx.lineTo(cx + 150, cy + 30); ctx.lineTo(cx + 10, cy + 30); ctx.fill();
      ctx.beginPath(); ctx.moveTo(cx - 10, cy - 120); ctx.lineTo(cx - 130, cy + 30); ctx.lineTo(cx - 10, cy + 30); ctx.fill();
      break;
    case 'crown':
      ctx.beginPath(); ctx.moveTo(cx - 180, cy + 80); ctx.lineTo(cx - 180, cy - 60); ctx.lineTo(cx - 90, cy + 10); ctx.lineTo(cx, cy - 110);
      ctx.lineTo(cx + 90, cy + 10); ctx.lineTo(cx + 180, cy - 60); ctx.lineTo(cx + 180, cy + 80); ctx.closePath(); ctx.fill();
      break;
    case 'star': {
      ctx.beginPath();
      for (let i = 0; i < 10; i++) { const t = -Math.PI / 2 + i * Math.PI / 5, R = i % 2 ? 70 : 170; ctx.lineTo(cx + Math.cos(t) * R, cy + Math.sin(t) * R); }
      ctx.closePath(); ctx.fill();
      break;
    }
    case 'waves':
      for (let k = 0; k < 4; k++) {
        ctx.beginPath();
        for (let x = 0; x <= a.w; x += 20) ctx.lineTo(x, cy + 40 + k * 50 + Math.sin(x / 60 + k) * 18);
        ctx.globalAlpha = 0.8 - k * 0.15; ctx.stroke();
      }
      ctx.globalAlpha = 1;
      for (let i = 0; i < 5; i++) { ctx.fillRect(cx - 300 + i * 130, cy - 40 - r() * 30, 70, 40); }
      break;
    case 'flag':
      ctx.fillRect(cx - 120, cy - 170, 10, 300);
      ctx.beginPath(); ctx.moveTo(cx - 110, cy - 170);
      ctx.quadraticCurveTo(cx, cy - 210, cx + 120, cy - 160); ctx.lineTo(cx + 120, cy - 40);
      ctx.quadraticCurveTo(cx, cy - 90, cx - 110, cy - 50); ctx.closePath(); ctx.fill();
      break;
    case 'grid':
      ctx.lineWidth = 6;
      for (let i = 0; i < 21; i++) { const gx = cx - 280 + (i % 7) * 80, gy = cy - 110 + ((i / 7) | 0) * 80; ctx.strokeRect(gx, gy, 66, 66); }
      break;
    case 'lamp':
      ctx.fillRect(cx - 6, cy - 150, 12, 290);
      ctx.beginPath(); ctx.moveTo(cx, cy - 150); ctx.quadraticCurveTo(cx + 60, cy - 190, cx + 110, cy - 150); ctx.lineWidth = 10; ctx.stroke();
      { const g = ctx.createRadialGradient(cx + 110, cy - 130, 5, cx + 110, cy - 130, 200);
        g.addColorStop(0, 'rgba(255,230,170,.9)'); g.addColorStop(1, 'rgba(255,230,170,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, a.w, a.h); }
      break;
  }
}
