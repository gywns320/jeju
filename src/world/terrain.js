import * as THREE from 'three';

// 1 world unit = 1 km (세로는 VE 배 과장). x: 동쪽(+), z: 남쪽(+)
export const LON0 = 126.55;
export const LAT0 = 33.385;
export const KX = 92.9; // 경도 1도 ≈ km
export const KZ = 111; // 위도 1도 ≈ km
export const VE = 3.4;
export const toXZ = (lon, lat) => ({ x: (lon - LON0) * KX, z: -(lat - LAT0) * KZ });

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (a, b, v) => {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

function hash(ix, iy) {
  let h = Math.imul(ix, 374761393) + Math.imul(iy, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
function vnoise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}
const fbm = (x, y) => vnoise(x, y) * 0.5 + vnoise(x * 2.1, y * 2.1) * 0.3 + vnoise(x * 4.3, y * 4.3) * 0.2;

function seeded(s) {
  return () => {
    s |= 0; s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 본섬: 동서로 긴 타원 + 해안선 노이즈 (실제 지형을 단순화한 모양)
const TH = (7 * Math.PI) / 180, CT = Math.cos(TH), ST = Math.sin(TH);
export function mainR(x, z) {
  const y = -z;
  const u = x * CT + y * ST, v = -x * ST + y * CT;
  const ang = Math.atan2(v / 18, u / 38);
  let r = Math.hypot(u / 38, v / 18);
  r *= 1 + 0.05 * Math.sin(3 * ang + 1.3) + 0.035 * Math.sin(5 * ang + 0.4) + (fbm(x * 0.09 + 10, y * 0.09 + 3) - 0.5) * 0.16;
  return r;
}

// 부속 섬(우도·가파도·마라도·비양도)과 성산 반도
const SMALL = [
  ['우도', 126.953, 33.503, 2.6, 1.5, 0.4, 0.13],
  ['성산반도', 126.925, 33.452, 2.6, 1.5, 0.7, 0.03],
  ['가파도', 126.272, 33.17, 0.9, 0.6, 0.2, 0.02],
  ['마라도', 126.268, 33.114, 0.8, 0.5, 0.0, 0.015],
  ['비양도', 126.228, 33.415, 0.8, 0.7, 0.0, 0.1],
].map(([name, lon, lat, a, b, rot, h]) => ({ name, ...toXZ(lon, lat), a, b, h, c: Math.cos(rot), s: Math.sin(rot) }));
const smallT = (s, x, z) => {
  const dx = x - s.x, dz = z - s.z;
  return 1 - Math.hypot((dx * s.c + dz * s.s) / s.a, (-dx * s.s + dz * s.c) / s.b);
};

// 한라산과 오름
export const HALLA = toXZ(126.533, 33.362);
export const NAMED_OREUM = [
  { name: '성산일출봉', lon: 126.942, lat: 33.459, h: 0.18, r: 1.15, p: 0.8 },
  { name: '산방산', lon: 126.314, lat: 33.239, h: 0.37, r: 1.3, p: 0.6 },
  { name: '송악산', lon: 126.29, lat: 33.205, h: 0.1, r: 1.0, p: 0.9 },
  { name: '새별오름', lon: 126.358, lat: 33.364, h: 0.28, r: 1.3, p: 1.2 },
  { name: '금오름', lon: 126.3, lat: 33.35, h: 0.25, r: 1.2, p: 1.2 },
  { name: '거문오름', lon: 126.7, lat: 33.43, h: 0.3, r: 1.6, p: 1.3 },
  { name: '다랑쉬오름', lon: 126.806, lat: 33.445, h: 0.2, r: 1.2, p: 1.2 },
  { name: '용눈이오름', lon: 126.832, lat: 33.431, h: 0.16, r: 1.2, p: 1.3 },
].map((o) => ({ ...o, ...toXZ(o.lon, o.lat), named: true }));

const OREUMS = [...NAMED_OREUM];
{
  const R = seeded(2024);
  let guard = 0;
  while (OREUMS.length < 8 + 95 && guard++ < 4000) {
    const x = (R() - 0.5) * 70, z = (R() - 0.5) * 32;
    if (mainR(x, z) > 0.88 || Math.hypot(x - HALLA.x, z - HALLA.z) < 5.5) continue;
    OREUMS.push({ x, z, h: 0.05 + R() * 0.22, r: 0.5 + R() * 1.0, p: 1.2 + R() * 0.5 });
  }
  OREUMS.forEach((o) => (o.r2 = o.r * o.r));
}

export function heightAt(x, z) {
  const rm = mainR(x, z);
  let t = 1 - rm;
  for (const s of SMALL) t = Math.max(t, smallT(s, x, z));
  let h = -0.02 - clamp(-t * 0.9, 0, 0.25);

  if (1 - rm > 0) {
    const tm = clamp(1 - rm, 0, 1);
    h = 0.004 + 0.5 * Math.pow(tm, 1.1) + fbm(x * 0.2, z * 0.2) * 0.03;
    const d = Math.hypot((x - HALLA.x) / 1.15, z - HALLA.z);
    h += 1.45 * Math.exp(-Math.pow(d / 7.2, 1.8));
    if (d < 0.45) h -= 0.09 * (1 - d / 0.45); // 백록담 분화구
  }
  for (const s of SMALL) {
    const ts = smallT(s, x, z);
    if (ts > 0) h = Math.max(h, 0.004 + s.h * Math.pow(ts, 0.8));
  }
  let bump = 0;
  for (const o of OREUMS) {
    const dx = x - o.x, dz = z - o.z, q2 = dx * dx + dz * dz;
    if (q2 < o.r2) bump += o.h * Math.pow(1 - Math.sqrt(q2 / o.r2), o.p);
  }
  if (bump > 0.01) h = Math.max(h, 0.004) + bump;
  return h;
}

export const groundY = (x, z) => Math.max(heightAt(x, z), 0) * VE;

// 바다에 걸친 좌표를 육지 쪽으로 끌어당김
export function snapToLand(x, z, minH = 0.03) {
  let px = x, pz = z;
  for (let i = 0; i < 80 && heightAt(px, pz) < minH; i++) {
    px *= 0.985;
    pz *= 0.985;
  }
  return { x: px, z: pz };
}

// 본섬 해안선 위의 점 (중심에서 (x,z) 방향으로 나가며 mainR=level 인 곳)
export function coastPoint(x, z, level = 1) {
  const len = Math.hypot(x, z) || 1, dx = x / len, dz = z / len;
  let lo = 0, hi = 70;
  for (let i = 0; i < 28; i++) {
    const mid = (lo + hi) / 2;
    if (mainR(dx * mid, dz * mid) < level) lo = mid;
    else hi = mid;
  }
  return { x: dx * lo, z: dz * lo, nx: dx, nz: dz };
}

const C = (h) => new THREE.Color(h);
const COL = {
  deep: C('#16597a'), shallow: C('#44bccb'), sand: C('#eadba8'), basalt: C('#4b4a52'),
  grass: C('#7db556'), grass2: C('#5f9846'), forest: C('#3f7a3a'), scrub: C('#8c8f5a'), rock: C('#8f8a80'), peak: C('#bdb7ab'),
};
function colorAt(h, x, z, out) {
  if (h <= 0) {
    out.copy(COL.deep).lerp(COL.shallow, smooth(-0.2, -0.005, h));
    return;
  }
  const n = fbm(x * 0.5, z * 0.5);
  out.copy(n > 0.55 ? COL.sand : COL.basalt).lerp(COL.grass, smooth(0.008, 0.045, h));
  out.lerp(COL.grass2, smooth(0.1, 0.4, h));
  out.lerp(COL.forest, smooth(0.45, 0.9, h));
  out.lerp(COL.scrub, smooth(1.0, 1.35, h));
  out.lerp(COL.rock, smooth(1.45, 1.75, h));
  out.lerp(COL.peak, smooth(1.8, 1.95, h));
  const k = 0.9 + 0.2 * fbm(x * 1.3, z * 1.3);
  out.multiplyScalar(k);
}

export function buildTerrain() {
  const W = 96, D = 60, SX = 300, SZ = 188;
  const geo = new THREE.PlaneGeometry(W, D, SX, SZ);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const h = heightAt(x, z);
    pos.setY(i, h * VE);
    colorAt(h, x, z, c);
    colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95, metalness: 0 }));
}
