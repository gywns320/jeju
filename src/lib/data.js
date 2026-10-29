// 공공데이터 "서귀포시 직영관광지 관람객수 추이" 불러오기 + 정규화
// 좌표는 3D 지도에 막대를 세우기 위한 대략적인 위치입니다.
export const SITES = [
  { name: '천지연폭포', lon: 126.554, lat: 33.247, color: '#38bdf8', desc: '서귀포 시내 가까이에 있는 폭포. 숲길을 따라 걸어 들어가요.' },
  { name: '정방폭포', lon: 126.571, lat: 33.245, color: '#fb923c', desc: '바다로 곧장 떨어지는 폭포로 알려진 서귀포의 명소.' },
  { name: '천제연폭포', lon: 126.413, lat: 33.254, color: '#a78bfa', desc: '중문관광단지 안에 있는, 이어지는 폭포들이 매력인 곳.' },
  { name: '중문대포 주상절리대', lon: 126.425, lat: 33.238, color: '#4ade80', desc: '기둥 모양으로 갈라진 용암 절벽이 바다와 만나는 해안.' },
  { name: '산방산_용머리', lon: 126.311, lat: 33.232, color: '#f43f5e', desc: '종처럼 솟은 산방산 아래로 이어지는 용머리 해안.' },
  { name: '감귤박물관', lon: 126.618, lat: 33.289, color: '#fbbf24', desc: '제주 감귤의 역사와 문화를 만나는 박물관.' },
];

const toNum = (v) => {
  if (v === null || v === undefined) return null;
  const n = Number(String(v).replace(/[,\s]/g, ''));
  return String(v).trim() === '' || Number.isNaN(n) ? null : n; // 빈칸("데이터 미집계")은 null
};

// 데이터셋 A: 기준연월 문자열 / 데이터셋 B: 기준연도 + 기준월
function ymOf(row) {
  if (row['기준연도'] !== undefined && row['기준월'] !== undefined) {
    const y = toNum(row['기준연도']);
    const m = toNum(row['기준월']);
    return y && m ? [y, m] : null;
  }
  const m = String(row['기준연월'] ?? '').match(/(\d{4})\D*(\d{1,2})/);
  return m ? [Number(m[1]), Number(m[2])] : null;
}

export function normalize(rows) {
  const out = [];
  for (const row of rows || []) {
    const ym = ymOf(row);
    if (!ym) continue;
    const [year, month] = ym;
    const v = {};
    for (const s of SITES) v[s.name] = toNum(row[s.name]);
    out.push({ year, month, key: `${year}-${String(month).padStart(2, '0')}`, v });
  }
  return out;
}

// 두 데이터셋 합치기: 같은 달이면 값이 있는 쪽(B 우선) 사용
export function merge(a, b) {
  const map = new Map();
  for (const r of a) map.set(r.key, r);
  for (const r of b) {
    const prev = map.get(r.key);
    if (!prev) map.set(r.key, r);
    else {
      const v = {};
      for (const s of SITES) v[s.name] = r.v[s.name] ?? prev.v[s.name];
      map.set(r.key, { ...r, v });
    }
  }
  return [...map.values()]
    .sort((x, y) => x.key.localeCompare(y.key))
    .map((r) => {
      const vals = SITES.map((s) => r.v[s.name]).filter((n) => n !== null);
      return { ...r, total: vals.length ? vals.reduce((x, y) => x + y, 0) : null };
    });
}

async function fetchDataset(name) {
  const res = await fetch(`/api/visitors?dataset=${name}`);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `불러오기 실패 (${res.status})`);
  return normalize(body.data);
}

export async function loadVisitors() {
  const [b, a] = await Promise.allSettled([fetchDataset('B'), fetchDataset('A')]);
  if (b.status === 'rejected' && a.status === 'rejected') throw b.reason;
  const rows = merge(a.status === 'fulfilled' ? a.value : [], b.status === 'fulfilled' ? b.value : []);
  if (!rows.length) throw new Error('불러온 데이터에 사용할 수 있는 행이 없어요.');
  return rows;
}
