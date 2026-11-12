import * as THREE from 'three';
import { HALLS, EXHIBITS, VOICES, VOICE_COLORS } from './exhibits.js';
import { paintedSurface, panelTexture, plaqueTexture, signTexture } from './art.js';
import { buildModel, plinth } from './models.js';

const W = 22, HALF = W / 2, H = 6, Z_END = -74, DOOR = 2.6;
const EYE = 1.65, SPEED = 3.6, RADIUS = 0.45;

await Promise.race([
  Promise.all([
    document.fonts.load('600 40px "Noto Serif TC"'),
    document.fonts.load('700 40px "Libre Baskerville"'),
    document.fonts.load('italic 40px "Libre Baskerville"'),
  ]),
  new Promise((r) => setTimeout(r, 4000)),
]);

// ───────── 基本場景 ─────────
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.3;
renderer.shadowMap.enabled = true;
document.getElementById('stage').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#151413');
scene.fog = new THREE.Fog('#1b1a18', 14, 40);

const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 200);
const player = { x: 0, z: -2.5, yaw: 0, pitch: -0.05 };

scene.add(new THREE.HemisphereLight('#d8d2c4', '#2a241f', 1.3));

const ctx = { tick: [] };
const clickables = [];
const colliders = []; // [minX, minZ, maxX, maxZ]

// ───────── 建築 ─────────
function box(w, h, d, mat, x, y, z, collide = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z); m.receiveShadow = true;
  scene.add(m);
  if (collide) colliders.push([x - w / 2, z - d / 2, x + w / 2, z + d / 2]);
  return m;
}

HALLS.forEach((hall, i) => {
  const [z0, z1] = hall.zRange, len = z0 - z1, zc = (z0 + z1) / 2;
  const wallMat = new THREE.MeshStandardMaterial({ map: paintedSurface(hall.palette.wall, { seed: 10 + i, repeat: [len / 6, 1], amt: 26 }), roughness: 0.95 });
  const floorMat = new THREE.MeshStandardMaterial({ map: paintedSurface(hall.palette.floor, { seed: 20 + i, angle: 0, repeat: [4, len / 5], amt: 16 }), roughness: 0.8 });
  const ceilMat = new THREE.MeshStandardMaterial({ map: paintedSurface('#2a2725', { seed: 30 + i, repeat: [3, len / 6] }), roughness: 1 });

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, len), floorMat);
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, zc); floor.receiveShadow = true; scene.add(floor);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, len), ceilMat);
  ceil.rotation.x = Math.PI / 2; ceil.position.set(0, H, zc); scene.add(ceil);

  box(0.4, H, len, wallMat, -HALF - 0.2, H / 2, zc);
  box(0.4, H, len, wallMat, HALF + 0.2, H / 2, zc);

  // 踢腳線
  const trim = new THREE.MeshStandardMaterial({ color: '#1a1714', roughness: 0.6 });
  box(0.08, 0.25, len, trim, -HALF + 0.04, 0.125, zc, false);
  box(0.08, 0.25, len, trim, HALF - 0.04, 0.125, zc, false);

  // 燈光
  const amb = new THREE.PointLight(hall.palette.accent, 14, 26, 1.4);
  amb.position.set(0, H - 0.6, zc); scene.add(amb);
  for (let z = z0 - 4; z > z1 + 2; z -= 7) {
    const l = new THREE.PointLight('#ffe2b8', 6, 14, 1.6); l.position.set(0, H - 0.4, z); scene.add(l);
    const fixture = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 0.12, 20), new THREE.MeshStandardMaterial({ color: '#ffe8c4', emissive: '#ffd59a', emissiveIntensity: 1.6 }));
    fixture.position.set(0, H - 0.06, z); scene.add(fixture);
  }

  // 前方隔牆（含門洞）與展廳名稱
  const zWall = z0;
  const segW = (W - DOOR) / 2;
  const isEntrance = i === 0;
  const wm = isEntrance ? new THREE.MeshStandardMaterial({ map: paintedSurface('#2c2a27', { seed: 40, repeat: [3, 1] }) }) : wallMat;
  if (isEntrance) {
    box(W + 0.8, H, 0.4, wm, 0, H / 2, zWall + 0.2);
  } else {
    box(segW, H, 0.4, wm, -HALF + segW / 2, H / 2, zWall);
    box(segW, H, 0.4, wm, HALF - segW / 2, H / 2, zWall);
    box(DOOR, H - 3.2, 0.4, wm, 0, H - (H - 3.2) / 2, zWall, false);
  }
  // 展廳名牌（面向進入的觀眾，掛在入口右側牆上）
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 0.9), new THREE.MeshStandardMaterial({
    map: signTexture([
      { text: `HALL ${hall.no} · ${hall.name.toUpperCase()}`, font: '700 64px "Libre Baskerville", serif', dy: 8 },
      { text: hall.zh, font: '600 78px "Noto Serif TC", serif', dy: -8 },
    ], { w: 1024, h: 256, accent: hall.palette.accent }),
  }));
  if (isEntrance) { sign.position.set(0, 3.2, zWall - 0.02); sign.rotation.y = Math.PI; }
  else sign.position.set(0, 4.55, zWall + 0.22);
  scene.add(sign);
  hall.sign = sign;
});
// 盡頭牆
box(W + 0.8, H, 0.4, new THREE.MeshStandardMaterial({ map: paintedSurface('#2f3b38', { seed: 50, repeat: [3, 1] }) }), 0, H / 2, Z_END - 0.2);

// ───────── 展品 ─────────
const hallOf = (id) => HALLS.find((h) => h.id === id);
const frameMat = new THREE.MeshStandardMaterial({ color: '#1d1916', roughness: 0.5, metalness: 0.2 });

for (const ex of EXHIBITS) {
  const hall = hallOf(ex.hall);
  const grp = new THREE.Group();
  if (ex.kind === 'panel' || ex.kind === 'timeline') {
    const [pw, ph] = ex.size;
    const frame = new THREE.Mesh(new THREE.BoxGeometry(pw + 0.14, ph + 0.14, 0.08), frameMat);
    const art = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), new THREE.MeshStandardMaterial({ map: panelTexture(ex, hall), roughness: 0.75 }));
    art.position.z = 0.045;
    grp.add(frame, art);
    grp.position.set(...ex.pos);
    grp.rotation.y = ex.rotY;
    // 投射燈
    const spot = new THREE.SpotLight('#ffe7c2', 22, 7, 0.55, 0.5, 1.3);
    const n = new THREE.Vector3(Math.sin(ex.rotY), 0, Math.cos(ex.rotY));
    spot.position.set(ex.pos[0] + n.x * 2.2, H - 0.3, ex.pos[2] + n.z * 2.2);
    spot.target.position.set(...ex.pos);
    scene.add(spot, spot.target);
    art.userData.exhibit = ex; clickables.push(art);
    ex.normal = n;
    const vd = ex.kind === 'timeline' ? 4.8 : 3.8;
    ex.view = { pos: [ex.pos[0] + n.x * vd, ex.pos[2] + n.z * vd], look: ex.pos };
  } else {
    const m = buildModel(ex.model, ctx);
    grp.add(m);
    grp.position.set(...ex.pos);
    m.traverse((o) => { if (o.isMesh) { o.userData.exhibit = ex; clickables.push(o); o.castShadow = true; } });
    colliders.push([ex.pos[0] - ex.radius * 0.8, ex.pos[2] - ex.radius * 0.8, ex.pos[0] + ex.radius * 0.8, ex.pos[2] + ex.radius * 0.8]);
    // 說明牌（斜放的小牌，朝向廳中央）
    if (ex.model !== 'hostel') {
      const dirX = ex.pos[0] === 0 ? 0 : -Math.sign(ex.pos[0]);
      const pq = new THREE.Group();
      const stand = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.9, 0.06), frameMat); stand.position.y = 0.45; pq.add(stand);
      const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.4), new THREE.MeshStandardMaterial({ map: plaqueTexture(ex, hall) }));
      plate.position.y = 0.98; plate.rotation.x = -0.5; pq.add(plate);
      plate.userData.exhibit = ex; clickables.push(plate);
      const off = ex.radius + 0.6;
      if (dirX) { pq.position.set(ex.pos[0] + dirX * off, 0, ex.pos[2] + 0.4); pq.rotation.y = dirX * Math.PI / 2; }
      else { pq.position.set(ex.pos[0] + 0.6, 0, ex.pos[2] + off); }
      scene.add(pq);
      const vx = dirX ? ex.pos[0] + dirX * (ex.radius + 3) : ex.pos[0];
      const vz = dirX ? ex.pos[2] + 1.2 : ex.pos[2] + ex.radius + 3.2;
      ex.view = { pos: [vx, vz], look: [ex.pos[0], 1.4, ex.pos[2]] };
    } else {
      ex.view = { pos: [0, ex.pos[2] + 7.5], look: [0, 2.6, ex.pos[2]] };
    }
  }
  scene.add(grp);
}

// 年表長線（貫穿第二廳的導引線）
{
  const tl = EXHIBITS.filter((e) => e.kind === 'timeline');
  const zA = tl[0].pos[2] + 1.6, zB = tl.at(-1).pos[2] - 1.6;
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.05, zA - zB), new THREE.MeshStandardMaterial({ color: '#d9a066', emissive: '#a86a32', emissiveIntensity: 0.6 }));
  bar.position.set(-HALF + 0.03, 4.15, (zA + zB) / 2); scene.add(bar);
  const label = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 0.55), new THREE.MeshStandardMaterial({
    map: signTexture([{ text: 'TIMELINE OF REVACHOL · 瑞瓦肖年表 →', font: '700 60px "Noto Serif TC", serif' }], { w: 1536, h: 192, accent: '#d9a066' }) }));
  label.position.set(-HALF + 0.03, 4.6, zA - 2.6); label.rotation.y = Math.PI / 2; scene.add(label);
}

// ───────── 控制 ─────────
const keys = new Set();
let tour = null; // { i, t, phase }
let dragging = false, dragMoved = 0, lastX = 0, lastY = 0;
const canvas = renderer.domElement;

addEventListener('keydown', (e) => {
  if (e.target.closest('input,textarea')) return;
  keys.add(e.code);
  if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) { stopTour(); }
  if (e.code === 'Escape') closeInfo();
});
addEventListener('keyup', (e) => keys.delete(e.code));
addEventListener('blur', () => keys.clear());

canvas.addEventListener('pointerdown', (e) => { dragging = true; dragMoved = 0; lastX = e.clientX; lastY = e.clientY; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointermove', (e) => {
  if (dragging) {
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    dragMoved += Math.abs(dx) + Math.abs(dy);
    if (dragMoved > 4) {
      stopTour();
      const k = e.pointerType === 'touch' ? 0.006 : 0.0035;
      player.yaw += dx * k; player.pitch = Math.max(-1.1, Math.min(1.1, player.pitch - dy * k));
    }
    lastX = e.clientX; lastY = e.clientY;
  } else hover(e);
});
canvas.addEventListener('pointerup', (e) => { dragging = false; if (dragMoved <= 4) click(e); });

const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
function pick(e) {
  ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hit = ray.intersectObjects(clickables, false)[0];
  return hit && hit.distance < 14 ? hit.object.userData.exhibit : null;
}
function hover(e) { canvas.style.cursor = pick(e) ? 'pointer' : 'grab'; }
function click(e) { const ex = pick(e); if (ex) { stopTour(); openInfo(ex); } }

// 手機方向鍵
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

function move(dt) {
  let f = 0, s = 0;
  if (keys.has('KeyW') || keys.has('ArrowUp')) f += 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) f -= 1;
  if (keys.has('KeyA')) s -= 1;
  if (keys.has('KeyD')) s += 1;
  if (keys.has('ArrowLeft') || keys.has('KeyQ')) player.yaw -= 1.8 * dt;
  if (keys.has('ArrowRight') || keys.has('KeyE')) player.yaw += 1.8 * dt;
  if (!f && !s) return;
  const sp = SPEED * (keys.has('ShiftLeft') || keys.has('ShiftRight') ? 1.8 : 1) * dt;
  const len = Math.hypot(f, s);
  const dx = (Math.sin(player.yaw) * f + Math.cos(player.yaw) * s) / len * sp;
  const dz = (-Math.cos(player.yaw) * f + Math.sin(player.yaw) * s) / len * sp;
  if (!collide(player.x + dx, player.z)) player.x += dx;
  if (!collide(player.x, player.z + dz)) player.z += dz;
}

// ───────── 導覽 ─────────
const lerpAngle = (a, b, t) => a + (((b - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI) * t;

function flyTo(ex, cb) {
  const [tx, tz] = ex.view.pos;
  const look = ex.view.look;
  const targetYaw = Math.atan2(look[0] - tx, -(look[2] - tz));
  const dist = Math.hypot(look[0] - tx, look[2] - tz);
  const targetPitch = Math.atan2((look[1] ?? 2) - EYE, dist);
  const from = { ...player };
  const dur = Math.max(1.2, Math.min(3.5, Math.hypot(tx - from.x, tz - from.z) / 5));
  fly = { from, to: { x: tx, z: tz, yaw: targetYaw, pitch: targetPitch }, t: 0, dur, cb };
}
let fly = null;
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

function startTour(from = 0) {
  tour = { i: from, wait: 0 };
  document.getElementById('btn-tour').classList.add('on');
  document.getElementById('btn-tour').textContent = '■ 停止導覽';
  stepTour();
}
function stepTour() {
  if (!tour) return;
  const ex = EXHIBITS[tour.i];
  flyTo(ex, () => { if (!tour) return; openInfo(ex, true); tour.hold = tour.wait = holdFor(ex.body[0]); });
}
function stopTour() {
  if (!tour) return;
  tour = null; fly = null;
  const b = document.getElementById('btn-tour'); b.classList.remove('on'); b.textContent = '▶ 自動導覽';
  document.getElementById('tour-bar').style.width = '0';
}
function updateTour(dt) {
  if (!tour || fly || tour.wait <= 0) return;
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

// ───────── UI ─────────
const $ = (s) => document.querySelector(s);
const info = $('#info');
const logEl = $('#log'), choicesEl = $('#choices');
let current = null, step = 0;
const esc = (t) => t.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

function say(who, text, cls = '', color = '') {
  logEl.querySelectorAll('.line').forEach((l) => l.classList.add('old'));
  const d = document.createElement('div');
  d.className = `line ${cls}`;
  d.innerHTML = `<b style="${color ? `color:${color}` : ''}">${esc(who)}</b><span class="dash"> — </span>${esc(text).replace(/\n/g, '<br>')}`;
  logEl.appendChild(d);
  requestAnimationFrame(() => d.classList.add('in'));
  logEl.scrollTo({ top: logEl.scrollHeight, behavior: 'smooth' });
}
const docent = (t) => say('導覽員', t, 'docent', 'var(--accent)');

function renderChoices() {
  choicesEl.innerHTML = '';
  if (!current) return;
  const opts = [];
  if (step < current.body.length) opts.push(['「繼續說。」', cont]);
  else opts.push(['「我明白了。帶我去下一件展品。」', goNext]);
  if (step < current.body.length) opts.push(['「先帶我去下一件展品吧。」', goNext]);
  opts.push(['「回到上一件。」', goPrev]);
  opts.push(['（轉身離開。）', () => { say('你', '（你轉身離開。）', 'you'); setTimeout(closeInfo, 350); }]);
  opts.forEach(([t, fn], i) => {
    const li = document.createElement('li');
    li.innerHTML = `<span class="k">${i + 1}.</span> ${esc(t)}`;
    li.onclick = () => { stopTour(); fn(t); };
    choicesEl.appendChild(li);
  });
}
function cont(t = '「繼續說。」') {
  if (!current || step >= current.body.length) return;
  say('你', t, 'you');
  const ex = current;
  setTimeout(() => { if (current !== ex) return; docent(ex.body[step++]); renderChoices(); }, 300);
  choicesEl.innerHTML = '';
}
const idx = (ex) => EXHIBITS.indexOf(ex);
function goTo(ex, t) {
  if (t) say('你', t, 'you');
  choicesEl.innerHTML = '';
  flyTo(ex, () => openInfo(ex, !!tour));
}
const goNext = (t) => goTo(EXHIBITS[(idx(current) + 1) % EXHIBITS.length], t);
const goPrev = (t) => goTo(EXHIBITS[(idx(current) - 1 + EXHIBITS.length) % EXHIBITS.length], t);

function openInfo(ex, fromTour = false) {
  const hall = hallOf(ex.hall);
  const same = current === ex;
  current = ex; step = 0;
  $('#info-hall').textContent = `HALL ${hall.no} · ${hall.zh}`;
  $('#info-no').textContent = `№ ${ex.no}`;
  $('#info-title').textContent = ex.title;
  $('#info-zh').textContent = ex.zh;
  info.style.setProperty('--accent', hall.palette.accent);
  info.classList.add('open');
  if (!same) {
    const sep = document.createElement('div'); sep.className = 'sep'; sep.textContent = `— № ${ex.no}　${ex.zh} —`;
    logEl.appendChild(sep);
  }
  docent(ex.body[step++]);
  const v = VOICES[ex.id];
  if (v) setTimeout(() => { if (current === ex) say(`${v[0]}`, v[1], 'voice', VOICE_COLORS[v[0]]); }, 900);
  renderChoices();
  document.querySelectorAll('#list li').forEach((li) => li.classList.toggle('active', li.dataset.id === ex.id));
  if (!fromTour) stopTour();
}
function closeInfo() { info.classList.remove('open'); current = null; choicesEl.innerHTML = ''; }
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

// ───────── 環境音（即時合成，無音檔）─────────
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
  const btn = $('#btn-sound');
  btn.onclick = () => {
    on = !on; btn.textContent = on ? '♪ 環境音：開' : '♪ 環境音：關';
    if (on && !ac) start();
    if (gain) gain.gain.linearRampToValueAtTime(on ? 0.6 : 0, ac.currentTime + 0.6);
  };
  return { maybeStart() { if (on && !ac) start(); } };
})();

// ───────── 小地圖 ─────────
const map = $('#minimap'), mctx = map.getContext('2d');
const MW = map.width, MH = map.height, sx = MW / -Z_END, sy = MH / W;
const toMap = (x, z) => [-z * sx, (x + HALF) * sy];
function drawMap() {
  mctx.clearRect(0, 0, MW, MH);
  HALLS.forEach((h) => {
    const [a] = toMap(0, h.zRange[0]), [b] = toMap(0, h.zRange[1]);
    mctx.fillStyle = h.palette.wall + '99'; mctx.fillRect(a, 0, b - a, MH);
    mctx.fillStyle = 'rgba(241,234,217,.85)'; mctx.font = '600 13px "Libre Baskerville", serif'; mctx.fillText(h.no, a + 5, 15);
  });
  mctx.strokeStyle = '#11100f'; mctx.lineWidth = 3;
  HALLS.slice(1).forEach((h) => {
    const [a] = toMap(0, h.zRange[0]);
    mctx.beginPath(); mctx.moveTo(a, 0); mctx.lineTo(a, (HALF - DOOR / 2) * sy); mctx.moveTo(a, (HALF + DOOR / 2) * sy); mctx.lineTo(a, MH); mctx.stroke();
  });
  for (const ex of EXHIBITS) {
    const [x, y] = toMap(ex.pos[0], ex.pos[2]);
    mctx.fillStyle = current === ex ? '#fff' : hallOf(ex.hall).palette.accent;
    mctx.beginPath(); mctx.arc(x, y, current === ex ? 5 : 3.2, 0, Math.PI * 2); mctx.fill();
  }
  const [px, py] = toMap(player.x, player.z);
  const ang = player.yaw; // 地圖座標中的朝向
  mctx.save(); mctx.translate(px, py); mctx.rotate(ang);
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
  fly = { from: { ...player }, to: { x, z, yaw: player.yaw, pitch: player.pitch }, t: 0, dur: 1 };
});

// ───────── 主迴圈 ─────────
const hallLabel = $('#hall-label');
let lastHall = null;
const clock = new THREE.Clock();
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
  if (!fly) move(dt);
  updateFly(dt); updateTour(dt);
  for (const f of ctx.tick) f(t);
  camera.position.set(player.x, EYE + (keys.size && !fly ? Math.sin(t * 9) * 0.025 : 0), player.z);
  camera.rotation.order = 'YXZ';
  camera.rotation.y = -player.yaw;
  camera.rotation.x = player.pitch;
  const hall = HALLS.find((h) => player.z <= h.zRange[0] && player.z > h.zRange[1]) || HALLS[0];
  if (hall !== lastHall) {
    lastHall = hall;
    hallLabel.innerHTML = `<b>HALL ${hall.no}</b> ${hall.zh}<small>${hall.intro}</small>`;
    hallLabel.style.setProperty('--accent', hall.palette.accent);
    hallLabel.classList.remove('flash'); void hallLabel.offsetWidth; hallLabel.classList.add('flash');
  }
  drawMap();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
document.body.classList.add('ready');
frame();

// 偵錯／截圖用
window.__ex = { player, openInfo, EXHIBITS, flyTo };
