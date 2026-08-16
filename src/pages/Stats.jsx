import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient.js';
import { topicLabel, outcomeLabel } from '../lib/labels.js';

const PRICE_IN = Number(import.meta.env.VITE_PRICE_IN) || 1.0;
const PRICE_OUT = Number(import.meta.env.VITE_PRICE_OUT) || 5.0;

// Single-hue magnitude color — these charts label each category directly on
// the axis, so color doesn't need to carry identity (no legend required).
const BAR_COLOR = '#2a78d6';
const GOOD_COLOR = '#0ca30c';
const CRITICAL_COLOR = '#d03b3b';
const GRID_COLOR = '#e1e0d9';
const AXIS_COLOR = '#c3c2b7';
const MUTED_TEXT = '#898781';

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

function defaultRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  return { start: isoDate(start), end: isoDate(end) };
}

// PostgREST caps rows per request (commonly 1000); loop with .range() so stats
// stay correct once a date range holds more rows than one page.
async function fetchAll(table, columns, startIso, endIso) {
  const pageSize = 1000;
  let offset = 0;
  let all = [];
  for (;;) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .gte('created_at', startIso)
      .lte('created_at', endIso)
      .range(offset, offset + pageSize - 1);
    if (error) throw error;
    all = all.concat(data || []);
    if (!data || data.length < pageSize) break;
    offset += pageSize;
  }
  return all;
}

function StatTile({ label, value, accent }) {
  return (
    <div className="stat-tile">
      {accent && <span className="stat-tile-dot" style={{ background: accent }} aria-hidden="true" />}
      <div className="stat-tile-value">{value}</div>
      <div className="stat-tile-label">{label}</div>
    </div>
  );
}

// Simple line chart, single series. Hover shows an exact-value tooltip since
// the axis alone can't carry precise daily counts for many points.
function LineChart({ points }) {
  const [hover, setHover] = useState(null);
  const width = 640;
  const height = 200;
  const padding = { top: 10, right: 16, bottom: 24, left: 36 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  if (points.length === 0) {
    return <p className="chart-empty">No data in this range.</p>;
  }

  const maxCount = Math.max(1, ...points.map((p) => p.count));
  const x = (i) => padding.left + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const y = (v) => padding.top + innerH - (v / maxCount) * innerH;

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(p.count)}`).join(' ');
  const gridLines = [0, 0.5, 1];

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Daily conversation volume">
        {gridLines.map((f) => (
          <line
            key={f}
            x1={padding.left}
            x2={width - padding.right}
            y1={padding.top + innerH * (1 - f)}
            y2={padding.top + innerH * (1 - f)}
            stroke={GRID_COLOR}
            strokeWidth="1"
          />
        ))}
        <line
          x1={padding.left}
          x2={width - padding.right}
          y1={padding.top + innerH}
          y2={padding.top + innerH}
          stroke={AXIS_COLOR}
          strokeWidth="1"
        />
        <path d={linePath} fill="none" stroke={BAR_COLOR} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <g key={p.date}>
            <circle cx={x(i)} cy={y(p.count)} r={hover === i ? 5 : 3} fill={BAR_COLOR} />
            {/* Larger invisible hit target so the tooltip is easy to trigger. */}
            <circle
              cx={x(i)}
              cy={y(p.count)}
              r={8}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover((h) => (h === i ? null : h))}
            />
          </g>
        ))}
        {points.length <= 14 &&
          points.map((p, i) => (
            <text key={p.date} x={x(i)} y={height - 6} fontSize="10" fill={MUTED_TEXT} textAnchor="middle">
              {p.date.slice(5)}
            </text>
          ))}
      </svg>
      {hover !== null && (
        <div className="chart-tooltip">
          <strong>{points[hover].date}</strong>: {points[hover].count} exchange{points[hover].count === 1 ? '' : 's'}
        </div>
      )}
    </div>
  );
}

// Horizontal bar chart. Categories are direct-labeled on the axis, so a single
// hue is used rather than one categorical color per bar.
function HBarChart({ data, color = BAR_COLOR }) {
  if (data.length === 0) {
    return <p className="chart-empty">No data in this range.</p>;
  }
  const maxCount = Math.max(1, ...data.map((d) => d.count));
  const rowHeight = 26;
  const barMax = 260;
  const labelWidth = 180;
  const height = data.length * rowHeight;

  return (
    <svg width="100%" viewBox={`0 0 ${labelWidth + barMax + 50} ${height}`} role="img" aria-label="Breakdown chart">
      {data.map((d, i) => {
        const barWidth = (d.count / maxCount) * barMax;
        const yMid = i * rowHeight + rowHeight / 2;
        return (
          <g key={d.key}>
            <text x={labelWidth - 8} y={yMid + 4} fontSize="12" textAnchor="end" fill="#0b0b0b">
              {d.label}
            </text>
            <rect x={labelWidth} y={yMid - 7} width={Math.max(barWidth, 2)} height={14} rx={4} fill={color} />
            <text x={labelWidth + barWidth + 6} y={yMid + 4} fontSize="12" fill={MUTED_TEXT}>
              {d.count}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function Stats() {
  const [{ start, end }, setRange] = useState(defaultRange());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const startIso = `${start}T00:00:00.000Z`;
        const endIso = `${end}T23:59:59.999Z`;

        const [logs, events] = await Promise.all([
          fetchAll('chat_logs', 'convo,topic,outcome,tokens_in,tokens_out,member,created_at', startIso, endIso),
          fetchAll('chat_events', 'event_type,ghl_ok,created_at', startIso, endIso),
        ]);
        if (cancelled) return;

        const convoSet = new Set();
        const byDate = new Map();
        const byTopic = new Map();
        const byOutcome = new Map();
        let tokensIn = 0;
        let tokensOut = 0;

        for (const row of logs) {
          convoSet.add(row.convo);
          const day = (row.created_at || '').slice(0, 10);
          byDate.set(day, (byDate.get(day) || 0) + 1);
          const topicKey = row.topic || 'other';
          byTopic.set(topicKey, (byTopic.get(topicKey) || 0) + 1);
          const outcomeKey = row.outcome || 'answered';
          byOutcome.set(outcomeKey, (byOutcome.get(outcomeKey) || 0) + 1);
          tokensIn += row.tokens_in || 0;
          tokensOut += row.tokens_out || 0;
        }

        let leads = 0;
        let handovers = 0;
        let ghlOk = 0;
        let ghlFail = 0;
        for (const ev of events) {
          if (ev.event_type === 'lead') leads += 1;
          if (ev.event_type === 'handover') handovers += 1;
          if (ev.ghl_ok) ghlOk += 1;
          else ghlFail += 1;
        }

        const dailyVolume = [];
        for (const [date, count] of byDate.entries()) dailyVolume.push({ date, count });
        dailyVolume.sort((a, b) => (a.date < b.date ? -1 : 1));

        const topicBreakdown = [...byTopic.entries()]
          .map(([key, count]) => ({ key, label: topicLabel(key), count }))
          .sort((a, b) => b.count - a.count);

        const outcomeBreakdown = [...byOutcome.entries()]
          .map(([key, count]) => ({ key, label: outcomeLabel(key), count }))
          .sort((a, b) => b.count - a.count);

        const cost = (tokensIn / 1_000_000) * PRICE_IN + (tokensOut / 1_000_000) * PRICE_OUT;

        setSummary({
          totalExchanges: logs.length,
          totalConversations: convoSet.size,
          dailyVolume,
          topicBreakdown,
          outcomeBreakdown,
          leads,
          handovers,
          ghlOk,
          ghlFail,
          cost,
        });
      } catch (e) {
        if (!cancelled) setError(e.message || String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [start, end]);

  return (
    <div>
      <h1>Stats</h1>

      <div className="filters">
        <label>
          From{' '}
          <input type="date" value={start} max={end} onChange={(e) => setRange((r) => ({ ...r, start: e.target.value }))} />
        </label>
        <label>
          To{' '}
          <input type="date" value={end} min={start} onChange={(e) => setRange((r) => ({ ...r, end: e.target.value }))} />
        </label>
      </div>

      {error && <p className="error-text">{error}</p>}
      {loading && <p>Loading…</p>}

      {!loading && !error && summary && (
        <>
          <div className="stat-grid">
            <StatTile label="Total exchanges" value={summary.totalExchanges} />
            <StatTile label="Conversations" value={summary.totalConversations} />
            <StatTile label="Leads offered" value={summary.leads} accent={BAR_COLOR} />
            <StatTile label="Handovers" value={summary.handovers} accent={BAR_COLOR} />
            <StatTile label="GHL pushes OK" value={summary.ghlOk} accent={GOOD_COLOR} />
            <StatTile label="GHL pushes failed" value={summary.ghlFail} accent={summary.ghlFail > 0 ? CRITICAL_COLOR : undefined} />
            <StatTile label="Estimated cost" value={`$${summary.cost.toFixed(2)}`} />
          </div>

          <section className="chart-section">
            <h2>Daily volume</h2>
            <LineChart points={summary.dailyVolume} />
          </section>

          <section className="chart-section">
            <h2>Topic breakdown</h2>
            <HBarChart data={summary.topicBreakdown} />
          </section>

          <section className="chart-section">
            <h2>Outcome breakdown</h2>
            <HBarChart data={summary.outcomeBreakdown} />
          </section>

          <p className="cost-note">
            Cost estimate uses ${PRICE_IN.toFixed(2)}/million input tokens and ${PRICE_OUT.toFixed(2)}/million output
            tokens (set VITE_PRICE_IN / VITE_PRICE_OUT to your actual model pricing).
          </p>
        </>
      )}
    </div>
  );
}
