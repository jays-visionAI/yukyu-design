// ============================================================
//  Analytics data layer (로컬 모드 1차 / ForgeDB 모드 2차)
// ------------------------------------------------------------
//  • 시드 데이터로 즉시 풍부한 분석 화면을 보여주기 위해 로컬
//    localStorage 기반 영속화 + 메모리 인덱스를 기본 구현합니다.
//  • ForgeDB 가 설정되어 있으면 동일 스키마(analytics_events,
//    seo_settings)에 대해 @forgedb/client 로 동기화합니다.
//  • RLS 정책은 관리자만 SELECT 가능하도록 만들어주세요.
// ============================================================

export type DeviceKind = 'desktop' | 'mobile' | 'tablet';

export interface AnalyticsEvent {
  id: string;
  at: string; // ISO
  sessionId: string;

  // 페이지 / 위치
  path: string; // e.g. "/", "/quote"
  referrer: string; // e.g. "https://google.com/" or "direct"
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;

  // 디바이스 / 환경
  device: DeviceKind;
  os: string; // e.g. "Windows", "Android"
  browser: string; // e.g. "Chrome"
  country: string; // e.g. "KR"
  region?: string;
  city?: string;

  // 지표
  durationMs: number; // 페이지에 머문 시간(ms)
  isEngaged: boolean; // durationMs > 5000 or scroll depth >= 50
}

// ===== SEO 설정 (관리자가 메타태그를 직접 편집) =====
export interface SeoSettings {
  // 사이트 전체 메타
  siteTitle: string;
  siteDescription: string;
  siteKeywords: string[];
  canonicalUrl: string;
  ogImageUrl: string;
  twitterHandle: string;

  // robots.txt / sitemap
  robotsPolicy: 'index,follow' | 'noindex,nofollow' | 'index,nofollow';
  sitemapEnabled: boolean;
  sitemapChangefreq: 'daily' | 'weekly' | 'monthly';

  // Google / Naver 검색 소유 확인
  googleVerification?: string;
  naverVerification?: string;

  // 구조화 데이터
  jsonLdBusinessName: string;
  jsonLdPhone: string;
  jsonLdAddress: string;
  jsonLdHours: string;
  jsonLdLatitude?: number;
  jsonLdLongitude?: number;

  // 분석 트래킹 ID (선택)
  ga4MeasurementId?: string;
  googleAdsId?: string;
  naverAnalyticsId?: string;

  // 페이지별 커스텀 (간단 매핑)
  pageMeta: Record<string, { title: string; description: string }>;

  updatedAt: string;
}

// ===== 시간 버킷 그루핑 =====
export type Granularity = 'hour' | 'day' | 'week' | 'month' | 'quarter';

export interface AnalyticsFilters {
  from: Date;
  to: Date;
  granularity: Granularity;
}

// ===== 유틸 =====
function genId(prefix = 'ev') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// ------------------------------------------------------------
//  사이트 기본 도메인 (SEO canonicalUrl / ogImageUrl 의 기본값)
// ------------------------------------------------------------
//  우선순위:
//    1) VITE_PUBLIC_SITE_URL 환경변수 (운영자가 빌드 시점에 주입)
//    2) 정적 기본값 yukyu.kr (커스텀 도메인 운영 도메인)
//  절대 https:// 없이 시작하지 말 것 — canonical/og 절대 URL 생성에 사용됨.
function resolveSiteUrl(): string {
  try {
    const fromEnv = (import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined)?.trim();
    if (fromEnv && /^https?:\/\//i.test(fromEnv)) {
      return fromEnv.replace(/\/+$/, '');
    }
  } catch {
    /* SSR / import.meta.env 비활성 환경 */
  }
  return 'https://yukyu.kr';
}

export const DEFAULT_SEO: SeoSettings = {
  siteTitle: 'Yukyu Design — 인테리어 시공 · 견적 · 포트폴리오',
  siteDescription:
    '아파트·빌라·오피스텔 인테리어 시공 전문 Yukyu Design. 1:1 맞춤 견적, 시공 진행경과 실시간 공유, 고객 만족도 기반 포트폴리오까지 한 번에.',
  siteKeywords: [
    '인테리어',
    '인테리어 시공',
    '아파트 인테리어',
    '빌라 인테리어',
    '인테리어 견적',
    'Yukyu Design',
  ],
  canonicalUrl: resolveSiteUrl(),
  ogImageUrl: `${resolveSiteUrl()}/og-cover.jpg`,
  twitterHandle: '@yukyudesign',
  robotsPolicy: 'index,follow',
  sitemapEnabled: true,
  sitemapChangefreq: 'weekly',
  googleVerification: '',
  naverVerification: '',
  jsonLdBusinessName: 'Blueforge D&I 사업부',
  jsonLdPhone: '+82-10-0000-0000',
  jsonLdAddress: '서울특별시 종로구 종로1길 50 더케이트윈타워 B동 2층',
  jsonLdHours: '평일 10:00 - 19:00 (토 10:00 - 14:00)',
  jsonLdLatitude: 37.5012,
  jsonLdLongitude: 127.0396,
  ga4MeasurementId: '',
  googleAdsId: '',
  naverAnalyticsId: '',
  pageMeta: {
    '/': {
      title: 'Yukyu Design — 인테리어 시공 전문',
      description:
        '욕구에 맞춘 1:1 인테리어 시공 — 24시간 내 맞춤 견적, 시공 진행경과 실시간 공유.',
    },
    '/quote': {
      title: '무료 견적 신청 — Yukyu Design',
      description:
        '시공 정보 30초 입력, 24시간 내 담당자가 맞춤 견적을 보내드립니다.',
    },
    '/portfolio': {
      title: '시공 포트폴리오 — Yukyu Design',
      description: '아파트·빌라·오피스텔 인테리어 시공 사례를 확인하세요.',
    },
  },
  updatedAt: new Date(0).toISOString(),
};

// ===== 시간 버킷 키 생성 =====
export function bucketKey(d: Date, gran: Granularity): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  if (gran === 'hour') return `${y}-${m}-${day} ${h}:00`;
  if (gran === 'day') return `${y}-${m}-${day}`;
  if (gran === 'week') {
    // ISO week
    const tmp = new Date(d);
    tmp.setHours(0, 0, 0, 0);
    const dayNum = (tmp.getDay() + 6) % 7; // Mon=0
    tmp.setDate(tmp.getDate() - dayNum + 3);
    const firstThursday = new Date(tmp.getFullYear(), 0, 4);
    const week =
      1 +
      Math.round(
        ((tmp.getTime() - firstThursday.getTime()) / 86400000 -
          3 +
          ((firstThursday.getDay() + 6) % 7)) /
          7
      );
    return `${tmp.getFullYear()}-W${String(week).padStart(2, '0')}`;
  }
  if (gran === 'month') return `${y}-${m}`;
  // quarter
  const q = Math.floor(d.getMonth() / 3) + 1;
  return `${y}-Q${q}`;
}

export function bucketLabel(key: string, gran: Granularity): string {
  if (gran === 'hour') return key.slice(11, 16);
  if (gran === 'day') return key.slice(5); // MM-DD
  if (gran === 'week') return key; // yyyy-Www
  if (gran === 'month') return key.slice(2); // yy-MM
  return key; // yyyy-Qq
}

export function nextBucket(key: string, gran: Granularity): string {
  const dt = bucketToDate(key, gran);
  if (gran === 'hour') dt.setHours(dt.getHours() + 1);
  else if (gran === 'day') dt.setDate(dt.getDate() + 1);
  else if (gran === 'week') dt.setDate(dt.getDate() + 7);
  else if (gran === 'month') dt.setMonth(dt.getMonth() + 1);
  else dt.setMonth(dt.getMonth() + 3);
  return bucketKey(dt, gran);
}

function bucketToDate(key: string, gran: Granularity): Date {
  if (gran === 'hour') {
    // "yyyy-MM-dd HH:00"
    const [date, hour] = key.split(' ');
    const [y, m, d] = date.split('-').map(Number);
    return new Date(y, m - 1, d, Number(hour.split(':')[0]));
  }
  if (gran === 'day') {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  if (gran === 'week') {
    // ISO week to Monday date (rough)
    const [y, w] = key.split('-W').map(Number);
    const jan4 = new Date(y, 0, 4);
    const jan4Dow = (jan4.getDay() + 6) % 7;
    const mondayWeek1 = new Date(jan4);
    mondayWeek1.setDate(jan4.getDate() - jan4Dow);
    const out = new Date(mondayWeek1);
    out.setDate(mondayWeek1.getDate() + (w - 1) * 7);
    return out;
  }
  if (gran === 'month') {
    const [y, m] = key.split('-').map(Number);
    return new Date(y, m - 1, 1);
  }
  // quarter
  const [y, q] = key.split('-Q').map(Number);
  return new Date(y, (q - 1) * 3, 1);
}

// ===== 시드 이벤트 (화면이 텅 비지 않도록 합성 데이터) =====
const SEED_PATHS = ['/', '/quote', '/quote/step-2', '/portfolio', '/quote/track'];
const SEED_REFERRERS = [
  'https://www.google.com/',
  'https://search.naver.com/',
  'https://m.search.naver.com/',
  'https://www.daum.net/',
  'https://blog.naver.com/',
  'https://www.instagram.com/',
  'https://m.facebook.com/',
  'https://t.co/',
  'https://ad.search.naver.com/',
  'https://www.youtube.com/',
  'direct',
];
const SEED_UTM = [
  undefined,
  undefined,
  undefined,
  undefined,
  { source: 'naver', medium: 'search' },
  { source: 'google', medium: 'search' },
  { source: 'instagram', medium: 'social' },
  { source: 'naver', medium: 'cpc', campaign: 'spring2026' },
  { source: 'google', medium: 'cpc', campaign: 'brand-keyword' },
  { source: 'blog', medium: 'referral' },
];
const SEED_DEVICES: { device: DeviceKind; os: string; browser: string }[] = [
  { device: 'mobile', os: 'Android', browser: 'Chrome' },
  { device: 'mobile', os: 'iOS', browser: 'Safari' },
  { device: 'mobile', os: 'iOS', browser: 'Safari' },
  { device: 'mobile', os: 'Android', browser: 'Samsung Internet' },
  { device: 'desktop', os: 'Windows', browser: 'Chrome' },
  { device: 'desktop', os: 'Windows', browser: 'Edge' },
  { device: 'desktop', os: 'macOS', browser: 'Safari' },
  { device: 'desktop', os: 'macOS', browser: 'Chrome' },
  { device: 'tablet', os: 'iPadOS', browser: 'Safari' },
];
const SEED_REGIONS: { country: string; region: string; city: string }[] = [
  { country: 'KR', region: '서울', city: '강남구' },
  { country: 'KR', region: '서울', city: '송파구' },
  { country: 'KR', region: '경기', city: '성남시' },
  { country: 'KR', region: '인천', city: '연수구' },
  { country: 'KR', region: '부산', city: '해운대구' },
  { country: 'KR', region: '대구', city: '수성구' },
  { country: 'JP', region: 'Tokyo', city: 'Shibuya' },
  { country: 'US', region: 'CA', city: 'Los Angeles' },
];

function pick<T>(arr: T[], rnd: () => number): T {
  return arr[Math.floor(rnd() * arr.length)];
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateSeedEvents(opts?: { daysBack?: number; perDay?: number }): AnalyticsEvent[] {
  const daysBack = opts?.daysBack ?? 60;
  const perDay = opts?.perDay ?? 18;
  const rnd = mulberry32(20260704);
  const out: AnalyticsEvent[] = [];
  const now = new Date();
  // 의도적으로 최근으로 갈수록 증가하는 트렌드 (성장 곡선)
  for (let d = daysBack - 1; d >= 0; d--) {
    const day = new Date(now);
    day.setDate(now.getDate() - d);
    const trend = 1 + (daysBack - d) * 0.04; // 점점 증가
    const weekend = day.getDay() === 0 || day.getDay() === 6 ? 0.7 : 1;
    const count = Math.max(2, Math.round(perDay * trend * weekend * (0.7 + rnd() * 0.6)));
    for (let i = 0; i < count; i++) {
      const at = new Date(day);
      at.setHours(Math.floor(rnd() * 24), Math.floor(rnd() * 60), Math.floor(rnd() * 60));
      const path = pick(SEED_PATHS, rnd);
      const ref = pick(SEED_REFERRERS, rnd);
      const utm = pick(SEED_UTM, rnd);
      const dev = pick(SEED_DEVICES, rnd);
      const reg = pick(SEED_REGIONS, rnd);
      const isLanding = path === '/' || rnd() < 0.6;
      out.push({
        id: genId('ev'),
        at: at.toISOString(),
        sessionId: `s_${Math.floor(at.getTime() / 1000 / 100)}_${Math.floor(rnd() * 9999)}`,
        path,
        referrer: ref === 'direct' ? '' : ref,
        utmSource: utm?.source,
        utmMedium: utm?.medium,
        utmCampaign: utm?.campaign,
        utmTerm: undefined,
        utmContent: undefined,
        device: dev.device,
        os: dev.os,
        browser: dev.browser,
        country: reg.country,
        region: reg.region,
        city: reg.city,
        durationMs: Math.floor((isLanding ? 8 + rnd() * 30 : 30 + rnd() * 180) * 1000),
        isEngaged: rnd() < 0.42,
      });
    }
  }
  // 시간순 정렬 (오래된 → 최신)
  out.sort((a, b) => +new Date(a.at) - +new Date(b.at));
  return out;
}

// ===== 채널 분류 (유입 경로 집계용) =====
export type Channel =
  | 'Organic Search'
  | 'Paid Search'
  | 'Social'
  | 'Referral'
  | 'Direct'
  | 'Email'
  | 'Display';

export function classifyChannel(ev: AnalyticsEvent): Channel {
  const src = (ev.utmSource ?? '').toLowerCase();
  const med = (ev.utmMedium ?? '').toLowerCase();
  const ref = ev.referrer.toLowerCase();
  if (med === 'cpc' || med === 'ppc' || med === 'paidsearch' || /\bads?\b/.test(src)) {
    return 'Paid Search';
  }
  if (med === 'social' || /instagram|facebook|t\.co|twitter|x\.com|naver_blog_blog|blog\.naver/.test(ref + src)) {
    return 'Social';
  }
  if (med === 'email' || med === 'newsletter') return 'Email';
  if (med === 'display' || med === 'banner') return 'Display';
  if (!ref && !src) return 'Direct';
  if (src === 'naver' || src === 'google' || src === 'daum' || src === 'bing') {
    return /cpc|paid/.test(med) ? 'Paid Search' : 'Organic Search';
  }
  if (ref.includes('google.') || ref.includes('naver.') || ref.includes('daum.') || ref.includes('bing.')) {
    return 'Organic Search';
  }
  if (ref) return 'Referral';
  return 'Direct';
}

// ===== 분석 집계 =====
export interface AnalyticsSummary {
  sessions: number;
  pageviews: number;
  uniqueVisitors: number; // distinct sessionId
  avgDurationSec: number;
  bounceRate: number; // single-page sessions %
  engagedRate: number;
  conversionCount: number; // /quote/step-2 진입
  conversionRate: number;
}

export function summarize(events: AnalyticsEvent[]): AnalyticsSummary {
  const sessions = new Map<string, number>();
  const pv = events.length;
  let totalDur = 0;
  let single = 0;
  let engagedCount = 0;
  let convCount = 0;
  for (const ev of events) {
    sessions.set(ev.sessionId, (sessions.get(ev.sessionId) ?? 0) + 1);
    totalDur += ev.durationMs;
    if (ev.isEngaged) engagedCount++;
    if (ev.path === '/quote/step-2') convCount++;
  }
  const total = sessions.size;
  for (const count of sessions.values()) if (count <= 1) single++;
  return {
    sessions: total,
    pageviews: pv,
    uniqueVisitors: total,
    avgDurationSec: pv === 0 ? 0 : Math.round(totalDur / pv / 1000),
    bounceRate: total === 0 ? 0 : single / total,
    engagedRate: pv === 0 ? 0 : engagedCount / pv,
    conversionCount: convCount,
    conversionRate: total === 0 ? 0 : convCount / total,
  };
}

export function groupByChannel(events: AnalyticsEvent[]): {
  channel: Channel;
  sessions: number;
  pageviews: number;
  conversions: number;
}[] {
  const map = new Map<Channel, { sessions: Set<string>; pv: number; conv: number }>();
  for (const ev of events) {
    const ch = classifyChannel(ev);
    const cur = map.get(ch) ?? { sessions: new Set(), pv: 0, conv: 0 };
    cur.sessions.add(ev.sessionId);
    cur.pv++;
    if (ev.path === '/quote/step-2') cur.conv++;
    map.set(ch, cur);
  }
  const order: Channel[] = [
    'Organic Search',
    'Paid Search',
    'Social',
    'Referral',
    'Email',
    'Display',
    'Direct',
  ];
  return order
    .filter((c) => map.has(c))
    .map((c) => ({
      channel: c,
      sessions: map.get(c)!.sessions.size,
      pageviews: map.get(c)!.pv,
      conversions: map.get(c)!.conv,
    }));
}

export function timeSeries(
  events: AnalyticsEvent[],
  gran: Granularity
): { key: string; label: string; pv: number; sessions: number; conv: number }[] {
  const buckets = new Map<string, { pv: number; sessions: Set<string>; conv: number }>();
  for (const ev of events) {
    const k = bucketKey(new Date(ev.at), gran);
    const cur = buckets.get(k) ?? { pv: 0, sessions: new Set(), conv: 0 };
    cur.pv++;
    cur.sessions.add(ev.sessionId);
    if (ev.path === '/quote/step-2') cur.conv++;
    buckets.set(k, cur);
  }
  // 버킷 사이 빈 키도 0으로 채워서 시계열 라인 끊김 방지
  if (buckets.size === 0) return [];
  const sortedKeys = [...buckets.keys()].sort();
  const start = sortedKeys[0];
  const end = sortedKeys[sortedKeys.length - 1];
  const out: { key: string; label: string; pv: number; sessions: number; conv: number }[] = [];
  let cur = start;
  let guard = 0;
  while (cur <= end && guard < 1000) {
    const data = buckets.get(cur) ?? { pv: 0, sessions: new Set(), conv: 0 };
    out.push({
      key: cur,
      label: bucketLabel(cur, gran),
      pv: data.pv,
      sessions: data.sessions.size,
      conv: data.conv,
    });
    cur = nextBucket(cur, gran);
    guard++;
  }
  return out;
}

export function topPages(events: AnalyticsEvent[]): {
  path: string;
  pv: number;
  avgDurationSec: number;
  bounceRate: number;
}[] {
  const map = new Map<string, { pv: number; dur: number; sessions: Set<string>; single: number }>();
  for (const ev of events) {
    const cur = map.get(ev.path) ?? {
      pv: 0,
      dur: 0,
      sessions: new Set(),
      single: 0,
    };
    cur.pv++;
    cur.dur += ev.durationMs;
    cur.sessions.add(ev.sessionId);
    map.set(ev.path, cur);
  }
  return [...map.entries()]
    .map(([path, v]) => {
      let single = 0;
      const sessionCounts = new Map<string, number>();
      for (const ev of events.filter((e) => e.path === path)) {
        sessionCounts.set(ev.sessionId, (sessionCounts.get(ev.sessionId) ?? 0) + 1);
      }
      for (const c of sessionCounts.values()) if (c <= 1) single++;
      const total = v.sessions.size;
      return {
        path,
        pv: v.pv,
        avgDurationSec: v.pv === 0 ? 0 : Math.round(v.dur / v.pv / 1000),
        bounceRate: total === 0 ? 0 : single / total,
      };
    })
    .sort((a, b) => b.pv - a.pv);
}

export function deviceBreakdown(events: AnalyticsEvent[]): {
  device: DeviceKind;
  pv: number;
  sessions: number;
}[] {
  const map = new Map<DeviceKind, { pv: number; sessions: Set<string> }>();
  for (const ev of events) {
    const cur = map.get(ev.device) ?? { pv: 0, sessions: new Set() };
    cur.pv++;
    cur.sessions.add(ev.sessionId);
    map.set(ev.device, cur);
  }
  return (['desktop', 'mobile', 'tablet'] as DeviceKind[])
    .filter((d) => map.has(d))
    .map((d) => ({
      device: d,
      pv: map.get(d)!.pv,
      sessions: map.get(d)!.sessions.size,
    }));
}

export function regionBreakdown(events: AnalyticsEvent[]): {
  country: string;
  region: string;
  city: string;
  sessions: number;
  pv: number;
}[] {
  const map = new Map<string, { country: string; region: string; city: string; sessions: Set<string>; pv: number }>();
  for (const ev of events) {
    const key = `${ev.country}|${ev.region ?? ''}|${ev.city ?? ''}`;
    const cur = map.get(key) ?? {
      country: ev.country,
      region: ev.region ?? '',
      city: ev.city ?? '',
      sessions: new Set(),
      pv: 0,
    };
    cur.sessions.add(ev.sessionId);
    cur.pv++;
    map.set(key, cur);
  }
  return [...map.values()]
    .map((v) => ({ ...v, sessions: v.sessions.size }))
    .sort((a, b) => b.sessions - a.sessions);
}

export function utmBreakdown(events: AnalyticsEvent[]): {
  source: string;
  medium: string;
  campaign: string;
  pv: number;
  sessions: number;
  conversions: number;
}[] {
  const map = new Map<string, { source: string; medium: string; campaign: string; pv: number; sessions: Set<string>; conversions: number }>();
  for (const ev of events) {
    const src = ev.utmSource ?? '(none)';
    const med = ev.utmMedium ?? '(none)';
    const camp = ev.utmCampaign ?? '(none)';
    const key = `${src}|${med}|${camp}`;
    const cur = map.get(key) ?? {
      source: src,
      medium: med,
      campaign: camp,
      pv: 0,
      sessions: new Set(),
      conversions: 0,
    };
    cur.pv++;
    cur.sessions.add(ev.sessionId);
    if (ev.path === '/quote/step-2') cur.conversions++;
    map.set(key, cur);
  }
  return [...map.values()]
    .map((v) => ({ ...v, sessions: v.sessions.size }))
    .sort((a, b) => b.pv - a.pv);
}

// ===== 이전 기간 대비 변화율 =====
export function pctDelta(curr: number, prev: number): number {
  if (prev === 0) return curr > 0 ? 100 : 0;
  return ((curr - prev) / prev) * 100;
}

export function previousPeriod(
  events: AnalyticsEvent[],
  filters: AnalyticsFilters
): AnalyticsEvent[] {
  const ms = filters.to.getTime() - filters.from.getTime();
  const prevTo = new Date(filters.from.getTime() - 1);
  const prevFrom = new Date(prevTo.getTime() - ms);
  return events.filter((e) => {
    const t = +new Date(e.at);
    return t >= +prevFrom && t <= +prevTo;
  });
}
