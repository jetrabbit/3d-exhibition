// 單頁雙視角：第一人稱 ⇄ 2.5D（按 V 或工具列按鈕即時切換）
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { HALLS, EXHIBITS, VOICES, VOICE_COLORS, VOICE_META, EXHIBIT_PORTRAITS } from './exhibits.js';
import { paintedSurface, panelTexture, plaqueTexture, signTexture, drawCover, toTexture } from './art.js';
import { buildModel } from './models.js';

const W = 22, HALF = W / 2, H = 6, Z_END = -74, DOOR = 2.6, LOW = 0.45;
const EYE = 1.65, SPEED = 3.6, RADIUS = 0.45;
const ISO_OFFSET = new THREE.Vector3(9, 13, 11);
const FOV = { fp: 70, iso: 34 };
const FOG = { fp: [14, 40], iso: [30, 60] };

// 兩種視角共用同一套展品擺位：右牆的展板移到隔牆上，2.5D 鏡頭才看得到
const LAYOUT = {
  '1-0': { pos: [-10.75, 2.3, -5] },
  '1-3': { pos: [-10.75, 2.3, -13] },
  '1-1': { pos: [-6, 2.3, -21.75], rotY: 0 },
  '1-5': { pos: [6, 2.3, -21.75], rotY: 0 },
  '1-4': { pos: [6.5, 0, -10] },
  '2-2': { pos: [-6, 2.4, -51.75], rotY: 0 },
  '2-4': { pos: [6, 2.3, -51.75], rotY: 0 },
  '3-3': { pos: [-8.2, 2.3, -73.75], rotY: 0 },
};
for (const ex of EXHIBITS) {
  const o = LAYOUT[ex.id];
  if (o) { ex.pos = o.pos; if (o.rotY !== undefined) ex.rotY = o.rotY; }
}

await Promise.race([
  Promise.all([
    document.fonts.load('600 40px "Noto Serif TC"'),
    document.fonts.load('700 40px "Libre Baskerville"'),
    document.fonts.load('italic 40px "Libre Baskerville"'),
    document.fonts.load('400 20px "Spectral"'),
    document.fonts.load('600 20px "Spectral"'),
  ]),
  new Promise((r) => setTimeout(r, 4000)),
]);

// ───────── 基本場景 ─────────
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.3;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('stage').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#151413');
scene.fog = new THREE.Fog('#1b1a18', ...FOG.fp);

const camera = new THREE.PerspectiveCamera(FOV.fp, innerWidth / innerHeight, 0.05, 200);
// 共用的玩家狀態：yaw/pitch 給第一人稱，face/path 給 2.5D 角色
const player = { x: 0, z: -2.5, yaw: 0, pitch: -0.05, face: Math.PI, path: [], arrive: null, moving: false };

// 燈光：半球光 + 一盞跟著玩家的陰影主光 + 每廳一盞氣氛光，共 5 盞
scene.add(new THREE.HemisphereLight('#e2d9c8', '#2a241f', 1.5));
const sun = new THREE.DirectionalLight('#ffe2b5', 1.8);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 40 });
sun.shadow.bias = -0.0008;
scene.add(sun, sun.target);

const clickables = [];
const colliders = []; // [minX, minZ, maxX, maxZ]
const floorMeshes = [];
const fpOnly = [];        // 只在第一人稱顯示（天花板、吊燈）
const shrinkWalls = [];   // 2.5D 時永遠降成矮牆（右牆、入口牆）
const cutaways = [];      // 2.5D 時擋住角色才降低（隔牆、門楣、隔牆上的展板）

// ───────── 建築 ─────────
function box(w, h, d, mat, x, y, z, collide = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z); m.receiveShadow = true; m.castShadow = true;
  scene.add(m);
  if (collide) colliders.push([x - w / 2, z - d / 2, x + w / 2, z + d / 2]);
  return m;
}

const fixtureMat = new THREE.MeshBasicMaterial({ color: '#ffe2b0' });
const fixtureGeo = new THREE.CylinderGeometry(0.35, 0.45, 0.12, 20);
const fixtureSpots = [];
HALLS.forEach((hall, i) => {
  const [z0, z1] = hall.zRange, len = z0 - z1, zc = (z0 + z1) / 2;
  const wallMat = new THREE.MeshLambertMaterial({ map: paintedSurface(hall.palette.wall, { seed: 10 + i, repeat: [len / 6, 1], amt: 26 }) });
  const floorMat = new THREE.MeshLambertMaterial({ map: paintedSurface(hall.palette.floor, { seed: 20 + i, angle: 0, repeat: [4, len / 5], amt: 16 }) });
  const ceilMat = new THREE.MeshLambertMaterial({ map: paintedSurface('#2a2725', { seed: 30 + i, repeat: [3, len / 6] }) });

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, len), floorMat);
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, zc); floor.receiveShadow = true;
  scene.add(floor); floorMeshes.push(floor);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, len), ceilMat);
  ceil.rotation.x = Math.PI / 2; ceil.position.set(0, H, zc); scene.add(ceil); fpOnly.push(ceil);

  box(0.4, H, len, wallMat, -HALF - 0.2, H / 2, zc);
  shrinkWalls.push(box(0.4, H, len, wallMat, HALF + 0.2, H / 2, zc));

  // 吊燈：只是發光的燈罩，不再是即時光源
  for (let z = z0 - 4; z > z1 + 2; z -= 7) fixtureSpots.push(z);

  const segW = (W - DOOR) / 2;
  if (i === 0) {
    shrinkWalls.push(box(W + 0.8, H, 0.4, new THREE.MeshLambertMaterial({ map: paintedSurface('#2c2a27', { seed: 40, repeat: [3, 1] }) }), 0, H / 2, z0 + 0.2));
  } else {
    for (const sx of [-1, 1]) cutaways.push({ mesh: box(segW, H, 0.4, wallMat, sx * (HALF - segW / 2), H / 2, z0), z: z0 });
    cutaways.push({ mesh: box(DOOR, H - 3.2, 0.4, wallMat, 0, H - (H - 3.2) / 2, z0, false), z: z0, hide: true });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 0.9), new THREE.MeshBasicMaterial({
      map: signTexture([
        { text: `HALL ${hall.no} · ${hall.name.toUpperCase()}`, font: '700 64px "Libre Baskerville", serif', dy: 8 },
        { text: hall.zh, font: '600 78px "Noto Serif TC", serif', dy: -8 },
      ], { w: 1024, h: 256, accent: hall.palette.accent }), color: '#e0d8c8' }));
    sign.position.set(0, 4.55, z0 + 0.22);
    scene.add(sign);
    cutaways.push({ mesh: sign, z: z0, hide: true });
  }

  const amb = new THREE.PointLight(hall.palette.accent, 30, 32, 1.2);
  amb.position.set(-1, H - 0.5, zc); scene.add(amb);
});
box(W + 0.8, H, 0.4, new THREE.MeshLambertMaterial({ map: paintedSurface('#2f3b38', { seed: 50, repeat: [3, 1] }) }), 0, H / 2, Z_END - 0.2);
{
  const fixtures = new THREE.InstancedMesh(fixtureGeo, fixtureMat, fixtureSpots.length);
  const m4 = new THREE.Matrix4();
  fixtureSpots.forEach((z, i) => fixtures.setMatrixAt(i, m4.makeTranslation(0, H - 0.06, z)));
  scene.add(fixtures); fpOnly.push(fixtures);
}

// 展板的「投射燈」：疊加的光暈貼圖，取代即時聚光燈
const glowMat = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d'); const gr = g.createRadialGradient(128, 80, 4, 128, 128, 128);
  gr.addColorStop(0, 'rgba(255,228,180,.5)'); gr.addColorStop(0.5, 'rgba(255,214,150,.16)'); gr.addColorStop(1, 'rgba(255,214,150,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  return new THREE.MeshBasicMaterial({ map: toTexture(c), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
})();

// 把同一材質、不會動的網格合併成一個，減少繪製次數（例如樹枝）
function mergeStatic(group) {
  group.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(group.matrixWorld).invert();
  const byMat = new Map();
  group.traverse((o) => {
    if (!o.isMesh || o.userData.animated || Array.isArray(o.material)) return;
    let p = o.parent; while (p && p !== group) { if (p.userData.animated) return; p = p.parent; }
    if (!byMat.has(o.material)) byMat.set(o.material, []);
    byMat.get(o.material).push(o);
  });
  for (const [mat, meshes] of byMat) {
    if (meshes.length < 3) continue;
    const geos = meshes.map((m) => { const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone(); return g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld)); });
    const merged = mergeGeometries(geos.map((g) => { for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k); return g; }));
    if (!merged) continue;
    meshes.forEach((m) => m.parent.remove(m));
    const mm = new THREE.Mesh(merged, mat); mm.castShadow = mm.receiveShadow = true;
    group.add(mm);
  }
}

// ───────── 展品 ─────────
const hallOf = (id) => HALLS.find((h) => h.id === id);
const frameMat = new THREE.MeshLambertMaterial({ color: '#1d1916' });
const ctx = { tick: [] };       // 與展品無關的動畫（灰燼粒子等）
const exhibitTicks = [];        // { ex, fns } 只在玩家附近時才更新

for (const ex of EXHIBITS) {
  const hall = hallOf(ex.hall);
  if (ex.kind === 'panel' || ex.kind === 'timeline') {
    const grp = new THREE.Group();
    const [pw, ph] = ex.size;
    grp.add(new THREE.Mesh(new THREE.BoxGeometry(pw + 0.14, ph + 0.14, 0.08), frameMat));
    const art = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), new THREE.MeshBasicMaterial({ map: panelTexture(ex, hall), color: '#dcd5c7' }));
    art.position.z = 0.045; grp.add(art);
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(pw * 1.9, ph * 1.9), glowMat);
    glow.position.set(0, 0.3, 0.03); grp.add(glow);
    grp.position.set(...ex.pos); grp.rotation.y = ex.rotY;
    scene.add(grp);
    const wallHall = HALLS.slice(1).find((h) => Math.abs(h.zRange[0] - ex.pos[2]) < 0.5);
    if (ex.rotY === 0 && wallHall) cutaways.push({ mesh: grp, z: wallHall.zRange[0], hide: true });
    art.userData.exhibit = ex; clickables.push(art);
    const n = [Math.sin(ex.rotY), Math.cos(ex.rotY)];
    const vd = ex.kind === 'timeline' ? 4.8 : 3.8;
    ex.view = { pos: [ex.pos[0] + n[0] * vd, ex.pos[2] + n[1] * vd], look: ex.pos };
    ex.stand = [ex.pos[0] + n[0] * 2.4, ex.pos[2] + n[1] * 2.4];
  } else {
    const local = { tick: [] };
    const m = buildModel(ex.model, local);
    // 模型自帶的光源全部移除（改靠材質自發光），這是效能的大頭
    const lights = []; m.traverse((o) => { if (o.isLight) lights.push(o); });
    lights.forEach((l) => l.parent.remove(l));
    m.position.set(...ex.pos);
    if (ex.model === 'tree' || ex.model === 'hostel' || ex.model === 'strike') mergeStatic(m);
    m.traverse((o) => { if (o.isMesh) { o.userData.exhibit = ex; clickables.push(o); o.castShadow = true; o.receiveShadow = true; } });
    scene.add(m);
    if (local.tick.length) exhibitTicks.push({ ex, fns: local.tick });
    const r = ex.radius * 0.8;
    colliders.push([ex.pos[0] - r, ex.pos[2] - r, ex.pos[0] + r, ex.pos[2] + r]);
    if (ex.model !== 'hostel') {
      const pq = new THREE.Group();
      const stand = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.9, 0.06), frameMat); stand.position.y = 0.45; pq.add(stand);
      const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.4), new THREE.MeshBasicMaterial({ map: plaqueTexture(ex, hall), color: '#dcd5c7' }));
      plate.position.y = 0.98; plate.rotation.x = -0.6; pq.add(plate);
      plate.userData.exhibit = ex; clickables.push(plate);
      const d = ex.radius + 0.5;
      pq.position.set(ex.pos[0] + d * 0.6, 0, ex.pos[2] + d * 0.8);
      pq.rotation.y = Math.atan2(0.6, 0.8);
      scene.add(pq);
      const vd = ex.radius + 3;
      ex.view = { pos: [ex.pos[0] + vd * 0.6, ex.pos[2] + vd * 0.8], look: [ex.pos[0], 1.4, ex.pos[2]] };
      ex.stand = [ex.pos[0] + (ex.radius + 1.2) * 0.6, ex.pos[2] + (ex.radius + 1.2) * 0.8 + 0.6];
    } else {
      ex.view = { pos: [0, ex.pos[2] + 7.5], look: [0, 2.6, ex.pos[2]] };
      ex.stand = [0, ex.pos[2] + 4.5];
    }
  }
}

// 年表長線
{
  const tl = EXHIBITS.filter((e) => e.kind === 'timeline');
  const zA = tl[0].pos[2] + 1.6, zB = tl.at(-1).pos[2] - 1.6;
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.05, zA - zB), new THREE.MeshBasicMaterial({ color: '#d9a066' }));
  bar.position.set(-HALF + 0.03, 4.15, (zA + zB) / 2); scene.add(bar);
  const label = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 0.55), new THREE.MeshBasicMaterial({
    map: signTexture([{ text: 'TIMELINE OF REVACHOL · 瑞瓦肖年表 →', font: '700 60px "Noto Serif TC", serif' }], { w: 1536, h: 192, accent: '#d9a066' }), color: '#e0d8c8' }));
  label.position.set(-HALF + 0.03, 4.6, zA - 2.6); label.rotation.y = Math.PI / 2; scene.add(label);
}

// ───────── 2.5D 角色（原創：穿長大衣的訪客）─────────
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
  hero.visible = false;
  scene.add(hero);
}
const marker = new THREE.Mesh(new THREE.RingGeometry(0.22, 0.3, 24), new THREE.MeshBasicMaterial({ color: '#e8d6a8', transparent: true, opacity: 0 }));
marker.rotation.x = -Math.PI / 2; marker.position.y = 0.02; scene.add(marker);

// ───────── 視角 ─────────
let view = 'fp';          // 目標視角
let blend = 0;            // 0 = 第一人稱，1 = 2.5D（過場時介於兩者之間）
let zoom = innerWidth < innerHeight ? 1.9 : 1.3; // 直立的手機畫面拉遠一點
const camTarget = new THREE.Vector3(player.x, 1, player.z);
const faceFromYaw = (yaw) => Math.PI - yaw;
const yawFromFace = (face) => Math.PI - face;

function setView(v) {
  if (v === view) return;
  stopTour();
  fly = null; player.path = []; player.arrive = null; marker.material.opacity = 0;
  if (v === 'iso') { player.face = faceFromYaw(player.yaw); camTarget.set(player.x, 1, player.z); }
  else { player.yaw = yawFromFace(player.face); player.pitch = -0.05; }
  view = v;
  if (v === 'fp' && current) fpFly(current);
  document.body.dataset.view = v;
  const b = document.getElementById('btn-view');
  if (b) b.textContent = v === 'iso' ? '⇄ 第一人稱' : '⇄ 2.5D 視角';
  const hint = document.getElementById('hint');
  if (hint) hint.textContent = v === 'iso'
    ? '點擊地板行走 · 點擊展品對話 · WASD 移動 · 滾輪縮放 · V 切換視角'
    : '拖曳滑鼠環顧 · WASD / 方向鍵移動 · Shift 加速 · 點擊展品對話 · V 切換視角';
  try { localStorage.setItem('elysium-view', v); } catch {}
}

// ───────── 控制 ─────────
const keys = new Set();
let tour = null;
let dragging = false, dragMoved = 0, lastX = 0, lastY = 0;
const canvas = renderer.domElement;
const MOVE_KEYS = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

addEventListener('keydown', (e) => {
  if (e.target.closest('input,textarea')) return;
  if (e.code === 'KeyV' && !e.repeat) { setView(view === 'fp' ? 'iso' : 'fp'); return; }
  keys.add(e.code);
  if (MOVE_KEYS.includes(e.code)) stopTour();
  if (e.code === 'Escape') closeInfo();
});
addEventListener('keyup', (e) => keys.delete(e.code));
addEventListener('blur', () => keys.clear());

const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
function cast(e) {
  ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
}
function pick(e) {
  cast(e);
  const hit = ray.intersectObjects(clickables, false)[0];
  return hit && (view === 'iso' || hit.distance < 14) ? hit.object.userData.exhibit : null;
}
canvas.addEventListener('pointerdown', (e) => { dragging = true; dragMoved = 0; lastX = e.clientX; lastY = e.clientY; canvas.setPointerCapture(e.pointerId); });
// 滑鼠移動時的 hover 偵測合併到每一格最多做一次
let hoverEvent = null;
canvas.addEventListener('pointermove', (e) => {
  if (dragging) {
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    dragMoved += Math.abs(dx) + Math.abs(dy);
    if (dragMoved > 4 && view === 'fp') {
      stopTour();
      const k = e.pointerType === 'touch' ? 0.006 : 0.0035;
      player.yaw += dx * k; player.pitch = Math.max(-1.1, Math.min(1.1, player.pitch - dy * k));
    }
    lastX = e.clientX; lastY = e.clientY;
  } else hoverEvent = e;
});
canvas.addEventListener('pointerup', (e) => {
  dragging = false;
  if (dragMoved > 6) return;
  const ex = pick(e);
  if (ex) { stopTour(); if (view === 'iso') approach(ex, () => openInfo(ex)); else openInfo(ex); return; }
  if (view === 'iso') {
    const fh = ray.intersectObjects(floorMeshes, false)[0];
    if (fh && !collide(fh.point.x, fh.point.z)) { stopTour(); walkTo(fh.point.x, fh.point.z); }
  }
});
canvas.addEventListener('wheel', (e) => { if (view === 'iso') zoom = Math.max(0.7, Math.min(1.9, zoom * (e.deltaY > 0 ? 1.08 : 0.93))); }, { passive: true });

document.querySelectorAll('[data-key]').forEach((b) => {
  const k = b.dataset.key;
  const on = (ev) => { ev.preventDefault(); keys.add(k); stopTour(); };
  const off = () => keys.delete(k);
  b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointerleave', off); b.addEventListener('pointercancel', off);
});

function collide(nx, nz) {
  for (const [a, b, c, d] of colliders) {
    const cx = Math.max(a, Math.min(nx, c)), cz = Math.max(b, Math.min(nz, d));
    if ((nx - cx) ** 2 + (nz - cz) ** 2 < RADIUS * RADIUS) return true;
  }
  return nx < -HALF + RADIUS || nx > HALF - RADIUS || nz > -RADIUS || nz < Z_END + RADIUS;
}
const hallIndex = (z) => Math.max(0, HALLS.findIndex((h) => z <= h.zRange[0] && z > h.zRange[1]));

function tryMove(mx, mz) {
  let ok = false;
  if (!collide(player.x + mx, player.z)) { player.x += mx; ok = true; }
  if (!collide(player.x, player.z + mz)) { player.z += mz; ok = true; }
  return ok;
}

function moveFP(dt) {
  let f = 0, s = 0;
  if (keys.has('KeyW') || keys.has('ArrowUp')) f += 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) f -= 1;
  if (keys.has('KeyA')) s -= 1;
  if (keys.has('KeyD')) s += 1;
  if (keys.has('ArrowLeft') || keys.has('KeyQ')) player.yaw -= 1.8 * dt;
  if (keys.has('ArrowRight') || keys.has('KeyE')) player.yaw += 1.8 * dt;
  player.moving = !!(f || s);
  if (!f && !s) return;
  const sp = SPEED * (keys.has('ShiftLeft') || keys.has('ShiftRight') ? 1.8 : 1) * dt;
  const len = Math.hypot(f, s);
  tryMove((Math.sin(player.yaw) * f + Math.cos(player.yaw) * s) / len * sp, (-Math.cos(player.yaw) * f + Math.sin(player.yaw) * s) / len * sp);
}

// 2.5D 尋路：0.5 公尺網格上的 A*，再把路徑拉直
const CELL = 0.5, GX = Math.round(W / CELL), GZ = Math.round(-Z_END / CELL);
let grid = null;
const cellX = (x) => Math.max(0, Math.min(GX - 1, Math.floor((x + HALF) / CELL)));
const cellZ = (z) => Math.max(0, Math.min(GZ - 1, Math.floor(-z / CELL)));
const cx = (i) => -HALF + (i + 0.5) * CELL, cz = (j) => -(j + 0.5) * CELL;
function buildGrid() {
  grid = new Uint8Array(GX * GZ);
  for (let j = 0; j < GZ; j++) for (let i = 0; i < GX; i++) grid[j * GX + i] = collide(cx(i), cz(j)) ? 1 : 0;
}
function clearLine(ax, az, bx, bz) {
  const d = Math.hypot(bx - ax, bz - az), n = Math.ceil(d / 0.2);
  for (let k = 1; k <= n; k++) if (collide(ax + (bx - ax) * k / n, az + (bz - az) * k / n)) return false;
  return true;
}
function findPath(x0, z0, x1, z1) {
  if (!grid) buildGrid();
  const s0 = cellZ(z0) * GX + cellX(x0);
  let goal = cellZ(z1) * GX + cellX(x1);
  if (grid[goal]) { // 目標在障礙物裡：找最近的空格
    let best = -1, bd = Infinity;
    for (let k = 0; k < grid.length; k++) if (!grid[k]) { const d = (cx(k % GX) - x1) ** 2 + (cz((k / GX) | 0) - z1) ** 2; if (d < bd) { bd = d; best = k; } }
    goal = best; x1 = cx(goal % GX); z1 = cz((goal / GX) | 0);
  }
  const g = new Float32Array(grid.length).fill(Infinity), came = new Int32Array(grid.length).fill(-1), done = new Uint8Array(grid.length);
  const open = [s0]; g[s0] = 0;
  const hfn = (k) => Math.hypot((k % GX) - (goal % GX), ((k / GX) | 0) - ((goal / GX) | 0));
  while (open.length) {
    let bi = 0; for (let k = 1; k < open.length; k++) if (g[open[k]] + hfn(open[k]) < g[open[bi]] + hfn(open[bi])) bi = k;
    const cur = open.splice(bi, 1)[0];
    if (cur === goal) break;
    if (done[cur]) continue; done[cur] = 1;
    const ci = cur % GX, cj = (cur / GX) | 0;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      if (!di && !dj) continue;
      const ni = ci + di, nj = cj + dj;
      if (ni < 0 || nj < 0 || ni >= GX || nj >= GZ) continue;
      const nk = nj * GX + ni;
      if (grid[nk] || done[nk]) continue;
      if (di && dj && (grid[cj * GX + ni] || grid[nj * GX + ci])) continue; // 不切牆角
      const ng = g[cur] + (di && dj ? 1.4142 : 1);
      if (ng < g[nk]) { g[nk] = ng; came[nk] = cur; open.push(nk); }
    }
  }
  if (came[goal] < 0 && goal !== s0) return null;
  const cells = []; for (let k = goal; k !== -1 && k !== s0; k = came[k]) cells.push([cx(k % GX), cz((k / GX) | 0)]);
  cells.reverse(); cells.push([x1, z1]);
  // 拉直：從目前點往後找最遠、中間沒有障礙的點
  const out = []; let ax = x0, az = z0, i = 0;
  while (i < cells.length) {
    let j = cells.length - 1;
    while (j > i && !clearLine(ax, az, cells[j][0], cells[j][1])) j--;
    out.push(cells[j]); [ax, az] = cells[j]; i = j + 1;
  }
  return out;
}
function walkTo(x, z, arrive = null) {
  const path = findPath(player.x, player.z, x, z);
  if (!path) return;
  player.path = path; player.arrive = arrive; player.stuck = 0;
  const [mx, mz] = path.at(-1);
  marker.position.set(mx, 0.02, mz); marker.material.opacity = 0.9;
}
function approach(ex, cb) {
  walkTo(ex.stand[0], ex.stand[1], () => {
    player.face = Math.atan2(ex.pos[0] - player.x, ex.pos[2] - player.z);
    cb && cb();
  });
}

function moveISO(dt) {
  const f = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
  const s = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
  player.moving = false;
  if (f || s) {
    player.path = []; player.arrive = null; marker.material.opacity = 0;
    const fx = -ISO_OFFSET.x, fz = -ISO_OFFSET.z, fl = Math.hypot(fx, fz);
    const dx = (fx / fl) * f + (-fz / fl) * s, dz = (fz / fl) * f + (fx / fl) * s;
    const l = Math.hypot(dx, dz), sp = SPEED * 0.9 * (keys.has('ShiftLeft') ? 1.7 : 1) * dt;
    player.moving = tryMove(dx / l * sp, dz / l * sp);
    player.face = Math.atan2(dx, dz);
  } else if (player.path.length) {
    const [tx, tz] = player.path[0];
    const dx = tx - player.x, dz = tz - player.z, d = Math.hypot(dx, dz);
    if (d < 0.08) {
      player.path.shift();
      if (!player.path.length) { marker.material.opacity = 0; const cb = player.arrive; player.arrive = null; cb && cb(); }
    } else {
      const sp = Math.min(SPEED * dt, d);
      player.moving = tryMove(dx / d * sp, dz / d * sp);
      player.face = Math.atan2(dx, dz);
      player.stuck = player.moving ? 0 : (player.stuck || 0) + dt;
      if (player.stuck > 1.5) { player.path = []; player.arrive = null; marker.material.opacity = 0; player.stuck = 0; }
    }
  }
}

// ───────── 前往展品（依視角：第一人稱飛過去 / 2.5D 走過去）─────────
const lerpAngle = (a, b, t) => a + (((b - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI) * t;
let fly = null;
function fpFly(ex, cb) {
  const [tx, tz] = ex.view.pos;
  const look = ex.view.look;
  const targetYaw = Math.atan2(look[0] - tx, -(look[2] - tz));
  const dist = Math.hypot(look[0] - tx, look[2] - tz);
  const targetPitch = Math.atan2((look[1] ?? 2) - EYE, dist);
  const from = { x: player.x, z: player.z, yaw: player.yaw, pitch: player.pitch };
  const dur = Math.max(1.2, Math.min(3.5, Math.hypot(tx - from.x, tz - from.z) / 5));
  fly = { from, to: { x: tx, z: tz, yaw: targetYaw, pitch: targetPitch }, t: 0, dur, cb };
}
function flyTo(ex, cb) {
  if (view === 'iso') approach(ex, cb);
  else fpFly(ex, cb);
}
function updateFly(dt) {
  if (!fly) return;
  fly.t += dt / fly.dur;
  const t = Math.min(1, fly.t), e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
  player.x = fly.from.x + (fly.to.x - fly.from.x) * e;
  player.z = fly.from.z + (fly.to.z - fly.from.z) * e;
  player.yaw = lerpAngle(fly.from.yaw, fly.to.yaw, e);
  player.pitch = fly.from.pitch + (fly.to.pitch - fly.from.pitch) * e;
  if (t >= 1) { const cb = fly.cb; fly = null; cb && cb(); }
}
const travelling = () => !!fly || player.path.length > 0;

function startTour(from = 0) {
  tour = { i: from, wait: 0 };
  document.getElementById('btn-tour').classList.add('on');
  document.getElementById('btn-tour').textContent = '■ 停止導覽';
  stepTour();
}
function stepTour() {
  if (!tour) return;
  const ex = EXHIBITS[tour.i];
  tour.wait = 0;
  flyTo(ex, () => { if (!tour) return; openInfo(ex, true); tour.hold = tour.wait = holdFor(ex.body[0]); });
}
function stopTour() {
  if (!tour) return;
  tour = null; fly = null; player.path = []; player.arrive = null; marker.material.opacity = 0;
  const b = document.getElementById('btn-tour'); b.classList.remove('on'); b.textContent = '▶ 自動導覽';
  document.getElementById('tour-bar').style.width = '0';
}
function updateTour(dt) {
  if (!tour || travelling() || tour.wait <= 0) return;
  tour.wait -= dt;
  document.getElementById('tour-bar').style.width = `${(1 - tour.wait / tour.hold) * 100}%`;
  if (tour.wait > 0) return;
  if (current && step < current.body.length) {
    tour.hold = tour.wait = holdFor(current.body[step]) + 0.3;
    cont();
    return;
  }
  tour.i++;
  if (tour.i >= EXHIBITS.length) { stopTour(); closeInfo(); return; }
  stepTour();
}
const holdFor = (text) => Math.max(5, Math.min(14, text.length / 14));

// ───────── UI（直接移植自 tm-a-t/speech-cabinet Player & MessageView & ActiveCheckDiceStrip）─────────
const $ = (s) => document.querySelector(s);
const info = $('#info');
const logEl = $('#log'), messagesEl = $('#messages'), choicesEl = $('#choices');
const coverCanvas = $('#info-cover-canvas');
const portraitImg = $('#sc-portrait-img');
const tapeEl = $('#tape-background');
const checkOverlay = $('#sc-check-overlay');
const checkBgImg = $('#sc-check-bg');
const checkTextImg = $('#sc-check-text');
const diceStripEl = $('#sc-dice-strip');
let current = null, step = 0, tapePos = 0, voiceRolled = false;
const esc = (t) => t.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

// 移植自 speech-cabinet/src/components/active-check-dice.tsx
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
  const pips = PIP_LAYOUT_BY_VALUE[v - 1];
  const circles = pips.map(([cx, cy]) => `<circle cx="${cx}" cy="${cy}" r="8" fill="white" />`).join('');
  return `<svg viewBox="0 0 96 96" class="sc-pip-die" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect x="2.5" y="2.5" width="91" height="91" rx="13.5" fill="none" stroke="white" stroke-width="5" />
    ${circles}
  </svg>`;
}

function rollTape(delta = 84, rolling = false) {
  tapePos += delta;
  if (!tapeEl) return;
  tapeEl.style.transition = rolling
    ? 'background-position-y 1s ease-in-out'
    : 'background-position-y .3s cubic-bezier(.1, .3, .7, .9)';
  tapeEl.style.backgroundPositionY = `-${tapePos}px`;
}

function setPortrait(url) {
  if (!portraitImg || !url) return;
  if (portraitImg.getAttribute('src') !== url) {
    portraitImg.src = url;
  }
}

// 移植自 speech-cabinet/src/components/player/message-view.tsx
function say(who, text, { cls = '', color = '', check = '', portrait = '' } = {}) {
  messagesEl.querySelectorAll('.sc-msg').forEach((l) => l.classList.add('old'));
  const d = document.createElement('div');
  d.className = `sc-msg ${cls}`.trim();
  const checkHtml = check ? `<span class="sc-check"> [${esc(check)}]</span>` : '';
  d.innerHTML = `<span class="sc-speaker" style="${color ? `color:${color}` : ''}">${esc(who)}</span>${checkHtml}<span class="sc-dash"> &ndash; </span><span class="sc-text">${esc(text).replace(/\n/g, '<br>')}</span>`;
  messagesEl.appendChild(d);
  rollTape(88, false);
  if (portrait) setPortrait(portrait);
  requestAnimationFrame(() => d.classList.add('in'));
  logEl.scrollTo({ top: logEl.scrollHeight, behavior: 'smooth' });
}

const docent = (t) => {
  const p = (current && EXHIBIT_PORTRAITS[current.id]) || 'public/portraits/Encyclopedia.png';
  say('CURATOR · 導覽員', t, { cls: 'docent', color: 'var(--accent)', portrait: p });
};

let checkInProgress = false;
let checkInterval = null;

// 主動技能檢定（移植自 speech-cabinet Player.tsx isActiveCheck 流程：捲軸快轉 + 雙骰翻滾 + 成功/失敗橫幅與光輝 + 音效）
function runActiveCheck(v) {
  if (!v || !current || checkInProgress) return;
  checkInProgress = true;
  const ex = current;
  const [vName, vText, vCheck] = v;
  const meta = VOICE_META[vName] || { en: vName, attr: 'intellect', portrait: 'public/portraits/Encyclopedia.png', sound: 'public/sounds/intellect.mp3' };
  const isFailure = (vCheck || '').includes('Failure');
  const [die1, die2] = isFailure ? [2, 1] : [5, 6];

  choicesEl.innerHTML = '';
  voiceRolled = true;

  // 1. 紙捲高速滾動 (tapeIsRolling)
  messagesEl.classList.add('tape-rolling');
  rollTape(1600, true);

  // 2. 顯示檢定覆蓋層並開始快速滾骰動畫
  if (checkOverlay) {
    checkBgImg.src = isFailure ? 'public/effects/check-failure-background.png' : 'public/effects/check-success-background.png';
    checkTextImg.src = isFailure ? 'public/effects/check-failure.svg' : 'public/effects/check-success.svg';
    checkOverlay.classList.remove('hidden', 'resolved', 'fade-out');

    if (checkInterval) clearInterval(checkInterval);
    checkInterval = setInterval(() => {
      const r1 = Math.floor(Math.random() * 6) + 1;
      const r2 = Math.floor(Math.random() * 6) + 1;
      diceStripEl.innerHTML = renderPipDie(r1) + renderPipDie(r2);
    }, 60);
  }

  // 3. 1000ms: 骰子停住鎖定點數，音效敲響，判定橫幅與光束炸現！
  setTimeout(() => {
    if (current !== ex) {
      if (checkInterval) clearInterval(checkInterval);
      checkInProgress = false;
      return;
    }
    if (checkInterval) clearInterval(checkInterval);
    diceStripEl.innerHTML = renderPipDie(die1) + renderPipDie(die2);
    if (checkOverlay) checkOverlay.classList.add('resolved');
    audio.playMp3(isFailure ? 'public/sounds/failure.mp3' : 'public/sounds/success.mp3');

    // 4. 1900ms: 橫幅滑出、光芒淡出，技能發話，肖像切換為該技能，文字進入對話流！
    setTimeout(() => {
      if (current !== ex) {
        checkInProgress = false;
        return;
      }
      messagesEl.classList.remove('tape-rolling');
      if (checkOverlay) checkOverlay.classList.add('fade-out');
      audio.playMp3(meta.sound);
      setPortrait(meta.portrait);
      say(`${meta.en} (${vName})`, vText, {
        cls: `voice text-${meta.attr}`,
        color: VOICE_COLORS[vName],
        check: vCheck || 'Medium: Success',
        portrait: meta.portrait,
      });
      renderChoices();

      // 5. 2600ms: 覆蓋層完全隱藏
      setTimeout(() => {
        if (checkOverlay) checkOverlay.classList.add('hidden');
        checkInProgress = false;
      }, 700);
    }, 900);
  }, 1000);
}

function renderChoices() {
  choicesEl.innerHTML = '';
  if (!current) return;
  const opts = [];
  if (step < current.body.length) opts.push(['"繼續說。" [Continue.]', cont, '']);
  else opts.push(['"我明白了。帶我去下一件展品。"', goNext, '']);

  const v = VOICES[current.id];
  if (v && !voiceRolled) {
    const [vName, , vCheck] = v;
    const meta = VOICE_META[vName] || { en: vName };
    const diff = (vCheck || 'Medium: Success').split(':')[0];
    opts.push([`[${meta.en} · ${vName} — ${diff}] 傾聽腦海中的聲音（擲骰檢定）`, () => runActiveCheck(v), 'check-opt']);
  }

  if (step < current.body.length) opts.push(['"先帶我去下一件展品吧。"', goNext, '']);
  opts.push(['"回到上一件展品。"', goPrev, '']);
  opts.push(['[Leave.]（轉身離開。）', () => {
    say('YOU', '（你轉身離開。）', { cls: 'you', color: '#CFD5BF', portrait: 'public/portraits/You.png' });
    setTimeout(closeInfo, 350);
  }, '']);

  opts.forEach(([t, fn, cls], i) => {
    const li = document.createElement('li');
    if (cls) li.className = cls;
    li.innerHTML = `<span class="k">${i + 1}. -</span> <span class="opt-text">${esc(t)}</span>`;
    li.onclick = () => { stopTour(); fn(t); };
    choicesEl.appendChild(li);
  });
}
function cont(t = '"繼續說。"') {
  if (!current || step >= current.body.length) return;
  say('YOU', t.replace(/ \[Continue\.\]$/, ''), { cls: 'you', color: '#CFD5BF' });
  const ex = current;
  const p = EXHIBIT_PORTRAITS[ex.id] || 'public/portraits/Encyclopedia.png';
  choicesEl.innerHTML = '';
  setTimeout(() => {
    if (current !== ex) return;
    setPortrait(p);
    docent(ex.body[step++]);
    renderChoices();
  }, 300);
}
const idx = (ex) => EXHIBITS.indexOf(ex);
function goTo(ex, t) {
  if (t) {
    say('YOU', t, { cls: 'you', color: '#CFD5BF', portrait: 'public/portraits/You.png' });
  }
  choicesEl.innerHTML = '';
  flyTo(ex, () => openInfo(ex, !!tour));
}
const goNext = (t) => goTo(EXHIBITS[(idx(current) + 1) % EXHIBITS.length], t);
const goPrev = (t) => goTo(EXHIBITS[(idx(current) - 1 + EXHIBITS.length) % EXHIBITS.length], t);

function openInfo(ex, fromTour = false) {
  const hall = hallOf(ex.hall);
  const same = current === ex;
  current = ex; step = 0; voiceRolled = false; checkInProgress = false;
  if (checkInterval) { clearInterval(checkInterval); checkInterval = null; }
  if (checkOverlay) checkOverlay.classList.add('hidden');
  $('#info-hall').textContent = `HALL ${hall.no} · ${hall.zh}`;
  $('#info-no').textContent = `EXHIBIT № ${ex.no}`;
  $('#info-title').textContent = ex.title;
  $('#info-zh').textContent = ex.zh;
  info.style.setProperty('--accent', hall.palette.accent);
  if (coverCanvas) drawCover(coverCanvas, ex, hall);
  const p = EXHIBIT_PORTRAITS[ex.id] || 'public/portraits/Encyclopedia.png';
  setPortrait(p);
  info.classList.add('open');
  if (!same) {
    const sep = document.createElement('div'); sep.className = 'sep'; sep.textContent = `— № ${ex.no} · ${ex.title.toUpperCase()} —`;
    messagesEl.appendChild(sep);
  }
  docent(ex.body[step++]);
  renderChoices();
  document.querySelectorAll('#list li').forEach((li) => li.classList.toggle('active', li.dataset.id === ex.id));
  if (!fromTour) stopTour();
}
function closeInfo() {
  info.classList.remove('open');
  current = null;
  choicesEl.innerHTML = '';
  checkInProgress = false;
  if (checkInterval) { clearInterval(checkInterval); checkInterval = null; }
}
$('#info-close').onclick = closeInfo;
addEventListener('keydown', (e) => {
  if (!current || !/^Digit[1-9]$/.test(e.code)) return;
  const li = choicesEl.children[+e.code.slice(5) - 1];
  if (li) li.click();
});

$('#btn-tour').onclick = () => (tour ? stopTour() : startTour(current ? idx(current) : 0));
$('#btn-list').onclick = () => $('#list').classList.toggle('open');
$('#btn-help').onclick = () => $('#intro').classList.remove('hidden');
$('#btn-full').onclick = () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.());

// ───────── Speech Cabinet 漂浮灰燼粒子（移植自 ashes-background.tsx）─────────
{
  const ashCanvas = $('#info-ashes');
  if (ashCanvas) {
    const actx = ashCanvas.getContext('2d');
    const AW = ashCanvas.width, AH = ashCanvas.height;
    const ashes = Array.from({ length: 64 }, () => ({
      x: Math.random() * 2 * AW - 0.5 * AW,
      y: Math.random() * AH,
      size: Math.random() * 2 + 2,
      sx: (Math.random() + 0.2) * 0.75,
      sy: Math.random() * -0.4 - 0.15,
      alpha: Math.random() * 0.4 + 0.2,
    }));
    ctx.tick.push(() => {
      if (!info.classList.contains('open')) return;
      actx.clearRect(0, 0, AW, AH);
      const wave = Math.sin(performance.now() / 1000) * 0.12;
      for (const a of ashes) {
        a.x += a.sx + wave;
        a.y += a.sy;
        if (a.alpha <= 0 || a.y < 0) {
          a.x = Math.random() * 2 * AW - 0.5 * AW;
          a.y = AH;
          a.size = Math.random() * 2 + 2;
          a.sx = (Math.random() + 0.2) * 0.75;
          a.sy = Math.random() * -0.4 - 0.15;
          a.alpha = Math.random() * 0.4 + 0.2;
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

// 展品列表
{
  const ul = $('#list-items');
  for (const hall of HALLS) {
    const h = document.createElement('li'); h.className = 'hall'; h.textContent = `HALL ${hall.no}　${hall.zh}`; ul.appendChild(h);
    for (const ex of EXHIBITS.filter((e) => e.hall === hall.id)) {
      const li = document.createElement('li'); li.dataset.id = ex.id;
      li.innerHTML = `<span class="n">${ex.no}</span><span>${ex.zh}<small>${ex.title}</small></span>`;
      li.onclick = () => { stopTour(); $('#list').classList.remove('open'); flyTo(ex, () => openInfo(ex)); };
      ul.appendChild(li);
    }
  }
}

// 開場
$('#enter').onclick = () => { $('#intro').classList.add('hidden'); audio.maybeStart(); };
$('#enter-tour').onclick = () => { $('#intro').classList.add('hidden'); audio.maybeStart(); startTour(0); };

// ───────── 環境音與 Speech Cabinet 原始 MP3 音效（public/sounds/*.mp3）─────────
const audio = (() => {
  let ac = null, gain = null, on = true;
  function start() {
    ac = new (window.AudioContext || window.webkitAudioContext)();
    gain = ac.createGain(); gain.gain.value = 0; gain.connect(ac.destination);
    // 低頻嗡鳴
    for (const f of [55, 82.4, 110.3]) {
      const o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = f;
      const g = ac.createGain(); g.gain.value = f === 55 ? 0.05 : 0.02;
      const lfo = ac.createOscillator(); lfo.frequency.value = 0.05 + Math.random() * 0.1;
      const lg = ac.createGain(); lg.gain.value = 0.015; lfo.connect(lg).connect(g.gain); lfo.start();
      o.connect(g).connect(gain); o.start();
    }
    // 風聲（棕噪音）
    const buf = ac.createBuffer(1, ac.sampleRate * 4, ac.sampleRate), d = buf.getChannelData(0);
    let last = 0; for (let i = 0; i < d.length; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; }
    const src = ac.createBufferSource(); src.buffer = buf; src.loop = true;
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500;
    const ng = ac.createGain(); ng.gain.value = 0.25;
    src.connect(lp).connect(ng).connect(gain); src.start();
    gain.gain.linearRampToValueAtTime(0.6, ac.currentTime + 3);
  }
  function playMp3(path) {
    if (!on || !path) return;
    const el = new Audio(path);
    el.volume = 0.65;
    el.play().catch(() => {});
  }
  const btn = $('#btn-sound');
  btn.onclick = () => {
    on = !on; btn.textContent = on ? '♪ 環境音：開' : '♪ 環境音：關';
    if (on && !ac) start();
    if (gain) gain.gain.linearRampToValueAtTime(on ? 0.6 : 0, ac.currentTime + 0.6);
  };
  return { maybeStart() { if (on && !ac) start(); }, playMp3 };
})();

// ───────── 視角切換按鈕 ─────────
$('#btn-view').onclick = () => setView(view === 'fp' ? 'iso' : 'fp');

// ───────── 小地圖（只有在玩家移動或展品改變時才重畫）─────────
const map = $('#minimap'), mctx = map.getContext('2d');
const MW = map.width, MH = map.height, sx = MW / -Z_END, sy = MH / W;
const toMap = (x, z) => [-z * sx, (x + HALF) * sy];
const mapBase = document.createElement('canvas'); mapBase.width = MW; mapBase.height = MH;
{
  const b = mapBase.getContext('2d');
  HALLS.forEach((h) => {
    const [a] = toMap(0, h.zRange[0]), [c] = toMap(0, h.zRange[1]);
    b.fillStyle = h.palette.wall + '99'; b.fillRect(a, 0, c - a, MH);
    b.fillStyle = 'rgba(241,234,217,.85)'; b.font = '600 13px "Libre Baskerville", serif'; b.fillText(h.no, a + 5, 15);
  });
  b.strokeStyle = '#11100f'; b.lineWidth = 3;
  HALLS.slice(1).forEach((h) => {
    const [a] = toMap(0, h.zRange[0]);
    b.beginPath(); b.moveTo(a, 0); b.lineTo(a, (HALF - DOOR / 2) * sy); b.moveTo(a, (HALF + DOOR / 2) * sy); b.lineTo(a, MH); b.stroke();
  });
}
let mapKey = '';
function drawMap() {
  const heading = view === 'iso' ? yawFromFace(player.face) : player.yaw;
  const key = `${player.x.toFixed(2)},${player.z.toFixed(2)},${heading.toFixed(2)},${current?.id}`;
  if (key === mapKey) return;
  mapKey = key;
  mctx.clearRect(0, 0, MW, MH);
  mctx.drawImage(mapBase, 0, 0);
  for (const ex of EXHIBITS) {
    const [x, y] = toMap(ex.pos[0], ex.pos[2]);
    mctx.fillStyle = current === ex ? '#fff' : hallOf(ex.hall).palette.accent;
    mctx.beginPath(); mctx.arc(x, y, current === ex ? 5 : 3.2, 0, Math.PI * 2); mctx.fill();
  }
  const [px, py] = toMap(player.x, player.z);
  mctx.save(); mctx.translate(px, py); mctx.rotate(heading);
  mctx.fillStyle = 'rgba(255,214,140,.25)'; mctx.beginPath(); mctx.moveTo(0, 0); mctx.arc(0, 0, 26, -0.6, 0.6); mctx.fill();
  mctx.fillStyle = '#ffd68c'; mctx.beginPath(); mctx.moveTo(8, 0); mctx.lineTo(-5, -5); mctx.lineTo(-5, 5); mctx.fill();
  mctx.restore();
}
map.addEventListener('click', (e) => {
  const r = map.getBoundingClientRect();
  const mx = (e.clientX - r.left) / r.width * MW, my = (e.clientY - r.top) / r.height * MH;
  const z = -mx / sx, x = my / sy - HALF;
  if (collide(x, z)) return;
  stopTour();
  if (view === 'iso') walkTo(x, z);
  else fly = { from: { x: player.x, z: player.z, yaw: player.yaw, pitch: player.pitch }, to: { x, z, yaw: player.yaw, pitch: player.pitch }, t: 0, dur: 1 };
});

// ───────── 主迴圈 ─────────
const hallLabel = $('#hall-label');
const intro = $('#intro');
let lastHall = null, viewShift = 0, renderedOnce = false;
const clock = new THREE.Clock();
const qFP = new THREE.Quaternion(), qISO = new THREE.Quaternion(), eul = new THREE.Euler(0, 0, 0, 'YXZ');
const posFP = new THREE.Vector3(), posISO = new THREE.Vector3(), tmpV = new THREE.Vector3(), lookM = new THREE.Matrix4();
const smooth = (k) => k * k * (3 - 2 * k);

function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
  // 開場說明打開時不必一直重畫 3D 場景
  if (!intro.classList.contains('hidden') && renderedOnce) return;

  if (view === 'fp') { if (!fly) moveFP(dt); updateFly(dt); }
  else moveISO(dt);
  updateTour(dt);
  for (const f of ctx.tick) f(t);
  for (const { ex, fns } of exhibitTicks) {
    if (Math.abs(ex.pos[2] - player.z) < 20) for (const f of fns) f(t);
  }

  // 過場進度（約 0.8 秒）
  blend += ((view === 'iso' ? 1 : 0) - blend) * Math.min(1, dt * 5);
  if (Math.abs(blend - (view === 'iso' ? 1 : 0)) < 0.002) blend = view === 'iso' ? 1 : 0;
  const k = smooth(blend);

  // 兩種鏡頭姿態，按 k 內插
  posFP.set(player.x, EYE + (player.moving && !fly ? Math.sin(t * 9) * 0.025 : 0), player.z);
  eul.set(player.pitch, -player.yaw, 0, 'YXZ'); qFP.setFromEuler(eul);
  camTarget.lerp(tmpV.set(player.x, 1, player.z), Math.min(1, dt * 4));
  posISO.copy(camTarget).addScaledVector(ISO_OFFSET, zoom);
  lookM.lookAt(posISO, camTarget, camera.up); qISO.setFromRotationMatrix(lookM);
  camera.position.lerpVectors(posFP, posISO, k);
  camera.quaternion.slerpQuaternions(qFP, qISO, k);
  const fov = FOV.fp + (FOV.iso - FOV.fp) * k;
  if (Math.abs(camera.fov - fov) > 0.01) { camera.fov = fov; camera.updateProjectionMatrix(); }
  scene.fog.near = FOG.fp[0] + (FOG.iso[0] - FOG.fp[0]) * k;
  scene.fog.far = FOG.fp[1] + (FOG.iso[1] - FOG.fp[1]) * k;

  // 說明欄打開時，把畫面中心往左推
  const want = info.classList.contains('open') && innerWidth > 900 ? info.offsetWidth / 2 * k : 0;
  if (Math.abs(want - viewShift) > 0.5 || (want === 0 && viewShift !== 0)) {
    viewShift += (want - viewShift) * Math.min(1, dt * 5);
    if (Math.abs(viewShift) < 0.5 && want === 0) { viewShift = 0; camera.clearViewOffset(); }
    else camera.setViewOffset(innerWidth, innerHeight, viewShift, 0, innerWidth, innerHeight);
  }

  // 角色（2.5D 才看得到）
  hero.visible = k > 0.25;
  if (hero.visible) {
    hero.position.set(player.x, player.moving ? Math.abs(Math.sin(t * 10)) * 0.04 : 0, player.z);
    const face = view === 'iso' ? player.face : faceFromYaw(player.yaw);
    const df = ((face - hero.rotation.y + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    hero.rotation.y += df * Math.min(1, dt * 12);
    hero.userData.legs.forEach((l, i) => { l.rotation.x = player.moving ? Math.sin(t * 10 + i * Math.PI) * 0.5 : 0; });
  }
  if (marker.material.opacity > 0) marker.scale.setScalar(1 + Math.sin(t * 6) * 0.1);

  // 牆面：第一人稱全高；2.5D 時靠近鏡頭的牆降低、擋到角色的隔牆降低
  for (const m of fpOnly) m.visible = k < 0.5;
  if (sun.castShadow !== (k > 0.5)) sun.castShadow = k > 0.5;
  for (const m of shrinkWalls) { const h = H - (H - LOW) * k; m.scale.y = h / H; m.position.y = h / 2; }
  for (const c of cutaways) {
    const target = c.z > player.z + 0.5 ? k : 0;
    const cur = c.mesh.userData.cut ?? 0;
    const nk = cur + (target - cur) * Math.min(1, dt * 6);
    c.mesh.userData.cut = nk;
    if (c.hide) c.mesh.visible = nk < 0.5;
    else { const h = H - (H - LOW) * nk; c.mesh.scale.y = h / H; c.mesh.position.y = h / 2; }
  }

  // 陰影主光跟著玩家
  sun.position.set(player.x - 6, 16, player.z + 8); sun.target.position.set(player.x, 0, player.z);

  if (hoverEvent) { canvas.style.cursor = pick(hoverEvent) ? 'pointer' : (view === 'iso' ? 'default' : 'grab'); hoverEvent = null; }

  const hall = HALLS[hallIndex(player.z)];
  if (hall !== lastHall) {
    lastHall = hall;
    hallLabel.innerHTML = `<b>HALL ${hall.no}</b> ${hall.zh}<small>${hall.intro}</small>`;
    hallLabel.style.setProperty('--accent', hall.palette.accent);
    hallLabel.classList.remove('flash'); void hallLabel.offsetWidth; hallLabel.classList.add('flash');
  }
  drawMap();
  renderer.render(scene, camera);
  renderedOnce = true;
}
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  if (viewShift) camera.setViewOffset(innerWidth, innerHeight, viewShift, 0, innerWidth, innerHeight);
});

// 網址 ?view=iso 或上次離開時的視角
{
  const q = new URLSearchParams(location.search).get('view');
  let saved = null; try { saved = localStorage.getItem('elysium-view'); } catch {}
  const initial = q === 'iso' || q === 'fp' ? q : saved;
  document.body.dataset.view = 'fp';
  if (initial === 'iso') { setView('iso'); blend = 1; }
}
document.body.classList.add('ready');
frame();

// 偵錯／截圖用
window.__ex = { player, openInfo, EXHIBITS, flyTo, setView, info: () => ({ ...renderer.info.render, geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures, view, blend }) };
