// 공공데이터 "서귀포시 직영관광지 관람객수 추이" 불러오기 + 정규화
export const SITES = ['천지연폭포', '정방폭포', '천제연폭포', '중문대포 주상절리대', '산방산_용머리', '감귤박물관'];
export const SITE_COLORS = ['#0e7490', '#ff8a00', '#7c3aed', '#16a34a', '#e11d48', '#0ea5e9'];

const toNum = (v) => {
  if (v === null || v === undefined) return null;
  const n = Number(String(v).replace(/[,\s]/g, ''));
  return String(v).trim() === '' || Number.isNaN(n) ? null : n; // 빈칸("데이터 미집계")은 null
};

// 데이터셋 A: 기준연월 문자열("2024-03", "202403", "2024.3" 등) / 데이터셋 B: 기준연도 + 기준월
function ymOf(row) {
  if (row['기준연도'] !== undefined && row['기준월'] !== undefined) {
    const y = toNum(row['기준연도']);
    const m = toNum(row['기준월']);
    return y && m ? [y, m] : null;
  }
  const s = String(row['기준연월'] ?? '');
  const m = s.match(/(\d{4})\D*(\d{1,2})/);
  return m ? [Number(m[1]), Number(m[2])] : null;
}

export function normalize(rows) {
  const out = [];
  for (const row of rows || []) {
    const ym = ymOf(row);
    if (!ym) continue;
    const [year, month] = ym;
    const sites = {};
    for (const s of SITES) sites[s] = toNum(row[s]);
    out.push({ year, month, key: `${year}-${String(month).padStart(2, '0')}`, sites });
  }
  return out;
}

// 두 데이터셋을 합침: 같은 달이면 값이 있는 쪽(B 우선)을 사용
export function merge(a, b) {
  const map = new Map();
  for (const r of a) map.set(r.key, r);
  for (const r of b) {
    const prev = map.get(r.key);
    if (!prev) map.set(r.key, r);
    else {
      const sites = {};
      for (const s of SITES) sites[s] = r.sites[s] ?? prev.sites[s];
      map.set(r.key, { ...r, sites });
    }
  }
  const list = [...map.values()].sort((x, y) => x.key.localeCompare(y.key));
  return list.map((r) => {
    const vals = SITES.map((s) => r.sites[s]).filter((v) => v !== null);
    return { ...r, total: vals.length ? vals.reduce((x, y) => x + y, 0) : null };
  });
}

async function fetchDataset(name) {
  const res = await fetch(`/api/visitors?dataset=${name}`);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(body.error || `불러오기 실패 (${res.status})`);
    err.code = body.code;
    throw err;
  }
  return normalize(body.data);
}

// 실제 데이터를 불러옵니다. B 가 실패하면 A 만이라도 사용합니다.
export async function loadVisitors() {
  const [b, a] = await Promise.allSettled([fetchDataset('B'), fetchDataset('A')]);
  if (b.status === 'rejected' && a.status === 'rejected') throw b.reason;
  const rows = merge(a.status === 'fulfilled' ? a.value : [], b.status === 'fulfilled' ? b.value : []);
  if (rows.length === 0) throw new Error('불러온 데이터에 사용할 수 있는 행이 없어요. (필드 이름이 바뀌었는지 확인해 주세요)');
  return rows;
}

// 인증키가 없을 때 화면을 확인하기 위한 가짜(데모) 데이터 — 실제 통계가 아닙니다.
export function demoVisitors() {
  const base = [38000, 22000, 30000, 52000, 26000, 9000];
  const season = [0.7, 0.75, 0.95, 1.05, 1.1, 0.95, 1.15, 1.3, 0.95, 1.1, 0.85, 0.7];
  const covid = { 2020: 0.55, 2021: 0.8 };
  const rows = [];
  for (let year = 2019; year <= 2025; year++) {
    for (let month = 1; month <= 12; month++) {
      if (year === 2025 && month > 8) break;
      const sites = {};
      SITES.forEach((s, i) => {
        const wave = 1 + 0.12 * Math.sin(year * 3 + month * (i + 1));
        sites[s] = Math.round(base[i] * season[month - 1] * (covid[year] ?? 1) * wave);
      });
      if (year === 2022 && month === 2) sites['감귤박물관'] = null; // 빈칸 처리 확인용
      rows.push({ year, month, key: `${year}-${String(month).padStart(2, '0')}`, sites });
    }
  }
  return merge([], rows);
}
