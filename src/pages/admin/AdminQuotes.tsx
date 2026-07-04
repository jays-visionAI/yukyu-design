import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useData } from '../../data/DataContext';
import { useToast } from '../../components/Toast';
import StatusBadge from '../../components/StatusBadge';
import {
  formatDate,
  formatKRW,
  relativeTime,
  SPACE_TYPE_LABEL,
} from '../../lib/format';
import type {
  ProgressUpdate,
  Quote,
  QuoteStatus,
} from '../../data/types';
import Modal from '../../components/Modal';

const STATUS_FILTERS: { value: QuoteStatus | 'all'; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'received', label: '접수됨' },
  { value: 'in_progress', label: '진행중' },
  { value: 'on_hold', label: '보류' },
  { value: 'completed', label: '완료' },
  { value: 'cancelled', label: '취소' },
];

export default function AdminQuotes() {
  const { quotes, resetData, backendMode } = useData();
  const toast = useToast();
  const navigate = useNavigate();
  const { id: routeId } = useParams();
  const [filter, setFilter] = useState<QuoteStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (routeId) setSelectedId(routeId);
  }, [routeId]);

  const filtered = useMemo(() => {
    return quotes
      .filter((q) => (filter === 'all' ? true : q.status === filter))
      .filter((q) => {
        if (!search.trim()) return true;
        const s = search.trim().toLowerCase();
        return (
          q.customerName.toLowerCase().includes(s) ||
          q.phone.includes(s) ||
          q.region.toLowerCase().includes(s) ||
          q.id.toLowerCase().includes(s)
        );
      })
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }, [quotes, filter, search]);

  function selectQuote(id: string) {
    setSelectedId(id);
    navigate(`/admin/quotes/${id}`, { replace: true });
  }

  function downloadCsv() {
    const rows = [
      [
        '접수번호',
        '접수일',
        '고객명',
        '연락처',
        '이메일',
        '지역',
        '선호연락시간',
        '공간유형',
        '평수',
        '예산',
        '입주예정일',
        '시공공간',
        '스타일',
        '상태',
        '진행률',
        '계약금액',
        '관리메모',
        '평점',
        '평가코멘트',
        '평가일시',
        '추가요청사항',
      ],
      ...filtered.map((q) => [
        q.id,
        formatDate(q.createdAt),
        q.customerName,
        q.phone,
        q.email ?? '',
        q.region,
        q.preferredContactTime ?? '',
        SPACE_TYPE_LABEL[q.spaceType] ?? q.spaceType,
        `${q.areaSize}평`,
        q.budget,
        formatDate(q.moveInDate),
        q.spaceTypes.join('/'),
        q.styles.join('/'),
        STATUS_FILTERS.find((f) => f.value === q.status)?.label ?? q.status,
        `${q.progressPercent}%`,
        q.contractAmount ?? '',
        q.adminMemo ?? '',
        q.review ? `${q.review.rating}.0` : '',
        q.review?.comment ?? '',
        q.review ? formatDate(q.review.submittedAt, true) : '',
        q.additionalRequests ?? '',
      ]),
    ];
    // Excel 에서 전화번호/접수번호가 자동으로 날짜·숫자로 변환되어 데이터가
    // 망가지는 것을 막기 위해 텍스트 컬럼은 ="..." 로 감싸 명시적으로 텍스트
    // 형식임을 표시합니다 (RFC 4180 호환, Excel · LibreOffice · Numbers 모두 인식).
    const escape = (c: unknown) => {
      const s = String(c ?? '');
      return `="${s.replace(/"/g, '""')}"`;
    };
    const csv = rows.map((r) => r.map(escape).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `yukyu_quotes_${formatDate(new Date().toISOString())}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV 다운로드 완료');
  }

  async function copyToClipboard(text: string): Promise<boolean> {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      /* fallback below */
    }
    // Fallback: hidden textarea + execCommand
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }

  async function clearAll() {
    if (backendMode === 'forgedb') {
      const sql =
        '-- ForgeDB 콘솔 SQL Editor 에서 실행하세요.\n' +
        '-- 진행 경과와 시공 건을 모두 삭제합니다 (관리자 계정은 유지).\n' +
        'DELETE FROM public.progress_updates;\n' +
        'DELETE FROM public.quotes;\n' +
        '-- 포트폴리오까지 초기화하려면:\n' +
        '-- DELETE FROM public.portfolio;';
      const ok = await copyToClipboard(sql);
      if (ok) {
        toast.success('초기화용 SQL 을 클립보드에 복사했습니다. 콘솔에 붙여넣으세요.');
      } else {
        toast.error('클립보드 복사 실패. 콘솔에서 다음 SQL 을 직접 실행하세요:\n' + sql);
      }
      return;
    }
    if (!confirm('데모 데이터를 초기화합니다. 되돌릴 수 없습니다.')) return;
    resetData();
    toast.success('초기화되었습니다.');
  }

  const selected = selectedId ? quotes.find((q) => q.id === selectedId) : null;

  return (
    <div style={{ padding: '32px 36px' }}>
      <div
        className="row-between"
        style={{ marginBottom: 24, flexWrap: 'wrap', gap: 12 }}
      >
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)' }}>접수 관리</h1>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            접수된 모든 견적 요청을 검색·관리하고 진행 상황을 기록합니다.
          </p>
        </div>
        <div className="row">
          <button className="btn btn-outline btn-sm" onClick={downloadCsv}>
            ⬇ CSV 다운로드
          </button>
          <button className="btn btn-ghost btn-sm" onClick={clearAll}>
            데모 데이터 초기화
          </button>
        </div>
      </div>

      <div className="card card-tight">
        {/* Toolbar */}
        <div
          className="row-between"
          style={{
            marginBottom: 16,
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                className={`check-pill ${filter === f.value ? 'checked' : ''}`}
                onClick={() => setFilter(f.value)}
                style={{ cursor: 'pointer' }}
              >
                {f.label}
                <span
                  style={{
                    marginLeft: 6,
                    color: 'var(--color-text-tertiary)',
                    fontSize: 12,
                  }}
                >
                  {f.value === 'all'
                    ? quotes.length
                    : quotes.filter((q) => q.status === f.value).length}
                </span>
              </button>
            ))}
          </div>
          <input
            className="input"
            style={{ width: 280 }}
            placeholder="이름/연락처/지역/접수번호 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Table */}
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>접수번호</th>
                <th>고객명</th>
                <th>연락처</th>
                <th>지역</th>
                <th>시공</th>
                <th>예산</th>
                <th>상태</th>
                <th>접수일</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="empty">
                    조건에 맞는 접수가 없습니다.
                  </td>
                </tr>
              )}
              {filtered.map((q) => (
                <tr
                  key={q.id}
                  onClick={() => selectQuote(q.id)}
                  style={{
                    cursor: 'pointer',
                    background:
                      selectedId === q.id
                        ? 'var(--color-primary-light)'
                        : undefined,
                  }}
                >
                  <td
                    style={{
                      fontFamily: 'var(--font-family-num)',
                      fontSize: 12,
                      color: 'var(--color-text-tertiary)',
                    }}
                  >
                    {q.id.slice(-8).toUpperCase()}
                  </td>
                  <td style={{ fontWeight: 600 }}>{q.customerName}</td>
                  <td>{q.phone}</td>
                  <td>{q.region}</td>
                  <td>
                    <div>{q.spaceTypes.join(' · ') || '-'}</div>
                    <div
                      style={{
                        fontSize: 12,
                        color: 'var(--color-text-tertiary)',
                      }}
                    >
                      {q.areaSize}평 · {SPACE_TYPE_LABEL[q.spaceType] ?? ''}
                    </div>
                  </td>
                  <td>{q.budget}</td>
                  <td>
                    <StatusBadge status={q.status} />
                  </td>
                  <td
                    style={{
                      fontSize: 12,
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    {formatDate(q.createdAt)}
                    <div
                      style={{
                        fontSize: 11,
                        color: 'var(--color-text-tertiary)',
                      }}
                    >
                      {relativeTime(q.createdAt)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <QuoteDetailPanel
          quote={selected}
          onClose={() => {
            setSelectedId(null);
            navigate('/admin/quotes', { replace: true });
          }}
        />
      )}
    </div>
  );
}

function QuoteDetailPanel({
  quote,
  onClose,
}: {
  quote: Quote;
  onClose: () => void;
}) {
  const { updateQuote } = useData();
  const [addOpen, setAddOpen] = useState(false);
  const [memo, setMemo] = useState(quote.adminMemo ?? '');

  // 외부(다른 곳)에서 quote.adminMemo가 바뀌면 로컬 state도 동기화 (stale 방지)
  useEffect(() => {
    setMemo(quote.adminMemo ?? '');
  }, [quote.adminMemo]);

  // 외부 클릭 시 닫히지 않음 — 명시 X 버튼으로만
  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15,23,42,.35)',
          zIndex: 90,
        }}
      />
      <aside
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 'min(720px, 100vw)',
          background: '#fff',
          boxShadow: 'var(--shadow-xl)',
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <header
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'var(--color-primary)',
            color: '#fff',
          }}
        >
          <div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.7)' }}>
              접수번호 {quote.id.slice(-8).toUpperCase()}
            </div>
            <div style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>
              {quote.customerName} · {quote.phone}
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn btn-sm"
            style={{
              background: 'rgba(255,255,255,.15)',
              color: '#fff',
            }}
          >
            ✕ 닫기
          </button>
        </header>

        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: '24px',
          }}
        >
          <DetailSection title="고객 정보">
            <Info label="이름" value={quote.customerName} />
            <Info label="연락처" value={quote.phone} />
            <Info label="이메일" value={quote.email ?? '-'} />
            <Info label="지역" value={quote.region} />
            <Info label="연락 시간" value={quote.preferredContactTime ?? '-'} />
            <Info label="상태" value={<StatusBadge status={quote.status} />} />
            <Info
              label="진행률"
              value={
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <div
                    style={{
                      width: 140,
                      height: 6,
                      background: 'var(--color-bg-muted)',
                      borderRadius: 999,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${quote.progressPercent}%`,
                        height: '100%',
                        background: 'var(--color-primary)',
                      }}
                    />
                  </div>
                  <strong>{quote.progressPercent}%</strong>
                </div>
              }
            />
          </DetailSection>

          <DetailSection title="시공 정보">
            <Info
              label="공간 유형"
              value={SPACE_TYPE_LABEL[quote.spaceType] ?? quote.spaceType}
            />
            <Info label="평수" value={`${quote.areaSize}평`} />
            <Info label="예산" value={quote.budget} />
            <Info label="입주 예정일" value={formatDate(quote.moveInDate)} />
            <Info label="시공 공간" value={quote.spaceTypes.join(', ') || '-'} />
            <Info label="스타일" value={quote.styles.join(', ') || '-'} />
            <Info
              label="계약 금액"
              value={
                quote.contractAmount ? (
                  formatKRW(quote.contractAmount)
                ) : (
                  <ContractAmountInput quote={quote} />
                )
              }
            />
            {quote.additionalRequests && (
              <Info
                label="추가 요청"
                value={
                  <span style={{ whiteSpace: 'pre-wrap' }}>
                    {quote.additionalRequests}
                  </span>
                }
              />
            )}
          </DetailSection>

          <DetailSection title="관리 메모">
            <textarea
              className="textarea"
              placeholder="내부 메모를 작성하세요 (고객에게는 노출되지 않습니다)"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              onBlur={() =>
                updateQuote(quote.id, { adminMemo: memo })
              }
              rows={3}
            />
            <div
              style={{
                fontSize: 12,
                color: 'var(--color-text-tertiary)',
                marginTop: 4,
              }}
            >
              포커스를 떠나면 자동 저장됩니다.
            </div>
          </DetailSection>

          <DetailSection
            title="진행 경과"
            action={
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setAddOpen(true)}
              >
                + 경과 추가
              </button>
            }
          >
            {quote.updates.length === 0 && (
              <div className="empty">등록된 진행 경과가 없습니다.</div>
            )}
            <div className="stack" style={{ gap: 12 }}>
              {[...quote.updates]
                .sort((a, b) => +new Date(b.at) - +new Date(a.at))
                .map((u) => (
                  <UpdateRow key={u.id} update={u} />
                ))}
            </div>
          </DetailSection>

          {quote.review && (
            <DetailSection title="고객 평가">
              <div
                className="row"
                style={{ alignItems: 'center', gap: 8, marginBottom: 8 }}
              >
                ⭐ <strong>{quote.review.rating}.0</strong>
                <span
                  style={{
                    fontSize: 12,
                    color: 'var(--color-text-tertiary)',
                  }}
                >
                  · {formatDate(quote.review.submittedAt)}
                </span>
              </div>
              {quote.review.comment && (
                <p
                  style={{
                    background: 'var(--color-bg-muted)',
                    padding: 12,
                    borderRadius: 'var(--radius-md)',
                    fontSize: 14,
                  }}
                >
                  {quote.review.comment}
                </p>
              )}
            </DetailSection>
          )}
        </div>
      </aside>

      <ProgressAddModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        quoteId={quote.id}
      />
    </>
  );
}

function DetailSection({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div
        className="row-between"
        style={{ marginBottom: 12, alignItems: 'center' }}
      >
        <h3
          style={{
            fontSize: 'var(--text-md)',
            fontWeight: 700,
            color: 'var(--color-text-primary)',
          }}
        >
          {title}
        </h3>
        {action}
      </div>
      <div
        className="stack"
        style={{
          gap: 8,
          background: 'var(--color-bg-page)',
          padding: 16,
          borderRadius: 'var(--radius-md)',
        }}
      >
        {children}
      </div>
    </div>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '120px 1fr',
        alignItems: 'start',
        gap: 12,
      }}
    >
      <div
        style={{
          fontSize: 12,
          color: 'var(--color-text-tertiary)',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 14, color: 'var(--color-text-primary)' }}>
        {value}
      </div>
    </div>
  );
}

function ContractAmountInput({ quote }: { quote: Quote }) {
  const { updateQuote } = useData();
  const toast = useToast();
  // 저장 후 또는 외부(Realtime/다른 세션)에서 contractAmount 가 바뀌면 입력값 초기화.
  // 단, 사용자가 새 값을 *입력 중*일 때는 입력값을 유지 (덮어쓰기 방지).
  const [val, setVal] = useState('');
  const [editing, setEditing] = useState(false);

  // 외부(저장/다른 세션/Realtime)로 contractAmount 가 바뀌면 입력값을 비웁니다.
  // 단, 사용자가 *지금은* 입력 중(editing=true)이라면 입력값을 보존해
  // 외부 변경으로 작성 중 데이터가 사라지지 않도록 합니다.
  useEffect(() => {
    if (!editing) setVal('');
  }, [quote.contractAmount]);

  return (
    <div className="row" style={{ gap: 8 }}>
      <input
        className="input"
        style={{ width: 160 }}
        inputMode="numeric"
        placeholder={quote.contractAmount ? '' : '3,200,0000'}
        value={val}
        onFocus={() => setEditing(true)}
        onBlur={() => setEditing(false)}
        onChange={(e) =>
          setVal(e.target.value.replace(/[^0-9]/g, ''))
        }
      />
      <button
        className="btn btn-primary btn-sm"
        onClick={() => {
          const n = parseInt(val, 10);
          if (!n) {
            toast.error('금액을 숫자로 입력해주세요.');
            return;
          }
          updateQuote(quote.id, { contractAmount: n });
          setVal('');
          setEditing(false);
          toast.success('계약 금액이 저장되었습니다.');
        }}
      >
        저장
      </button>
      {quote.contractAmount ? (
        <span
          style={{
            fontSize: 12,
            color: 'var(--color-text-tertiary)',
          }}
        >
          현재 {formatKRW(quote.contractAmount)}
        </span>
      ) : null}
    </div>
  );
}

function UpdateRow({ update }: { update: ProgressUpdate }) {
  const dotColor =
    update.category === 'milestone'
      ? 'var(--color-accent)'
      : update.authorRole === 'customer'
        ? 'var(--color-primary)'
        : 'var(--color-info)';
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        padding: 14,
        position: 'relative',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: -6,
          top: 16,
          width: 12,
          height: 12,
          borderRadius: '50%',
          background: dotColor,
        }}
      />
      <div className="row-between" style={{ marginBottom: 6 }}>
        <div className="row" style={{ gap: 6 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.08em',
              color: dotColor,
              textTransform: 'uppercase',
            }}
          >
            {update.category === 'milestone'
              ? '📍 마일스톤'
              : update.category === 'progress'
                ? '🔧 진행'
                : update.category === 'evidence'
                  ? '📎 증빙'
                  : update.category === 'issue'
                    ? '⚠ 이슈'
                    : '📝 메모'}
          </span>
          {update.authorRole === 'customer' && (
            <span
              style={{
                fontSize: 10,
                background: 'var(--color-primary)',
                color: '#fff',
                padding: '2px 6px',
                borderRadius: 999,
              }}
            >
              고객
            </span>
          )}
        </div>
        <span
          style={{
            fontSize: 12,
            color: 'var(--color-text-tertiary)',
          }}
        >
          {formatDate(update.at, true)}
        </span>
      </div>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{update.title}</div>
      {update.message && (
        <p
          style={{
            fontSize: 13,
            color: 'var(--color-text-secondary)',
            whiteSpace: 'pre-wrap',
          }}
        >
          {update.message}
        </p>
      )}
      {update.attachments && update.attachments.length > 0 && (
        <div
          style={{
            marginTop: 8,
            fontSize: 12,
            color: 'var(--color-primary)',
          }}
        >
          📎 첨부 파일 {update.attachments.length}개
        </div>
      )}
    </div>
  );
}

function ProgressAddModal({
  open,
  onClose,
  quoteId,
}: {
  open: boolean;
  onClose: () => void;
  quoteId: string;
}) {
  const { addProgressUpdate } = useData();
  const toast = useToast();
  const [category, setCategory] = useState<ProgressUpdate['category']>(
    'progress'
  );
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [author, setAuthor] = useState('');

  // 모달이 닫히면 입력값 reset (다음 열기에서 깨끗하게 시작).
  useEffect(() => {
    if (!open) {
      setTitle('');
      setMessage('');
      setAuthor('');
      setCategory('progress');
    }
  }, [open]);

  function submit() {
    if (!title.trim()) {
      toast.error('제목을 입력해주세요.');
      return;
    }
    addProgressUpdate(quoteId, {
      authorName: author.trim() || 'Yukyu Design',
      authorRole: 'admin',
      category,
      title: title.trim(),
      message: message.trim() || undefined,
      visibleToCustomer: true,
    });
    toast.success('진행 경과가 추가되었습니다.');
    onClose();
  }

  return (
    <Modal
      open={open}
      title="진행 경과 추가"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose}>
            취소
          </button>
          <button className="btn btn-primary" onClick={submit}>
            추가
          </button>
        </>
      }
    >
      <div className="field">
        <label className="field-label">유형</label>
        <div className="checkbox-grid">
          {(
            [
              ['milestone', '📍 마일스톤'],
              ['progress', '🔧 진행'],
              ['evidence', '📎 증빙'],
              ['issue', '⚠ 이슈'],
              ['note', '📝 메모'],
            ] as [ProgressUpdate['category'], string][]
          ).map(([c, label]) => (
            <label
              key={c}
              className={`check-pill ${category === c ? 'checked' : ''}`}
            >
              <input
                type="radio"
                name="cat"
                checked={category === c}
                onChange={() => setCategory(c)}
              />
              {label}
            </label>
          ))}
        </div>
      </div>
      <div
        className="field"
        onKeyDown={(e) => {
          // Enter 누르면 즉시 추가 (Shift+Enter 는 textarea 의 줄바꿈용).
          if (e.key === 'Enter' && !(e.target instanceof HTMLTextAreaElement)) {
            e.preventDefault();
            submit();
          }
        }}
      >
        <label className="field-label">
          제목<span className="req">*</span>
        </label>
        <input
          className="input"
          placeholder="예: 거실 타일 시공 완료"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
        />
      </div>
      <div className="field">
        <label className="field-label">상세</label>
        <textarea
          className="textarea"
          placeholder="고객에게 전달할 내용을 작성합니다."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </div>
      <div className="field">
        <label className="field-label">작성자</label>
        <input
          className="input"
          placeholder="Yukyu Design"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
        />
        <div
          style={{
            fontSize: 12,
            color: 'var(--color-text-tertiary)',
            marginTop: 4,
          }}
        >
          비워두면 기본값 "Yukyu Design" 으로 저장됩니다.
        </div>
      </div>
    </Modal>
  );
}
