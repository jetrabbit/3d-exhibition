// 2.5D 版本：固定斜俯視鏡頭、角色點地移動、右側敘事欄
import * as THREE from 'three';
import { HALLS, EXHIBITS, VOICES, VOICE_COLORS, VOICE_META, EXHIBIT_PORTRAITS } from '../js/exhibits.js';
import { paintedSurface, panelTexture, plaqueTexture, signTexture, toTexture } from '../js/art.js';
import { buildModel } from '../js/models.js';

const W = 22, HALF = W / 2, H = 5, Z_END = -74, DOOR = 2.6, LOW = 0.45;
const SPEED = 3.2, RADIUS = 0.4;
const CAM_OFFSET = new THREE.Vector3(9, 13, 11);

// ── 2.5D 專用的展品擺位（右牆被切掉，所以右牆的展板移到後方牆面）──
const LAYOUT = {
  '1-0': { pos: [-10.75, 2.1, -5] },
  '1-3': { pos: [-10.75, 2.1, -13] },
  '1-1': { pos: [-6, 2.1, -21.75], rotY: 0 },
  '1-5': { pos: [6, 2.1, -21.75], rotY: 0 },
  '1-4': { pos: [6.5, 0, -10] },
  '2-2': { pos: [-6, 2.3, -51.75], rotY: 0 },
  '2-4': { pos: [6, 2.1, -51.75], rotY: 0 },
  '3-3': { pos: [-8.2, 2.1, -73.75], rotY: 0 },
};
for (const ex of EXHIBITS) {
  const o = LAYOUT[ex.id];
  if (o) { ex.pos = o.pos; if (o.rotY !== undefined) ex.rotY = o.rotY; }
  if (ex.kind === 'timeline') ex.pos = [ex.pos[0], 2.2, ex.pos[2]];
}

await Promise.race([
  Promise.all(['600 40px "Noto Serif TC"', '700 40px "Libre Baskerville"', 'italic 40px "Libre Baskerville"'].map((f) => document.fonts.load(f))),
  new Promise((r) => setTimeout(r, 4000)),
]);

// ───────── 場景 ─────────
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('stage').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#0f0e0d');
scene.fog = new THREE.Fog("#0f0e0d", 30, 60);

const camera = new THREE.PerspectiveCamera(34, innerWidth / innerHeight, 0.5, 120);

// 燈光：總共 5 盞（半球光、一盞帶陰影的主光、每廳一盞氣氛光）
scene.add(new THREE.HemisphereLight('#e6dccb', '#2a221c', 1.5));
const sun = new THREE.DirectionalLight('#ffe2b5', 2.2);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 40 });
sun.shadow.bias = -0.0008;
scene.add(sun, sun.target);

const ctx = { tick: [] };
const clickables = [];
const colliders = [];
const cutaways = []; // 會隨角色位置降低的隔牆 { mesh, z }

function box(w, h, d, mat, x, y, z, collide = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z); m.receiveShadow = true; m.castShadow = true;
  scene.add(m);
  if (collide) colliders.push([x - w / 2, z - d / 2, x + w / 2, z + d / 2]);
  return m;
}

const floorMeshes = [];
HALLS.forEach((hall, i) => {
  const [z0, z1] = hall.zRange, len = z0 - z1, zc = (z0 + z1) / 2;
  const wallMat = new THREE.MeshLambertMaterial({ map: paintedSurface(hall.palette.wall, { seed: 10 + i, repeat: [len / 6, 1], amt: 26 }) });
  const capMat = new THREE.MeshLambertMaterial({ color: '#1a1714' });
  const floorMat = new THREE.MeshLambertMaterial({ map: paintedSurface(hall.palette.floor, { seed: 20 + i, angle: 0, repeat: [4, len / 5], amt: 18 }) });

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, len), floorMat);
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, zc); floor.receiveShadow = true;
  scene.add(floor); floorMeshes.push(floor);

  // 左牆（遠端，完整高度）、右牆（靠近鏡頭，切成矮牆）
  box(0.4, H, len, wallMat, -HALF - 0.2, H / 2, zc);
  box(0.4, LOW, len, capMat, HALF + 0.2, LOW / 2, zc);

  // 前隔牆（含門洞）
  const segW = (W - DOOR) / 2;
  if (i === 0) {
    box(W + 0.8, LOW, 0.4, capMat, 0, LOW / 2, z0 + 0.2);
  } else {
    for (const sx of [-1, 1]) {
      const m = box(segW, H, 0.4, wallMat, sx * (HALF - segW / 2), H / 2, z0);
      cutaways.push({ mesh: m, z: z0 });
    }
    const lintel = box(DOOR, H - 3, 0.4, wallMat, 0, H - (H - 3) / 2, z0, false);
    cutaways.push({ mesh: lintel, z: z0, lintel: true });
    // 門上方的展廳名牌（面向前一廳）
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 0.9), new THREE.MeshBasicMaterial({
      map: signTexture([
        { text: `HALL ${hall.no} · ${hall.name.toUpperCase()}`, font: '700 64px "Libre Baskerville", serif', dy: 8 },
        { text: hall.zh, font: '600 78px "Noto Serif TC", serif', dy: -8 },
      ], { w: 1024, h: 256, accent: hall.palette.accent }), toneMapped: false }));
    sign.position.set(-5.5, 3.6, z0 + 0.22);
    scene.add(sign);
    cutaways.push({ mesh: sign, z: z0, sign: true });
  }

  // 每廳一盞氣氛光
  const amb = new THREE.PointLight(hall.palette.accent, 26, 30, 1.2);
  amb.position.set(-2, H + 1, zc); scene.add(amb);
});
box(W + 0.8, H, 0.4, new THREE.MeshLambertMaterial({ map: paintedSurface('#2f3b38', { seed: 50, repeat: [3, 1] }) }), 0, H / 2, Z_END - 0.2);

// 牆上的「假投射燈」：一張疊加的光暈貼圖，取代即時聚光燈
const glowTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d'); const gr = g.createRadialGradient(128, 90, 4, 128, 128, 128);
  gr.addColorStop(0, 'rgba(255,228,180,.55)'); gr.addColorStop(0.5, 'rgba(255,214,150,.18)'); gr.addColorStop(1, 'rgba(255,214,150,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256); return toTexture(c);
})();
const glowMat = new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });

// ───────── 展品 ─────────
const hallOf = (id) => HALLS.find((h) => h.id === id);
const frameMat = new THREE.MeshLambertMaterial({ color: '#1d1916' });

for (const ex of EXHIBITS) {
  const hall = hallOf(ex.hall);
  if (ex.kind === 'panel' || ex.kind === 'timeline') {
    const grp = new THREE.Group();
    const [pw, ph] = ex.size;
    grp.add(new THREE.Mesh(new THREE.BoxGeometry(pw + 0.14, ph + 0.14, 0.08), frameMat));
    const art = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), new THREE.MeshBasicMaterial({ map: panelTexture(ex, hall), color: '#d9d2c4' }));
    art.position.z = 0.045; grp.add(art);
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(pw * 1.9, ph * 1.9), glowMat);
    glow.position.set(0, 0.3, 0.03); grp.add(glow);
    grp.position.set(...ex.pos); grp.rotation.y = ex.rotY;
    scene.add(grp);
    // 掛在隔牆上的展板，跟著隔牆一起隱藏
    const wallHall = HALLS.slice(1).find((h) => Math.abs(h.zRange[0] - ex.pos[2]) < 0.5);
    if (ex.rotY === 0 && wallHall) cutaways.push({ mesh: grp, z: wallHall.zRange[0], sign: true });
    art.userData.exhibit = ex; clickables.push(art);
    const n = [Math.sin(ex.rotY), Math.cos(ex.rotY)];
    ex.stand = [ex.pos[0] + n[0] * 2.4, ex.pos[2] + n[1] * 2.4];
    ex.lookAt = [ex.pos[0], ex.pos[2]];
  } else {
    const m = buildModel(ex.model, ctx);
    // 2.5D 版移除模型自帶的光源，改用材質自發光
    const lights = []; m.traverse((o) => { if (o.isLight) lights.push(o); });
    lights.forEach((l) => l.parent.remove(l));
    m.position.set(...ex.pos);
    m.traverse((o) => { if (o.isMesh) { o.userData.exhibit = ex; clickables.push(o); o.castShadow = true; o.receiveShadow = true; } });
    scene.add(m);
    const r = ex.radius * 0.8;
    colliders.push([ex.pos[0] - r, ex.pos[2] - r, ex.pos[0] + r, ex.pos[2] + r]);
    if (ex.model !== 'hostel') {
      const pq = new THREE.Group();
      const stand = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.9, 0.06), frameMat); stand.position.y = 0.45; pq.add(stand);
      const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.4), new THREE.MeshBasicMaterial({ map: plaqueTexture(ex, hall), color: '#d9d2c4' }));
      plate.position.y = 0.98; plate.rotation.x = -0.6; pq.add(plate);
      plate.userData.exhibit = ex; clickables.push(plate);
      // 說明牌放在面向鏡頭的一側
      const d = ex.radius + 0.5;
      pq.position.set(ex.pos[0] + d * 0.6, 0, ex.pos[2] + d * 0.8);
      pq.rotation.y = Math.atan2(0.6, 0.8);
      scene.add(pq);
      ex.stand = [ex.pos[0] + (ex.radius + 1.2) * 0.6, ex.pos[2] + (ex.radius + 1.2) * 0.8 + 0.6];
    } else {
      ex.stand = [0, ex.pos[2] + 4.5];
    }
    ex.lookAt = [ex.pos[0], ex.pos[2]];
  }
}

// 年表導引線
{
  const tl = EXHIBITS.filter((e) => e.kind === 'timeline');
  const zA = tl[0].pos[2] + 1.6, zB = tl.at(-1).pos[2] - 1.6;
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.05, zA - zB), new THREE.MeshBasicMaterial({ color: '#d9a066' }));
  bar.position.set(-HALF + 0.03, 3.8, (zA + zB) / 2); scene.add(bar);
}

// ───────── 角色（原創：穿長大衣的訪客）─────────
const hero = new THREE.Group();
{
  const coat = new THREE.MeshLambertMaterial({ map: paintedSurface('#3b3a33', { seed: 200, size: 128, angle: Math.PI / 2 }) });
  const skin = new THREE.MeshLambertMaterial({ color: '#c9a58a' });
  const dark = new THREE.MeshLambertMaterial({ color: '#1b1a18' });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.36, 1.05, 10), coat); body.position.y = 0.95;
  const chest = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.21, 0.42, 10), coat); chest.position.y = 1.55;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 10), skin); head.position.y = 1.93;
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.155, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), dark); hair.position.y = 1.95;
  const legs = [-1, 1].map((s) => { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.5, 6), dark); l.position.set(0.1 * s, 0.25, 0); return l; });
  const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.05, 6, 12), new THREE.MeshLambertMaterial({ color: '#7a2b22' }));
  scarf.rotation.x = Math.PI / 2; scarf.position.y = 1.77;
  hero.add(body, chest, head, hair, scarf, ...legs);
  hero.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  hero.userData.legs = legs;
  scene.add(hero);
}
const player = { x: 0, z: -3, face: Math.PI, path: [], arrive: null, moving: false };
hero.position.set(player.x, 0, player.z);

// 點擊目的地標記
const marker = new THREE.Mesh(new THREE.RingGeometry(0.22, 0.3, 24), new THREE.MeshBasicMaterial({ color: '#e8d6a8', transparent: true, opacity: 0 }));
marker.rotation.x = -Math.PI / 2; marker.position.y = 0.02; scene.add(marker);

// ───────── 移動與尋路 ─────────
function collide(x, z) {
  for (const [a, b, c, d] of colliders) {
    const cx = Math.max(a, Math.min(x, c)), cz = Math.max(b, Math.min(z, d));
    if ((x - cx) ** 2 + (z - cz) ** 2 < RADIUS * RADIUS) return true;
  }
  return x < -HALF + RADIUS || x > HALF - RADIUS || z > -RADIUS || z < Z_END + RADIUS;
}
const hallIndex = (z) => Math.max(0, HALLS.findIndex((h) => z <= h.zRange[0] && z > h.zRange[1]));

function walkTo(x, z, arrive = null) {
  const from = hallIndex(player.z), to = hallIndex(z);
  const path = [];
  if (to > from) for (let i = from + 1; i <= to; i++) { const zw = HALLS[i].zRange[0]; path.push([0, zw + 1.2], [0, zw - 1.2]); }
  if (to < from) for (let i = from; i > to; i--) { const zw = HALLS[i].zRange[0]; path.push([0, zw - 1.2], [0, zw + 1.2]); }
  path.push([x, z]);
  player.path = path; player.arrive = arrive;
  marker.position.set(x, 0.02, z); marker.material.opacity = 0.9;
}

function step(dt) {
  let moved = false;
  // 鍵盤（相對於鏡頭方向）
  const f = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
  const s = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
  if (f || s) {
    player.path = []; player.arrive = null; marker.material.opacity = 0;
    const fx = -CAM_OFFSET.x, fz = -CAM_OFFSET.z, fl = Math.hypot(fx, fz);
    const dx = (fx / fl) * f + (-fz / fl) * s, dz = (fz / fl) * f + (fx / fl) * s;
    const l = Math.hypot(dx, dz), sp = SPEED * (keys.has('ShiftLeft') ? 1.7 : 1) * dt;
    const mx = dx / l * sp, mz = dz / l * sp;
    if (!collide(player.x + mx, player.z)) player.x += mx;
    if (!collide(player.x, player.z + mz)) player.z += mz;
    player.face = Math.atan2(dx, dz); moved = true;
  } else if (player.path.length) {
    const [tx, tz] = player.path[0];
    const dx = tx - player.x, dz = tz - player.z, d = Math.hypot(dx, dz);
    const sp = SPEED * 1.15 * dt;
    if (d < 0.08) {
      player.path.shift();
      if (!player.path.length) { marker.material.opacity = 0; const cb = player.arrive; player.arrive = null; cb && cb(); }
    } else {
      const mx = dx / d * Math.min(sp, d), mz = dz / d * Math.min(sp, d);
      let ok = false;
      if (!collide(player.x + mx, player.z)) { player.x += mx; ok = true; }
      if (!collide(player.x, player.z + mz)) { player.z += mz; ok = true; }
      if (!ok) { player.path = []; player.arrive = null; marker.material.opacity = 0; }
      player.face = Math.atan2(dx, dz); moved = ok;
    }
  }
  player.moving = moved;
}

// ───────── 輸入 ─────────
const keys = new Set();
addEventListener('keydown', (e) => {
  if (/^Digit[1-9]$/.test(e.code) && current) { const li = choicesEl.children[+e.code.slice(5) - 1]; if (li) li.click(); return; }
  keys.add(e.code);
  if (e.code === 'Escape') closeDialogue();
});
addEventListener('keyup', (e) => keys.delete(e.code));
addEventListener('blur', () => keys.clear());

const canvas = renderer.domElement;
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
function cast(e) {
  ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
}
let downAt = null;
canvas.addEventListener('pointerdown', (e) => { downAt = [e.clientX, e.clientY]; });
canvas.addEventListener('pointerup', (e) => {
  if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 6) return;
  cast(e);
  const hit = ray.intersectObjects(clickables, false)[0];
  if (hit) return approach(hit.object.userData.exhibit);
  const fh = ray.intersectObjects(floorMeshes, false)[0];
  if (fh && !collide(fh.point.x, fh.point.z)) walkTo(fh.point.x, fh.point.z);
});
canvas.addEventListener('pointermove', (e) => {
  cast(e);
  canvas.style.cursor = ray.intersectObjects(clickables, false)[0] ? 'pointer' : 'default';
});
let zoom = 1.3;
canvas.addEventListener('wheel', (e) => { zoom = Math.max(0.7, Math.min(1.9, zoom * (e.deltaY > 0 ? 1.08 : 0.93))); }, { passive: true });

function approach(ex) {
  walkTo(ex.stand[0], ex.stand[1], () => {
    player.face = Math.atan2(ex.lookAt[0] - player.x, ex.lookAt[1] - player.z);
    openDialogue(ex);
  });
}

// ───────── 敘事欄（直接移植自 tm-a-t/speech-cabinet）─────────
const $ = (s) => document.querySelector(s);
const dlg = $('#dlg'), logEl = $('#dlg-log'), choicesEl = $('#dlg-choices');
const portraitImg = $('#dlg-portrait-img'), tapeEl = $('#dlg-tape');
const checkOverlay = $('#dlg-check-overlay'), checkBgImg = $('#dlg-check-bg'), checkTextImg = $('#dlg-check-text'), diceStripEl = $('#dlg-dice-strip');
let current = null, stepIdx = 0, tapePos = 0, voiceRolled = false;
const esc = (t) => t.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

const PIP_LAYOUT_BY_VALUE = [
  [[48, 48]],
  [[28, 28], [68, 68]],
  [[28, 28], [48, 48], [68, 68]],
  [[28, 28], [68, 28], [28, 68], [68, 68]],
  [[28, 28], [68, 28], [48, 48], [28, 68], [68, 68]],
  [[28, 24], [28, 48], [28, 72], [68, 24], [68, 48], [68, 72]],
];
function renderPipDie(value) {
  const v = value >= 1 && value <= 6 ? value : 1;
  const circles = PIP_LAYOUT_BY_VALUE[v - 1].map(([cx, cy]) => `<circle cx="${cx}" cy="${cy}" r="8" fill="white" />`).join('');
  return `<svg viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect x="2.5" y="2.5" width="91" height="91" rx="13.5" fill="none" stroke="white" stroke-width="5" />
    ${circles}
  </svg>`;
}
function playMp3(path) {
  if (!path) return;
  const el = new Audio(`../${path}`);
  el.volume = 0.65;
  el.play().catch(() => {});
}
function rollTape(delta = 84, rolling = false) {
  tapePos += delta;
  if (!tapeEl) return;
  tapeEl.style.transition = rolling
    ? 'background-position-y 1s ease-in-out'
    : 'background-position-y .3s cubic-bezier(.1, .3, .7, .9)';
  tapeEl.style.backgroundPositionY = `-${tapePos}px`;
}
function setPortrait(relPath) {
  if (!portraitImg || !relPath) return;
  const url = `../${relPath}`;
  if (portraitImg.getAttribute('src') !== url) portraitImg.src = url;
}

const NARRATION = {
  panel: ['你在展板前停下。燈光把畫布照得有點過亮，每一道筆觸都看得見。', '你湊近了一點。顏料的氣味，聞起來像是昨天才乾。', '一塊展板。身後好像有人咳了一聲——回頭時，什麼人也沒有。'],
  timeline: ['你沿著年表往前走。牆上那條線，一直延伸到看不見的地方。', '你在年表的一個節點前停下。日期旁邊的油彩堆得特別厚。'],
  object: ['你繞著展台走了半圈。', '它就立在那裡，安靜得像在等你先開口。', '你停下腳步。地板吱了一聲。'],
};
let narrIdx = 0;
const narrate = (ex) => { const pool = NARRATION[ex.kind] || NARRATION.object; return pool[(narrIdx++) % pool.length]; };

function line(type, who, text, color, { check = '', portrait = '' } = {}) {
  logEl.querySelectorAll('.line').forEach((l) => l.classList.add('is-old'));
  const d = document.createElement('p');
  d.className = `line line--${type}`;
  const checkHtml = check ? `<span class="check"> [${esc(check)}]</span>` : '';
  d.innerHTML = (who ? `<span class="who"${color ? ` style="--who:${color}"` : ''}>${esc(who)}</span>${checkHtml}<span class="dash"> &ndash; </span>` : '') +
    `<span class="text">${esc(text).replace(/\n/g, '<br>')}</span>`;
  logEl.appendChild(d);
  rollTape(88, false);
  if (portrait) setPortrait(portrait);
  requestAnimationFrame(() => d.classList.add('is-in'));
  logEl.scrollTo({ top: logEl.scrollHeight, behavior: 'smooth' });
}

function runActiveCheck(v) {
  if (!v || !current) return;
  const ex = current;
  const [vName, vText, vCheck] = v;
  const meta = VOICE_META[vName] || { en: vName, attr: 'intellect', portrait: 'public/portraits/Encyclopedia.png', sound: 'public/sounds/intellect.mp3' };
  const isFailure = (vCheck || '').includes('Failure');
  const [die1, die2] = isFailure ? [2, 1] : [5, 6];

  choicesEl.innerHTML = '';
  playMp3(isFailure ? 'public/sounds/failure.mp3' : 'public/sounds/success.mp3');
  rollTape(1100, true);

  if (checkOverlay) {
    checkBgImg.src = `../public/effects/${isFailure ? 'check-failure-background.png' : 'check-success-background.png'}`;
    checkTextImg.src = `../public/effects/${isFailure ? 'check-failure.svg' : 'check-success.svg'}`;
    diceStripEl.innerHTML = renderPipDie(die1) + renderPipDie(die2);
    checkOverlay.classList.remove('is-hidden', 'fade-out');
  }

  setTimeout(() => {
    if (current !== ex) return;
    if (checkOverlay) checkOverlay.classList.add('fade-out');
    playMp3(meta.sound);
    line('voice', `${meta.en} (${vName})`, vText, VOICE_COLORS[vName], {
      check: vCheck || 'Medium: Success',
      portrait: meta.portrait,
    });
    voiceRolled = true;
    renderChoices();
    setTimeout(() => { if (checkOverlay) checkOverlay.classList.add('is-hidden'); }, 1100);
  }, 1100);
}

function renderChoices() {
  choicesEl.innerHTML = '';
  if (!current) return;
  const opts = [];
  if (stepIdx < current.body.length) opts.push(['"繼續說。" [Continue.]', cont, '']);
  const v = VOICES[current.id];
  if (v && !voiceRolled) {
    const [vName, , vCheck] = v;
    const meta = VOICE_META[vName] || { en: vName };
    const diff = (vCheck || 'Medium: Success').split(':')[0];
    opts.push([`[${meta.en} · ${vName} — ${diff}] 傾聽腦海中的聲音（擲骰檢定）`, () => runActiveCheck(v), 'choice--check']);
  }
  opts.push([stepIdx < current.body.length ? '"先帶我去下一件吧。"' : '"我明白了。下一件。"', () => goRel(1), '']);
  opts.push(['"回到上一件。"', () => goRel(-1), '']);
  opts.push(['[Leave.]（轉身離開。）', () => { line('you', 'YOU', '（轉身離開。）', '#CFD5BF', { portrait: 'public/portraits/You.png' }); setTimeout(closeDialogue, 300); }, '']);
  opts.forEach(([t, fn, cls], i) => {
    const li = document.createElement('li');
    li.className = `choice ${cls || ''}`.trim();
    li.innerHTML = `<span class="choice-key">${i + 1}. -</span> <span class="choice-text">${esc(t)}</span>`;
    li.onclick = () => { stopTour(); fn(t); };
    choicesEl.appendChild(li);
  });
}
function cont(t = '"繼續說。"') {
  if (!current || stepIdx >= current.body.length) return;
  line('you', 'YOU', t.replace(/ \[Continue\.\]$/, ''), '#CFD5BF', { portrait: 'public/portraits/You.png' });
  choicesEl.innerHTML = '';
  const ex = current;
  const p = EXHIBIT_PORTRAITS[ex.id] || 'public/portraits/Encyclopedia.png';
  setTimeout(() => { if (current !== ex) return; line('docent', 'CURATOR · 導覽員', ex.body[stepIdx++], 'var(--hall-accent)', { portrait: p }); renderChoices(); }, 350);
}
function goRel(d) {
  const i = (EXHIBITS.indexOf(current) + d + EXHIBITS.length) % EXHIBITS.length;
  choicesEl.innerHTML = '';
  approach(EXHIBITS[i]);
}
function openDialogue(ex) {
  const hall = hallOf(ex.hall);
  current = ex; stepIdx = 0; voiceRolled = false;
  document.documentElement.style.setProperty('--hall-accent', hall.palette.accent);
  $('#dlg-hall').textContent = `HALL ${hall.no} · ${hall.zh}`;
  $('#dlg-title').textContent = ex.zh;
  $('#dlg-sub').textContent = `№ ${ex.no} · ${ex.title}`;
  const p = EXHIBIT_PORTRAITS[ex.id] || 'public/portraits/Encyclopedia.png';
  setPortrait(p);
  dlg.classList.add('is-open');
  const sep = document.createElement('div'); sep.className = 'sep'; sep.textContent = `— № ${ex.no} · ${ex.title.toUpperCase()} —`;
  logEl.appendChild(sep);
  line('narration', null, narrate(ex));
  setTimeout(() => { if (current !== ex) return; line('docent', 'CURATOR · 導覽員', ex.body[stepIdx++], 'var(--hall-accent)', { portrait: p }); renderChoices();
    const v = VOICES[ex.id];
    if (v) {
      const [vName, vText, vCheck] = v;
      const meta = VOICE_META[vName] || { en: vName, attr: 'intellect', portrait: 'public/portraits/Encyclopedia.png', sound: 'public/sounds/intellect.mp3' };
      setTimeout(() => {
        if (current !== ex || voiceRolled) return;
        voiceRolled = true;
        playMp3(meta.sound);
        line('voice', `${meta.en} (${vName})`, vText, VOICE_COLORS[vName], {
          check: vCheck || 'Medium: Success',
          portrait: meta.portrait,
        });
        renderChoices();
      }, 900);
    }
  }, 450);
}
function closeDialogue() { dlg.classList.remove('is-open'); current = null; choicesEl.innerHTML = ''; }
$('#dlg-close').onclick = closeDialogue;

// 2.5D 漂浮灰燼粒子（AshesBackground）
{
  const ashCanvas = $('#dlg-ashes');
  if (ashCanvas) {
    const actx = ashCanvas.getContext('2d');
    const AW = ashCanvas.width, AH = ashCanvas.height;
    const ashes = Array.from({ length: 48 }, () => ({
      x: Math.random() * 2 * AW - 0.5 * AW,
      y: Math.random() * AH,
      size: Math.random() * 2 + 2,
      sx: (Math.random() + 0.2) * 0.75,
      sy: Math.random() * -0.4 - 0.15,
      alpha: Math.random() * 0.4 + 0.2,
    }));
    ctx.tick.push(() => {
      if (!dlg.classList.contains('is-open')) return;
      actx.clearRect(0, 0, AW, AH);
      const wave = Math.sin(performance.now() / 1000) * 0.12;
      for (const a of ashes) {
        a.x += a.sx + wave;
        a.y += a.sy;
        if (a.alpha <= 0 || a.y < 0) {
          a.x = Math.random() * 2 * AW - 0.5 * AW;
          a.y = AH;
        }
        const al = a.alpha * (a.y / AH + 0.4) / 1.4;
        actx.fillStyle = `rgba(220, 161, 141, ${al})`;
        actx.beginPath();
        actx.arc(a.x, a.y, a.size, 0, Math.PI * 2);
        actx.fill();
      }
    });
  }
}

// 自動導覽
let tour = null;
const holdFor = (t) => Math.max(5, Math.min(14, t.length / 14));
function startTour() {
  tour = { i: current ? EXHIBITS.indexOf(current) : 0, wait: -1 };
  $('#btn-tour').classList.add('is-on'); $('#btn-tour').textContent = '■ 停止導覽';
  tourGo();
}
function tourGo() {
  const ex = EXHIBITS[tour.i]; tour.wait = -1;
  approach(ex);
  const orig = player.arrive;
  player.arrive = () => { orig && orig(); if (tour) tour.wait = holdFor(ex.body[0]) + 1.4; };
}
function stopTour() { if (!tour) return; tour = null; $('#btn-tour').classList.remove('is-on'); $('#btn-tour').textContent = '▶ 自動導覽'; }
function updateTour(dt) {
  if (!tour || tour.wait < 0) return;
  tour.wait -= dt;
  if (tour.wait > 0) return;
  if (current && stepIdx < current.body.length) { tour.wait = holdFor(current.body[stepIdx]) + 0.4; cont(); return; }
  tour.i++;
  if (tour.i >= EXHIBITS.length) { stopTour(); return; }
  tourGo();
}
$('#btn-tour').onclick = () => (tour ? stopTour() : startTour());
addEventListener('keydown', (e) => { if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) stopTour(); });

// 展品列表
{
  const ul = $('#list-items');
  for (const hall of HALLS) {
    const h = document.createElement('li'); h.className = 'list-hall'; h.textContent = `HALL ${hall.no}　${hall.zh}`; ul.appendChild(h);
    for (const ex of EXHIBITS.filter((e) => e.hall === hall.id)) {
      const li = document.createElement('li'); li.className = 'list-item';
      li.innerHTML = `<span class="list-no">${ex.no}</span> ${esc(ex.zh)}`;
      li.onclick = () => { stopTour(); $('#list').classList.remove('is-open'); approach(ex); };
      ul.appendChild(li);
    }
  }
  $('#btn-list').onclick = () => $('#list').classList.toggle('is-open');
}

// 開場
let paused = true;
$('#enter').onclick = () => { $('#intro').classList.add('is-hidden'); paused = false; };
$('#enter-tour').onclick = () => { $('#intro').classList.add('is-hidden'); paused = false; startTour(); };
$('#btn-help').onclick = () => { $('#intro').classList.remove('is-hidden'); paused = true; };
document.addEventListener('visibilitychange', () => { if (document.hidden) keys.clear(); });

// 狀態卡：展場時鐘（每 2 秒走 1 分鐘）
let clockMin = 13 * 60 + 10;
setInterval(() => { if (!paused && !document.hidden) clockMin = (clockMin + 1) % 1440; }, 2000);

// ───────── 主迴圈 ─────────
const camTarget = new THREE.Vector3(player.x, 1, player.z);
const clock = new THREE.Clock();
let lastHall = -1, viewShift = 0, lastClockText = '';
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.05);
  if (paused && lastHall !== -1) return;
  const t = clock.elapsedTime;
  step(dt); updateTour(dt);
  for (const f of ctx.tick) f(t);

  // 角色
  hero.position.set(player.x, player.moving ? Math.abs(Math.sin(t * 10)) * 0.04 : 0, player.z);
  const df = ((player.face - hero.rotation.y + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  hero.rotation.y += df * Math.min(1, dt * 12);
  hero.userData.legs.forEach((l, i) => { l.rotation.x = player.moving ? Math.sin(t * 10 + i * Math.PI) * 0.5 : 0; });
  if (marker.material.opacity > 0) marker.scale.setScalar(1 + Math.sin(t * 6) * 0.1);

  // 鏡頭跟隨
  camTarget.lerp(new THREE.Vector3(player.x, 1, player.z), Math.min(1, dt * 4));
  camera.position.copy(camTarget).addScaledVector(CAM_OFFSET, zoom);
  camera.lookAt(camTarget);
  // 對話欄打開時把畫面往左推，角色不會被擋住
  const want = dlg.classList.contains('is-open') && innerWidth > 900 ? dlg.offsetWidth / 2 : 0;
  viewShift += (want - viewShift) * Math.min(1, dt * 5);
  camera.setViewOffset(innerWidth, innerHeight, viewShift, 0, innerWidth, innerHeight);

  // 主光跟著角色，陰影範圍才夠用
  sun.position.set(player.x - 6, 16, player.z + 8); sun.target.position.set(player.x, 0, player.z);

  // 擋在角色與鏡頭之間的隔牆降成矮牆
  for (const c of cutaways) {
    const low = c.z > player.z + 0.5;
    const k = c.mesh.userData.k ?? 1, target = low ? 0 : 1;
    const nk = k + (target - k) * Math.min(1, dt * 6);
    c.mesh.userData.k = nk;
    if (c.sign) c.mesh.visible = nk > 0.5;
    else if (c.lintel) c.mesh.visible = nk > 0.5;
    else { const h = LOW + (H - LOW) * nk; c.mesh.scale.y = h / H; c.mesh.position.y = h / 2; }
  }

  // 介面
  const hi = hallIndex(player.z);
  if (hi !== lastHall) {
    lastHall = hi; const h = HALLS[hi];
    document.documentElement.style.setProperty('--hall-accent', h.palette.accent);
    $('#status-hall').textContent = `HALL ${h.no}`;
    $('#status-hall-zh').textContent = h.zh;
  }
  const ct = `'51 · ${String((clockMin / 60) | 0).padStart(2, '0')}:${String(clockMin % 60).padStart(2, '0')}`;
  if (ct !== lastClockText) { $('#status-clock').textContent = ct; lastClockText = ct; }

  renderer.render(scene, camera);
}
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
document.body.classList.add('is-ready');
frame();
window.__iso = { player, approach, EXHIBITS, openDialogue };
