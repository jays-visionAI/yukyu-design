// ============================================================
//  useSeoHead — SEO 설정을 document <head>에 자동 반영
// ------------------------------------------------------------
//  • 관리자가 AdminSEO 에서 저장한 메타태그/JSON-LD를 모든
//    페이지에서 즉시 반영하도록 head 를 동기화합니다.
//  • 페이지별 pageMeta 가 있으면 그것을 우선 적용합니다.
// ============================================================

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAnalytics } from '../data/AnalyticsContext';

function ensureMeta(name: string, attr: 'name' | 'property', content: string) {
  if (typeof document === 'undefined') return;
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function ensureLink(rel: string, href: string) {
  if (typeof document === 'undefined') return;
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.rel = rel;
    document.head.appendChild(el);
  }
  el.href = href;
}

function ensureJsonLd(payload: Record<string, unknown>) {
  if (typeof document === 'undefined') return;
  let el = document.head.querySelector<HTMLScriptElement>(
    'script[data-yukye-seo-jsonld="1"]'
  );
  if (!el) {
    el = document.createElement('script');
    el.type = 'application/ld+json';
    el.setAttribute('data-yukye-seo-jsonld', '1');
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(payload);
}

export function useSeoHead() {
  const { seo } = useAnalytics();
  const location = useLocation();

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const path = location.pathname;
    const overrides = seo.pageMeta[path];
    const title = overrides?.title || seo.siteTitle;
    const description = overrides?.description || seo.siteDescription;

    // title
    document.title = title;

    // core meta
    ensureMeta('description', 'name', description);
    ensureMeta('keywords', 'name', seo.siteKeywords.join(', '));
    ensureMeta('robots', 'name', seo.robotsPolicy);
    ensureLink('canonical', `${seo.canonicalUrl.replace(/\/$/, '')}${path}`);

    // og / twitter
    ensureMeta('og:type', 'property', 'website');
    ensureMeta('og:site_name', 'property', seo.jsonLdBusinessName || 'Yukyu Design');
    ensureMeta('og:title', 'property', title);
    ensureMeta('og:description', 'property', description);
    ensureMeta('og:url', 'property', `${seo.canonicalUrl.replace(/\/$/, '')}${path}`);
    ensureMeta('og:image', 'property', seo.ogImageUrl);

    ensureMeta('twitter:card', 'name', 'summary_large_image');
    ensureMeta('twitter:site', 'name', seo.twitterHandle);
    ensureMeta('twitter:title', 'name', title);
    ensureMeta('twitter:description', 'name', description);
    ensureMeta('twitter:image', 'name', seo.ogImageUrl);

    // verifications
    if (seo.googleVerification) {
      ensureMeta('google-site-verification', 'name', seo.googleVerification);
    }
    if (seo.naverVerification) {
      ensureMeta('naver-site-verification', 'name', seo.naverVerification);
    }

    // JSON-LD
    const jsonld: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'HomeAndConstructionBusiness',
      name: seo.jsonLdBusinessName,
      description,
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
      jsonld.geo = {
        '@type': 'GeoCoordinates',
        latitude: seo.jsonLdLatitude,
        longitude: seo.jsonLdLongitude,
      };
    }
    if (seo.siteKeywords.length) jsonld.keywords = seo.siteKeywords.join(', ');
    ensureJsonLd(jsonld);
  }, [seo, location.pathname]);
}

// ============================================================
//  useAutoAnalytics — 페이지 진입/이탈 시 자동 pageview 기록
// ============================================================

import { useRef } from 'react';

export function useAutoAnalytics() {
  const { trackPageView } = useAnalytics();
  const location = useLocation();
  const enteredAt = useRef<number>(0);
  const currentPath = useRef<string>('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const path = location.pathname;

    // 떠날 때 duration/commit
    function commit() {
      if (!currentPath.current) return;
      const duration = Date.now() - enteredAt.current;
      const isEngaged = duration > 5000;
      trackPageView(currentPath.current, { durationMs: duration, isEngaged });
    }

    // 페이지 변경 직전(이전 페이지)에 대한 기록
    if (currentPath.current && currentPath.current !== path) {
      commit();
    }
    currentPath.current = path;
    enteredAt.current = Date.now();

    // 페이지 떠날 때 (SPA 내부 전환 + 새로고침/닫기)
    return () => {
      commit();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);
}
