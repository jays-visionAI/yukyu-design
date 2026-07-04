import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Header, Footer } from '../../components/Layout';
import { useData } from '../../data/DataContext';
import { formatDate, formatKRW, relativeTime, SPACE_TYPE_LABEL } from '../../lib/format';
import StatusBadge from '../../components/StatusBadge';
import { StarStatic } from '../../components/StarRating';
import type { ProgressAttachment, ProgressUpdate, Quote } from '../../data/types';
import Modal from '../../components/Modal';
import ProgressSubmitModal from './ProgressSubmitModal';
import ReviewModal from './ReviewModal';

/** 메모리에서 share_token 으로 quote 를 찾습니다. */
function getQuoteMemoByToken(token: string): Quote | undefined {
  if (!token) return undefined;
  const list = readQuotesFromStorage();
  return list.find((q) => q.shareToken === token);
}

/**
 * ⚠️ useData() 훅은 React 컴포넌트 안에서만 호출 가능합니다.
 * 위 헬퍼는 React 외부(localStorage 직접 읽기)에서 호출되므로 별도 구현이 필요합니다.
 * localStorage 키는 DataContext.LS_KEY 와 동일 ('yukye_design_state_v1').
 */
function readQuotesFromStorage(): Quote[] {
  try {
    const raw = localStorage.getItem('yukye_design_state_v1');
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { quotes?: Quote[] };
    return Array.isArray(parsed.quotes) ? parsed.quotes : [];
  } catch {
    return [];
  }
}

export default function QuoteTrack() {
  const { id: token = '' } = useParams();
  const navigate = useNavigate();
  const { getQuote, fetchQuoteByShareToken } = useData();
  const [progressOpen, setProgressOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [loadingToken, setLoadingToken] = useState(false);

  // ⚠️ URL 파라미터는 share_token 입니다 (PII 보호 + RLS 호환).
  //    1) 메모리에서 먼저 찾고 (관리자가 hydrate 한 quote 도 그대로 추적 가능)
  //    2) 없으면 ForgeDB 모드에서 토큰으로 단건 조회 → 메모리에 캐시
  const memMatch: Quote | undefined =
    getQuote(token) ?? getQuoteMemoByToken(token);

  const [fetched, setFetched] = useState<Quote | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (!token || memMatch) return;
    setLoadingToken(true);
    fetchQuoteByShareToken(token)
      .then((q) => {
        if (!cancelled) setFetched(q);
      })
      .finally(() => {
        if (!cancelled) setLoadingToken(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const quote = memMatch ?? fetched ?? null;

  const visibleUpdates = useMemo(() => {
    if (!quote) return [];
    return [...(quote.updates ?? [])]
      .filter((u) => u.visibleToCustomer)
      .sort((a, b) => +new Date(a.at) - +new Date(b.at));
  }, [quote]);

  if (!quote) {
    return (
      <>
        <Header />
        <main className="container" style={{ padding: '80px 24px', textAlign: 'center' }}>
          <h1 style={{ fontSize: 'var(--text-2xl)' }}>
            {loadingToken ? '접수 정보를 불러오는 중…' : '접수 정보를 찾을 수 없어요'}
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', margin: '16px 0 24px' }}>
            {loadingToken
              ? '잠시만 기다려주세요.'
              : '공유받은 추적 링크가 정확한지 다시 한번 확인해주세요. 또는 시공 완료 안내 SMS/카톡에 포함된 링크를 다시 열어주세요.'}
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/')}>
            홈으로
          </button>
        </main>
        <Footer />
      </>
    );
  }

  const customerUpdates = (quote.updates ?? []).filter(
    (u) => u.authorRole === 'customer'
  );
  const hasReview = !!quote.review;
  const canReview = quote.status === 'completed' && !hasReview;

  return (
    <>
      <Header />
      <main className="container" style={{ padding: '40px 24px 80px' }}>
        {/* Header */}
        <div
          className="row-between"
          style={{ marginBottom: 'var(--space-6)' }}
        >
          <Link to="/" className="btn btn-ghost btn-sm">
            ‹ 홈으로
          </Link>
          <div
            className="btn btn-ghost btn-sm"
            style={{ fontFamily: 'var(--font-family-num)', cursor: 'default' }}
            title="추적 링크는 본인만 사용할 수 있는 불투명 토큰입니다."
          >
            추적 토큰: {quote.shareToken.slice(0, 8).toUpperCase()}…
          </div>
        </div>

        {/* Summary card */}
        <div
          className="card"
          style={{ marginBottom: 'var(--space-6)' }}
        >
          <div
            className="row-between"
            style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}
          >
            <div>
              <div
                style={{
                  fontSize: 13,
                  color: 'var(--color-text-tertiary)',
                  marginBottom: 6,
                }}
              >
                {quote.customerName} 님의 시공 · 접수일 {formatDate(quote.createdAt)}
              </div>
              <h1 style={{ fontSize: 'var(--text-2xl)', marginBottom: 8 }}>
                {quote.spaceTypes.join(' · ') || '시공'} · {quote.areaSize}평
              </h1>
              <div
                className="row"
                style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}
              >
                <span>{SPACE_TYPE_LABEL[quote.spaceType] ?? quote.spaceType}</span>
                <span>·</span>
                <span>{quote.region}</span>
                <span>·</span>
                <span>예산 {quote.budget}</span>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <StatusBadge status={quote.status} />
              <div
                style={{
                  marginTop: 12,
                  fontSize: 12,
                  color: 'var(--color-text-tertiary)',
                }}
              >
                진행률
              </div>
              <div style={{ marginTop: 4 }}>
                <ProgressBar value={quote.progressPercent} />
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-family-num)',
                  fontWeight: 700,
                  marginTop: 4,
                  color: 'var(--color-primary)',
                }}
              >
                {quote.progressPercent}%
              </div>
            </div>
          </div>

          {quote.contractAmount && (
            <div
              style={{
                marginTop: 16,
                padding: '12px 16px',
                background: 'var(--color-bg-muted)',
                borderRadius: 'var(--radius-md)',
                fontSize: 14,
              }}
            >
              계약 금액: <strong>{formatKRW(quote.contractAmount)}</strong>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 'var(--space-3)',
            marginBottom: 'var(--space-8)',
          }}
        >
          <button
            className="btn btn-outline"
            onClick={() => setProgressOpen(true)}
            disabled={quote.status === 'cancelled'}
          >
            📎 공사 경과 / 증빙자료 제출
          </button>
          <button
            className={`btn ${canReview ? 'btn-accent' : 'btn-outline'}`}
            onClick={() => setReviewOpen(true)}
            disabled={!canReview}
            title={
              !canReview && hasReview
                ? '이미 평가하셨습니다'
                : quote.status !== 'completed'
                  ? '공사 완료 후 평가 가능합니다'
                  : ''
            }
          >
            {hasReview ? '✓ 평가 완료' : '⭐ 만족도 평가하기'}
          </button>
        </div>

        {customerUpdates.length > 0 && (
          <div
            style={{
              marginBottom: 'var(--space-8)',
              padding: 'var(--space-4)',
              background: 'var(--color-primary-light)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-primary)',
              fontSize: 14,
            }}
          >
            <strong>제출한 증빙/경과 {customerUpdates.length}건</strong> — 담당자가
            확인 후 회신드려요.
          </div>
        )}

        {/* Timeline */}
        <h2 style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-4)' }}>
          진행 경과 타임라인
        </h2>
        <div
          style={{
            position: 'relative',
            paddingLeft: 'var(--space-6)',
            borderLeft: '2px solid var(--color-border)',
            marginLeft: 8,
          }}
        >
          {visibleUpdates.length === 0 && (
            <div
              style={{
                color: 'var(--color-text-tertiary)',
                padding: '24px 0',
              }}
            >
              아직 등록된 진행 정보가 없습니다.
            </div>
          )}
          {visibleUpdates.map((u) => (
            <TimelineItem key={u.id} update={u} />
          ))}
        </div>

        {/* Review summary */}
        {hasReview && quote.review && (
          <div
            className="card"
            style={{ marginTop: 'var(--space-10)' }}
          >
            <h2 style={{ fontSize: 'var(--text-lg)', marginBottom: 12 }}>
              나의 평가
            </h2>
            <div
              className="row"
              style={{ marginBottom: 12, alignItems: 'center', gap: 12 }}
            >
              <StarStatic value={quote.review.rating} size={22} />
              <span style={{ fontWeight: 700 }}>
                {quote.review.rating}.0 / 5
              </span>
              <span
                style={{
                  color: 'var(--color-text-tertiary)',
                  fontSize: 13,
                }}
              >
                · {formatDate(quote.review.submittedAt)}
              </span>
            </div>
            {quote.review.comment && (
              <p
                style={{
                  background: 'var(--color-bg-muted)',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 14,
                  marginTop: 8,
                }}
              >
                {quote.review.comment}
              </p>
            )}
          </div>
        )}
      </main>
      <Footer />

      <ProgressSubmitModal
        open={progressOpen}
        onClose={() => setProgressOpen(false)}
        quoteId={quote.id}
      />
      <ReviewModal
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        quoteId={quote.id}
      />
    </>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div
      style={{
        width: 180,
        height: 8,
        background: 'var(--color-bg-muted)',
        borderRadius: 999,
        overflow: 'hidden',
        border: '1px solid var(--color-border)',
      }}
    >
      <div
        style={{
          width: `${Math.max(0, Math.min(100, value))}%`,
          height: '100%',
          background:
            'linear-gradient(90deg, var(--color-primary), var(--color-accent))',
          transition: 'width 320ms ease',
        }}
      />
    </div>
  );
}

function TimelineItem({ update }: { update: ProgressUpdate }) {
  const isCustomer = update.authorRole === 'customer';
  const isMilestone = update.category === 'milestone';
  const color = isMilestone
    ? 'var(--color-accent)'
    : isCustomer
      ? 'var(--color-primary)'
      : 'var(--color-info)';
  const dotSize = isMilestone ? 16 : 12;

  return (
    <div
      style={{
        position: 'relative',
        paddingBottom: 'var(--space-6)',
        paddingLeft: 'var(--space-5)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: -10,
          top: 4,
          width: dotSize,
          height: dotSize,
          borderRadius: '50%',
          background: color,
          border: '3px solid #fff',
          boxShadow: '0 0 0 2px ' + color,
        }}
      />
      <div
        style={{
          background: '#fff',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: '14px 16px',
        }}
      >
        <div
          className="row-between"
          style={{ alignItems: 'flex-start', gap: 12 }}
        >
          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                marginBottom: 6,
              }}
            >
              {categoryLabel(update.category)}
              {isCustomer && (
                <span
                  style={{
                    marginLeft: 8,
                    background: 'var(--color-primary)',
                    color: '#fff',
                    padding: '2px 8px',
                    borderRadius: 999,
                    fontSize: 10,
                  }}
                >
                  고객 제출
                </span>
              )}
            </div>
            <div
              style={{ fontWeight: 700, fontSize: 'var(--text-md)' }}
            >
              {update.title}
            </div>
            {update.message && (
              <p
                style={{
                  color: 'var(--color-text-secondary)',
                  fontSize: 14,
                  marginTop: 6,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {update.message}
              </p>
            )}
            {update.attachments && update.attachments.length > 0 && (
              <Attachments files={update.attachments} />
            )}
          </div>
          <div
            style={{
              fontSize: 12,
              color: 'var(--color-text-tertiary)',
              whiteSpace: 'nowrap',
            }}
          >
            {relativeTime(update.at)}
          </div>
        </div>
        <div
          style={{
            fontSize: 12,
            color: 'var(--color-text-tertiary)',
            marginTop: 8,
          }}
        >
          {update.authorName} · {formatDate(update.at, true)}
        </div>
      </div>
    </div>
  );
}

function categoryLabel(c: ProgressUpdate['category']) {
  return (
    {
      milestone: '마일스톤',
      progress: '진행',
      issue: '이슈',
      evidence: '증빙',
      note: '메모',
    } as Record<ProgressUpdate['category'], string>
  )[c];
}

function Attachments({ files }: { files: ProgressAttachment[] }) {
  const [preview, setPreview] = useState<ProgressAttachment | null>(null);
  return (
    <>
      <div
        style={{
          marginTop: 12,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: 8,
        }}
      >
        {files.map((f) => (
          <button
            type="button"
            key={f.id}
            onClick={() => setPreview(f)}
            style={{
              display: 'block',
              width: '100%',
              padding: 0,
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              overflow: 'hidden',
              background: 'var(--color-bg-muted)',
              cursor: 'zoom-in',
              textAlign: 'left',
              font: 'inherit',
              color: 'inherit',
            }}
          >
            {f.type.startsWith('image/') ? (
              <img
                src={f.dataUrl}
                alt={f.name}
                style={{
                  width: '100%',
                  height: 100,
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
            ) : (
              <div
                style={{
                  padding: 12,
                  fontSize: 12,
                  color: 'var(--color-text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                📄 {f.name}
              </div>
            )}
            <div
              style={{
                fontSize: 11,
                padding: '4px 8px',
                color: 'var(--color-text-tertiary)',
                borderTop: '1px solid var(--color-border)',
                background: '#fff',
              }}
            >
              {f.name}
            </div>
          </button>
        ))}
      </div>

      <Modal
        open={!!preview}
        onClose={() => setPreview(null)}
        title={preview?.name ?? '미리보기'}
        maxWidth={960}
      >
        {preview && (
          <div style={{ textAlign: 'center' }}>
            {preview.type.startsWith('image/') ? (
              <img
                src={preview.dataUrl}
                alt={preview.name}
                style={{
                  maxWidth: '100%',
                  maxHeight: '70vh',
                  objectFit: 'contain',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-bg-muted)',
                }}
              />
            ) : (
              <div
                style={{
                  padding: '40px 24px',
                  textAlign: 'center',
                  color: 'var(--color-text-secondary)',
                }}
              >
                <div style={{ fontSize: 48, marginBottom: 12 }}>📄</div>
                <p style={{ marginBottom: 16, fontSize: 14 }}>
                  미리보기를 지원하지 않는 형식입니다.
                </p>
                <a
                  href={preview.dataUrl}
                  download={preview.name}
                  className="btn btn-primary"
                  style={{ display: 'inline-flex', textDecoration: 'none' }}
                >
                  다운로드: {preview.name}
                </a>
              </div>
            )}
            <div
              style={{
                marginTop: 16,
                fontSize: 12,
                color: 'var(--color-text-tertiary)',
              }}
            >
              {preview.type} · ESC 또는 바깥 클릭으로 닫기
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
