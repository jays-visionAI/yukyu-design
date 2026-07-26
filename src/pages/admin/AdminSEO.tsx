import React, { useEffect, useMemo, useState } from 'react';
import { useAnalytics } from '../../data/AnalyticsContext';
import { useToast } from '../../components/Toast';
import type { SeoSettings } from '../../data/analytics';

// ============================================================
//  AdminSEO — 검색 최적화 / 소셜 공유 / 구조화 데이터 / Sitemap/robots
// ============================================================

type Tab = 'overview' | 'meta' | 'pages' | 'sitemap' | 'jsonld' | 'tracking';

export default function AdminSEO() {
  const [renderErr, setRenderErr] = useState<string | null>(null);
  if (renderErr) {
    return (
      <div style={{ padding: 40, color: '#b00', fontFamily: 'monospace' }}>
        <h2>AdminSEO 렌더 에러</h2>
        <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>{renderErr}</pre>
      </div>
    );
  }
  try {
    return AdminSEORender();
  } catch (e) {
    const msg = e instanceof Error ? `${e.name}: ${e.message}\n\n${e.stack ?? ''}` : String(e);
    console.error('[AdminSEO] render error:', msg);
    setRenderErr(msg);
    return null;
  }
}

function AdminSEORender(): React.ReactElement {
  const { seo, saveSeo, resetSeo } = useAnalytics();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('overview');
  const [draft, setDraft] = useState<SeoSettings>(seo);

  // seo 참조는 saveSeo/실시간 구독/이벤트 추적 등으로 매 렌더마다
  // 새 객체가 들어오지만, 실제 사용자 편집 내용이 들어 있을 때는
  // draft 를 덮어쓰면 안 된다. updatedAt 같은 메타 필드가 흔들려도
  // "내용이 바뀐 경우에만" 동기화하도록 문자열 시그니처로 비교한다.
  const seoSignature = useMemo(
    () => JSON.stringify({ ...seo, updatedAt: '' }),
    [seo]
  );

  // updatedAt 을 제외한 본문 시그니처로만 비교 → 1초 단위 메타 갱신에
  // 흔들려도 dirty 가 토글되지 않는다.
  const dirty = useMemo(
    () => JSON.stringify({ ...draft, updatedAt: '' }) !== seoSignature,
    [draft, seoSignature]
  );

  // ⚠️ 핵심: dirty 일 때는 draft 가 사용자 편집 상태이므로 seo 로 덮어쓰지
  // 않는다. 그렇지 않으면 매 렌더마다 setDraft(seo) 가 호출되어 사용자가 방금
  // 친 글자가 즉시 원본으로 복원되어 저장 버튼이 절대 켜지지 않는다.
  // 저장 직후 / 기본값 복원 직후 등 dirty=false 인 시점에만 동기화한다.
  // 의존성에 dirty 를 포함시켜 dirty 토글 시점에만 effect 가 발화하도록 하고,
  // signature 비교는 effect 내부에서 수행하여 매 렌더 발동을 방지한다.
  useEffect(() => {
    if (!dirty) setDraft(seo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seoSignature, dirty]);

  function apply() {
    saveSeo(draft);
    toast.push('SEO 설정이 저장되었습니다.');
  }

  function restoreDefaults() {
    if (!window.confirm('기본 SEO 설정으로 되돌릴까요?')) return;
    const next = resetSeo();
    setDraft(next);
    toast.push('기본값으로 복원되었습니다.');
  }

  return (
    <div style={{ padding: '32px 36px' }}>
      <div className="row-between" style={{ marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)' }}>SEO 설정</h1>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            검색엔진 · 소셜 공유 · 구조화 데이터를 한 곳에서 관리합니다.
          </p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={restoreDefaults}>
            기본값 복원
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={apply}
            disabled={!dirty}
          >
            저장
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 4,
          padding: 4,
          background: 'var(--color-bg-card)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          marginBottom: 16,
          width: 'fit-content',
          flexWrap: 'wrap',
        }}
      >
        {(
          [
            { key: 'overview', label: '대시보드' },
            { key: 'meta', label: '메타 태그' },
            { key: 'pages', label: '페이지별 설정' },
            { key: 'jsonld', label: '구조화 데이터' },
            { key: 'sitemap', label: 'Sitemap · robots' },
            { key: 'tracking', label: '추적 ID' },
          ] as { key: Tab; label: string }[]
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '8px 14px',
              border: 'none',
              borderRadius: 8,
              background: tab === t.key ? 'var(--color-primary)' : 'transparent',
              color: tab === t.key ? '#fff' : 'var(--color-text-secondary)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && <Overview seo={draft} setDraft={setDraft} />}
      {tab === 'meta' && <MetaTags seo={draft} setDraft={setDraft} />}
      {tab === 'pages' && <PerPage seo={draft} setDraft={setDraft} />}
      {tab === 'jsonld' && <JsonLd seo={draft} setDraft={setDraft} />}
      {tab === 'sitemap' && <SitemapRobots seo={draft} setDraft={setDraft} />}
      {tab === 'tracking' && <TrackingIds seo={draft} setDraft={setDraft} />}
    </div>
  );
}

// ============================================================
//  Overview (live SERP + share preview)
// ============================================================

function Overview({
  seo,
  setDraft,
}: {
  seo: SeoSettings;
  setDraft: (u: (d: SeoSettings) => SeoSettings) => void;
}) {
  const characterWarnings = useMemo(() => {
    const out: string[] = [];
    if (seo.siteTitle.length > 60) out.push(`사이트 제목이 ${seo.siteTitle.length}자입니다 (권장 ≤ 60자).`);
    if (seo.siteDescription.length > 160)
      out.push(
        `사이트 설명이 ${seo.siteDescription.length}자입니다 (권장 ≤ 160자).`
      );
    return out;
  }, [seo.siteTitle, seo.siteDescription]);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 16,
      }}
    >
      <div className="card card-tight">
        <h2 style={{ fontSize: 'var(--text-lg)', marginBottom: 12 }}>Google 검색 미리보기</h2>
        <SerpPreview title={seo.siteTitle} description={seo.siteDescription} url={seo.canonicalUrl} />
        <div className="divider" />
        <h3 style={{ fontSize: 'var(--text-md)', marginBottom: 8 }}>
          길이 진단
        </h3>
        <LengthMeter label="사이트 제목" value={seo.siteTitle} max={60} />
        <div style={{ height: 8 }} />
        <LengthMeter label="사이트 설명" value={seo.siteDescription} max={160} />
        {characterWarnings.length > 0 && (
          <div
            style={{
              marginTop: 12,
              padding: 12,
              background: 'var(--color-warning)',
              color: '#fff',
              borderRadius: 'var(--radius-md)',
              fontSize: 13,
            }}
          >
            <strong>⚠ 개선 권장</strong>
            <ul style={{ margin: '6px 0 0 18px', padding: 0 }}>
              {characterWarnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </div>
        )}
        <div className="divider" />
        <h3 style={{ fontSize: 'var(--text-md)', marginBottom: 8 }}>빠른 편집</h3>
        <Input
          label="사이트 제목"
          value={seo.siteTitle}
          onChange={(v) =>
            setDraft((d) => ({
              ...d,
              siteTitle: v,
            }))
          }
        />
        <div style={{ height: 8 }} />
        <Textarea
          label="사이트 설명"
          value={seo.siteDescription}
          onChange={(v) =>
            setDraft((d) => ({
              ...d,
              siteDescription: v,
            }))
          }
        />
      </div>
      <div className="card card-tight">
        <h2 style={{ fontSize: 'var(--text-lg)', marginBottom: 12 }}>소셜 공유 미리보기</h2>
        <SocialPreview
          title={seo.siteTitle}
          description={seo.siteDescription}
          image={seo.ogImageUrl}
          url={seo.canonicalUrl}
          twitter={seo.twitterHandle}
        />
        <div className="divider" />
        <h3 style={{ fontSize: 'var(--text-md)', marginBottom: 8 }}>
          추천 다음 단계
        </h3>
        <Checklist seo={seo} />
      </div>
    </div>
  );
}

function LengthMeter({ label, value, max }: { label: string; value: string; max: number }) {
  const ratio = Math.min(1, value.length / max);
  const status = value.length > max ? 'over' : ratio > 0.85 ? 'near' : 'ok';
  const color =
    status === 'over' ? 'var(--color-danger)' : status === 'near' ? 'var(--color-warning)' : 'var(--color-success)';
  return (
    <div>
      <div className="row-between" style={{ fontSize: 12, marginBottom: 4 }}>
        <span style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
        <span style={{ fontWeight: 700, color }}>
          {value.length} / {max}
        </span>
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
            width: `${ratio * 100}%`,
            background: color,
            height: '100%',
          }}
        />
      </div>
    </div>
  );
}

function Checklist({ seo }: { seo: SeoSettings }) {
  const checks: { ok: boolean; label: string }[] = [
    { ok: seo.siteTitle.length > 0, label: '사이트 제목 설정' },
    { ok: seo.siteDescription.length >= 60, label: '사이트 설명 60자 이상' },
    { ok: seo.siteKeywords.length > 0, label: '키워드 최소 1개' },
    { ok: seo.ogImageUrl.startsWith('http'), label: '소셜 공유 이미지 URL' },
    { ok: !!seo.jsonLdBusinessName, label: '구조화 데이터 — 업체명' },
    { ok: !!seo.ga4MeasurementId, label: 'GA4 측정 ID 설정' },
    { ok: seo.sitemapEnabled, label: 'Sitemap 활성화' },
    { ok: !!seo.googleVerification || !!seo.naverVerification, label: '검색엔진 소유 확인' },
  ];
  return (
    <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
      {checks.map((c) => (
        <li
          key={c.label}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '6px 0',
            fontSize: 13,
          }}
        >
          <span
            style={{
              width: 18,
              height: 18,
              borderRadius: 999,
              background: c.ok ? 'var(--color-success)' : 'var(--color-bg-muted)',
              color: c.ok ? '#fff' : 'var(--color-text-tertiary)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              fontWeight: 800,
            }}
          >
            {c.ok ? '✓' : '·'}
          </span>
          <span style={{ color: c.ok ? 'var(--color-text-primary)' : 'var(--color-text-secondary)' }}>
            {c.label}
          </span>
        </li>
      ))}
    </ul>
  );
}

// ============================================================
//  Meta tags tab
// ============================================================

function MetaTags({
  seo,
  setDraft,
}: {
  seo: SeoSettings;
  setDraft: (u: (d: SeoSettings) => SeoSettings) => void;
}) {
  return (
    <div className="card card-tight">
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 16,
        }}
      >
        <Input
          label="사이트 제목 (title)"
          value={seo.siteTitle}
          onChange={(v) => setDraft((d) => ({ ...d, siteTitle: v }))}
          hint="브라우저 탭 / 검색 결과 제목에 노출됩니다."
        />
        <Input
          label="Twitter 핸들 (@yukyudesign)"
          value={seo.twitterHandle}
          onChange={(v) => setDraft((d) => ({ ...d, twitterHandle: v }))}
        />
        <Textarea
          label="메타 설명 (description)"
          value={seo.siteDescription}
          onChange={(v) => setDraft((d) => ({ ...d, siteDescription: v }))}
          hint="검색결과와 소셜 미리보기에 공통으로 노출됩니다."
        />
        <Textarea
          label="키워드 (쉼표 구분)"
          value={seo.siteKeywords.join(', ')}
          onChange={(v) =>
            setDraft((d) => ({
              ...d,
              siteKeywords: v
                .split(',')
                .map((k) => k.trim())
                .filter(Boolean),
            }))
          }
        />
        <Input
          label="정규 URL (canonical)"
          value={seo.canonicalUrl}
          onChange={(v) => setDraft((d) => ({ ...d, canonicalUrl: v }))}
          hint="대표 도메인 (https 포함)"
        />
        <Input
          label="소셜 공유 이미지 (OG)"
          value={seo.ogImageUrl}
          onChange={(v) => setDraft((d) => ({ ...d, ogImageUrl: v }))}
          hint="1200×630 권장. 절대 URL"
        />
      </div>
      <div className="divider" />
      <h3 style={{ fontSize: 'var(--text-md)', marginBottom: 8 }}>
        자동 생성 헤더 (저장 시 즉시 반영)
      </h3>
      <AutoMetaPreview seo={seo} />
    </div>
  );
}

function AutoMetaPreview({ seo }: { seo: SeoSettings }) {
  return (
    <pre
      style={{
        background: '#0b1224',
        color: '#cbd5e1',
        padding: 16,
        borderRadius: 'var(--radius-md)',
        fontSize: 12,
        overflow: 'auto',
        lineHeight: 1.6,
      }}
    >{`<title>${seo.siteTitle}</title>
<meta name="description" content="${seo.siteDescription}" />
<meta name="keywords" content="${seo.siteKeywords.join(', ')}" />
<link rel="canonical" href="${seo.canonicalUrl}" />

<!-- Open Graph -->
<meta property="og:type" content="website" />
<meta property="og:site_name" content="${seo.jsonLdBusinessName || 'Yukyu Design'}" />
<meta property="og:title" content="${seo.siteTitle}" />
<meta property="og:description" content="${seo.siteDescription}" />
<meta property="og:url" content="${seo.canonicalUrl}" />
<meta property="og:image" content="${seo.ogImageUrl}" />

<!-- Twitter -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:site" content="${seo.twitterHandle}" />
<meta name="twitter:title" content="${seo.siteTitle}" />
<meta name="twitter:description" content="${seo.siteDescription}" />
<meta name="twitter:image" content="${seo.ogImageUrl}" />`}</pre>
  );
}

// ============================================================
//  Per-page meta
// ============================================================

function PerPage({
  seo,
  setDraft,
}: {
  seo: SeoSettings;
  setDraft: (u: (d: SeoSettings) => SeoSettings) => void;
}) {
  const [newPath, setNewPath] = useState('');
  const entries = Object.entries(seo.pageMeta);

  function add() {
    const path = newPath.trim();
    if (!path || !path.startsWith('/')) return;
    if (seo.pageMeta[path]) return;
    setDraft((d) => ({
      ...d,
      pageMeta: {
        ...d.pageMeta,
        [path]: { title: '', description: '' },
      },
    }));
    setNewPath('');
  }

  function remove(path: string) {
    setDraft((d) => {
      const next = { ...d.pageMeta };
      delete next[path];
      return { ...d, pageMeta: next };
    });
  }

  function update(path: string, key: 'title' | 'description', v: string) {
    setDraft((d) => ({
      ...d,
      pageMeta: {
        ...d.pageMeta,
        [path]: {
          ...d.pageMeta[path],
          [key]: v,
        },
      },
    }));
  }

  return (
    <div className="card card-tight">
      <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', marginBottom: 12 }}>
        경로별로 다른 제목/설명/OG 가 노출되도록 설정할 수 있습니다. 비워두면 사이트 기본값을
        사용합니다.
      </p>
      <div className="row" style={{ marginBottom: 12, gap: 8 }}>
        <input
          className="input"
          placeholder="예: /services/interior"
          value={newPath}
          onChange={(e) => setNewPath(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') add();
          }}
          style={{ maxWidth: 320 }}
        />
        <button type="button" className="btn btn-outline btn-sm" onClick={add}>
          + 페이지 추가
        </button>
      </div>
      <div className="stack" style={{ gap: 14 }}>
        {entries.map(([path, meta]) => (
          <div
            key={path}
            style={{
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: 14,
            }}
          >
            <div className="row-between" style={{ marginBottom: 8 }}>
              <code
                style={{
                  background: 'var(--color-primary-light)',
                  color: 'var(--color-primary)',
                  padding: '4px 10px',
                  borderRadius: 6,
                  fontWeight: 700,
                }}
              >
                {path}
              </code>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ color: 'var(--color-danger)' }}
                onClick={() => remove(path)}
              >
                삭제
              </button>
            </div>
            <div className="row" style={{ gap: 10 }}>
              <div className="field" style={{ flex: 1 }}>
                <label className="field-label">title</label>
                <input
                  className="input"
                  value={meta.title}
                  onChange={(e) => update(path, 'title', e.target.value)}
                  placeholder="페이지 제목"
                />
              </div>
              <div className="field" style={{ flex: 1 }}>
                <label className="field-label">description</label>
                <input
                  className="input"
                  value={meta.description}
                  onChange={(e) => update(path, 'description', e.target.value)}
                  placeholder="페이지 설명"
                />
              </div>
            </div>
          </div>
        ))}
        {entries.length === 0 && (
          <div className="empty" style={{ padding: 24 }}>
            등록된 페이지가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
//  JSON-LD (LocalBusiness)
// ============================================================

function JsonLd({
  seo,
  setDraft,
}: {
  seo: SeoSettings;
  setDraft: (u: (d: SeoSettings) => SeoSettings) => void;
}) {
  const json = useMemo(() => buildLocalBusinessJsonLd(seo), [seo]);
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 16,
      }}
    >
      <div className="card card-tight">
        <h2 style={{ fontSize: 'var(--text-lg)', marginBottom: 12 }}>업체 정보</h2>
        <Input
          label="업체명"
          value={seo.jsonLdBusinessName}
          onChange={(v) => setDraft((d) => ({ ...d, jsonLdBusinessName: v }))}
        />
        <div style={{ height: 8 }} />
        <Input
          label="전화번호"
          value={seo.jsonLdPhone}
          onChange={(v) => setDraft((d) => ({ ...d, jsonLdPhone: v }))}
        />
        <div style={{ height: 8 }} />
        <Input
          label="주소"
          value={seo.jsonLdAddress}
          onChange={(v) => setDraft((d) => ({ ...d, jsonLdAddress: v }))}
        />
        <div style={{ height: 8 }} />
        <Input
          label="영업시간"
          value={seo.jsonLdHours}
          onChange={(v) => setDraft((d) => ({ ...d, jsonLdHours: v }))}
        />
        <div style={{ height: 8 }} />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 8,
          }}
        >
          <Input
            label="위도"
            value={String(seo.jsonLdLatitude ?? '')}
            onChange={(v) =>
              setDraft((d) => ({
                ...d,
                jsonLdLatitude: v === '' ? undefined : Number(v),
              }))
            }
          />
          <Input
            label="경도"
            value={String(seo.jsonLdLongitude ?? '')}
            onChange={(v) =>
              setDraft((d) => ({
                ...d,
                jsonLdLongitude: v === '' ? undefined : Number(v),
              }))
            }
          />
        </div>
      </div>
      <div className="card card-tight">
        <h2 style={{ fontSize: 'var(--text-lg)', marginBottom: 12 }}>JSON-LD 미리보기</h2>
        <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginBottom: 8 }}>
          아래 JSON-LD 가 <code>&lt;script type=&quot;application/ld+json&quot;&gt;</code>로
          자동 삽입됩니다.
        </p>
        <pre
          style={{
            background: '#0b1224',
            color: '#cbd5e1',
            padding: 16,
            borderRadius: 'var(--radius-md)',
            fontSize: 12,
            overflow: 'auto',
            maxHeight: 420,
            lineHeight: 1.55,
          }}
        >
          {JSON.stringify(json, null, 2)}
        </pre>
      </div>
    </div>
  );
}

function buildLocalBusinessJsonLd(seo: SeoSettings) {
  const obj: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'HomeAndConstructionBusiness',
    name: seo.jsonLdBusinessName,
    description: seo.siteDescription,
    url: seo.canonicalUrl,
    telephone: seo.jsonLdPhone,
    address: {
      '@type': 'PostalAddress',
      streetAddress: seo.jsonLdAddress,
      addressCountry: 'KR',
    },
    openingHours: seo.jsonLdHours,
    image: seo.ogImageUrl,
  };
  if (seo.jsonLdLatitude && seo.jsonLdLongitude) {
    obj.geo = {
      '@type': 'GeoCoordinates',
      latitude: seo.jsonLdLatitude,
      longitude: seo.jsonLdLongitude,
    };
  }
  if (seo.siteKeywords.length) obj.keywords = seo.siteKeywords.join(', ');
  return obj;
}

// ============================================================
//  Sitemap & Robots
// ============================================================

function SitemapRobots({
  seo,
  setDraft,
}: {
  seo: SeoSettings;
  setDraft: (u: (d: SeoSettings) => SeoSettings) => void;
}) {
  const robots = useMemo(() => buildRobots(seo), [seo]);
  const sitemap = useMemo(() => buildSitemap(seo), [seo]);
  const toast = useToast();

  function copy(text: string) {
    navigator.clipboard
      .writeText(text)
      .then(() => toast.success('클립보드에 복사되었습니다.'))
      .catch(() => {
        toast.error('클립보드 접근이 차단되었습니다.');
      });
  }

  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="card card-tight">
        <h2 style={{ fontSize: 'var(--text-lg)', marginBottom: 12 }}>robots.txt</h2>
        <div className="row" style={{ gap: 12, marginBottom: 12 }}>
          <div className="field">
            <label className="field-label">색인 정책</label>
            <select
              className="select"
              value={seo.robotsPolicy}
              onChange={(e) =>
                setDraft((d) => ({ ...d, robotsPolicy: e.target.value as SeoSettings['robotsPolicy'] }))
              }
            >
              <option value="index,follow">index, follow (기본)</option>
              <option value="index,nofollow">index, nofollow</option>
              <option value="noindex,nofollow">noindex, nofollow (검색 제외)</option>
            </select>
          </div>
        </div>
        <pre
          style={{
            background: '#0b1224',
            color: '#cbd5e1',
            padding: 14,
            borderRadius: 'var(--radius-md)',
            fontSize: 12,
            overflow: 'auto',
          }}
        >
          {robots}
        </pre>
        <div style={{ marginTop: 8, textAlign: 'right' }}>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => copy(robots)}
          >
            복사
          </button>
        </div>
      </div>
      <div className="card card-tight">
        <div className="row-between" style={{ marginBottom: 12 }}>
          <h2 style={{ fontSize: 'var(--text-lg)' }}>sitemap.xml</h2>
          <label className="row" style={{ gap: 6, fontSize: 13, fontWeight: 600 }}>
            <input
              type="checkbox"
              checked={seo.sitemapEnabled}
              onChange={(e) => setDraft((d) => ({ ...d, sitemapEnabled: e.target.checked }))}
            />
            생성 활성화
          </label>
        </div>
        <div className="row" style={{ gap: 12, marginBottom: 12 }}>
          <div className="field">
            <label className="field-label">업데이트 빈도 (changefreq)</label>
            <select
              className="select"
              value={seo.sitemapChangefreq}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  sitemapChangefreq: e.target.value as SeoSettings['sitemapChangefreq'],
                }))
              }
            >
              <option value="daily">daily</option>
              <option value="weekly">weekly</option>
              <option value="monthly">monthly</option>
            </select>
          </div>
        </div>
        <pre
          style={{
            background: '#0b1224',
            color: '#cbd5e1',
            padding: 14,
            borderRadius: 'var(--radius-md)',
            fontSize: 12,
            overflow: 'auto',
            maxHeight: 320,
          }}
        >
          {seo.sitemapEnabled ? sitemap : '<!-- sitemap 비활성화됨 -->'}
        </pre>
        <div style={{ marginTop: 8, textAlign: 'right' }}>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => {
              if (!seo.sitemapEnabled) return;
              copy(sitemap);
            }}
            disabled={!seo.sitemapEnabled}
          >
            복사
          </button>
        </div>
        <p style={{ marginTop: 12, fontSize: 12, color: 'var(--color-text-tertiary)' }}>
          * 정적 호스팅 환경에서는 /robots.txt, /sitemap.xml 두 파일을 도메인 루트에 추가하면
          즉시 검색엔진이 인식합니다. 본 페이지는 XML을 생성해 클립보드로 복사할 수 있습니다.
        </p>
      </div>
    </div>
  );
}



function buildRobots(seo: SeoSettings) {
  const lines = [
    `User-agent: *`,
    `Disallow:`,
    `Allow: /`,
    ``,
    `# 정책: ${seo.robotsPolicy}`,
  ];
  if (seo.sitemapEnabled) {
    lines.push(`Sitemap: ${seo.canonicalUrl.replace(/\/$/, '')}/sitemap.xml`);
  }
  return lines.join('\n');
}

function buildSitemap(seo: SeoSettings) {
  const base = seo.canonicalUrl.replace(/\/$/, '');
  const today = new Date().toISOString().slice(0, 10);
  const paths = Array.from(
    new Set(['/', '/quote', '/portfolio', ...Object.keys(seo.pageMeta)])
  );
  const urls = paths
    .map(
      (p) =>
        `  <url>\n    <loc>${base}${p}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${seo.sitemapChangefreq}</changefreq>\n    <priority>${p === '/' ? '1.0' : '0.8'}</priority>\n  </url>`
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
}

// ============================================================
//  Tracking ids
// ============================================================

function TrackingIds({
  seo,
  setDraft,
}: {
  seo: SeoSettings;
  setDraft: (u: (d: SeoSettings) => SeoSettings) => void;
}) {
  return (
    <div className="card card-tight">
      <h2 style={{ fontSize: 'var(--text-lg)', marginBottom: 12 }}>검색엔진 소유 확인</h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 12,
        }}
      >
        <Input
          label="Google Search Console meta tag"
          value={seo.googleVerification ?? ''}
          onChange={(v) => setDraft((d) => ({ ...d, googleVerification: v }))}
          hint="content 값만 입력"
        />
        <Input
          label="Naver Search Advisor meta tag"
          value={seo.naverVerification ?? ''}
          onChange={(v) => setDraft((d) => ({ ...d, naverVerification: v }))}
          hint="content 값만 입력"
        />
      </div>
      <div className="divider" />
      <h2 style={{ fontSize: 'var(--text-lg)', marginBottom: 12 }}>분석 추적 ID</h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: 12,
        }}
      >
        <Input
          label="GA4 측정 ID (G-XXXXXXXX)"
          value={seo.ga4MeasurementId ?? ''}
          onChange={(v) => setDraft((d) => ({ ...d, ga4MeasurementId: v }))}
        />
        <Input
          label="Google Ads ID (AW-XXXXXXXX)"
          value={seo.googleAdsId ?? ''}
          onChange={(v) => setDraft((d) => ({ ...d, googleAdsId: v }))}
        />
        <Input
          label="Naver Analytics ID"
          value={seo.naverAnalyticsId ?? ''}
          onChange={(v) => setDraft((d) => ({ ...d, naverAnalyticsId: v }))}
        />
      </div>
      <p style={{ marginTop: 12, fontSize: 12, color: 'var(--color-text-tertiary)' }}>
        * 분석 스크립트 본체는 환경에 따라 GA4 / Naver 분석 스니펫을 페이지 head에 삽입하는
        단계가 따로 필요합니다. 본 화면은 메타데이터와 관리 콘솔의 트래킹 섹션만 관리합니다.
      </p>
    </div>
  );
}

// ============================================================
//  Inputs
// ============================================================

function Input({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}) {
  return (
    <div className="field">
      <label className="field-label">{label}</label>
      <input className="input" value={value} onChange={(e) => onChange(e.target.value)} />
      {hint && <div className="field-hint">{hint}</div>}
    </div>
  );
}

function Textarea({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}) {
  return (
    <div className="field">
      <label className="field-label">{label}</label>
      <textarea
        className="textarea"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ minHeight: 80 }}
      />
      {hint && <div className="field-hint">{hint}</div>}
    </div>
  );
}

// ============================================================
//  Visual previews
// ============================================================

function SerpPreview({
  title,
  description,
  url,
}: {
  title: string;
  description: string;
  url: string;
}) {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        padding: 14,
      }}
    >
      <div style={{ fontSize: 12, color: '#006621' }}>{url}</div>
      <div
        style={{
          color: '#1a0dab',
          fontSize: 18,
          fontWeight: 700,
          margin: '4px 0',
          lineHeight: 1.3,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitLineClamp: 1,
          WebkitBoxOrient: 'vertical',
        }}
      >
        {title || '사이트 제목'}
      </div>
      <div
        style={{
          color: '#4d5156',
          fontSize: 13,
          lineHeight: 1.5,
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
        }}
      >
        {description || '사이트 설명'}
      </div>
    </div>
  );
}

function SocialPreview({
  title,
  description,
  image,
  url,
  twitter,
}: {
  title: string;
  description: string;
  image: string;
  url: string;
  twitter: string;
}) {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          height: 140,
          background: `linear-gradient(135deg, var(--color-primary), var(--color-accent))`,
          display: 'grid',
          placeItems: 'center',
          color: '#fff',
          fontWeight: 700,
          fontSize: 13,
        }}
      >
        {image ? `🖼 ${image}` : 'OG 이미지'}
      </div>
      <div style={{ padding: 14 }}>
        <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>
          {url} · {twitter}
        </div>
        <div
          style={{
            fontSize: 16,
            fontWeight: 700,
            margin: '4px 0',
            color: 'var(--color-text-primary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 1,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {title || '공유 제목'}
        </div>
        <div
          style={{
            fontSize: 13,
            color: 'var(--color-text-secondary)',
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {description || '공유 설명'}
        </div>
      </div>
    </div>
  );
}
