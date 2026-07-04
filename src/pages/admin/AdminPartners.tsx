// ============================================================
//  AdminPartners — 파트너 신청 관리 콘솔 (관리자 전용)
// ------------------------------------------------------------
//  · RequireAdmin 으로 이미 보호됨 (anon 접근 불가)
//  · 상태별 탭: 전체 / 접수됨 / 검토중 / 승인 / 반려
//  · 신청 상세 보기 (모달) — 사업자정보/시공사례/실적 한 화면
//  · 승인/반려 처리 — 관리자 코멘트(반려 사유) 입력
//  · PII 마스킹 해제 (관리자 권한)
// ============================================================

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Modal from '../../components/Modal';
import { useToast } from '../../components/Toast';
import { usePartner } from '../../data/PartnerContext';
import {
  PARTNER_SPECIALTY_LABELS,
  PARTNER_STATUS_LABELS,
  type PartnerApplication,
  type PartnerStatus,
} from '../../data/partner';

type TabKey = 'all' | PartnerStatus;

const TAB_LABELS: Record<TabKey, string> = {
  all: '전체',
  submitted: '접수됨',
  reviewing: '검토중',
  approved: '승인',
  rejected: '반려',
};

const STATUS_COLORS: Record<PartnerStatus, { bg: string; fg: string }> = {
  submitted: { bg: 'var(--color-today-bg)', fg: 'var(--color-today-fg)' },
  reviewing: { bg: 'var(--color-waiting-bg)', fg: 'var(--color-waiting-fg)' },
  approved: { bg: 'var(--color-done-bg)', fg: 'var(--color-done-fg)' },
  rejected: { bg: 'var(--color-hot-bg)', fg: 'var(--color-hot-fg)' },
};

export default function AdminPartners() {
  const { applications, updateApplicationStatus, resetApplications, backendMode, isReady } =
    usePartner();
  const toast = useToast();

  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState<TabKey>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<PartnerApplication | null>(null);

  // URL 의 ?id= 와 모달 상태 동기화
  // - hydrate 끝난 뒤 ?id= 가 가리키는 신청을 찾아 모달 오픈
  // - 모달 닫을 때 ?id= 쿼리 제거 (히스토리 더럽히지 않음)
  // - 모달이 열려있는 동안 다른 관리자가 같은 신청을 변경하면
  //   applications 가 갱신되고 모달 안의 데이터도 자동 따라갑니다 (Realtime 협업).
  useEffect(() => {
    if (!isReady) return;
    const id = searchParams.get('id');
    if (!id) {
      // 쿼리 없으면 모달도 닫힌 상태로 동기화 (뒤로가기로 돌아왔을 때 대비)
      setSelected((cur) => (cur ? null : cur));
      return;
    }
    const found = applications.find((a) => a.id === id);
    if (found) {
      setSelected((cur) => (cur && cur.id === found.id ? cur : found));
    }
  }, [isReady, searchParams, applications]);

  const closeModal = useCallback(() => {
    setSelected(null);
    const next = new URLSearchParams(searchParams);
    if (next.has('id')) {
      next.delete('id');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const filtered = useMemo(() => {
    let list = applications;
    if (tab !== 'all') list = list.filter((a) => a.status === tab);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((a) => {
        const biz = a.business;
        const perf = a.performance;
        const caseMatches = a.cases.some(
          (c) =>
            c.title.toLowerCase().includes(q) ||
            c.location.toLowerCase().includes(q) ||
            c.spaceType.toLowerCase().includes(q)
        );
        return (
          biz.companyName.toLowerCase().includes(q) ||
          biz.contactName.toLowerCase().includes(q) ||
          biz.contactPhone.includes(q) ||
          biz.contactEmail.toLowerCase().includes(q) ||
          biz.businessNumber.includes(q) ||
          biz.address.toLowerCase().includes(q) ||
          PARTNER_SPECIALTY_LABELS[biz.businessType].toLowerCase().includes(q) ||
          perf.specialties.some((s) =>
            PARTNER_SPECIALTY_LABELS[s].toLowerCase().includes(q)
          ) ||
          perf.primaryRegions.some((r) => r.toLowerCase().includes(q)) ||
          (a.note ?? '').toLowerCase().includes(q) ||
          (a.adminMemo ?? '').toLowerCase().includes(q) ||
          caseMatches
        );
      });
    }
    return list;
  }, [applications, tab, search]);

  const counts = useMemo(() => {
    const out: Record<TabKey, number> = {
      all: applications.length,
      submitted: 0,
      reviewing: 0,
      approved: 0,
      rejected: 0,
    };
    for (const a of applications) out[a.status] += 1;
    return out;
  }, [applications]);

  function handleReset() {
    // ForgeDB 모드에서는 RLS 안전을 위해 RPC 필요 — 데모 초기화는 local 모드에서만 동작합니다.
    if (backendMode !== 'local') {
      toast.push('ForgeDB 모드에서는 데모 초기화를 사용할 수 없습니다. 콘솔 SQL Editor에서 초기화해 주세요.');
      return;
    }
    if (!window.confirm('모든 파트너 신청을 삭제하시겠습니까? 되돌릴 수 없습니다.')) return;
    resetApplications();
    toast.push('파트너 신청 데이터가 초기화되었습니다.');
  }

  return (
    <div style={{ padding: 32, maxWidth: 1280, margin: '0 auto' }}>
      {/* 헤더 */}
      <div className="row-between" style={{ marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="text-3xl" style={{ fontSize: 28, fontWeight: 800 }}>
            파트너 신청 관리
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: 4 }}>
            인테리어·시공 협력업체 신청을 검토하고 승인/반려합니다.
          </p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              padding: '4px 10px',
              borderRadius: 999,
              background: backendMode === 'forgedb' ? 'var(--color-done-bg)' : '#fff8e6',
              color: backendMode === 'forgedb' ? 'var(--color-done-fg)' : '#8a5a00',
            }}
          >
            {backendMode === 'forgedb' ? 'ForgeDB 모드' : 'LOCAL 데모'}
          </span>
          <button type="button" className="btn btn-outline btn-sm" onClick={handleReset}>
            데모 데이터 초기화
          </button>
        </div>
      </div>

      {/* 탭 */}
      <div
        className="row"
        style={{
          gap: 6,
          marginBottom: 16,
          borderBottom: '1px solid var(--color-border)',
          flexWrap: 'wrap',
        }}
      >
        {(Object.keys(TAB_LABELS) as TabKey[]).map((k) => {
          const isActive = tab === k;
          return (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              className="btn btn-ghost btn-sm"
              style={{
                borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
                background: isActive ? '#fff' : 'transparent',
                borderBottom: isActive
                  ? '2px solid var(--color-primary)'
                  : '2px solid transparent',
                color: isActive ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                fontWeight: isActive ? 700 : 500,
                marginBottom: -1,
              }}
            >
              {TAB_LABELS[k]}{' '}
              <span style={{ opacity: 0.7, fontSize: 12 }}>({counts[k]})</span>
            </button>
          );
        })}
      </div>

      {/* 검색 */}
      <div
        className="row"
        style={{ marginBottom: 16, gap: 8, flexWrap: 'wrap' }}
      >
        <input
          className="input"
          style={{ maxWidth: 360 }}
          placeholder="회사명·담당자·연락처·사업자번호·지역·전문분야로 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>
          {filtered.length}건
        </span>
      </div>

      {/* 목록 */}
      {!isReady ? (
        <div className="empty">불러오는 중...</div>
      ) : filtered.length === 0 ? (
        <div className="empty">
          {tab === 'all' ? '아직 접수된 신청이 없습니다.' : '해당 상태의 신청이 없습니다.'}
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 110 }}>상태</th>
                <th>회사명</th>
                <th>사업자번호</th>
                <th>담당자</th>
                <th>연락처</th>
                <th style={{ width: 90 }}>사례수</th>
                <th style={{ width: 120 }}>누적 실적</th>
                <th style={{ width: 160 }}>접수일시</th>
                <th style={{ width: 90 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id}>
                  <td>
                    <StatusBadge status={a.status} />
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{a.business.companyName}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                      {PARTNER_SPECIALTY_LABELS[a.business.businessType]} ·{' '}
                      {a.business.ceoName}
                    </div>
                  </td>
                  <td style={{ fontFamily: 'var(--font-family-num)' }}>
                    {a.business.businessNumber}
                  </td>
                  <td>
                    {a.business.contactName}
                    {a.business.contactRole ? (
                      <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                        {a.business.contactRole}
                      </div>
                    ) : null}
                  </td>
                  <td style={{ fontFamily: 'var(--font-family-num)' }}>
                    <div>{a.business.contactPhone}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                      {a.business.contactEmail}
                    </div>
                  </td>
                  <td>{a.cases.length}건</td>
                  <td style={{ fontFamily: 'var(--font-family-num)' }}>
                    {a.performance.totalProjects}건
                  </td>
                  <td style={{ fontSize: 13 }}>
                    {new Date(a.createdAt).toLocaleString('ko-KR', {
                      hour12: false,
                    })}
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => setSelected(a)}
                      className="btn btn-outline btn-sm"
                    >
                      상세
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 상세 모달 */}
      <PartnerDetailModal
        app={selected}
        onClose={closeModal}
        onUpdateStatus={(status, memo) => {
          if (!selected) return;
          updateApplicationStatus(selected.id, status, { adminMemo: memo });
          toast.push(
            status === 'approved'
              ? '파트너 신청을 승인했습니다.'
              : status === 'rejected'
              ? '파트너 신청을 반려했습니다.'
              : `${PARTNER_STATUS_LABELS[status]}로 상태를 변경했습니다.`
          );
          setSelected((cur) =>
            cur ? { ...cur, status, adminMemo: memo } : cur
          );
        }}
      />
    </div>
  );
}

// ============================================================
//  StatusBadge
// ============================================================

function StatusBadge({ status }: { status: PartnerStatus }) {
  const c = STATUS_COLORS[status];
  return (
    <span
      className="badge"
      style={{ background: c.bg, color: c.fg }}
    >
      {PARTNER_STATUS_LABELS[status]}
    </span>
  );
}

// ============================================================
//  Detail Modal
// ============================================================

function PartnerDetailModal({
  app,
  onClose,
  onUpdateStatus,
}: {
  app: PartnerApplication | null;
  onClose: () => void;
  onUpdateStatus: (status: PartnerStatus, memo?: string) => void;
}) {
  const [memo, setMemo] = useState('');

  // 모달이 다른 신청으로 바뀌면 메모 입력란 동기화
  useEffect(() => {
    if (app) setMemo(app.adminMemo ?? '');
  }, [app?.id]);

  if (!app) return null;

  return (
    <Modal open={!!app} onClose={onClose} title={`${app.business.companyName} 신청 상세`} maxWidth={920}>
      <div className="stack" style={{ gap: 24 }}>
        {/* 헤더 요약 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 13,
                color: 'var(--color-text-tertiary)',
                marginBottom: 4,
              }}
            >
              신청번호 {app.id}
            </div>
            <h2 style={{ fontSize: 22 }}>
              {app.business.companyName}
              <span style={{ marginLeft: 10 }}>
                <StatusBadge status={app.status} />
              </span>
            </h2>
            <div style={{ color: 'var(--color-text-secondary)', marginTop: 4 }}>
              {PARTNER_SPECIALTY_LABELS[app.business.businessType]} · 대표 {app.business.ceoName}
            </div>
          </div>
        </div>

        {/* 사업자 정보 */}
        <section className="stack" style={{ gap: 8 }}>
          <SectionTitle>사업자 정보</SectionTitle>
          <DetailGrid
            items={[
              ['회사/상호명', app.business.companyName],
              ['대표자', app.business.ceoName],
              [
                '사업자등록번호',
                app.business.businessNumber,
              ],
              ['설립 연도', app.business.establishedYear ?? '—'],
              ['소재지', app.business.address],
              ['웹사이트', app.business.websiteUrl || '—'],
            ]}
          />
        </section>

        {/* 담당자 */}
        <section className="stack" style={{ gap: 8 }}>
          <SectionTitle>담당자</SectionTitle>
          <DetailGrid
            items={[
              ['이름', app.business.contactName],
              ['직함', app.business.contactRole || '—'],
              ['연락처', app.business.contactPhone],
              ['이메일', app.business.contactEmail],
            ]}
          />
        </section>

        {/* 시공 사례 */}
        <section className="stack" style={{ gap: 8 }}>
          <SectionTitle>시공 사례 ({app.cases.length}건)</SectionTitle>
          <div className="stack" style={{ gap: 12 }}>
            {app.cases.map((c, idx) => (
              <div
                key={idx}
                style={{
                  padding: 14,
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-bg-muted)',
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: 6 }}>
                  사례 #{idx + 1} · {c.title}
                </div>
                <DetailGrid
                  items={[
                    ['시공유형', c.spaceType],
                    ['면적', `${c.areaSize}평`],
                    ['지역', c.location],
                    ['기간', `${c.durationWeeks}주`],
                    ['예산', c.budget],
                    ['완료연도', `${c.completedYear}년`],
                  ]}
                />
                {c.materials && (
                  <div style={{ marginTop: 8, fontSize: 13 }}>
                    <strong>자재/스타일:</strong> {c.materials}
                  </div>
                )}
                <div style={{ marginTop: 8, fontSize: 13, whiteSpace: 'pre-line' }}>
                  {c.description}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 실적 */}
        <section className="stack" style={{ gap: 8 }}>
          <SectionTitle>실적 정보</SectionTitle>
          <DetailGrid
            items={[
              ['누적 시공 건수 (최근 3년)', `${app.performance.totalProjects}건`],
              ['최근 1년 시공 건수', `${app.performance.recentYearProjects}건`],
              ['평균 시공 면적', `${app.performance.avgAreaSize}평`],
              ['평균 공사기간', `${app.performance.avgDurationWeeks}주`],
              [
                '전문 분야',
                app.performance.specialties
                  .map((s) => PARTNER_SPECIALTY_LABELS[s])
                  .join(', '),
              ],
              ['주요 시공 지역', app.performance.primaryRegions.join(', ') || '—'],
              ['자격증/면허', app.performance.certifications || '—'],
            ]}
          />
        </section>

        {/* 추가 메모 */}
        {app.note && (
          <section className="stack" style={{ gap: 8 }}>
            <SectionTitle>추가 메모</SectionTitle>
            <div
              style={{
                padding: 12,
                background: 'var(--color-bg-muted)',
                borderRadius: 'var(--radius-md)',
                whiteSpace: 'pre-line',
                fontSize: 14,
              }}
            >
              {app.note}
            </div>
          </section>
        )}

        {/* 관리자 액션 */}
        <section
          className="stack"
          style={{
            gap: 12,
            paddingTop: 16,
            borderTop: '1px solid var(--color-border)',
          }}
        >
          <SectionTitle>관리자 처리</SectionTitle>

          <div className="field">
            <label className="field-label">관리자 코멘트 (반려 사유 등)</label>
            <textarea
              className="textarea"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="반려 시 사유를 명확히 적어주시면 신청자가 다음 신청에 참고할 수 있습니다."
              rows={3}
            />
          </div>

          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => onUpdateStatus('reviewing', memo)}
              disabled={app.status === 'reviewing'}
            >
              검토중으로 표시
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                if (window.confirm(`${app.business.companyName} 신청을 승인하시겠습니까?`)) {
                  onUpdateStatus('approved', memo);
                }
              }}
              disabled={app.status === 'approved'}
              style={{ background: 'var(--color-success)' }}
            >
              승인
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => {
                if (
                  window.confirm(
                    `${app.business.companyName} 신청을 반려하시겠습니까?\n반려 사유는 신청자에게 이메일로 전달됩니다.`
                  )
                ) {
                  onUpdateStatus('rejected', memo);
                }
              }}
              disabled={app.status === 'rejected'}
            >
              반려
            </button>
          </div>

          {app.processedAt && (
            <div
              style={{
                fontSize: 12,
                color: 'var(--color-text-tertiary)',
                marginTop: 4,
              }}
            >
              처리일시: {new Date(app.processedAt).toLocaleString('ko-KR', { hour12: false })}
            </div>
          )}
        </section>
      </div>
    </Modal>
  );
}

// ============================================================
//  작은 헬퍼들
// ============================================================

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3
      style={{
        fontSize: 14,
        fontWeight: 700,
        color: 'var(--color-text-secondary)',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        marginTop: 4,
      }}
    >
      {children}
    </h3>
  );
}

function DetailGrid({ items }: { items: (readonly [string, string | number])[] }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 12,
      }}
    >
      {items.map(([k, v]) => (
        <div key={k}>
          <div
            style={{
              fontSize: 11,
              color: 'var(--color-text-tertiary)',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: 2,
            }}
          >
            {k}
          </div>
          <div style={{ fontWeight: 500, fontSize: 14 }}>{v || '—'}</div>
        </div>
      ))}
    </div>
  );
}