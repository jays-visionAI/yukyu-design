import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../../data/DataContext';
import { formatKRW, relativeTime } from '../../lib/format';
import StatusBadge from '../../components/StatusBadge';
import { StarStatic } from '../../components/StarRating';
import type { QuoteStatus } from '../../data/types';
import {
  CONSULTATION_STATUS_LABEL,
  BUDGET_LABEL,
  MOVE_IN_LABEL,
  type ConsultationStatus,
} from '../../data/consultation';

export default function AdminDashboard() {
  const { quotes, portfolio, consultations } = useData();

  const stats = useMemo(() => {
    const total = quotes.length;
    const received = quotes.filter((q) => q.status === 'received').length;
    const inProgress = quotes.filter((q) => q.status === 'in_progress').length;
    const completed = quotes.filter((q) => q.status === 'completed').length;
    const revenue = quotes
      .filter((q) => q.status === 'completed')
      .reduce((sum, q) => sum + (q.contractAmount ?? 0), 0);
    const avgRating = (() => {
      const rated = quotes.filter((q) => q.review);
      if (rated.length === 0) return 0;
      return (
        rated.reduce((s, q) => s + (q.review?.rating ?? 0), 0) / rated.length
      );
    })();
    return { total, received, inProgress, completed, revenue, avgRating };
  }, [quotes]);

  // 7일간 접수 수 (오늘 기준 -6 ~ 오늘)
  const daily = useMemo(() => {
    const days: { label: string; count: number; date: Date }[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const next = new Date(d);
      next.setDate(d.getDate() + 1);
      const count = quotes.filter((q) => {
        const t = new Date(q.createdAt).getTime();
        return t >= d.getTime() && t < next.getTime();
      }).length;
      days.push({
        label: `${d.getMonth() + 1}/${d.getDate()}`,
        count,
        date: d,
      });
    }
    return days;
  }, [quotes]);

  const statusBreakdown = useMemo(() => {
    const counts: Record<QuoteStatus, number> = {
      received: 0,
      in_progress: 0,
      on_hold: 0,
      completed: 0,
      cancelled: 0,
    };
    quotes.forEach((q) => {
      counts[q.status]++;
    });
    return counts;
  }, [quotes]);

  const recent = [...quotes]
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, 6);

  const maxDaily = Math.max(1, ...daily.map((d) => d.count));

  // ============================================================
  //  상담(Consultations) 집계 — AdminConsultations 와 동일한 도메인
  // ============================================================

  const consultStats = useMemo(() => {
    const total = consultations.length;
    const received = consultations.filter((c) => c.status === 'received').length;
    const contacted = consultations.filter((c) => c.status === 'contacted').length;
    const consulting = consultations.filter((c) => c.status === 'consulting').length;
    const proposal = consultations.filter((c) => c.status === 'proposal').length;
    const contracted = consultations.filter((c) => c.status === 'contracted').length;
    const onHold = consultations.filter((c) => c.status === 'on_hold').length;
    const cancelled = consultations.filter((c) => c.status === 'cancelled').length;
    const completed = consultations.filter((c) => c.status === 'completed').length;

    // 미배정: received 상태 + 담당자 미지정
    const unassigned = consultations.filter(
      (c) => c.status === 'received' && !c.assignedAdmin
    );
    // 24시간 이상 미연락 (received 상태에서 24시간 경과)
    const stale = consultations.filter((c) => {
      if (c.status !== 'received') return false;
      const hoursAgo =
        (Date.now() - new Date(c.createdAt).getTime()) / (1000 * 60 * 60);
      return hoursAgo > 24;
    });
    // 오늘 신규 (KST 기준 자정 ~)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const newToday = consultations.filter(
      (c) => new Date(c.createdAt).getTime() >= todayStart.getTime()
    ).length;
    return {
      total,
      received,
      contacted,
      consulting,
      proposal,
      contracted,
      onHold,
      cancelled,
      completed,
      unassigned,
      stale,
      newToday,
    };
  }, [consultations]);

  const consultPipeline = useMemo<
    { status: ConsultationStatus; label: string; count: number }[]
  >(() => {
    const order: { status: ConsultationStatus; label: string }[] = [
      { status: 'received', label: '신규' },
      { status: 'contacted', label: '연락완료' },
      { status: 'consulting', label: '상담중' },
      { status: 'proposal', label: '제안서' },
      { status: 'contracted', label: '계약' },
      { status: 'completed', label: '완료' },
    ];
    return order.map((o) => ({
      ...o,
      count: consultations.filter((c) => c.status === o.status).length,
    }));
  }, [consultations]);

  const consultRecent = useMemo(
    () =>
      [...consultations]
        .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
        .slice(0, 5),
    [consultations]
  );

  const attentionList = useMemo(() => {
    const items: { id: string; name: string; phone: string; reason: string; hoursAgo: number }[] = [];
    consultStats.unassigned.forEach((c) => {
      const hoursAgo = Math.round(
        (Date.now() - new Date(c.createdAt).getTime()) / (1000 * 60 * 60)
      );
      items.push({
        id: c.id,
        name: c.name,
        phone: c.phone,
        reason: hoursAgo >= 24 ? `미배정 · ${hoursAgo}시간 경과` : '미배정',
        hoursAgo,
      });
    });
    consultStats.stale.forEach((c) => {
      if (items.find((i) => i.id === c.id)) return;
      const hoursAgo = Math.round(
        (Date.now() - new Date(c.createdAt).getTime()) / (1000 * 60 * 60)
      );
      items.push({
        id: c.id,
        name: c.name,
        phone: c.phone,
        reason: `${hoursAgo}시간 경과 · 연락 필요`,
        hoursAgo,
      });
    });
    return items
      .sort((a, b) => b.hoursAgo - a.hoursAgo)
      .slice(0, 5);
  }, [consultStats.stale, consultStats.unassigned]);

  return (
    <div style={{ padding: '32px 36px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 'var(--text-2xl)' }}>대시보드</h1>
        <p style={{ color: 'var(--color-text-secondary)' }}>
          오늘의 현황을 한눈에 확인합니다.
        </p>
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
          label="신규 접수"
          value={stats.received}
          sub="대기중"
          accent="var(--color-primary)"
        />
        <KpiCard
          label="진행중"
          value={stats.inProgress}
          sub="공사중"
          accent="var(--color-warning)"
        />
        <KpiCard
          label="누적 완료"
          value={stats.completed}
          sub="총 시공"
          accent="var(--color-success)"
        />
        <KpiCard
          label="매출 합계"
          value={formatKRW(stats.revenue)}
          sub="완료 기준"
          accent="var(--color-accent)"
          big
        />
      </div>

      {/* ============ 상담 파이프라인 (신규) ============ */}
      <div
        className="card card-tight"
        style={{ marginBottom: 24 }}
      >
        <div
          className="row-between"
          style={{ marginBottom: 16, flexWrap: 'wrap', gap: 12 }}
        >
          <div>
            <h2 style={{ fontSize: 'var(--text-lg)' }}>상담 파이프라인</h2>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>
              신규 접수부터 완료까지 단계별 현황. 미배정 / 24시간 경과 건은 별도 알림으로 표시됩니다.
            </p>
          </div>
          <div className="row" style={{ gap: 16, flexWrap: 'wrap' }}>
            <Mini label="오늘 신규" value={consultStats.newToday} />
            <Mini label="미배정" value={consultStats.unassigned.length} highlight={consultStats.unassigned.length > 0} />
            <Mini
              label="24h 경과"
              value={consultStats.stale.length}
              highlight={consultStats.stale.length > 0}
            />
            <Link to="/admin/consultations" className="btn btn-outline btn-sm">
              상담 관리 →
            </Link>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
            gap: 10,
          }}
        >
          {consultPipeline.map((p) => {
            const pct =
              consultStats.total === 0
                ? 0
                : Math.round((p.count / consultStats.total) * 100);
            return (
              <div
                key={p.status}
                style={{
                  padding: 16,
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  background:
                    p.status === 'received' && p.count > 0
                      ? 'var(--ink-50)'
                      : '#fff',
                  borderColor:
                    p.status === 'received' && p.count > 0
                      ? 'var(--ink-900)'
                      : 'var(--color-border)',
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--color-text-tertiary)',
                    marginBottom: 6,
                  }}
                >
                  {p.label}
                </div>
                <div
                  style={{
                    fontSize: 26,
                    fontWeight: 800,
                    color: 'var(--color-text-primary)',
                    lineHeight: 1.1,
                  }}
                >
                  {p.count}
                </div>
                <div
                  style={{
                    marginTop: 6,
                    fontSize: 11,
                    color: 'var(--color-text-tertiary)',
                  }}
                >
                  {pct}% · {consultStats.total}건 중
                </div>
              </div>
            );
          })}
        </div>

        {attentionList.length > 0 && (
          <div
            style={{
              marginTop: 16,
              padding: 14,
              background: '#fef2f2',
              borderLeft: '3px solid #fca5a5',
              borderRadius: 4,
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--color-text-primary)',
                marginBottom: 8,
              }}
            >
              ⚠ 즉시 확인 필요 ({attentionList.length}건)
            </div>
            <div className="stack" style={{ gap: 8 }}>
              {attentionList.map((i) => (
                <Link
                  key={i.id}
                  to={`/admin/consultations/${i.id}`}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    background: '#fff',
                    borderRadius: 6,
                    textDecoration: 'none',
                    color: 'var(--color-text-primary)',
                    fontSize: 13,
                  }}
                >
                  <span>
                    <strong>{i.name}</strong>
                    <span
                      style={{
                        marginLeft: 8,
                        color: 'var(--color-text-tertiary)',
                        fontFamily: 'var(--font-family-num)',
                      }}
                    >
                      {i.phone}
                    </span>
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#b91c1c',
                    }}
                  >
                    {i.reason}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ============ 최근 상담 카드 ============ */}
      {consultRecent.length > 0 && (
        <div
          className="card card-tight"
          style={{ marginBottom: 24 }}
        >
          <div className="row-between" style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: 'var(--text-lg)' }}>최근 상담</h2>
            <Link to="/admin/consultations" className="btn btn-ghost btn-sm">
              전체 보기 →
            </Link>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 12,
            }}
          >
            {consultRecent.map((c) => (
              <Link
                key={c.id}
                to={`/admin/consultations/${c.id}`}
                style={{
                  display: 'block',
                  padding: 16,
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  textDecoration: 'none',
                  color: 'var(--color-text-primary)',
                  background:
                    c.status === 'received' && !c.assignedAdmin
                      ? 'var(--ink-50)'
                      : '#fff',
                }}
              >
                <div
                  className="row-between"
                  style={{ marginBottom: 8 }}
                >
                  <strong style={{ fontSize: 15 }}>{c.name}</strong>
                  <span
                    className="consult-status-pill"
                    data-status={c.status}
                  >
                    {CONSULTATION_STATUS_LABEL[c.status]}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--color-text-tertiary)',
                    marginBottom: 8,
                  }}
                >
                  {c.apartment}
                </div>
                <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                  {c.moveIn ? MOVE_IN_LABEL[c.moveIn] : '일정 미정'} ·{' '}
                  {c.budget ? BUDGET_LABEL[c.budget] : '예산 미정'}
                </div>
                <div
                  style={{
                    marginTop: 10,
                    fontSize: 11,
                    color: 'var(--color-text-tertiary)',
                  }}
                >
                  {relativeTime(c.createdAt)}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr',
          gap: 16,
          marginBottom: 24,
        }}
      >
        {/* Chart */}
        <div className="card card-tight">
          <div className="row-between" style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: 'var(--text-lg)' }}>최근 7일 접수</h2>
            <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
              총 {daily.reduce((s, d) => s + d.count, 0)}건
            </span>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: 12,
              alignItems: 'end',
              height: 220,
              padding: '8px 0',
            }}
          >
            {daily.map((d) => {
              const h = (d.count / maxDaily) * 180;
              return (
                <div
                  key={d.label}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      color: 'var(--color-text-secondary)',
                      fontWeight: 600,
                    }}
                  >
                    {d.count}
                  </span>
                  <div
                    style={{
                      width: '70%',
                      background:
                        'linear-gradient(180deg, var(--color-primary), var(--color-accent))',
                      height: Math.max(8, h),
                      borderRadius: '8px 8px 0 0',
                      transition: 'height 320ms',
                    }}
                  />
                  <span
                    style={{
                      fontSize: 11,
                      color: 'var(--color-text-tertiary)',
                    }}
                  >
                    {d.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Status donut */}
        <div className="card card-tight">
          <h2 style={{ fontSize: 'var(--text-lg)', marginBottom: 16 }}>
            상태별 비율
          </h2>
          <Donut data={statusBreakdown} />
          <div style={{ marginTop: 16 }}>
            <LegendItem color="var(--color-today-fg)" label="접수됨" count={statusBreakdown.received} />
            <LegendItem color="var(--color-waiting-fg)" label="진행중" count={statusBreakdown.in_progress} />
            <LegendItem color="var(--color-done-fg)" label="완료" count={statusBreakdown.completed} />
            <LegendItem color="var(--color-hot-fg)" label="보류/취소" count={statusBreakdown.on_hold + statusBreakdown.cancelled} />
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.5fr 1fr',
          gap: 16,
        }}
      >
        <div className="card card-tight">
          <div className="row-between" style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: 'var(--text-lg)' }}>최근 접수</h2>
            <Link to="/admin/quotes" className="btn btn-ghost btn-sm">
              전체 보기 →
            </Link>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>고객명</th>
                  <th>시공</th>
                  <th>상태</th>
                  <th>접수</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((q) => (
                  <tr key={q.id}>
                    <td>
                      <Link
                        to={`/admin/quotes/${q.id}`}
                        style={{ fontWeight: 600 }}
                      >
                        {q.customerName}
                      </Link>
                      <div
                        style={{
                          fontSize: 12,
                          color: 'var(--color-text-tertiary)',
                        }}
                      >
                        {q.phone}
                      </div>
                    </td>
                    <td>
                      <div>{q.spaceTypes.join(' · ')}</div>
                      <div
                        style={{
                          fontSize: 12,
                          color: 'var(--color-text-tertiary)',
                        }}
                      >
                        {q.areaSize}평 · {q.budget}
                      </div>
                    </td>
                    <td>
                      <StatusBadge status={q.status} />
                    </td>
                    <td
                      style={{
                        fontSize: 12,
                        color: 'var(--color-text-secondary)',
                      }}
                    >
                      {relativeTime(q.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card card-tight">
          <h2 style={{ fontSize: 'var(--text-lg)', marginBottom: 16 }}>
            만족도
          </h2>
          <div
            style={{
              textAlign: 'center',
              padding: '24px 0',
              borderBottom: '1px solid var(--color-border)',
              marginBottom: 16,
            }}
          >
            <div
              style={{
                fontSize: 56,
                fontWeight: 800,
                color: 'var(--color-warning)',
                lineHeight: 1,
              }}
            >
              {stats.avgRating.toFixed(1)}
            </div>
            <div style={{ marginTop: 8 }}>
              <StarStatic value={Math.round(stats.avgRating)} size={20} />
            </div>
            <div
              style={{
                fontSize: 13,
                color: 'var(--color-text-tertiary)',
                marginTop: 8,
              }}
            >
              최근 평가 평균 ({quotes.filter((q) => q.review).length}건)
            </div>
          </div>

          <h3
            style={{
              fontSize: 'var(--text-sm)',
              color: 'var(--color-text-secondary)',
              marginBottom: 12,
            }}
          >
            최근 평가
          </h3>
          <div className="stack" style={{ gap: 12 }}>
            {quotes
              .filter((q) => q.review)
              .slice(0, 3)
              .map((q) => (
                <div
                  key={q.id}
                  style={{
                    padding: 12,
                    background: 'var(--color-bg-muted)',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <div
                    className="row-between"
                    style={{ marginBottom: 6 }}
                  >
                    <strong style={{ fontSize: 14 }}>{q.customerName}</strong>
                    <StarStatic value={q.review!.rating} size={14} />
                  </div>
                  <p
                    style={{
                      fontSize: 13,
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    "{q.review!.comment ?? '코멘트 없음'}"
                  </p>
                </div>
              ))}
            {quotes.filter((q) => q.review).length === 0 && (
              <div
                style={{
                  color: 'var(--color-text-tertiary)',
                  textAlign: 'center',
                  padding: 20,
                }}
              >
                아직 평가가 없습니다.
              </div>
            )}
          </div>

          <div
            style={{
              marginTop: 16,
              padding: 12,
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-primary-light)',
              fontSize: 13,
              color: 'var(--color-primary)',
            }}
          >
            등록된 포트폴리오 <strong>{portfolio.length}</strong>건 ·
            공개 <strong>{portfolio.filter((p) => p.published).length}</strong>건
          </div>
        </div>
      </div>
    </div>
  );
}

function Mini({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <div
      style={{
        padding: '6px 12px',
        borderRadius: 8,
        background: highlight ? '#fef2f2' : 'var(--ink-100)',
        border: highlight ? '1px solid #fca5a5' : '1px solid transparent',
        textAlign: 'center',
        minWidth: 78,
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: highlight ? '#b91c1c' : 'var(--color-text-tertiary)',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 18,
          fontWeight: 800,
          color: highlight ? '#b91c1c' : 'var(--color-text-primary)',
          lineHeight: 1.2,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  accent,
  big,
}: {
  label: string;
  value: string | number;
  sub: string;
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
      </div>
      <div
        style={{
          marginTop: 6,
          fontSize: 12,
          color: 'var(--color-text-tertiary)',
        }}
      >
        {sub}
      </div>
    </div>
  );
}

function Donut({
  data,
}: {
  data: Record<QuoteStatus, number>;
}) {
  const total = Object.values(data).reduce((s, v) => s + v, 0);
  if (total === 0) {
    return (
      <div
        style={{
          height: 160,
          display: 'grid',
          placeItems: 'center',
          color: 'var(--color-text-tertiary)',
        }}
      >
        데이터 없음
      </div>
    );
  }
  const colors: Record<QuoteStatus, string> = {
    received: 'var(--color-today-fg)',
    in_progress: 'var(--color-waiting-fg)',
    on_hold: 'var(--color-hot-fg)',
    completed: 'var(--color-done-fg)',
    cancelled: 'var(--color-hot-fg)',
  };
  let acc = 0;
  const radius = 60;
  const c = 2 * Math.PI * radius;
  const segments = (Object.keys(data) as QuoteStatus[])
    .filter((k) => data[k] > 0)
    .map((k) => {
      const v = data[k] / total;
      const dash = v * c;
      const seg = {
        key: k,
        color: colors[k],
        dash,
        offset: -acc,
      };
      acc += dash;
      return seg;
    });
  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <svg width="160" height="160" viewBox="0 0 160 160">
        <circle
          cx="80"
          cy="80"
          r={radius}
          fill="none"
          stroke="var(--color-bg-muted)"
          strokeWidth="20"
        />
        <g transform="rotate(-90 80 80)">
          {segments.map((s) => (
            <circle
              key={s.key}
              cx="80"
              cy="80"
              r={radius}
              fill="none"
              stroke={s.color}
              strokeWidth="20"
              strokeDasharray={`${s.dash} ${c}`}
              strokeDashoffset={s.offset}
            />
          ))}
        </g>
        <text
          x="80"
          y="80"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="22"
          fontWeight="800"
        >
          {total}
        </text>
        <text
          x="80"
          y="100"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="10"
          fill="var(--color-text-tertiary)"
        >
          총 접수
        </text>
      </svg>
    </div>
  );
}

function LegendItem({
  color,
  label,
  count,
}: {
  color: string;
  label: string;
  count: number;
}) {
  return (
    <div
      className="row-between"
      style={{
        padding: '4px 0',
        fontSize: 13,
      }}
    >
      <div className="row" style={{ gap: 8 }}>
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: 2,
            background: color,
            display: 'inline-block',
          }}
        />
        {label}
      </div>
      <strong>{count}</strong>
    </div>
  );
}
