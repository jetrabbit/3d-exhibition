// 立體展品模型（全部以基本幾何體原創建模）
import * as THREE from 'three';
import { paintedSurface, signTexture, rng, toTexture, brush } from './art.js';

const stdMat = (color, opts = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.05, ...opts });

export function plinth(r = 1, h = 0.8, color = '#2a2622') {
  const tex = paintedSurface(color, { seed: 11, size: 256, amt: 14 });
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.05, h, 40), stdMat('#ffffff', { map: tex }));
  m.position.y = h / 2;
  m.castShadow = m.receiveShadow = true;
  return m;
}

function islandMesh(r, seed, top = '#5e7a5a') {
  const R = rng(seed);
  const g = new THREE.DodecahedronGeometry(r, 1);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    const k = 0.85 + R() * 0.3;
    p.setXYZ(i, p.getX(i) * k, y > 0 ? y * 0.25 : y * (0.9 + R() * 0.5), p.getZ(i) * k);
  }
  g.computeVertexNormals();
  const tex = paintedSurface(top, { seed, size: 256, amt: 30 });
  return new THREE.Mesh(g, stdMat('#ffffff', { map: tex, flatShading: true }));
}

const builders = {
  pale(ctx) {
    const grp = new THREE.Group();
    grp.add(plinth(2.6, 0.5, '#33302c'));
    const world = new THREE.Group();
    world.position.y = 1.7;
    grp.add(world);
    const isles = [[0, 0, 0, 0.5, '#4f6b5d'], [-1.5, 0.3, -0.6, 0.7, '#6a6450'], [1.4, -0.2, -0.9, 0.45, '#6a6450'],
      [0.9, 0.4, 1.3, 0.38, '#6a6450'], [-1.0, -0.3, 1.2, 0.33, '#6a6450'], [0.2, 0.6, -1.8, 0.3, '#7d8a8e'], [-1.9, 0, 0.6, 0.28, '#6a6450']];
    isles.forEach(([x, y, z, r, c], i) => {
      const m = islandMesh(r, 30 + i, c);
      m.position.set(x, y, z);
      m.userData.bob = { base: y, ph: i * 1.3 };
      world.add(m);
    });
    // 灰域粒子
    const N = 2200, pos = new Float32Array(N * 3), R = rng(77);
    for (let i = 0; i < N; i++) {
      const a = R() * Math.PI * 2, d = 0.4 + R() * 2.2;
      pos.set([Math.cos(a) * d, (R() - 0.5) * 1.6, Math.sin(a) * d], i * 3);
    }
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const dot = document.createElement('canvas'); dot.width = dot.height = 64;
    const dc = dot.getContext('2d'); const gr = dc.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(220,224,224,1)'); gr.addColorStop(1, 'rgba(220,224,224,0)'); dc.fillStyle = gr; dc.fillRect(0, 0, 64, 64);
    const pts = new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.13, map: toTexture(dot), transparent: true, opacity: 0.3, depthWrite: false, color: '#cfd4d4' }));
    world.add(pts);
    const glow = new THREE.PointLight('#dfe6ea', 10, 9, 1.4); glow.position.y = 1.5; grp.add(glow);
    ctx.tick.push((t) => {
      world.rotation.y = t * 0.06;
      pts.rotation.y = -t * 0.1;
      world.children.forEach((c) => { if (c.userData.bob) c.position.y = c.userData.bob.base + Math.sin(t * 0.6 + c.userData.bob.ph) * 0.08; });
    });
    return grp;
  },

  aerostat(ctx) {
    const grp = new THREE.Group();
    grp.add(plinth(1.0, 0.9));
    const ship = new THREE.Group(); ship.position.y = 2.1; grp.add(ship);
    const envTex = paintedSurface('#8b7a5e', { seed: 51, size: 256, amt: 26, angle: 0 });
    const env = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 16), stdMat('#ffffff', { map: envTex }));
    env.scale.set(2.2, 1, 1); ship.add(env);
    const gond = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.18, 0.24), stdMat('#2b2622')); gond.position.y = -0.6; ship.add(gond);
    for (const s of [-1, 1]) {
      const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.3), stdMat('#222')); strut.position.set(0.2 * s, -0.45, 0); ship.add(strut);
      const eng = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.22, 12), stdMat('#3a332c')); eng.rotation.z = Math.PI / 2; eng.position.set(-0.1, -0.35, 0.42 * s); ship.add(eng);
    }
    const finG = new THREE.BoxGeometry(0.35, 0.4, 0.02);
    for (let i = 0; i < 4; i++) {
      const fin = new THREE.Mesh(finG, stdMat('#5a4a3a')); fin.position.x = -1.05;
      const holder = new THREE.Group(); holder.rotation.x = i * Math.PI / 2; holder.add(fin); fin.position.y = 0.3; ship.add(holder);
    }
    ctx.tick.push((t) => { ship.position.y = 2.1 + Math.sin(t * 0.8) * 0.08; ship.rotation.y = Math.sin(t * 0.2) * 0.5; });
    return grp;
  },

  innocence(ctx) {
    const grp = new THREE.Group();
    const base = plinth(1.6, 0.25, '#3a2c25'); grp.add(base);
    const names = ['Perikarnassian', 'Polycarp', 'Pasternak', 'Franconegro', 'Dolores Dei', 'Sola'];
    names.forEach((n, i) => {
      const a = i / names.length * Math.PI * 2;
      const tex = paintedSurface(n === 'Dolores Dei' ? '#5c7594' : '#6e5a4a', { seed: 60 + i, size: 128, amt: 22 });
      const ob = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.16, 1.6, 4), stdMat('#fff', { map: tex, flatShading: true }));
      ob.position.set(Math.cos(a) * 1.15, 1.05, Math.sin(a) * 1.15);
      grp.add(ob);
      const lab = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.15), new THREE.MeshBasicMaterial({
        map: signTexture([{ text: n, font: '600 40px "Libre Baskerville", serif' }], { w: 512, h: 128, accent: '#e8dcc0' }) }));
      lab.position.set(Math.cos(a) * 1.4, 0.4, Math.sin(a) * 1.4);
      lab.lookAt(0, 0.4, 0); lab.rotateY(Math.PI);
      grp.add(lab);
    });
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 32, 16), new THREE.MeshStandardMaterial({ color: '#cfe0ff', emissive: '#7fa6e6', emissiveIntensity: 0.9 }));
    orb.position.y = 1.8; grp.add(orb);
    const l = new THREE.PointLight('#a9c6ff', 5, 6, 1.5); l.position.y = 1.8; grp.add(l);
    ctx.tick.push((t) => { orb.position.y = 1.8 + Math.sin(t) * 0.1; l.intensity = 4 + Math.sin(t * 1.7) * 1; });
    return grp;
  },

  banner(ctx) {
    const grp = new THREE.Group();
    grp.add(plinth(0.7, 0.3));
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 3.2), stdMat('#3a2f27'));
    pole.position.set(0, 1.9, 0); pole.rotation.z = 0.12; grp.add(pole);
    // 殘破的旗
    const c = document.createElement('canvas'); c.width = 512; c.height = 320;
    const g = c.getContext('2d');
    g.fillStyle = '#8f2a20'; g.fillRect(0, 0, 512, 320);
    brush(g, 512, 320, ['#8f2a20', '#a5372a', '#6d1f18'], { count: 500, seed: 70 });
    // 撕裂邊緣（透明）
    g.globalCompositeOperation = 'destination-out';
    const R = rng(71);
    g.beginPath(); g.moveTo(512, 0);
    for (let y = 0; y <= 320; y += 16) g.lineTo(380 + R() * 130, y);
    g.lineTo(512, 320); g.closePath(); g.fill();
    for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(80 + R() * 320, 30 + R() * 260, 4 + R() * 14, 0, Math.PI * 2); g.fill(); }
    g.globalCompositeOperation = 'source-over';
    const tex = toTexture(c);
    const geo = new THREE.PlaneGeometry(1.6, 1.0, 24, 12);
    const flag = new THREE.Mesh(geo, stdMat('#fff', { map: tex, side: THREE.DoubleSide, alphaTest: 0.5 }));
    flag.position.set(0.68, 2.85, 0); flag.rotation.z = 0.12;
    grp.add(flag);
    const orig = geo.attributes.position.array.slice();
    ctx.tick.push((t) => {
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = orig[i * 3], y = orig[i * 3 + 1];
        const k = (x + 0.8) / 1.6;
        p.setZ(i, Math.sin(x * 4 - t * 2.2 + y * 1.5) * 0.12 * k);
        p.setY(i, y - k * k * 0.15);
      }
      p.needsUpdate = true; geo.computeVertexNormals();
    });
    return grp;
  },

  tree(ctx) {
    const grp = new THREE.Group();
    const ground = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.7, 0.25, 40), stdMat('#fff', { map: paintedSurface('#3d3a2c', { seed: 80, size: 256 }) }));
    ground.position.y = 0.125; grp.add(ground);
    const bark = stdMat('#fff', { map: paintedSurface('#2a2420', { seed: 81, size: 256, angle: Math.PI / 2 }) });
    const R = rng(82);
    const branch = (len, rad, depth, parent, rot) => {
      const g = new THREE.CylinderGeometry(rad * 0.65, rad, len, 7); g.translate(0, len / 2, 0);
      const m = new THREE.Mesh(g, bark); m.castShadow = true;
      m.rotation.set(rot[0], rot[1], rot[2]);
      parent.add(m);
      if (depth > 0) {
        const n = depth > 2 ? 2 : 3;
        for (let i = 0; i < n; i++) {
          const holder = new THREE.Group(); holder.position.y = len * (0.6 + R() * 0.4); m.add(holder);
          branch(len * (0.6 + R() * 0.15), rad * 0.62, depth - 1, holder, [(R() - 0.5) * 1.3, R() * Math.PI * 2, (R() - 0.5) * 1.3 + 0.25]);
        }
      }
      return m;
    };
    const trunk = new THREE.Group(); trunk.position.y = 0.25; grp.add(trunk);
    branch(1.6, 0.16, 4, trunk, [0, 0, 0.08]);
    // 案件封鎖線（地面）
    const tapeTex = signTexture([{ text: 'RCM · DO NOT CROSS · RCM · DO NOT CROSS', font: '700 52px "Libre Baskerville", serif' }],
      { w: 1024, h: 96, bg: '#c9a227', accent: '#1c1a17' });
    tapeTex.wrapS = THREE.RepeatWrapping; tapeTex.repeat.set(3, 1);
    const tape = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.9, 0.12, 48, 1, true), new THREE.MeshBasicMaterial({ map: tapeTex, side: THREE.DoubleSide }));
    tape.position.y = 0.9; grp.add(tape);
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1), stdMat('#d8d0bf'));
      post.position.set(Math.cos(a) * 1.9, 0.5, Math.sin(a) * 1.9); grp.add(post);
    }
    const lamp = new THREE.SpotLight('#ffd9a0', 30, 9, 0.5, 0.6, 1.2); lamp.position.set(0, 5.5, 0);
    lamp.target.position.set(0, 0, 0); grp.add(lamp, lamp.target);
    return grp;
  },

  badge(ctx) {
    const grp = new THREE.Group();
    grp.add(plinth(0.7, 1.1));
    const s = new THREE.Shape();
    s.moveTo(0, 0.42); s.quadraticCurveTo(0.2, 0.36, 0.34, 0.42); s.lineTo(0.34, 0.05);
    s.quadraticCurveTo(0.3, -0.25, 0, -0.42); s.quadraticCurveTo(-0.3, -0.25, -0.34, 0.05);
    s.lineTo(-0.34, 0.42); s.quadraticCurveTo(-0.2, 0.36, 0, 0.42);
    const geo = new THREE.ExtrudeGeometry(s, { depth: 0.06, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 3 });
    geo.center();
    const badge = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: '#b59a5a', metalness: 0.8, roughness: 0.35 }));
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), new THREE.MeshStandardMaterial({
      map: signTexture([{ text: 'R·C·M', font: '700 110px "Libre Baskerville", serif' }, { text: 'REVACHOL', font: '600 60px "Libre Baskerville", serif' }],
        { w: 512, h: 512, bg: '#6b5a33', accent: '#f1e2b0', fg: '#e8d7a3' }), metalness: 0.5, roughness: 0.5 }));
    face.position.z = 0.056;
    const holder = new THREE.Group(); holder.add(badge, face); holder.position.y = 1.7; grp.add(holder);
    const l = new THREE.PointLight('#ffe3a8', 3, 3); l.position.set(0, 2.2, 0.8); grp.add(l);
    ctx.tick.push((t) => { holder.rotation.y = Math.sin(t * 0.6) * 0.9; });
    return grp;
  },

  strike(ctx) {
    const grp = new THREE.Group();
    // 鐵絲網門
    const meshC = document.createElement('canvas'); meshC.width = meshC.height = 128;
    const mg = meshC.getContext('2d'); mg.strokeStyle = '#8d8f88'; mg.lineWidth = 3;
    for (let i = -128; i < 256; i += 16) { mg.beginPath(); mg.moveTo(i, 0); mg.lineTo(i + 128, 128); mg.moveTo(i + 128, 0); mg.lineTo(i, 128); mg.stroke(); }
    const mt = toTexture(meshC, [6, 4]);
    const fence = new THREE.Mesh(new THREE.PlaneGeometry(4, 2.6), new THREE.MeshStandardMaterial({ map: mt, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, metalness: 0.6, roughness: 0.5 }));
    fence.position.set(0, 1.3, -0.8); grp.add(fence);
    for (const x of [-2, 0, 2]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.8), stdMat('#555a55', { metalness: 0.6 })); p.position.set(x, 1.4, -0.8); grp.add(p); }
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 4), stdMat('#555a55')); top.rotation.z = Math.PI / 2; top.position.set(0, 2.7, -0.8); grp.add(top);
    const gateSign = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.4), new THREE.MeshStandardMaterial({
      map: signTexture([{ text: 'TERMINAL B', font: '700 90px "Libre Baskerville", serif' }], { w: 1024, h: 256, bg: '#2f3a3a', accent: '#e0d6b8' }) }));
    gateSign.position.set(0, 2.3, -0.75); grp.add(gateSign);
    // 罷工標語牌
    const signs = [['ON STRIKE', '#d8cfb5'], ['UNION', '#c9a227'], ['罷工中', '#d8cfb5']];
    signs.forEach(([t, c], i) => {
      const sg = new THREE.Group();
      const stick = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.5, 0.05), stdMat('#6b513a')); stick.position.y = 0.75; sg.add(stick);
      const board = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.55, 0.03), [
        stdMat('#cfc6ab'), stdMat('#cfc6ab'), stdMat('#cfc6ab'), stdMat('#cfc6ab'),
        new THREE.MeshStandardMaterial({ map: signTexture([{ text: t, font: `900 150px "Noto Serif TC", serif` }], { w: 1024, h: 600, bg: c, accent: '#7a1f17', seed: 90 + i }) }),
        stdMat('#cfc6ab')]);
      board.position.y = 1.6; sg.add(board);
      sg.position.set(-1.3 + i * 1.3, 0, 0.3 + (i % 2) * 0.3);
      sg.rotation.set(0, (i - 1) * -0.25, (i - 1) * 0.12);
      grp.add(sg);
    });
    // 木箱
    for (const [x, z, s] of [[-1.7, 0.9, 0.5], [-1.2, 1.1, 0.4], [1.8, 0.8, 0.55]]) {
      const box = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), stdMat('#fff', { map: paintedSurface('#6b5238', { seed: 95, size: 128 }) }));
      box.position.set(x, s / 2, z); box.rotation.y = x; grp.add(box);
    }
    return grp;
  },

  hostel(ctx) {
    const grp = new THREE.Group();
    const wallTex = paintedSurface('#6e5f4c', { seed: 100, size: 512, amt: 26, repeat: [2, 1] });
    const facade = new THREE.Mesh(new THREE.BoxGeometry(9, 5.6, 0.4), stdMat('#fff', { map: wallTex }));
    facade.position.set(0, 2.8, -0.2); grp.add(facade);
    // 門
    const door = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2.4), stdMat('#fff', { map: paintedSurface('#3a2a1e', { seed: 101, size: 256, angle: Math.PI / 2 }) }));
    door.position.set(0, 1.2, 0.01); grp.add(door);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.05), new THREE.MeshStandardMaterial({ color: '#c9a84a', metalness: 0.9, roughness: 0.3 }));
    knob.position.set(0.5, 1.15, 0.05); grp.add(knob);
    // 亮著的窗
    const winMat = new THREE.MeshStandardMaterial({ color: '#ffcf86', emissive: '#ffb860', emissiveIntensity: 1.2 });
    for (const [x, y] of [[-2.8, 1.6], [2.8, 1.6], [-2.8, 4], [0, 4], [2.8, 4]]) {
      const w = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.1), winMat); w.position.set(x, y, 0.01); grp.add(w);
      const frame = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.08, 0.1), stdMat('#2a2420'));
      frame.position.set(x, y - 0.58, 0.05); grp.add(frame);
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.1, 0.06), stdMat('#2a2420')); bar.position.set(x, y, 0.04); grp.add(bar);
    }
    // 招牌
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 0.8), new THREE.MeshStandardMaterial({
      map: signTexture([{ text: 'WHIRLING-IN-RAGS', font: '700 96px "Libre Baskerville", serif' }], { w: 1536, h: 288, bg: '#24302d', accent: '#e8c77a' }),
      emissive: '#ffffff', emissiveIntensity: 0.25 }));
    sign.position.set(0, 2.85, 0.05);
    sign.material.emissiveMap = sign.material.map;
    grp.add(sign);
    const l = new THREE.PointLight('#ffbf70', 8, 8, 1.5); l.position.set(0, 2.5, 1.6); grp.add(l);
    ctx.tick.push((t) => { l.intensity = 7 + Math.sin(t * 9) * 0.3 + (Math.sin(t * 23) > 0.97 ? -3 : 0); });
    return grp;
  },
};

export function buildModel(name, ctx) {
  return (builders[name] || (() => new THREE.Group()))(ctx);
}
