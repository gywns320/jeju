// Vercel 서버리스 함수: 공공데이터 인증키를 브라우저에 노출하지 않고 odcloud API를 대신 호출합니다.
// GET /api/visitors?dataset=B   (B: 20251002 버전, A: 20250831 버전)
const DATASETS = {
  A: 'uddi:258f6b02-0967-4fed-b337-83e46cdbba73',
  B: 'uddi:32a1b877-af20-4505-a76a-fd389ebd30ca',
};

export default async function handler(req, res) {
  const rawKey = process.env.DATA_GO_KR_KEY;
  if (!rawKey) {
    return res.status(500).json({ code: 'NO_KEY', error: 'DATA_GO_KR_KEY 환경변수가 설정되지 않았어요.' });
  }
  // 포털의 "Encoding 키"(%가 들어있음)를 넣어도 이중 인코딩되지 않게 디코딩해 둡니다.
  const key = rawKey.includes('%') ? decodeURIComponent(rawKey) : rawKey;
  const id = DATASETS[req.query.dataset === 'A' ? 'A' : 'B'];

  const all = [];
  let total = Infinity;
  try {
    for (let page = 1; all.length < total && page <= 20; page++) {
      const url = new URL(`https://api.odcloud.kr/api/15125100/v1/${id}`);
      url.search = new URLSearchParams({ serviceKey: key, page: String(page), perPage: '500' }).toString();
      const r = await fetch(url);
      if (!r.ok) {
        const msg = r.status === 401 ? '인증키가 올바르지 않거나 아직 승인되지 않았어요.' : `공공데이터 서버 오류 (${r.status})`;
        return res.status(r.status).json({ code: `HTTP_${r.status}`, error: msg });
      }
      const json = await r.json();
      total = Number.isFinite(json.totalCount) ? json.totalCount : 0;
      const rows = json.data || [];
      all.push(...rows);
      if (rows.length === 0) break;
    }
  } catch (e) {
    return res.status(502).json({ code: 'FETCH_FAILED', error: '공공데이터 서버에 연결하지 못했어요.' });
  }

  // 월 단위 통계라 자주 바뀌지 않음 → 하루 캐시
  res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=3600');
  return res.status(200).json({ data: all, totalCount: total });
}
