import { useMemo, useState } from 'react';
import { useAnalytics } from '../../data/AnalyticsContext';
import {
  classifyChannel,
  deviceBreakdown,
  groupByChannel,
  pctDelta,
  previousPeriod,
  regionBreakdown,
  summarize,
  timeSeries,
  topPages,
  utmBreakdown,
  type Channel,
  type Granularity,
} from '../../data/analytics';

type RangeKey = '1d' | '7d' | '30d' | '90d';

const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: '1d', label: '오늘' },
  { key: '7d', label: '7일' },
  { key: '30d', label: '30일' },
  { key: '90d', label: '90일' },
];

const GRAN_OPTIONS: { key: Granularity; label: string }[] = [
  { key: 'hour', label: '시간' },
  { key: 'day', label: '일' },
  { key: 'week', label: '주' },
  { key: 'month', label: '월' },
  { key: 'quarter', label: '분기' },
];

function rangeToSpan(key: RangeKey) {
  const now = new Date();
  const to = new Date(now);
  to.setHours(23, 59, 59, 999);
  if (key === '1d') {
    const from = new Date(now);
    from.setHours(0, 0, 0, 0);
    return { from, to };
  }
  const from = new Date(now);
  const days = key === '7d' ? 7 : key === '30d' ? 30 : 90;
  from.setDate(now.getDate() - days + 1);
  from.setHours(0, 0, 0, 0);
  return { from, to };
}

function inferGranularity(range: RangeKey): Granularity {
  if (range === '1d') return 'hour';
  if (range === '7d') return 'day';
  if (range === '30d') return 'day';
  return 'week';
}

function fmtNumber(n: number) {
  if (!Number.isFinite(n)) return '0';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 10_000) return (n / 1000).toFixed(1) + 'K';
  return n.toLocaleString();
}

function fmtTime(sec: number) {
  if (!Number.isFinite(sec)) return '0s';
  if (sec < 60) return `${sec}초`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m < 60) return `${m}분 ${s}초`;
  const h = Math.floor(m / 60);
  return `${h}시간 ${m % 60}분`;
}

function fmtPct(n: number, digits = 1) {
  return `${(n * 100).toFixed(digits)}%`;
}

export default function AdminAnalytics() {
  const { events, resetEvents } = useAnalytics();
  const [range, setRange] = useState<RangeKey>('30d');
  const granularity = useMemo(() => inferGranularity(range), [range]);

  const { from, to } = useMemo(() => rangeToSpan(range), [range]);

  const eventsInRange = useMemo(
    () =>
      events.filter((e) => {
        const t = +new Date(e.at);
        return t >= +from && t <= +to;
      }),
    [events, from, to]
  );

  const prevEvents = useMemo(() => previousPeriod(events, { from, to, granularity }), [
    events,
    from,
    to,
    granularity,
  ]);

  const summary = useMemo(() => summarize(eventsInRange), [eventsInRange]);
  const prevSummary = useMemo(() => summarize(prevEvents), [prevEvents]);

  const series = useMemo(() => timeSeries(eventsInRange, granularity), [
    eventsInRange,
    granularity,
  ]);
  const prevSeries = useMemo(() => timeSeries(prevEvents, granularity), [
    prevEvents,
    granularity,
  ]);

  const channels = useMemo(() => groupByChannel(eventsInRange), [eventsInRange]);
  const pages = useMemo(() => topPages(eventsInRange), [eventsInRange]);
  const devices = useMemo(() => deviceBreakdown(eventsInRange), [eventsInRange]);
  const regions = useMemo(() => regionBreakdown(eventsInRange), [eventsInRange]);
  const utms = useMemo(() => utmBreakdown(eventsInRange), [eventsInRange]);

  const totalChannelSessions = channels.reduce((s, c) => s + c.sessions, 0) || 1;
  const totalDevicePv = devices.reduce((s, d) => s + d.pv, 0) || 1;

  return (
    <div style={{ padding: '32px 36px' }}>
      <div className="row-between" style={{ marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)' }}>트래픽 분석</h1>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            유입 경로 · 디바이스 · 지역 · 검색 유입 성과를 정교하게 분석합니다.
          </p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <RangePicker
            value={range}
            onChange={setRange}
          />
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              if (window.confirm('시드 이벤트 데이터를 다시 생성합니다. 계속할까요?')) {
                resetEvents();
              }
            }}
            title="데모용 시드 이벤트 재생성"
          >
            ↻ 시드 재생성
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <KpiCard
          label="세션"
          value={fmtNumber(summary.sessions)}
          delta={pctDelta(summary.sessions, prevSummary.sessions)}
          accent="var(--color-primary)"
        />
        <KpiCard
          label="페이지뷰"
          value={fmtNumber(summary.pageviews)}
          delta={pctDelta(summary.pageviews, prevSummary.pageviews)}
          accent="var(--color-info)"
        />
        <KpiCard
          label="평균 체류시간"
          value={fmtTime(summary.avgDurationSec)}
          delta={pctDelta(summary.avgDurationSec, prevSummary.avgDurationSec)}
          accent="var(--color-success)"
        />
        <KpiCard
          label="전환율 (견적 step-2)"
          value={fmtPct(summary.conversionRate)}
          delta={pctDelta(summary.conversionRate, prevSummary.conversionRate)}
          accent="var(--color-accent)"
          big
        />
      </div>

      <SecondaryKpiBar
        bounceRate={summary.bounceRate}
        prevBounceRate={prevSummary.bounceRate}
        engagedRate={summary.engagedRate}
        prevEngagedRate={prevSummary.engagedRate}
        conversions={summary.conversionCount}
        prevConversions={prevSummary.conversionCount}
      />

      {/* Time series */}
      <div className="card card-tight" style={{ marginTop: 24 }}>
        <div className="row-between" style={{ marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
          <div>
            <h2 style={{ fontSize: 'var(--text-lg)' }}>시간대별 트래픽</h2>
            <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', marginTop: 4 }}>
              {labelKorean(granularity)} 단위로 집계 · 전 기간 데이터와 함께 비교합니다.
            </p>
          </div>
          <div className="row" style={{ gap: 6 }}>
            {GRAN_OPTIONS.map((g) => (
              <span
                key={g.key}
                className="badge"
                style={{
                  background:
                    g.key === granularity ? 'var(--color-primary-light)' : 'var(--color-bg-muted)',
                  color:
                    g.key === granularity ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                  fontWeight: 700,
                  padding: '6px 10px',
                }}
              >
                {g.label}
              </span>
            ))}
          </div>
        </div>
        <TimeSeriesChart
          series={series}
          compare={prevSeries}
          granularity={granularity}
        />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.2fr 1fr',
          gap: 16,
          marginTop: 24,
        }}
      >
        <div className="card card-tight">
          <h2 style={{ fontSize: 'var(--text-lg)', marginBottom: 16 }}>유입 채널별 성과</h2>
          <ChannelTable data={channels} totalSessions={totalChannelSessions} />
        </div>
        <div className="card card-tight">
          <h2 style={{ fontSize: 'var(--text-lg)', marginBottom: 16 }}>디바이스 비중</h2>
          <DeviceList data={devices} total={totalDevicePv} />
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.5fr 1fr',
          gap: 16,
          marginTop: 24,
        }}
      >
        <div className="card card-tight">
          <h2 style={{ fontSize: 'var(--text-lg)', marginBottom: 16 }}>인기 페이지</h2>
          <PageTable data={pages} />
        </div>
        <div className="card card-tight">
          <h2 style={{ fontSize: 'var(--text-lg)', marginBottom: 16 }}>상위 지역</h2>
          <RegionList data={regions.slice(0, 6)} />
        </div>
      </div>

      <div className="card card-tight" style={{ marginTop: 24 }}>
        <div className="row-between" style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 'var(--text-lg)' }}>UTM 캠페인 성과</h2>
          <span style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>
            utm_source / utm_medium / utm_campaign 기준 정렬
          </span>
        </div>
        <UtmTable data={utms.slice(0, 12)} />
      </div>

      <div
        style={{
          marginTop: 24,
          padding: 16,
          background: 'var(--color-primary-light)',
          borderRadius: 'var(--radius-md)',
          fontSize: 13,
          color: 'var(--color-primary)',
          lineHeight: 1.55,
        }}
      >
        <strong>💡 분석 팁</strong> · 전환율 (Step-2 도달)은 곧 견적 요청 직전 단계입니다.
        bounce rate가 70% 이상인 페이지는 메타태그/카피 개선 후보로 표시해보세요. 우측 상단
        “SEO 설정”에서 페이지별 메타를 다듬을 수 있습니다.
      </div>
    </div>
  );
}

function labelKorean(g: Granularity) {
  switch (g) {
    case 'hour':
      return '시간';
    case 'day':
      return '일';
    case 'week':
      return '주';
    case 'month':
      return '월';
    case 'quarter':
      return '분기';
  }
}

// ============================================================
//  Sub components
// ============================================================

function RangePicker({
  value,
  onChange,
}: {
  value: RangeKey;
  onChange: (v: RangeKey) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="기간 선택"
      style={{
        display: 'inline-flex',
        padding: 4,
        background: 'var(--color-bg-card)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-border)',
      }}
    >
      {RANGE_OPTIONS.map((r) => (
        <button
          key={r.key}
          onClick={() => onChange(r.key)}
          role="tab"
          aria-selected={value === r.key}
          style={{
            padding: '6px 12px',
            border: 'none',
            background: value === r.key ? 'var(--color-primary)' : 'transparent',
            color: value === r.key ? '#fff' : 'var(--color-text-secondary)',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background 160ms',
          }}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}

function Delta({ value }: { value: number }) {
  const positive = value >= 0;
  const color = positive ? 'var(--color-success)' : 'var(--color-danger)';
  const arrow = positive ? '▲' : '▼';
  return (
    <span
      style={{
        marginLeft: 8,
        padding: '2px 8px',
        background: positive ? 'rgba(31,138,85,.1)' : 'rgba(201,53,53,.1)',
        color,
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
      }}
    >
      {arrow} {Math.abs(value).toFixed(1)}%
    </span>
  );
}

function KpiCard({
  label,
  value,
  delta,
  accent,
  big,
}: {
  label: string;
  value: string;
  delta?: number;
  accent: string;
  big?: boolean;
}) {
  return (
    <div className="card card-tight" style={{ position: 'relative' }}>
      <div
        style={{
          fontSize: 13,
          color: 'var(--color-text-secondary)',
          fontWeight: 600,
          marginBottom: 12,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: big ? 'var(--text-xl)' : 'var(--text-2xl)',
          fontWeight: 800,
          color: accent,
          lineHeight: 1.1,
        }}
      >
        {value}
        {delta !== undefined && <Delta value={delta} />}
      </div>
    </div>
  );
}

function SecondaryKpiBar({
  bounceRate,
  prevBounceRate,
  engagedRate,
  prevEngagedRate,
  conversions,
  prevConversions,
}: {
  bounceRate: number;
  prevBounceRate: number;
  engagedRate: number;
  prevEngagedRate: number;
  conversions: number;
  prevConversions: number;
}) {
  // bounce rate 는 ↓가 좋음. 색 반대로 보여주기
  const bounceDelta = pctDelta(bounceRate, prevBounceRate);
  const bounceImproved = bounceDelta <= 0;
  const items = [
    {
      label: '이탈률 (Bounce)',
      value: fmtPct(bounceRate),
      delta: bounceDelta,
      tone: bounceImproved ? 'good-down' as const : 'good-up' as const,
      help: '단일 페이지만 보고 떠난 세션의 비율',
    },
    {
      label: '체감 참여율 (Engaged)',
      value: fmtPct(engagedRate),
      delta: pctDelta(engagedRate, prevEngagedRate),
      tone: 'good-up' as const,
      help: '5초 이상 머문 세션의 비율',
    },
    {
      label: '전환 수 (Step-2)',
      value: `${fmtNumber(conversions)}건`,
      delta: pctDelta(conversions, prevConversions),
      tone: 'good-up' as const,
      help: '직접 견적 2단계 도달 수',
    },
  ];
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 16,
      }}
    >
      {items.map((it) => {
        const improved = it.tone === 'good-up' ? it.delta >= 0 : it.delta <= 0;
        const color = improved ? 'var(--color-success)' : 'var(--color-danger)';
        return (
          <div
            key={it.label}
            className="card card-tight"
            style={{ background: 'var(--color-bg-card)' }}
          >
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontWeight: 600 }}>
              {it.label}
            </div>
            <div style={{ marginTop: 8 }}>
              <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text-primary)' }}>
                {it.value}
              </span>
              <span style={{ marginLeft: 8, color, fontSize: 12, fontWeight: 700 }}>
                {it.delta >= 0 ? '▲' : '▼'} {Math.abs(it.delta).toFixed(1)}%
              </span>
            </div>
            <div style={{ marginTop: 4, fontSize: 12, color: 'var(--color-text-tertiary)' }}>
              {it.help}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
//  Time series chart (SVG, 자체 구현 — 외부 차트 라이브러리 X)
// ============================================================

function TimeSeriesChart({
  series,
  compare,
  granularity,
}: {
  series: { key: string; label: string; pv: number; sessions: number; conv: number }[];
  compare: { pv: number }[];
  granularity: Granularity;
}) {
  const width = 720;
  const height = 240;
  const padLeft = 36;
  const padRight = 16;
  const padTop = 16;
  const padBottom = 32;
  const innerW = width - padLeft - padRight;
  const innerH = height - padTop - padBottom;

  const max = Math.max(1, ...series.map((s) => s.pv), ...compare.map((c) => c.pv));
  const stepX = series.length <= 1 ? innerW : innerW / (series.length - 1);

  const pts = series.map((s, i) => {
    const x = padLeft + stepX * i;
    const y = padTop + innerH - (s.pv / max) * innerH;
    return { x, y, p: s };
  });

  // 평균선
  const avg = series.length
    ? series.reduce((s, r) => s + r.pv, 0) / series.length
    : 0;
  const avgY = padTop + innerH - (avg / max) * innerH;

  const smoothPath = pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', minWidth: 560 }}>
        {/* grid */}
        {[0, 0.25, 0.5, 0.75, 1].map((r) => {
          const y = padTop + innerH * (1 - r);
          return (
            <g key={r}>
              <line
                x1={padLeft}
                x2={padLeft + innerW}
                y1={y}
                y2={y}
                stroke="var(--color-border)"
                strokeDasharray="2 4"
              />
              <text
                x={padLeft - 6}
                y={y + 4}
                textAnchor="end"
                fontSize="10"
                fill="var(--color-text-tertiary)"
              >
                {Math.round(max * r)}
              </text>
            </g>
          );
        })}
        {/* x labels */}
        {pts.map((p, i) => {
          // 너무 많으면 라벨 일부만 노출
          if (pts.length > 14 && i % Math.ceil(pts.length / 10) !== 0) return null;
          return (
            <text
              key={p.p.key}
              x={p.x}
              y={height - 10}
              textAnchor="middle"
              fontSize="10"
              fill="var(--color-text-tertiary)"
            >
              {p.p.label}
            </text>
          );
        })}
        {/* 비교 (이전 기간) */}
        {compare.length > 0 &&
          (() => {
            const maxCmp = Math.max(1, ...compare.map((c) => c.pv));
            const stepXc = compare.length <= 1 ? innerW : innerW / (compare.length - 1);
            const ptsCmp = compare.map((c, i) => {
              const x = padLeft + stepXc * i;
              const y = padTop + innerH - (c.pv / maxCmp) * innerH;
              return { x, y };
            });
            const d = ptsCmp
              .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
              .join(' ');
            return (
              <path
                d={d}
                fill="none"
                stroke="var(--color-border-strong)"
                strokeWidth="1.5"
                strokeDasharray="4 3"
                opacity={0.75}
              />
            );
          })()}
        {/* 평균선 */}
        <line
          x1={padLeft}
          x2={padLeft + innerW}
          y1={avgY}
          y2={avgY}
          stroke="var(--color-accent)"
          strokeDasharray="2 4"
          opacity={0.6}
        />
        {/* gradient */}
        <defs>
          <linearGradient id="anaFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d={
            pts.length > 0
              ? `${smoothPath} L ${pts[pts.length - 1].x} ${padTop + innerH} L ${pts[0].x} ${padTop + innerH} Z`
              : ''
          }
          fill="url(#anaFill)"
        />
        <path d={smoothPath} fill="none" stroke="var(--color-primary)" strokeWidth="2.5" />
        {pts.map((p, i) => (
          <g key={`pt-${i}`}>
            <circle cx={p.x} cy={p.y} r={3} fill="var(--color-primary)" />
            <title>{`${p.p.label} · ${p.p.pv} PV / ${p.p.sessions} 세션 · 전환 ${p.p.conv}건`}</title>
          </g>
        ))}
        <text
          x={width - padRight - 4}
          y={avgY - 6}
          textAnchor="end"
          fontSize="10"
          fill="var(--color-accent)"
          fontWeight={700}
        >
          평균 {Math.round(avg)} ({granularity})
        </text>
      </svg>
    </div>
  );
}

// ============================================================
//  Channel table + bar
// ============================================================

const CHANNEL_COLOR: Record<Channel, string> = {
  'Organic Search': '#0b3d91',
  'Paid Search': '#c93535',
  Social: '#9b51e0',
  Referral: '#1f8a55',
  Email: '#e08a1f',
  Display: '#1f6faa',
  Direct: '#5c6470',
};

function ChannelTable({
  data,
  totalSessions,
}: {
  data: ReturnType<typeof groupByChannel>;
  totalSessions: number;
}) {
  const total = data.reduce((s, c) => s + c.sessions, 0);
  if (total === 0) {
    return (
      <div style={{ padding: 24, color: 'var(--color-text-tertiary)', textAlign: 'center' }}>
        데이터 없음
      </div>
    );
  }
  return (
    <div>
      {data.map((c) => {
        const share = totalSessions === 0 ? 0 : c.sessions / totalSessions;
        return (
          <div key={c.channel} style={{ marginBottom: 14 }}>
            <div className="row-between" style={{ fontSize: 13, marginBottom: 6 }}>
              <div className="row" style={{ gap: 8 }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 2,
                    background: CHANNEL_COLOR[c.channel],
                    display: 'inline-block',
                  }}
                />
                <strong>{c.channel}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-secondary)' }}>
                  {fmtNumber(c.sessions)} 세션
                </span>
                <span style={{ marginLeft: 12, fontWeight: 700 }}>
                  {(share * 100).toFixed(1)}%
                </span>
              </div>
            </div>
            <div
              style={{
                height: 6,
                background: 'var(--color-bg-muted)',
                borderRadius: 999,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${Math.max(2, share * 100)}%`,
                  height: '100%',
                  background: CHANNEL_COLOR[c.channel],
                  borderRadius: 999,
                  transition: 'width 320ms',
                }}
              />
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 4 }}>
              페이지뷰 {fmtNumber(c.pageviews)} · 전환 {c.conversions}건
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
//  Devices
// ============================================================

const DEVICE_GLYPH: Record<string, string> = {
  desktop: '🖥️',
  mobile: '📱',
  tablet: '💻',
};

const DEVICE_LABEL: Record<string, string> = {
  desktop: '데스크탑',
  mobile: '모바일',
  tablet: '태블릿',
};

function DeviceList({
  data,
  total,
}: {
  data: ReturnType<typeof deviceBreakdown>;
  total: number;
}) {
  if (total === 0) {
    return (
      <div style={{ padding: 24, color: 'var(--color-text-tertiary)', textAlign: 'center' }}>
        데이터 없음
      </div>
    );
  }
  const max = Math.max(...data.map((d) => d.pv)) || 1;
  return (
    <div className="stack" style={{ gap: 14 }}>
      {data.map((d) => {
        const share = d.pv / total;
        return (
          <div key={d.device}>
            <div className="row-between" style={{ marginBottom: 6 }}>
              <span style={{ fontWeight: 600 }}>
                <span style={{ marginRight: 8 }}>{DEVICE_GLYPH[d.device]}</span>
                {DEVICE_LABEL[d.device]}
              </span>
              <strong>{(share * 100).toFixed(1)}%</strong>
            </div>
            <div
              style={{
                height: 10,
                background: 'var(--color-bg-muted)',
                borderRadius: 999,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${(d.pv / max) * 100}%`,
                  height: '100%',
                  background:
                    d.device === 'mobile'
                      ? 'var(--color-primary)'
                      : d.device === 'desktop'
                      ? 'var(--color-info)'
                      : 'var(--color-accent)',
                  borderRadius: 999,
                }}
              />
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 4 }}>
              {fmtNumber(d.sessions)} 세션 · {fmtNumber(d.pv)} 페이지뷰
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
//  Pages
// ============================================================

function PageTable({
  data,
}: {
  data: ReturnType<typeof topPages>;
}) {
  if (data.length === 0) {
    return (
      <div style={{ padding: 24, color: 'var(--color-text-tertiary)', textAlign: 'center' }}>
        데이터 없음
      </div>
    );
  }
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>경로</th>
            <th>페이지뷰</th>
            <th>평균 체류</th>
            <th>이탈률</th>
          </tr>
        </thead>
        <tbody>
          {data.slice(0, 10).map((p) => (
            <tr key={p.path}>
              <td>
                <code
                  style={{
                    background: 'var(--color-bg-muted)',
                    padding: '2px 8px',
                    borderRadius: 4,
                    fontSize: 12,
                  }}
                >
                  {p.path}
                </code>
              </td>
              <td>
                <strong>{fmtNumber(p.pv)}</strong>
              </td>
              <td>{fmtTime(p.avgDurationSec)}</td>
              <td>{fmtPct(p.bounceRate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================
//  Regions
// ============================================================

function RegionList({
  data,
}: {
  data: ReturnType<typeof regionBreakdown>;
}) {
  if (data.length === 0) {
    return (
      <div style={{ padding: 24, color: 'var(--color-text-tertiary)', textAlign: 'center' }}>
        데이터 없음
      </div>
    );
  }
  const max = Math.max(...data.map((d) => d.sessions)) || 1;
  return (
    <div className="stack" style={{ gap: 10 }}>
      {data.map((r) => {
        const flag = r.country === 'KR' ? '🇰🇷' : r.country === 'JP' ? '🇯🇵' : r.country === 'US' ? '🇺🇸' : '🌐';
        return (
          <div key={`${r.country}-${r.region}-${r.city}`}>
            <div className="row-between" style={{ marginBottom: 4 }}>
              <span style={{ fontWeight: 600 }}>
                <span style={{ marginRight: 8 }}>{flag}</span>
                {r.city} <span style={{ color: 'var(--color-text-tertiary)' }}>· {r.region}</span>
              </span>
              <strong>{fmtNumber(r.sessions)}</strong>
            </div>
            <div
              style={{
                height: 6,
                background: 'var(--color-bg-muted)',
                borderRadius: 999,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${(r.sessions / max) * 100}%`,
                  height: '100%',
                  background: 'var(--color-primary)',
                  borderRadius: 999,
                }}
              />
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
              {fmtNumber(r.pv)} PV · {r.country}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
//  UTM Table
// ============================================================

function UtmTable({
  data,
}: {
  data: ReturnType<typeof utmBreakdown>;
}) {
  if (data.length === 0) {
    return (
      <div style={{ padding: 24, color: 'var(--color-text-tertiary)', textAlign: 'center' }}>
        UTM 태그가 부착된 방문이 아직 없습니다. 광고/이메일 캠페인에 UTM 을 붙여보세요.
      </div>
    );
  }
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>utm_source</th>
            <th>utm_medium</th>
            <th>utm_campaign</th>
            <th>세션</th>
            <th>페이지뷰</th>
            <th>전환</th>
          </tr>
        </thead>
        <tbody>
          {data.map((u, i) => (
            <tr key={i}>
              <td>
                <strong>{u.source}</strong>
              </td>
              <td>{u.medium}</td>
              <td>{u.campaign}</td>
              <td>{fmtNumber(u.sessions)}</td>
              <td>{fmtNumber(u.pv)}</td>
              <td>{u.conversions}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// silence unused-export warning for classifyChannel (kept for future use)
void classifyChannel;
