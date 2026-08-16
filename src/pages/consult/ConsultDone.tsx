import { useSearchParams } from 'react-router-dom';
import { Header, Footer } from '../../components/Layout';

/**
 *  상담 신청 완료 페이지
 *  · share_token 을 URL 로 전달받아 표시 (고객이 다시 접속할 때 추적용)
 *  · 추후 19단계 중 Step 03 이후 단계가 추가되면, 이 페이지에서
 *    "다음 단계 이어서 작성하기" 진입점이 될 예정 (placeholder 안내).
 */
export default function ConsultDone() {
  const [params] = useSearchParams();
  const token = params.get('t') ?? '';
  const shortToken = token.slice(0, 8).toUpperCase();

  return (
    <>
      <Header />
      <main
        className="container"
        style={{ padding: '80px 24px 120px', maxWidth: 720, textAlign: 'center' }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: 'var(--color-text-primary)',
            color: '#fff',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 28,
            margin: '0 auto 24px',
          }}
          aria-hidden
        >
          ✓
        </div>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 800,
            color: 'var(--color-text-primary)',
            marginBottom: 12,
          }}
        >
          상담 접수가 완료되었습니다
        </h1>
        <p
          style={{
            fontSize: 15,
            color: 'var(--color-text-secondary)',
            lineHeight: 1.6,
            marginBottom: 32,
          }}
        >
          담당자가 영업일 기준 24시간 내로 연락드려요.
          <br />
          잠시만 기다려 주세요.
        </p>

        <div
          style={{
            background: 'var(--ink-100)',
            borderRadius: 8,
            padding: 24,
            marginBottom: 32,
            textAlign: 'left',
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--color-text-tertiary)',
              marginBottom: 8,
            }}
          >
            접수 번호
          </div>
          <div
            style={{
              fontFamily: 'var(--font-family-num)',
              fontSize: 22,
              fontWeight: 800,
              color: 'var(--color-text-primary)',
              letterSpacing: '0.04em',
            }}
          >
            {shortToken || '—'}
          </div>
          <div
            style={{
              marginTop: 8,
              fontSize: 12,
              color: 'var(--color-text-tertiary)',
            }}
          >
            마이페이지에서 진행 상황을 실시간으로 확인할 수 있습니다.
          </div>
        </div>

        <a href="/" className="btn btn-primary btn-lg">
          홈으로 돌아가기
        </a>
      </main>
      <Footer />
    </>
  );
}