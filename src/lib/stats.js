import { SITES } from './data.js';

export const sum = (arr) => arr.reduce((a, b) => a + b, 0);
export const fmt = (n) => (n === null || n === undefined ? '—' : Math.round(n).toLocaleString('ko-KR'));
export const fmtMan = (n) => (n >= 10000 ? `${(n / 10000).toLocaleString('ko-KR', { maximumFractionDigits: 1 })}만` : fmt(n));

export const years = (rows) => [...new Set(rows.map((r) => r.year))].sort((a, b) => a - b);

export function yearTotal(rows, year) {
  const list = rows.filter((r) => r.year === year && r.total !== null);
  return { total: sum(list.map((r) => r.total)), months: list.length };
}

export function siteTotals(rows, year) {
  const list = rows.filter((r) => r.year === year);
  return SITES.map((s) => {
    const vals = list.map((r) => r.sites[s]).filter((v) => v !== null);
    return { name: s, value: sum(vals), months: vals.length };
  });
}

// 월별(1~12월) 평균 총 관람객 → 상위 3개월은 성수기, 하위 3개월은 비수기로 표시
export function seasonality(rows) {
  const data = Array.from({ length: 12 }, (_, i) => {
    const vals = rows.filter((r) => r.month === i + 1 && r.total !== null).map((r) => r.total);
    return { month: i + 1, label: `${i + 1}월`, avg: vals.length ? sum(vals) / vals.length : null };
  });
  const ranked = data.filter((d) => d.avg !== null).sort((a, b) => b.avg - a.avg);
  const peak = new Set(ranked.slice(0, 3).map((d) => d.month));
  const low = new Set(ranked.slice(-3).map((d) => d.month));
  return data.map((d) => ({ ...d, kind: peak.has(d.month) ? 'peak' : low.has(d.month) ? 'low' : 'mid' }));
}

// 같은 개월 수끼리 비교한 전년 대비 증감률
export function yoy(rows, year) {
  const cur = rows.filter((r) => r.year === year && r.total !== null);
  const months = new Set(cur.map((r) => r.month));
  const prev = rows.filter((r) => r.year === year - 1 && r.total !== null && months.has(r.month));
  if (!prev.length) return null;
  const prevSum = sum(prev.map((r) => r.total));
  const curSum = sum(cur.filter((r) => prev.some((p) => p.month === r.month)).map((r) => r.total));
  return prevSum ? ((curSum - prevSum) / prevSum) * 100 : null;
}
