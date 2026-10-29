import { useEffect, useMemo, useState } from 'react';
import { CompareChart, SeasonChart, TrendChart } from './components/Charts.jsx';
import { SITES, SITE_COLORS, demoVisitors, loadVisitors } from './lib/data.js';
import { fmt, fmtMan, seasonality, siteTotals, years, yearTotal, yoy } from './lib/stats.js';

export default function App() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [demo, setDemo] = useState(false);
  const [year, setYear] = useState(null);
  const [active, setActive] = useState(SITES);

  useEffect(() => {
    let alive = true;
    loadVisitors()
      .then((r) => alive && setRows(r))
      .catch((e) => {
        if (!alive) return;
        setError(e.message);
        setRows(demoVisitors());
        setDemo(true);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const yearList = useMemo(() => years(rows), [rows]);
  const cur = year ?? yearList[yearList.length - 1];

  const summary = useMemo(() => {
    if (!rows.length || !cur) return null;
    const yt = yearTotal(rows, cur);
    const sites = siteTotals(rows, cur);
    const top = [...sites].sort((a, b) => b.value - a.value)[0];
    const season = seasonality(rows);
    const peak = [...season].filter((s) => s.avg !== null).sort((a, b) => b.avg - a.avg)[0];
    return { yt, top, peak, change: yoy(rows, cur), sites, season };
  }, [rows, cur]);

  const toggle = (s) => setActive((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  const tableRows = rows.filter((r) => r.year === cur);

  return (
    <>
      <header className="hero">
        <p className="eyebrow">공공데이터 × 제주</p>
        <h1>서귀포 직영관광지 관람객 대시보드</h1>
        <p>천지연폭포부터 감귤박물관까지, 월별 관람객이 어떻게 달라지는지 한눈에 봐요.</p>
      </header>

      <main className="wrap">
        {loading && <p className="note">공공데이터를 불러오는 중… 🌊</p>}

        {demo && (
          <div className="banner">
            <b>⚠️ 지금 보이는 숫자는 실제 통계가 아닌 <u>샘플(가짜) 데이터</u>입니다.</b>
            <br />
            이유: {error} → README의 "인증키 설정"을 따라 <code>DATA_GO_KR_KEY</code>를 넣으면 실제 데이터로 바뀌어요.
          </div>
        )}

        {summary && (
          <>
            <div className="toolbar">
              <label>
                연도
                <select value={cur} onChange={(e) => setYear(Number(e.target.value))}>
                  {yearList.map((y) => (
                    <option key={y} value={y}>{y}년</option>
                  ))}
                </select>
              </label>
              <span className="muted">데이터 기간 {rows[0].key} ~ {rows[rows.length - 1].key} · 총 {rows.length}개월</span>
            </div>

            <section className="cards">
              <article className="stat">
                <h3>{cur}년 총 관람객</h3>
                <strong>{fmtMan(summary.yt.total)}명</strong>
                <span className="muted">{summary.yt.months}개월 집계</span>
              </article>
              <article className="stat">
                <h3>전년 대비 (같은 개월)</h3>
                <strong className={summary.change === null ? '' : summary.change >= 0 ? 'up' : 'down'}>
                  {summary.change === null ? '—' : `${summary.change >= 0 ? '▲' : '▼'} ${Math.abs(summary.change).toFixed(1)}%`}
                </strong>
                <span className="muted">{cur - 1}년과 비교</span>
              </article>
              <article className="stat">
                <h3>가장 붐빈 관광지</h3>
                <strong>{summary.top?.value ? summary.top.name : '—'}</strong>
                <span className="muted">{summary.top?.value ? `${fmt(summary.top.value)}명` : ''}</span>
              </article>
              <article className="stat">
                <h3>가장 붐비는 달 (전체 기간 평균)</h3>
                <strong>{summary.peak ? `${summary.peak.month}월` : '—'}</strong>
                <span className="muted">{summary.peak ? `월 평균 ${fmtMan(summary.peak.avg)}명` : ''}</span>
              </article>
            </section>

            <section className="panel">
              <h2>📈 월별 관람객 추이</h2>
              <div className="chips">
                {SITES.map((s, i) => (
                  <button key={s} className={`chip ${active.includes(s) ? 'on' : ''}`} style={{ '--c': SITE_COLORS[i] }} onClick={() => toggle(s)}>
                    {s}
                  </button>
                ))}
              </div>
              <TrendChart rows={rows} active={active} />
              <p className="muted small">굵은 점선은 6개 관광지 합계예요. 칩을 눌러 보고 싶은 관광지만 골라 보세요. 끊긴 선은 "데이터 미집계"(빈칸)입니다.</p>
            </section>

            <div className="two">
              <section className="panel">
                <h2>🏆 {cur}년 관광지별 비교</h2>
                <CompareChart data={summary.sites} />
              </section>
              <section className="panel">
                <h2>🗓️ 언제 가면 좋을까? (월별 평균)</h2>
                <SeasonChart data={summary.season} />
                <p className="muted small">
                  <span className="dot peak" /> 붐비는 달(상위 3) · <span className="dot low" /> 한적한 달(하위 3) — 불러온 {rows.length}개월 전체의 평균이라, 데이터 기간이 짧으면 해마다 다를 수 있어요.
                </p>
              </section>
            </div>

            <section className="panel">
              <h2>📋 {cur}년 월별 데이터</h2>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>월</th>
                      {SITES.map((s) => <th key={s}>{s}</th>)}
                      <th>합계</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableRows.map((r) => (
                      <tr key={r.key}>
                        <td>{r.month}월</td>
                        {SITES.map((s) => <td key={s}>{fmt(r.sites[s])}</td>)}
                        <td><b>{fmt(r.total)}</b></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </main>

      <footer className="footer">
        <p>출처: 공공데이터포털 — 제주특별자치도 서귀포시_직영관광지 관람객수 추이 (이용 조건은 데이터 상세 페이지의 이용허락범위를 확인하세요)</p>
      </footer>
    </>
  );
}
