import { useEffect, useState } from 'react';
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
          <div className="container hero-grid">
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
                Yukyu Design은 고객 한 분 한 분의 라이프 스타일에 맞춘
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
                  WHY YUKYU
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
              className="cards-3"
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
            <div className="cards-3">
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
                      height: 220,
                      background: p.images && p.images.length > 0
                        ? `url(${p.images[0]}) center/cover no-repeat`
                        : `linear-gradient(135deg, ${p.coverColor} 0%, ${p.coverAccent} 140%)`,
                      display: 'flex',
                      alignItems: 'flex-end',
                      padding: 18,
                      position: 'relative',
                    }}
                  >
                    {p.images && p.images.length > 1 && (
                      <span
                        style={{
                          position: 'absolute',
                          top: 12,
                          right: 12,
                          background: 'rgba(0,0,0,0.55)',
                          color: '#fff',
                          padding: '4px 10px',
                          borderRadius: 999,
                          fontSize: 11,
                          backdropFilter: 'blur(6px)',
                        }}
                      >
                        +{p.images.length - 1}장
                      </span>
                    )}
                    <span
                      style={{
                        background: 'rgba(0,0,0,0.45)',
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

// ============================================================
//  히어로 슬라이드쇼 (4장 인테리어 사진 · 3초 간격 자동 전환
//  + Ken Burns 슬로우 줌인 효과로 다이나믹한 인상)
// ============================================================
const HERO_SLIDES: {
  src: string;
  fallback: string;
  tag: string;
  title: string;
  meta: string;
}[] = [
  {
    src: '/assets/hero-1-living.jpg',
    fallback: 'linear-gradient(135deg, #1f8a55 0%, #4ba87b 50%, #c9a961 100%)',
    tag: '01 · LIVING ROOM',
    title: '청담 더 라운지 — 우드 톤과 라운지형 가구로 따뜻한 거실',
    meta: '2024 · 32평 · 8주',
  },
  {
    src: '/assets/hero-2-dining.jpg',
    fallback: 'linear-gradient(135deg, #8a6a4a 0%, #b89070 45%, #e8d5b8 100%)',
    tag: '02 · DINING',
    title: '한남 다이닝 — 페인티드 우드 테이블과 펜던트 조명이 만드는 결',
    meta: '2024 · 24평 · 6주',
  },
  {
    src: '/assets/hero-3-kitchen.jpg',
    fallback: 'linear-gradient(135deg, #2c3e50 0%, #5d6d7e 45%, #cdd5dc 100%)',
    tag: '03 · KITCHEN',
    title: '도곡 미니멀 키친 — 화이트 페인트와 브러시드 메탈의 모던함',
    meta: '2025 · 18평 · 5주',
  },
  {
    src: '/assets/hero-4-bedroom.jpg',
    fallback: 'linear-gradient(135deg, #6a4a7a 0%, #b07aa8 50%, #f0d9e8 100%)',
    tag: '04 · BEDROOM',
    title: '서초 호텔식 침실 — 린넨 월아트와 인디렉트 조명의 휴식처',
    meta: '2025 · 28평 · 7주',
  },
];

const HERO_INTERVAL_MS = 6000;
// Ken Burns 줌인이 6초 duration 으로 한 컷당 절반만 진행된 채 다음 슬라이드로
// 교체되어, 시작 부분의 정적 → 중간 줌인 → 다음 컷의 정적 이라는 리듬이 생깁니다.
// 슬라이드 전환은 crossfade 로 부드럽게 겹쳐집니다.

function HeroVisual() {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => {
      setIdx((i) => (i + 1) % HERO_SLIDES.length);
    }, HERO_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [paused]);

  const slide = HERO_SLIDES[idx];
  const prevSlide = HERO_SLIDES[(idx - 1 + HERO_SLIDES.length) % HERO_SLIDES.length];

  return (
    <div
      style={{
        position: 'relative',
        height: 360,
        borderRadius: 'var(--radius-xl)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-xl)',
        background: slide.fallback,
        cursor: 'pointer',
      }}
      role="region"
      aria-label="시공 사례 슬라이드쇼"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {/* 이전 슬라이드 — crossfade out 으로 부드럽게 사라짐 */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          background: prevSlide.fallback,
          animation: 'hero-crossfade-out 700ms ease-out forwards',
        }}
        key={`prev-${idx}`}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${prevSlide.src})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            transform: 'scale(1.08)',
            transformOrigin: 'center center',
          }}
        />
      </div>
      {/* 현재 슬라이드 — Ken Burns 슬로우 줌인 (6초) */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          background: slide.fallback,
        }}
        key={`cur-${idx}`}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${slide.src})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            animation: 'hero-kenburns 6000ms ease-out forwards',
            transformOrigin: 'center center',
          }}
        />
      </div>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(to bottom, rgba(11,61,145,.0) 30%, rgba(11,61,145,.85))',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 24,
          right: 24,
          bottom: 24,
          color: '#fff',
          animation: 'hero-fadein 600ms ease-out both',
        }}
        key={`txt-${idx}`}
      >
        <div
          style={{
            fontSize: 12,
            letterSpacing: '0.08em',
            color: 'var(--color-accent)',
            marginBottom: 6,
            fontWeight: 700,
          }}
        >
          {slide.tag}
        </div>
        <div
          style={{
            fontSize: 'var(--text-lg)',
            fontWeight: 700,
            lineHeight: 1.3,
            textShadow: '0 2px 12px rgba(0,0,0,.35)',
          }}
        >
          {slide.title}
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
          <span>{slide.meta}</span>
        </div>
      </div>

      {/* 진행 인디케이터 (4 dots) */}
      <div
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          display: 'flex',
          gap: 6,
          zIndex: 2,
        }}
        aria-hidden
      >
        {HERO_SLIDES.map((_, i) => (
          <span
            key={i}
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background:
                i === idx
                  ? 'var(--color-accent)'
                  : 'rgba(255,255,255,.35)',
              transition: 'background 240ms ease',
            }}
          />
        ))}
      </div>

      {/* 하단 progress bar — 현재 슬라이드의 경과 시간을 시각화 */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: 3,
          background: 'rgba(255,255,255,.18)',
          zIndex: 2,
        }}
      >
        <div
          key={`bar-${idx}-${paused ? 'p' : 'r'}`}
          style={{
            height: '100%',
            width: paused ? '0%' : '100%',
            transformOrigin: 'left center',
            background: 'var(--color-accent)',
            animation: paused
              ? undefined
              : `hero-progressbar ${HERO_INTERVAL_MS}ms linear forwards`,
          }}
        />
      </div>
    </div>
  );
}
