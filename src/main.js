import './styles.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { SITES, loadVisitors } from './lib/data.js';
import { HALLA, NAMED_OREUM, VE, buildTerrain, groundY, snapToLand, toXZ } from './world/terrain.js';
import { HARBORS, HAREUBANG, INFO, LIGHTHOUSES, WINDFARMS } from './world/places.js';
import { buildCitrus, buildOlle, makeCloud, makeHarbor, makeHareubang, makeLighthouse, makeTurbine, tag } from './world/objects.js';

const $ = (id) => document.getElementById(id);
const app = $('app');
const fmt = (n) => (n === null || n === undefined ? '—' : Math.round(n).toLocaleString('ko-KR'));

/* ---------- 렌더러·씬 ---------- */
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
app.prepend(renderer.domElement);
const labelRenderer = new CSS2DRenderer();
labelRenderer.domElement.className = 'labels';
app.appendChild(labelRenderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xcfe8f5, 95, 260);
const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 700);
camera.position.set(0, 50, 64);

scene.add(new THREE.HemisphereLight(0xe3f4ff, 0x6b7a4a, 1.0));
const sun = new THREE.DirectionalLight(0xfff0d0, 1.35);
sun.position.set(-40, 60, 25);
scene.add(sun);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.maxPolarAngle = Math.PI * 0.47;
controls.minDistance = 5;
controls.maxDistance = 150;
controls.target.set(0, 0, 0);

/* ---------- 지형과 바다 ---------- */
scene.add(buildTerrain());

// 지형의 바다 바닥과 같은 색·같은 조명으로 맞춰서 지형 가장자리가 네모로 보이지 않게 함
const deep = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.MeshStandardMaterial({ color: 0x16597a, roughness: 0.95, flatShading: true }));
deep.rotation.x = -Math.PI / 2;
deep.position.y = -0.27 * VE;
scene.add(deep);

function waveTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.strokeStyle = '#ffffffaa';
  g.lineWidth = 2;
  for (let i = 0; i < 70; i++) {
    const x = Math.random() * 256, y = Math.random() * 256, r = 4 + Math.random() * 10;
    g.beginPath();
    g.arc(x, y, r, Math.PI * 1.15, Math.PI * 1.85);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(90, 90);
  return t;
}
const waves = waveTexture();
const water = new THREE.Mesh(
  new THREE.PlaneGeometry(900, 900),
  new THREE.MeshStandardMaterial({ color: 0x2aa7c8, transparent: true, opacity: 0.72, roughness: 0.25, metalness: 0.1, map: waves })
);
water.rotation.x = -Math.PI / 2;
scene.add(water);

/* ---------- 레이어 ---------- */
const LAYERS = {};
function addLayer(key, label, on = true) {
  const group = new THREE.Group();
  scene.add(group);
  LAYERS[key] = { key, label, group, tags: [], on };
  return LAYERS[key];
}
addLayer('visitors', '🍊 관광지 방문자');
addLayer('oreum', '⛰️ 한라산·오름');
addLayer('coast', '⚓ 항·포구');
addLayer('olle', '🥾 올레길(개략)');
addLayer('citrus', '🟠 감귤 재배지');
addLayer('wind', '🌬️ 풍력발전기');
addLayer('light', '🗼 등대');
addLayer('hareubang', '🗿 돌하르방');
addLayer('cloud', '☁️ 구름');

let selectPlace = () => {};
function addTag(layer, parent, text, { cls = '', sub = '', y = 0, maxDist = 80, place = null } = {}) {
  const t = tag(text, cls, sub);
  t.position.set(0, y, 0);
  parent.add(t);
  t.userData = { layer, maxDist };
  layer.tags.push(t);
  if (place) t.element.addEventListener('click', () => selectPlace(place, parent));
  return t;
}

const anims = [];

/* 한라산 + 오름 */
{
  const L = LAYERS.oreum;
  const hy = groundY(HALLA.x, HALLA.z);
  const hp = new THREE.Group();
  hp.position.set(HALLA.x, hy, HALLA.z);
  L.group.add(hp);
  addTag(L, hp, '한라산', { cls: 'peak', sub: '1,947m', y: 0.9, maxDist: 400, place: { name: '한라산', desc: INFO['한라산'], type: '산' } });
  // 백록담
  const lake = new THREE.Mesh(new THREE.CircleGeometry(0.33, 20), new THREE.MeshStandardMaterial({ color: 0x3aa6d8, roughness: 0.2 }));
  lake.rotation.x = -Math.PI / 2;
  lake.position.set(HALLA.x, hy + 0.03, HALLA.z);
  scene.add(lake);
  for (const o of NAMED_OREUM) {
    const g = new THREE.Group();
    g.position.set(o.x, groundY(o.x, o.z), o.z);
    L.group.add(g);
    addTag(L, g, o.name, { cls: 'minor', y: 0.9, maxDist: 75, place: { name: o.name, desc: INFO[o.name] || '제주의 오름', type: '오름' } });
  }
}

/* 항·포구 */
{
  const L = LAYERS.coast;
  const boats = [];
  for (const h of HARBORS) {
    const p = toXZ(h.lon, h.lat);
    const g = makeHarbor(p.x, p.z);
    L.group.add(g);
    boats.push(...g.userData.boats);
    const holder = new THREE.Group();
    holder.position.set(g.userData.px, 0.5, g.userData.pz);
    L.group.add(holder);
    addTag(L, holder, h.name, { cls: 'minor', y: 0.6, maxDist: 70, place: { name: h.name, desc: h.desc, type: '항·포구' } });
  }
  anims.push((t) => boats.forEach((b) => (b.position.y = Math.sin(t * 1.6 + b.userData.phase) * 0.03)));
}

/* 올레길(개략) */
{
  const L = LAYERS.olle;
  const olle = buildOlle();
  L.group.add(olle.group);
  anims.push((t) => olle.dots.forEach((d, i) => d.position.copy(olle.curve.getPoint(((t * 0.02 + i / olle.dots.length) % 1 + 1) % 1))));
  const holder = new THREE.Group();
  const p = olle.curve.getPoint(0.62);
  holder.position.copy(p);
  L.group.add(holder);
  addTag(L, holder, '올레길 (개략도)', { cls: 'minor', y: 0.7, maxDist: 90, place: { name: '올레길 (개략도)', desc: '해안을 따라 걷는 제주 올레길을 단순하게 표현했어요. 실제 노선과는 달라요.', type: '길' } });
}

/* 감귤 재배지 */
{
  const L = LAYERS.citrus;
  const { mesh, count } = buildCitrus(toXZ);
  L.group.add(mesh);
  const c = toXZ(126.62, 33.3);
  const holder = new THREE.Group();
  holder.position.set(c.x, groundY(c.x, c.z) + 0.6, c.z);
  L.group.add(holder);
  addTag(L, holder, '감귤 재배지', { cls: 'minor', sub: '서귀포 일대(개략)', y: 0.4, maxDist: 70, place: { name: '감귤 재배지', desc: `따뜻한 남쪽 비탈에 감귤나무가 이어져요. 지도에는 약 ${count.toLocaleString('ko-KR')}그루를 상징적으로 심었어요.`, type: '농업' } });
}

/* 풍력발전기 */
{
  const L = LAYERS.wind;
  const hubs = [];
  for (const w of WINDFARMS) {
    const p = toXZ(w.lon, w.lat);
    const base = snapToLand(p.x, p.z, 0.02);
    const farm = new THREE.Group();
    L.group.add(farm);
    for (let i = 0; i < 4; i++) {
      const tb = makeTurbine();
      const x = base.x + (i % 2) * 1.2 - 0.6 + Math.sin(i * 2.3) * 0.4;
      const z = base.z + Math.floor(i / 2) * 1.2 - 0.6;
      tb.position.set(x, groundY(x, z), z);
      tb.rotation.y = -0.6;
      farm.add(tb);
      hubs.push([tb.userData.hub, i * 0.9]);
    }
    const holder = new THREE.Group();
    holder.position.set(base.x, groundY(base.x, base.z) + 1.4, base.z);
    L.group.add(holder);
    addTag(L, holder, w.name, { cls: 'minor', y: 0.3, maxDist: 55, place: { name: w.name, desc: '바람이 많은 제주에서 전기를 만드는 풍력발전 지대예요. (크기는 보기 좋게 과장했어요)', type: '풍력' } });
  }
  anims.push((t) => hubs.forEach(([h, ph]) => (h.rotation.z = t * 1.6 + ph)));
}

/* 등대 */
{
  const L = LAYERS.light;
  const spins = [];
  for (const l of LIGHTHOUSES) {
    const p = toXZ(l.lon, l.lat);
    const s = snapToLand(p.x, p.z, 0.006);
    const lh = makeLighthouse();
    lh.position.set(s.x, groundY(s.x, s.z), s.z);
    L.group.add(lh);
    spins.push([lh.userData.spin, spins.length]);
    addTag(L, lh, l.name, { cls: 'minor', y: 1.6, maxDist: 55, place: { name: l.name, desc: '밤바다를 비추는 등대예요. (위치는 대략적이고 크기는 과장했어요)', type: '등대' } });
  }
  anims.push((t) => spins.forEach(([s, i]) => (s.rotation.y = t * 1.4 + i)));
}

/* 돌하르방 */
{
  const L = LAYERS.hareubang;
  for (const h of HAREUBANG) {
    const p = toXZ(h.lon, h.lat);
    const s = snapToLand(p.x, p.z, 0.02);
    const d = makeHareubang();
    d.position.set(s.x, groundY(s.x, s.z), s.z);
    d.rotation.y = Math.PI * 0.15;
    L.group.add(d);
    addTag(L, d, `돌하르방 · ${h.name}`, { cls: 'minor', y: 2.2, maxDist: 45, place: { name: `돌하르방 (${h.name})`, desc: '제주를 지켜 주는 현무암 석상이에요. (크기는 보기 좋게 과장했어요)', type: '상징' } });
  }
}

/* 구름 */
{
  const L = LAYERS.cloud;
  const clouds = [];
  for (let i = 0; i < 6; i++) {
    const c = makeCloud(i * 13 + 5);
    c.position.set(-60 + i * 22, 16 + (i % 3) * 3, (i * 37) % 56 - 28);
    c.scale.setScalar(0.8 + (i % 3) * 0.25);
    L.group.add(c);
    clouds.push(c);
  }
  anims.push((t, dt) => clouds.forEach((c) => {
    c.position.x += dt * 0.6;
    if (c.position.x > 70) c.position.x = -70;
  }));
}

/* ---------- 방문자 막대(공공데이터) ---------- */
const bars = SITES.map((s) => {
  const p = toXZ(s.lon, s.lat);
  const sn = snapToLand(p.x, p.z, 0.012);
  const L = LAYERS.visitors;
  const g = new THREE.Group();
  g.position.set(sn.x, groundY(sn.x, sn.z), sn.z);
  L.group.add(g);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.72, 0.14, 24), new THREE.MeshStandardMaterial({ color: s.color, roughness: 0.5 }));
  base.position.y = 0.07;
  g.add(base);
  const bar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.42, 1, 24),
    new THREE.MeshStandardMaterial({ color: s.color, emissive: s.color, emissiveIntensity: 0.3, roughness: 0.35, transparent: true, opacity: 0.93 })
  );
  bar.userData.site = s;
  g.add(bar);
  base.userData.site = s;
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.46, 20, 14), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: s.color, emissiveIntensity: 0.6 }));
  g.add(cap);
  const t = addTag(L, g, s.name, { cls: 'site', sub: '—', maxDist: 400, place: null });
  t.element.addEventListener('click', () => selectSite(s));
  return { s, g, bar, base, cap, tag: t, sub: t.element.querySelector('small'), h: 0.05, target: 0.05 };
});

const MAXH = 5.6;
let rows = [];
let maxAll = 1;
let mi = 0;
let selected = null; // 선택된 방문자 관광지

/* ---------- 정보 패널 ---------- */
const info = $('info');
function drawSpark(canvas, vals, idx, color) {
  const dpr = devicePixelRatio || 1;
  const w = canvas.clientWidth, h = canvas.clientHeight;
  canvas.width = w * dpr; canvas.height = h * dpr;
  const g = canvas.getContext('2d');
  g.scale(dpr, dpr);
  const nums = vals.filter((v) => v !== null);
  const mx = Math.max(...nums, 1);
  const px = (i) => 8 + (i / Math.max(vals.length - 1, 1)) * (w - 16);
  const py = (v) => h - 10 - (v / mx) * (h - 22);
  g.strokeStyle = color; g.lineWidth = 2.5; g.lineJoin = 'round';
  g.beginPath();
  let pen = false;
  vals.forEach((v, i) => {
    if (v === null) { pen = false; return; }
    if (!pen) { g.moveTo(px(i), py(v)); pen = true; } else g.lineTo(px(i), py(v));
  });
  g.stroke();
  if (vals[idx] !== null && vals[idx] !== undefined) {
    g.fillStyle = '#ff8a00';
    g.beginPath(); g.arc(px(idx), py(vals[idx]), 5, 0, 7); g.fill();
  }
}

function renderInfo() {
  if (!rows.length) { info.innerHTML = '<h2>방문자 순위</h2><p class="muted">공공데이터를 불러오는 중…</p>'; return; }
  const row = rows[mi];
  if (selected) {
    const s = selected;
    const vals = rows.map((r) => r.v[s.name]);
    const nums = vals.filter((v) => v !== null);
    const best = nums.length ? Math.max(...nums) : null;
    const bi = vals.indexOf(best);
    const avg = nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
    const rank = [...SITES].sort((a, b) => (row.v[b.name] ?? -1) - (row.v[a.name] ?? -1)).findIndex((x) => x.name === s.name) + 1;
    info.innerHTML = `
      <button class="close" id="back" aria-label="닫기">✕</button>
      <h3 style="color:${s.color}">${s.name}</h3>
      <p class="muted">${s.desc}</p>
      <p><b>${row.year}년 ${row.month}월</b> 방문자 <b>${fmt(row.v[s.name])}명</b> <span class="muted">(이달 ${rank}위)</span></p>
      <canvas class="spark" id="spark"></canvas>
      <div class="stats">
        <div>가장 많았던 달<b>${bi >= 0 ? rows[bi].key : '—'}</b>${fmt(best)}명</div>
        <div>월 평균<b>${fmt(avg)}명</b>${nums.length}개월 기준</div>
      </div>`;
    drawSpark($('spark'), vals, mi, s.color);
    $('back').onclick = () => { selected = null; renderInfo(); };
  } else {
    const list = [...SITES].map((s) => ({ s, v: row.v[s.name] })).sort((a, b) => (b.v ?? -1) - (a.v ?? -1));
    const mx = Math.max(...list.map((x) => x.v ?? 0), 1);
    info.innerHTML = `<h2>${row.year}년 ${row.month}월 방문자 순위</h2>
      <ul class="rank">${list.map((x, i) => `
        <li data-n="${x.s.name}"><span>${i + 1}. ${x.s.name}</span><b>${fmt(x.v)}</b>
          <div class="bar"><i style="width:${((x.v ?? 0) / mx) * 100}%;background:${x.s.color}"></i></div></li>`).join('')}</ul>
      <p class="muted" style="margin-top:8px">막대나 이름을 누르면 월별 추이를 볼 수 있어요.</p>`;
    info.querySelectorAll('.rank li').forEach((li) => (li.onclick = () => selectSite(SITES.find((s) => s.name === li.dataset.n))));
  }
}

function renderPlace(p) {
  info.innerHTML = `<button class="close" id="back" aria-label="닫기">✕</button>
    <h3>${p.name}</h3><p class="muted">${p.type}</p><p>${p.desc}</p>`;
  $('back').onclick = () => renderInfo();
}

/* ---------- 카메라 이동 ---------- */
let fly = null;
const ease = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
function flyTo(pos, tgt, dur = 1.5) {
  fly = { t: 0, dur, p0: camera.position.clone(), t0: controls.target.clone(), p1: new THREE.Vector3(...pos), t1: new THREE.Vector3(...tgt) };
}
function flyNear(worldPos, dist = 15) {
  const dir = camera.position.clone().sub(controls.target).normalize();
  dir.y = Math.max(dir.y, 0.5);
  dir.normalize();
  const p = worldPos.clone().add(dir.multiplyScalar(dist));
  flyTo([p.x, p.y, p.z], [worldPos.x, worldPos.y, worldPos.z]);
}

function selectSite(s) {
  selected = s;
  renderInfo();
  const b = bars.find((x) => x.s === s);
  flyNear(b.g.position.clone().setY(b.g.position.y + 1), 14);
}
selectPlace = (p, obj) => {
  selected = null;
  renderPlace(p);
  const w = new THREE.Vector3();
  obj.getWorldPosition(w);
  flyNear(w, 18);
};

const VIEWS = [
  ['전체 보기', () => [[0, 50, 64], [0, 0, 0]]],
  ['한라산', () => [[HALLA.x + 12, 13, HALLA.z + 22], [HALLA.x, 2.5, HALLA.z]]],
  ['서귀포 관광지', () => { const c = toXZ(126.46, 33.255); return [[c.x, 20, c.z + 30], [c.x, 0, c.z]]; }],
  ['성산·우도', () => { const c = toXZ(126.93, 33.48); return [[c.x - 14, 14, c.z + 22], [c.x, 0, c.z]]; }],
  ['서쪽 해안', () => { const c = toXZ(126.22, 33.35); return [[c.x - 18, 16, c.z + 24], [c.x, 0, c.z]]; }],
];
{
  const nav = $('views');
  VIEWS.forEach(([name, fn]) => {
    const b = document.createElement('button');
    b.textContent = name;
    b.onclick = () => { const [p, t] = fn(); flyTo(p, t, 1.8); };
    nav.appendChild(b);
  });
}

/* ---------- 레이어 토글 ---------- */
{
  const box = $('layers');
  Object.values(LAYERS).forEach((L) => {
    const lab = document.createElement('label');
    lab.innerHTML = `<input type="checkbox" checked /> ${L.label}`;
    lab.querySelector('input').onchange = (e) => { L.on = e.target.checked; L.group.visible = L.on; };
    box.appendChild(lab);
  });
}

/* ---------- 타임라인 ---------- */
const slider = $('slider');
const playBtn = $('play');
let timer = null;
function setMonth(i) {
  mi = i;
  slider.value = i;
  const row = rows[i];
  $('month').textContent = `${row.year}년 ${row.month}월`;
  $('total').textContent = row.total !== null ? `합계 ${fmt(row.total)}명` : '집계 없음';
  bars.forEach((b) => {
    const v = row.v[b.s.name];
    b.target = v === null ? 0.05 : Math.max(0.12, (v / maxAll) * MAXH);
    b.sub.textContent = v === null ? '미집계' : `${fmt(v)}명`;
  });
  renderInfo();
}
slider.oninput = () => rows.length && setMonth(Number(slider.value));
playBtn.onclick = () => {
  if (!rows.length) return;
  if (timer) { clearInterval(timer); timer = null; playBtn.textContent = '▶'; return; }
  playBtn.textContent = '⏸';
  if (mi >= rows.length - 1) setMonth(0);
  timer = setInterval(() => {
    if (mi >= rows.length - 1) { clearInterval(timer); timer = null; playBtn.textContent = '▶'; return; }
    setMonth(mi + 1);
  }, 1000);
};

/* ---------- 막대 클릭 ---------- */
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
let down = null;
renderer.domElement.addEventListener('pointerdown', (e) => (down = [e.clientX, e.clientY]));
renderer.domElement.addEventListener('pointerup', (e) => {
  if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) return;
  ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hit = ray.intersectObjects(bars.flatMap((b) => [b.bar, b.base]), false)[0];
  if (hit) selectSite(hit.object.userData.site);
});

/* ---------- 루프 ---------- */
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h);
  labelRenderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

const clock = new THREE.Clock();
const tmp = new THREE.Vector3();
const allTags = Object.values(LAYERS).flatMap((L) => L.tags);
function loop() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  if (fly) {
    fly.t += dt;
    const k = ease(Math.min(fly.t / fly.dur, 1));
    camera.position.lerpVectors(fly.p0, fly.p1, k);
    controls.target.lerpVectors(fly.t0, fly.t1, k);
    if (fly.t >= fly.dur) fly = null;
  }
  controls.update();
  waves.offset.x = t * 0.01;
  waves.offset.y = t * 0.006;
  anims.forEach((a) => a(t, dt));
  bars.forEach((b) => {
    b.h += (b.target - b.h) * Math.min(1, dt * 5);
    b.bar.scale.y = Math.max(b.h, 0.01);
    b.bar.position.y = b.h / 2 + 0.14;
    b.cap.position.y = b.h + 0.14;
    b.tag.position.y = b.h + 1.0;
  });
  for (const tg of allTags) {
    tg.getWorldPosition(tmp);
    tg.visible = tg.userData.layer.on && camera.position.distanceTo(tmp) < tg.userData.maxDist;
  }
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
  requestAnimationFrame(loop);
}
loop();

/* ---------- 데이터 ---------- */
renderInfo();
loadVisitors()
  .then((r) => {
    rows = r;
    maxAll = Math.max(...rows.flatMap((x) => SITES.map((s) => x.v[s.name] ?? 0)), 1);
    slider.max = rows.length - 1;
    $('status').textContent = `데이터: 서귀포시 직영관광지 관람객수 추이 (공공데이터포털) · ${rows[0].key} ~ ${rows[rows.length - 1].key}`;
    setMonth(rows.length - 1);
  })
  .catch((e) => {
    const s = $('status');
    s.textContent = `⚠️ 방문자 데이터를 불러오지 못했어요: ${e.message}`;
    s.className = 'err';
    info.innerHTML = '<h2>방문자 순위</h2><p class="muted">데이터가 없어 막대가 비어 있어요. 인증키(DATA_GO_KR_KEY) 설정을 확인해 주세요. 지도 탐색은 그대로 할 수 있어요.</p>';
  });

window.__jeju = { camera, controls, scene, renderer, flyTo };
