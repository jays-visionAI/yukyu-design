import { Link, useSearchParams } from 'react-router-dom';
import { Header, Footer } from '../../components/Layout';

export default function QuoteDone() {
  const [params] = useSearchParams();
  // ⚠️ share_token 기반 추적 링크. PII(id) 가 아닌 본인만 조회 가능한 토큰입니다.
  const token = params.get('t') ?? params.get('id') ?? '';

  return (
    <>
      <Header />
      <main className="container" style={{ padding: '80px 24px' }}>
        <div
          className="card"
          style={{
            maxWidth: 720,
            margin: '0 auto',
            textAlign: 'center',
            padding: '64px 32px',
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: 'var(--color-done-bg)',
              color: 'var(--color-done-fg)',
              fontSize: 36,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 24,
            }}
            aria-hidden
          >
            ✓
          </div>
          <h1
            style={{
              fontSize: 'var(--text-2xl)',
              marginBottom: 'var(--space-4)',
            }}
          >
            견적 신청이 정상적으로 접수되었습니다
          </h1>
          <p
            style={{
              color: 'var(--color-text-secondary)',
              marginBottom: 'var(--space-8)',
              fontSize: 'var(--text-md)',
            }}
          >
            담당자가 빠르게 연락드릴 예정이에요.<br />
            아래 버튼에서 진행 상황을 실시간으로 확인하실 수 있습니다.
          </p>

          {token && (
            <div
              style={{
                background: 'var(--color-bg-muted)',
                padding: 'var(--space-5)',
                borderRadius: 'var(--radius-md)',
                marginBottom: 'var(--space-8)',
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: 'var(--color-text-tertiary)',
                  letterSpacing: '0.08em',
                  marginBottom: 6,
                }}
              >
                본인 추적 링크 (안전한 토큰)
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-family-num)',
                  fontSize: 'var(--text-md)',
                  fontWeight: 700,
                  color: 'var(--color-primary)',
                  letterSpacing: '0.04em',
                  wordBreak: 'break-all',
                }}
              >
                {token}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--color-text-tertiary)',
                  marginTop: 6,
                }}
              >
                이 링크는 본인만 사용할 수 있어요. 북마크해두시면 진행 상황을
                실시간으로 확인할 수 있습니다.
              </div>
            </div>
          )}

          <div
            className="row"
            style={{
              justifyContent: 'center',
              gap: 'var(--space-3)',
              flexWrap: 'wrap',
            }}
          >
            {token && (
              <Link
                to={`/quote/track/${encodeURIComponent(token)}`}
                className="btn btn-primary btn-lg"
              >
                진행 상황 확인 →
              </Link>
            )}
            <Link to="/" className="btn btn-outline btn-lg">
              홈으로 돌아가기
            </Link>
          </div>

          <div
            style={{
              marginTop: 'var(--space-10)',
              padding: 'var(--space-5)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-primary-light)',
              color: 'var(--color-primary)',
              fontSize: 'var(--text-sm)',
            }}
          >
            <strong>💡 TIP</strong> — 진행 상황 페이지에서 별점 평가,
            증빙 자료 업로드, 담당자와의 소통이 모두 가능합니다.
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
