-- ============================================================
-- Yukyu Design — Analytics & SEO migration
-- ------------------------------------------------------------
-- 적용 방법: ForgeDB 콘솔 SQL 에디터 또는
--   `forgedb_generate_migration` + applyNow=true 로 실행.
-- 이 파일은 동일한 SQL 을 안전하게 보관하기 위한 카피입니다.
-- ============================================================

-- 1) Analytics 이벤트 ------------------------------------------
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- 페이지 / 위치
  path        TEXT NOT NULL,
  referrer    TEXT NOT NULL DEFAULT '',

  -- UTM
  utm_source    TEXT,
  utm_medium    TEXT,
  utm_campaign  TEXT,
  utm_term      TEXT,
  utm_content   TEXT,

  -- 디바이스
  device     TEXT NOT NULL CHECK (device IN ('desktop','mobile','tablet')),
  os         TEXT NOT NULL,
  browser    TEXT NOT NULL,

  -- 지역
  country   TEXT NOT NULL,
  region    TEXT,
  city      TEXT,

  -- 지표
  duration_ms  INTEGER NOT NULL DEFAULT 0,
  is_engaged   BOOLEAN NOT NULL DEFAULT false,

  -- 세션 식별자
  session_id   TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_at
  ON public.analytics_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session
  ON public.analytics_events (session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_path
  ON public.analytics_events (path);

-- 2) SEO 설정 (1 row) ------------------------------------------
CREATE TABLE IF NOT EXISTS public.seo_settings (
  id          TEXT PRIMARY KEY,                 -- 'site'
  payload     JSONB NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3) RLS --------------------------------------------------------
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_settings     ENABLE ROW LEVEL SECURITY;

-- anon INSERT 허용 (페이지 자동 추적용)
DROP POLICY IF EXISTS analytics_insert_anon ON public.analytics_events;
CREATE POLICY analytics_insert_anon
  ON public.analytics_events FOR INSERT
  TO anon
  WITH CHECK (true);

-- 인증된 사용자 (관리자)만 SELECT
DROP POLICY IF EXISTS analytics_select_authenticated ON public.analytics_events;
CREATE POLICY analytics_select_authenticated
  ON public.analytics_events FOR SELECT
  TO authenticated
  USING (true);

-- seo_settings: anon READ, authenticated WRITE
DROP POLICY IF EXISTS seo_select_anon ON public.seo_settings;
CREATE POLICY seo_select_anon
  ON public.seo_settings FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS seo_upsert_authenticated ON public.seo_settings;
CREATE POLICY seo_upsert_authenticated
  ON public.seo_settings FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 4) Realtime 채널 ---------------------------------------------
--   • analytics_events: 새 pageview 가 들어올 때마다 콘솔이 즉시 갱신되도록 broadcast
--   • seo_settings:     관리자가 저장할 때 다른 탭에 즉시 반영되도록 broadcast
ALTER TABLE public.analytics_events REPLICA IDENTITY FULL;
ALTER TABLE public.seo_settings     REPLICA IDENTITY FULL;

-- Realtime publication 등록 (이미 publication 이 존재하면 멱등하게 추가)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END$$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.analytics_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.seo_settings;
