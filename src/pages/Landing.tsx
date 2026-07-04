import { Link } from 'react-router-dom';
import { Header, Footer } from '../components/Layout';
import { useData } from '../data/DataContext';
import { formatCurrency } from '../lib/format';

export default function Landing() {
  const { portfolio } = useData();
  const featured = portfolio.filter((p) => p.featured && p.published).slice(0, 3);

  return (
    <>
      <Header />
      <main>
        {/* Hero */}
        <section
          style={{
            background:
              'linear-gradient(135deg, #0b3d91 0%, #143e7d 50%, #1a3a6e 100%)',
            color: '#fff',
            padding: 'var(--space-20) 0',
          }}
        >
          <div
            className="container"
            style={{
              display: 'grid',
              gridTemplateColumns: '1.2fr 1fr',
              gap: 'var(--space-12)',
              alignItems: 'center',
            }}
          >
            <div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 14px',
                  borderRadius: 999,
                  background: 'rgba(255,255,255,.1)',
                  border: '1px solid rgba(255,255,255,.2)',
                  fontSize: 'var(--text-sm)',
                  marginBottom: 'var(--space-5)',
                }}
              >
                <span style={{ color: 'var(--color-accent)' }}>●</span>
                2025 시공 · 진행중인 프로젝트 12건
              </div>
              <h1
                style={{
                  fontSize: 'var(--text-3xl)',
                  color: '#fff',
                  lineHeight: 1.2,
                  marginBottom: 'var(--space-5)',
                }}
              >
                숨 쉬는 공간,<br />
                <span style={{ color: 'var(--color-accent)' }}>
                  매일 기분 좋은 집
                </span>
              </h1>
              <p
                style={{
                  fontSize: 'var(--text-md)',
                  color: 'rgba(255,255,255,.85)',
                  marginBottom: 'var(--space-8)',
                  maxWidth: 520,
                }}
              >
                Yukye Design은 고객 한 분 한 분의 라이프 스타일에 맞춘
                인테리어 시공을 제안합니다. 2분이면 견적 신청이 끝나고,
                신청 내역은 실시간으로 공유됩니다.
              </p>
              <div className="row" style={{ gap: 'var(--space-3)' }}>
                <Link to="/quote" className="btn btn-accent btn-lg">
                  무료 견적 신청 →
                </Link>
                <a
                  href="#portfolio"
                  className="btn btn-lg"
                  style={{
                    background: 'rgba(255,255,255,.1)',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,.3)',
                  }}
                >
                  시공 사례 보기
                </a>
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: 32,
                  marginTop: 'var(--space-10)',
                  color: 'rgba(255,255,255,.85)',
                }}
              >
                <Stat n="182+" label="누적 시공" />
                <Stat n="98%" label="고객 만족도" />
                <Stat n="8년" label="업력" />
              </div>
            </div>
            <HeroVisual />
          </div>
        </section>

        {/* Why us */}
        <section style={{ padding: 'var(--space-16) 0' }}>
          <div className="container">
            <div className="row-between" style={{ marginBottom: 'var(--space-10)' }}>
              <div>
                <p
                  style={{
                    color: 'var(--color-accent)',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                  }}
                >
                  WHY YUKYE
                </p>
                <h2
                  style={{
                    fontSize: 'var(--text-2xl)',
                    marginTop: 'var(--space-2)',
                  }}
                >
                  끝까지 책임지는 시공, 끝까지 함께하는 진행
                </h2>
              </div>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 'var(--space-6)',
              }}
            >
              <Feature
                title="실시간 진행 공유"
                desc="계약부터 인도까지 모든 단계를 마이페이지에서 실시간으로 확인할 수 있어요."
                icon="📋"
              />
              <Feature
                title="증빙 업로드"
                desc="자재 영수증, 시공 사진, 이슈 사항까지 첨부해 투명하게 공유합니다."
                icon="📎"
              />
              <Feature
                title="공사 후 별점 평가"
                desc="공사 완료 후 다섯 가지 항목으로 평가해주시면 서비스 품질을 개선합니다."
                icon="⭐"
              />
            </div>
          </div>
        </section>

        {/* Portfolio preview */}
        <section
          id="portfolio"
          style={{
            background: '#fff',
            padding: 'var(--space-16) 0',
            borderTop: '1px solid var(--color-border)',
          }}
        >
          <div className="container">
            <div className="row-between" style={{ marginBottom: 'var(--space-8)' }}>
              <h2 style={{ fontSize: 'var(--text-2xl)' }}>최근 시공 사례</h2>
              <Link to="/quote" className="btn btn-outline btn-sm">
                견적 문의 →
              </Link>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 'var(--space-5)',
              }}
            >
              {featured.map((p) => (
                <article
                  key={p.id}
                  style={{
                    borderRadius: 'var(--radius-lg)',
                    overflow: 'hidden',
                    background: '#fff',
                    border: '1px solid var(--color-border)',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  <div
                    style={{
                      height: 200,
                      background: `linear-gradient(135deg, ${p.coverColor} 0%, ${p.coverAccent} 140%)`,
                      display: 'flex',
                      alignItems: 'flex-end',
                      padding: 18,
                    }}
                  >
                    <span
                      style={{
                        background: 'rgba(0,0,0,0.25)',
                        color: '#fff',
                        padding: '4px 10px',
                        borderRadius: 999,
                        fontSize: 12,
                        backdropFilter: 'blur(4px)',
                      }}
                    >
                      {p.location}
                    </span>
                  </div>
                  <div style={{ padding: 18 }}>
                    <div
                      style={{
                        color: 'var(--color-text-tertiary)',
                        fontSize: 12,
                        marginBottom: 6,
                      }}
                    >
                      {p.year} · {p.spaceType} · {p.durationWeeks}주
                    </div>
                    <h3 style={{ fontSize: 'var(--text-lg)', marginBottom: 8 }}>
                      {p.title}
                    </h3>
                    <p
                      style={{
                        color: 'var(--color-text-secondary)',
                        fontSize: 'var(--text-sm)',
                      }}
                    >
                      {p.description}
                    </p>
                    <div
                      className="row"
                      style={{
                        marginTop: 16,
                        justifyContent: 'space-between',
                      }}
                    >
                      <span
                        style={{
                          fontWeight: 700,
                          color: 'var(--color-primary)',
                        }}
                      >
                        {formatCurrency(parseInt(p.budget.replace(/[^0-9]/g, '')) * 10000)}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                        {p.tags.join(' · ')}
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Banner */}
        <section style={{ padding: 'var(--space-16) 0' }}>
          <div
            className="container"
            style={{
              background: 'var(--color-primary)',
              color: '#fff',
              borderRadius: 'var(--radius-xl)',
              padding: 'var(--space-12)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 24,
              flexWrap: 'wrap',
            }}
          >
            <div>
              <h2 style={{ fontSize: 'var(--text-2xl)', color: '#fff' }}>
                이번 주 컨설팅 무료 · 3가지만 알려주세요
              </h2>
              <p style={{ marginTop: 8, color: 'rgba(255,255,255,.85)' }}>
                시공 유형 · 평수 · 예산 — 그 외는 저희가 채워드릴게요.
              </p>
            </div>
            <Link to="/quote" className="btn btn-accent btn-lg">
              2분 견적 시작
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function Stat({ n, label }: { n: string; label: string }) {
  return (
    <div>
      <div style={{ fontSize: 32, fontWeight: 800, color: '#fff' }}>{n}</div>
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,.7)' }}>{label}</div>
    </div>
  );
}

function Feature({
  title,
  desc,
  icon,
}: {
  title: string;
  desc: string;
  icon: string;
}) {
  return (
    <div
      style={{
        padding: 'var(--space-6)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        background: '#fff',
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          background: 'var(--color-primary-light)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 22,
          marginBottom: 'var(--space-4)',
        }}
      >
        {icon}
      </div>
      <h3 style={{ fontSize: 'var(--text-lg)', marginBottom: 8 }}>{title}</h3>
      <p
        style={{
          color: 'var(--color-text-secondary)',
          fontSize: 'var(--text-sm)',
        }}
      >
        {desc}
      </p>
    </div>
  );
}

function HeroVisual() {
  return (
    <div
      style={{
        position: 'relative',
        height: 360,
        borderRadius: 'var(--radius-xl)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-xl)',
        background:
          'linear-gradient(135deg, #1f8a55 0%, #4ba87b 60%, #c9a961 100%)',
      }}
      aria-hidden
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(to bottom, rgba(11,61,145,.0) 30%, rgba(11,61,145,.85))',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 24,
          right: 24,
          bottom: 24,
          color: '#fff',
        }}
      >
        <div
          style={{
            fontSize: 12,
            letterSpacing: '0.08em',
            color: 'var(--color-accent)',
            marginBottom: 6,
          }}
        >
          FEATURED
        </div>
        <div
          style={{
            fontSize: 'var(--text-lg)',
            fontWeight: 700,
            lineHeight: 1.3,
          }}
        >
          청담 더 라운지 — 우드 톤과 라운지형 가구로 따뜻한 거실
        </div>
        <div
          style={{
            display: 'flex',
            gap: 12,
            marginTop: 12,
            fontSize: 13,
            color: 'rgba(255,255,255,.85)',
          }}
        >
          <span>2024 · 32평</span>
          <span>·</span>
          <span>8주</span>
        </div>
      </div>
    </div>
  );
}
