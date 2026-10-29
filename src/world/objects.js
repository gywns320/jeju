import * as THREE from 'three';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { coastPoint, groundY, heightAt, mainR, VE } from './terrain.js';

export function tag(text, cls = '', sub = '') {
  const el = document.createElement('div');
  el.className = `tag ${cls}`;
  el.textContent = text;
  if (sub) {
    const s = document.createElement('small');
    s.textContent = sub;
    el.appendChild(s);
  }
  return new CSS2DObject(el);
}

const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.7, flatShading: true, ...o });

function seeded(s) {
  return () => {
    s |= 0; s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* 풍력발전기 (크기는 눈에 띄게 과장) */
export function makeTurbine() {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.07, 1.1, 8), std(0xf4f4f4));
  pole.position.y = 0.55;
  g.add(pole);
  const hub = new THREE.Group();
  hub.position.set(0, 1.12, 0.06);
  for (let i = 0; i < 3; i++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.55, 0.02), std(0xffffff));
    blade.position.y = 0.28;
    const arm = new THREE.Group();
    arm.rotation.z = (i * Math.PI * 2) / 3;
    arm.add(blade);
    hub.add(arm);
  }
  hub.add(new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), std(0xdddddd)));
  g.add(hub);
  g.userData.hub = hub;
  return g;
}

/* 등대 + 회전하는 불빛 */
export function makeLighthouse() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.17, 0.9, 10), std(0xffffff));
  body.position.y = 0.45;
  g.add(body);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.145, 0.16, 10), std(0xe11d48));
  band.position.y = 0.45;
  g.add(band);
  const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.14, 10), std(0xfff3a0, { emissive: 0xffe066, emissiveIntensity: 1 }));
  lamp.position.y = 0.97;
  g.add(lamp);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.16, 10), std(0xe11d48));
  roof.position.y = 1.12;
  g.add(roof);
  const beamGeo = new THREE.ConeGeometry(0.55, 3.2, 20, 1, true);
  beamGeo.translate(0, -1.6, 0);
  beamGeo.rotateZ(Math.PI / 2);
  const beam = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({ color: 0xfff1a8, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  const spin = new THREE.Group();
  spin.position.y = 0.97;
  spin.add(beam);
  g.add(spin);
  g.userData.spin = spin;
  return g;
}

/* 돌하르방 */
export function makeHareubang() {
  const g = new THREE.Group();
  const stone = std(0x6b6a70);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.27, 0.55, 10), stone);
  body.position.y = 0.28;
  g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), stone);
  head.position.y = 0.72;
  g.add(head);
  const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.26, 0.2, 10), stone);
  hat.position.y = 0.98;
  g.add(hat);
  const dark = new THREE.MeshStandardMaterial({ color: 0x1a1a1f });
  for (const sx of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), dark);
    eye.position.set(sx * 0.09, 0.76, 0.19);
    g.add(eye);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.28), stone);
    arm.position.set(sx * 0.2, 0.42, 0.14);
    arm.rotation.x = -0.5;
    g.add(arm);
  }
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.1, 0.05), stone);
  nose.position.set(0, 0.7, 0.22);
  g.add(nose);
  g.scale.setScalar(1.7);
  return g;
}

/* 항·포구: 방파제 + 작은 배 */
export function makeHarbor(x, z) {
  const g = new THREE.Group();
  const cp = coastPoint(x, z, 1.0);
  const px = cp.x + cp.nx * 0.5, pz = cp.z + cp.nz * 0.5;
  g.position.set(px, 0.02, pz);
  g.rotation.y = Math.atan2(cp.nx, cp.nz);
  const wall = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.07, 6, 18, Math.PI * 1.15), std(0x9ca3af));
  wall.rotation.x = Math.PI / 2;
  wall.rotation.z = Math.PI * 0.42;
  wall.position.z = 0.4;
  g.add(wall);
  const boats = [[-0.25, 0.55], [0.2, 0.7], [0.0, 0.3]];
  boats.forEach(([bx, bz], i) => {
    const boat = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.07, 0.34), std(i % 2 ? 0xffffff : 0xfbbf24));
    hull.position.y = 0.06;
    const cab = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.09, 0.1), std(0xe11d48));
    cab.position.set(0, 0.13, -0.05);
    boat.add(hull, cab);
    boat.position.set(bx, 0, bz);
    boat.userData.phase = i * 1.7;
    g.add(boat);
  });
  g.userData.boats = g.children.filter((c) => c.userData.phase !== undefined);
  g.userData.px = px;
  g.userData.pz = pz;
  return g;
}

/* 구름 */
export function makeCloud(seed) {
  const R = seeded(seed);
  const g = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.88, roughness: 1, flatShading: true });
  for (let i = 0; i < 5; i++) {
    const s = new THREE.Mesh(new THREE.IcosahedronGeometry(1 + R() * 1.2, 1), m);
    s.position.set((i - 2) * 1.6 + R(), R() * 0.6, R() * 1.2);
    g.add(s);
  }
  return g;
}

/* 감귤 재배지: 서귀포 남쪽 비탈에 작은 나무를 격자로 심음 */
export function buildCitrus(toXZ) {
  const pts = [];
  const R = seeded(77);
  for (let lon = 126.42; lon <= 126.86; lon += 0.0035) {
    for (let lat = 33.255; lat <= 33.34; lat += 0.0028) {
      const p = toXZ(lon + (R() - 0.5) * 0.002, lat + (R() - 0.5) * 0.0015);
      const h = heightAt(p.x, p.z);
      if (h > 0.03 && h < 0.36 && mainR(p.x, p.z) < 0.95) pts.push(p);
    }
  }
  const geo = new THREE.IcosahedronGeometry(0.11, 0);
  const mesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ roughness: 0.8, flatShading: true }), pts.length);
  const m = new THREE.Matrix4(), c = new THREE.Color();
  pts.forEach((p, i) => {
    const s = 0.8 + R() * 0.6;
    m.makeScale(s, s, s);
    m.setPosition(p.x, groundY(p.x, p.z) + 0.1, p.z);
    mesh.setMatrixAt(i, m);
    c.setHSL(0.08 + R() * 0.26, 0.75, 0.42 + R() * 0.1); // 주황~초록
    mesh.setColorAt(i, c);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.instanceColor.needsUpdate = true;
  return { mesh, count: pts.length };
}

/* 올레길(개략도): 해안선을 따라 한 바퀴 도는 길. 실제 노선과는 다릅니다. */
export function buildOlle() {
  const pts = [];
  for (let i = 0; i < 120; i++) {
    const a = (i / 120) * Math.PI * 2;
    const cp = coastPoint(Math.cos(a) * 30, Math.sin(a) * 15, 0.93);
    pts.push(new THREE.Vector3(cp.x, Math.max(groundY(cp.x, cp.z), 0.06) + 0.1, cp.z));
  }
  const curve = new THREE.CatmullRomCurve3(pts, true);
  const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 600, 0.07, 6, true), new THREE.MeshBasicMaterial({ color: 0xff7a1a }));
  const g = new THREE.Group();
  g.add(tube);
  const dots = [];
  for (let i = 0; i < 10; i++) {
    const d = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 10), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    g.add(d);
    dots.push(d);
  }
  return { group: g, curve, dots };
}

export const ROOT_VE = VE;
