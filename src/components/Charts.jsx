import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { SITES, SITE_COLORS } from '../lib/data.js';
import { fmt, fmtMan } from '../lib/stats.js';

const grid = '#d9e8ec';

export function TrendChart({ rows, active }) {
  const data = rows.map((r) => ({ key: r.key, 합계: r.total, ...r.sites }));
  return (
    <ResponsiveContainer width="100%" height={340}>
      <LineChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={grid} strokeDasharray="3 3" />
        <XAxis dataKey="key" tick={{ fontSize: 12 }} minTickGap={28} />
        <YAxis tickFormatter={fmtMan} width={56} tick={{ fontSize: 12 }} />
        <Tooltip formatter={(v) => [fmt(v) + '명']} />
        <Legend />
        <Line type="monotone" dataKey="합계" stroke="#2b2d33" strokeWidth={3} strokeDasharray="6 3" dot={false} connectNulls={false} />
        {SITES.filter((s) => active.includes(s)).map((s) => (
          <Line key={s} type="monotone" dataKey={s} stroke={SITE_COLORS[SITES.indexOf(s)]} strokeWidth={2} dot={false} connectNulls={false} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function CompareChart({ data }) {
  const sorted = [...data].sort((a, b) => b.value - a.value);
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={sorted} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 0 }}>
        <CartesianGrid stroke={grid} strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" tickFormatter={fmtMan} tick={{ fontSize: 12 }} />
        <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 13 }} />
        <Tooltip formatter={(v) => [fmt(v) + '명', '관람객']} />
        <Bar dataKey="value" radius={[0, 8, 8, 0]}>
          {sorted.map((d) => (
            <Cell key={d.name} fill={SITE_COLORS[SITES.indexOf(d.name)]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

const KIND_COLOR = { peak: '#ff8a00', low: '#0ea5e9', mid: '#9ec9d3' };

export function SeasonChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={grid} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
        <YAxis tickFormatter={fmtMan} width={56} tick={{ fontSize: 12 }} />
        <Tooltip formatter={(v) => [fmt(v) + '명', '월 평균']} />
        <Bar dataKey="avg" radius={[8, 8, 0, 0]}>
          {data.map((d) => (
            <Cell key={d.month} fill={KIND_COLOR[d.kind]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
