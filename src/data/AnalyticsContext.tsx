// ============================================================
//  AnalyticsContext — 분석 이벤트 + SEO 설정 상태
// ------------------------------------------------------------
//  • localStorage 영속화를 기본으로 하고, ForgeDB 가 켜져 있을 때만
//    동일 스키마 테이블에 동기화합니다.
//  • AdminConsole 에서 사용하는 집계 컴포넌트는 이 context 만
//    의존하므로 기존 DataContext 와 결합도를 낮춥니다.
// ============================================================

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  DEFAULT_SEO,
  generateSeedEvents,
  type AnalyticsEvent,
  type SeoSettings,
} from './analytics';
import { isForgeConfigured, getForge } from './forgeClient';

const EVENTS_KEY = 'yukye_design_analytics_v1';
const SEO_KEY = 'yukye_design_seo_v1';
const MAX_EVENTS = 5000; // 너무 커지지 않도록 상한

// ============================================================
//  localStorage 헬퍼
// ============================================================

function loadEvents(): AnalyticsEvent[] {
  try {
    const raw = localStorage.getItem(EVENTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AnalyticsEvent[];
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    /* ignore */
  }
  return generateSeedEvents({ daysBack: 60, perDay: 18 });
}

function saveEvents(events: AnalyticsEvent[]) {
  try {
    const trimmed = events.slice(-MAX_EVENTS);
    localStorage.setItem(EVENTS_KEY, JSON.stringify(trimmed));
  } catch {
    /* quota — 무시 */
  }
}

function loadSeo(): SeoSettings {
  try {
    const raw = localStorage.getItem(SEO_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SeoSettings;
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_SEO, updatedAt: new Date().toISOString() };
}

// saveSeo 는 useEffect 의존성에 묶여 내부에서 직접 호출되므로 별도 export 가 없음.

// (구현) ForgeDB 모드일 때 변경 이벤트/SEO 갱신을 다른 탭/세션에 broadcast
//          하고, 들어오는 변경은 로컬 state 와 즉시 머지합니다.
function useForgeRealtime(
  setEvents: React.Dispatch<React.SetStateAction<AnalyticsEvent[]>>,
  setSeo: React.Dispatch<React.SetStateAction<SeoSettings>>
) {
  useEffect(() => {
    if (!isForgeConfigured) return;
    let cancelled = false;
    let channel: { unsubscribe: () => void | Promise<void> } | null = null;
    try {
      const fb = getForge();
      const ch = fb.channel('yukye-analytics');
      ch.on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'analytics_events' },
        (payload: { new: Record<string, unknown> | null }) => {
          if (cancelled || !payload?.new) return;
          const row = payload.new as {
            id?: string;
            created_at?: string;
            path?: string;
            referrer?: string;
            utm_source?: string | null;
            utm_medium?: string | null;
            utm_campaign?: string | null;
            utm_term?: string | null;
            utm_content?: string | null;
            device?: AnalyticsEvent['device'];
            os?: string;
            browser?: string;
            country?: string;
            region?: string | null;
            city?: string | null;
            duration_ms?: number;
            is_engaged?: boolean;
            session_id?: string;
          };
          if (!row.id || !row.path) return;
          setEvents((prev) => {
            if (prev.some((e) => e.id === row.id)) return prev;
            const mapped: AnalyticsEvent = {
              id: row.id as string,
              at: row.created_at ?? new Date().toISOString(),
              sessionId: row.session_id ?? 'srv',
              path: row.path as string,
              referrer: row.referrer ?? '',
              utmSource: row.utm_source ?? undefined,
              utmMedium: row.utm_medium ?? undefined,
              utmCampaign: row.utm_campaign ?? undefined,
              utmTerm: row.utm_term ?? undefined,
              utmContent: row.utm_content ?? undefined,
              device: (row.device ?? 'desktop') as AnalyticsEvent['device'],
              os: row.os ?? 'Unknown',
              browser: row.browser ?? 'Unknown',
              country: row.country ?? 'KR',
              region: row.region ?? undefined,
              city: row.city ?? undefined,
              durationMs: row.duration_ms ?? 0,
              isEngaged: row.is_engaged ?? false,
            };
            return [...prev, mapped].slice(-MAX_EVENTS);
          });
        }
      )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'seo_settings' },
          (payload: { new: { payload?: SeoSettings } | null }) => {
            if (cancelled) return;
            const p = payload?.new?.payload;
            if (p && typeof p === 'object') setSeo(p);
          }
        )
        .subscribe((status: string) => {
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            console.warn('[ForgeDB] Analytics Realtime 상태:', status);
          }
        });
      channel = ch as unknown as { unsubscribe: () => void | Promise<void> };
    } catch (err) {
      console.warn('[ForgeDB] Analytics Realtime 구독 실패:', err);
    }
    return () => {
      cancelled = true;
      if (channel) void channel.unsubscribe();
    };
  }, [setEvents, setSeo]);
}

// ============================================================
//  디바이스 추정 (간단 UA 파서)
// ============================================================

function detectDevice(): AnalyticsEvent['device'] {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent;
  if (/iPad|Tablet/.test(ua)) return 'tablet';
  if (/Mobile|Android|iPhone/.test(ua)) return 'mobile';
  return 'desktop';
}

function detectOs(): string {
  if (typeof navigator === 'undefined') return 'Unknown';
  const ua = navigator.userAgent;
  if (/Windows/.test(ua)) return 'Windows';
  if (/Mac OS X|macOS/.test(ua)) return 'macOS';
  if (/iPhone|iPad|iPod/.test(ua)) return 'iOS';
  if (/Android/.test(ua)) return 'Android';
  return 'Unknown';
}

function detectBrowser(): string {
  if (typeof navigator === 'undefined') return 'Unknown';
  const ua = navigator.userAgent;
  if (/Edg\//.test(ua)) return 'Edge';
  if (/OPR\//.test(ua) || /Opera/.test(ua)) return 'Opera';
  if (/Chrome\//.test(ua) && !/Edg\//.test(ua)) return 'Chrome';
  if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) return 'Safari';
  if (/Firefox\//.test(ua)) return 'Firefox';
  if (/SamsungBrowser/.test(ua)) return 'Samsung Internet';
  return 'Unknown';
}

function genId(prefix = 'ev') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// ============================================================
//  UTM 파싱 (현재 URL 쿼리)
// ============================================================

function readUtm(): {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
} {
  if (typeof window === 'undefined') return {};
  const p = new URLSearchParams(window.location.search);
  const get = (k: string) => p.get(k) ?? undefined;
  return {
    utmSource: get('utm_source'),
    utmMedium: get('utm_medium'),
    utmCampaign: get('utm_campaign'),
    utmTerm: get('utm_term'),
    utmContent: get('utm_content'),
  };
}

interface AnalyticsContextValue {
  events: AnalyticsEvent[];
  seo: SeoSettings;
  trackPageView: (path: string, opts?: { durationMs?: number; isEngaged?: boolean }) => void;
  resetSeo: () => SeoSettings;
  saveSeo: (next: SeoSettings) => void;
  resetEvents: () => void;
  appendManualEvent: (e: Omit<AnalyticsEvent, 'id'>) => AnalyticsEvent;
  isAnalyticsReady: boolean;
  hasSeedData: boolean;
}

const AnalyticsContext = createContext<AnalyticsContextValue | null>(null);

const SESSION_KEY = 'yukye_design_anon_session_v1';
function getSessionId(): string {
  if (typeof window === 'undefined') return 'srv';
  let s = sessionStorage.getItem(SESSION_KEY);
  if (!s) {
    s = `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    sessionStorage.setItem(SESSION_KEY, s);
  }
  return s;
}

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<AnalyticsEvent[]>(() => loadEvents());
  const [seo, setSeo] = useState<SeoSettings>(() => loadSeo());
  const [hasSeedData] = useState<boolean>(() => events.length > 0);

  // ForgeDB 모드에서 외부 변경을 실시간 반영
  useForgeRealtime(setEvents, setSeo);

  // 이벤트가 바뀔 때마다 영속화 (성능: 1초 디바운스)
  useEffect(() => {
    const t = window.setTimeout(() => saveEvents(events), 600);
    return () => window.clearTimeout(t);
  }, [events]);

  useEffect(() => {
    // ⚠️ saveSeo 는 내부에서 setSeo 를 다시 호출하므로, 직접 호출하면
    //   seo → setSeo(stamped) → seo 변경 → effect 재실행 → ... 무한 루프.
    //   대신 localStorage 영속화만 직접 수행하고, ForgeDB 동기화도 직접 처리합니다.
    try {
      localStorage.setItem(SEO_KEY, JSON.stringify(seo));
    } catch {
      /* quota — 무시 */
    }
    if (isForgeConfigured) {
      try {
        const fb = getForge();
        fb.from('seo_settings')
          .upsert({ id: 'site', payload: seo, updated_at: seo.updatedAt })
          .then(({ error }) => {
            if (error) console.warn('[ForgeDB] SEO save 동기화 실패:', error);
          });
      } catch {
        /* ignore */
      }
    }
  }, [seo]);

  // === 페이지뷰 자동 추적 (클라이언트 사이드) ===
  const trackPageView = useCallback<AnalyticsContextValue['trackPageView']>(
    (path, opts) => {
      const at = new Date().toISOString();
      const utm = readUtm();
      const ref = typeof document !== 'undefined' ? document.referrer : '';
      const ev: AnalyticsEvent = {
        id: genId('ev'),
        at,
        sessionId: getSessionId(),
        path,
        referrer: ref,
        utmSource: utm.utmSource,
        utmMedium: utm.utmMedium,
        utmCampaign: utm.utmCampaign,
        utmTerm: utm.utmTerm,
        utmContent: utm.utmContent,
        device: detectDevice(),
        os: detectOs(),
        browser: detectBrowser(),
        country: 'KR', // ※ 정밀 지역은 서버가 필요. 데모는 KR 기본
        region: undefined,
        city: undefined,
        durationMs: opts?.durationMs ?? 0,
        isEngaged: opts?.isEngaged ?? false,
      };
      setEvents((prev) => [...prev, ev]);

      // ForgeDB 모드면 비동기 동기화 (실패해도 무관)
      if (isForgeConfigured) {
        try {
          const fb = getForge();
          fb.from('analytics_events')
            .insert({
              path: ev.path,
              referrer: ev.referrer,
              utm_source: ev.utmSource ?? null,
              utm_medium: ev.utmMedium ?? null,
              utm_campaign: ev.utmCampaign ?? null,
              utm_term: ev.utmTerm ?? null,
              utm_content: ev.utmContent ?? null,
              device: ev.device,
              os: ev.os,
              browser: ev.browser,
              country: ev.country,
              region: ev.region ?? null,
              city: ev.city ?? null,
              duration_ms: ev.durationMs,
              is_engaged: ev.isEngaged,
              session_id: ev.sessionId,
            })
            .then(({ error }) => {
              if (error) console.warn('[ForgeDB] trackPageView 동기화 실패:', error);
            });
        } catch (err) {
          console.warn('[ForgeDB] trackPageView 호출 실패:', err);
        }
      }
    },
    []
  );

  const resetSeo = useCallback(() => {
    const next: SeoSettings = { ...DEFAULT_SEO, updatedAt: new Date().toISOString() };
    setSeo(next);
    if (isForgeConfigured) {
      try {
        const fb = getForge();
        fb.from('seo_settings')
          .upsert({ id: 'site', payload: next, updated_at: next.updatedAt })
          .then(({ error }) => {
            if (error) console.warn('[ForgeDB] SEO reset 동기화 실패:', error);
          });
      } catch {
        /* ignore */
      }
    }
    return next;
  }, []);

  const saveSeo = useCallback((next: SeoSettings) => {
    const stamped = { ...next, updatedAt: new Date().toISOString() };
    setSeo(stamped);
    if (isForgeConfigured) {
      try {
        const fb = getForge();
        fb.from('seo_settings')
          .upsert({ id: 'site', payload: stamped, updated_at: stamped.updatedAt })
          .then(({ error }) => {
            if (error) console.warn('[ForgeDB] SEO save 동기화 실패:', error);
          });
      } catch {
        /* ignore */
      }
    }
  }, []);

  const resetEvents = useCallback(() => {
    setEvents(generateSeedEvents({ daysBack: 60, perDay: 18 }));
  }, []);

  const appendManualEvent = useCallback<AnalyticsContextValue['appendManualEvent']>(
    (e) => {
      const ev: AnalyticsEvent = { ...e, id: genId('ev') };
      setEvents((prev) => [...prev, ev]);
      return ev;
    },
    []
  );

  const value = useMemo<AnalyticsContextValue>(
    () => ({
      events,
      seo,
      trackPageView,
      resetSeo,
      saveSeo,
      resetEvents,
      appendManualEvent,
      isAnalyticsReady: true,
      hasSeedData,
    }),
    [events, seo, trackPageView, resetSeo, saveSeo, resetEvents, appendManualEvent, hasSeedData]
  );

  return <AnalyticsContext.Provider value={value}>{children}</AnalyticsContext.Provider>;
}

export function useAnalytics(): AnalyticsContextValue {
  const ctx = useContext(AnalyticsContext);
  if (!ctx) throw new Error('useAnalytics must be used within AnalyticsProvider');
  return ctx;
}
