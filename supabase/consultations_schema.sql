-- ============================================================
-- Yukyu Design — 고객 상담 신청 (Consultations) 스키마
-- ============================================================
-- 적용 방법:
--   1) ForgeDB 콘솔 (https://forgedb.cloud) 접속
--   2) SQL Editor 에 아래 BEGIN/COMMIT 블록 전체 붙여넣기 후 실행
--   3) anon / authenticated 두 role 에 대해 정책이 자동 생성됩니다.
-- ============================================================

BEGIN;

-- ============================================================
-- 1) ENUM: 상담 상태 / 일정 / 예산 / 범위 / 옵션 카테고리
-- ============================================================

DO $$ BEGIN
  CREATE TYPE consultation_status AS ENUM (
    'received',   -- 신규 접수
    'contacted',  -- 첫 연락 완료
    'consulting', -- 상담중
    'proposal',   -- 제안서 발송
    'contracted', -- 계약
    'on_hold',    -- 보류
    'cancelled',  -- 취소
    'completed'   -- 완료
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE consultation_move_in AS ENUM ('within_1m', '1_3m', 'after_3m');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE consultation_budget AS ENUM ('budget_100', 'budget_150', 'budget_200_plus');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE consultation_scope AS ENUM ('full', 'partial', 'styling');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE consultation_contact_pref AS ENUM ('any', 'morning', 'afternoon', 'evening');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 2) 메인 테이블: consultations
-- ============================================================

CREATE TABLE IF NOT EXISTS public.consultations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Step 01 — 기본정보
  name            text        NOT NULL,
  phone           text        NOT NULL,
  email           text,
  apartment       text        NOT NULL,
  contact_prefs   consultation_contact_pref[] NOT NULL DEFAULT '{}',

  -- Step 02 — 간단 질문
  move_in         consultation_move_in,
  budget          consultation_budget,
  remodel_scope   consultation_scope,
  remodel_areas   text[] NOT NULL DEFAULT '{}',  -- 부분 리모델링 선택 (한글 라벨 그대로 저장)
  supply_area     numeric,                         -- 공급 평형 (옵션)

  -- 운영 필드
  status          consultation_status NOT NULL DEFAULT 'received',
  assigned_admin  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  admin_memo      text,

  -- 고객 추적용 (Quote 와 동일한 share_token 패턴 재사용)
  share_token     uuid NOT NULL DEFAULT gen_random_uuid(),

  -- 타임스탬프
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS consultations_status_idx     ON public.consultations(status);
CREATE INDEX IF NOT EXISTS consultations_created_idx    ON public.consultations(created_at DESC);
CREATE INDEX IF NOT EXISTS consultations_share_token_ix ON public.consultations(share_token);
CREATE INDEX IF NOT EXISTS consultations_assigned_idx   ON public.consultations(assigned_admin);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_consultations_updated ON public.consultations;
CREATE TRIGGER trg_consultations_updated
  BEFORE UPDATE ON public.consultations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 3) 첨부 파일 (평면도 / 현장사진 / 도면 / PDF)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.consultation_files (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id uuid NOT NULL REFERENCES public.consultations(id) ON DELETE CASCADE,
  file_type       text NOT NULL CHECK (file_type IN ('floor_plan','site_photo','pdf','drawing','other')),
  storage_path    text NOT NULL,        -- Supabase Storage 경로
  original_name   text NOT NULL,
  mime_type       text,
  size_bytes      bigint,
  uploaded_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS consultation_files_consult_idx ON public.consultation_files(consultation_id);

-- ============================================================
-- 4) 활동 로그 (상태 변경 / 메모 / 연락 시도 자동 기록)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.consultation_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id uuid NOT NULL REFERENCES public.consultations(id) ON DELETE CASCADE,
  actor_id        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_name      text,
  event_type      text NOT NULL CHECK (event_type IN (
    'created','status_changed','assigned','memo_added','contacted','file_attached','note'
  )),
  payload         jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS consultation_logs_consult_idx ON public.consultation_logs(consultation_id, created_at DESC);

-- ============================================================
-- 5) 참고 링크 (인스타 / 핀터레스트 / 유튜브 / 블로그)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.reference_links (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id uuid NOT NULL REFERENCES public.consultations(id) ON DELETE CASCADE,
  url             text NOT NULL,
  category        text NOT NULL CHECK (category IN ('instagram','pinterest','youtube','blog','other')),
  label           text,
  added_by        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reference_links_consult_idx ON public.reference_links(consultation_id);

-- ============================================================
-- 6) RLS 활성화 + 정책
-- ============================================================
--
-- 정책 요약:
--   · anon: INSERT 만 허용 (고객 폼 제출)
--   · anon: share_token 으로 단건 SELECT (고객이 본인 진행 페이지 조회)
--   · authenticated(role=admin): 모든 SELECT/UPDATE/DELETE
--   · assigned_admin: 본인 담당 건에 대한 UPDATE
--
-- ⚠️ "admin role" 은 별도 admin_users 테이블 또는 auth.users.raw_user_meta_data->>'role'
--   로 구분합니다. 여기서는 metadata.role='admin' 가정.
-- ============================================================

ALTER TABLE public.consultations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultation_files  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultation_logs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reference_links     ENABLE ROW LEVEL SECURITY;

-- helper: 현재 사용자가 admin 인지 검사
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT coalesce(
    (SELECT (raw_user_meta_data->>'role') = 'admin' FROM auth.users WHERE id = auth.uid()),
    false
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ----------------------------------------------------
-- consultations
-- ----------------------------------------------------

DROP POLICY IF EXISTS consultations_anon_insert ON public.consultations;
CREATE POLICY consultations_anon_insert ON public.consultations
  FOR INSERT TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS consultations_anon_select_own_share ON public.consultations;
CREATE POLICY consultations_anon_select_own_share ON public.consultations
  FOR SELECT TO anon
  USING (share_token IS NOT NULL);  -- anon 은 share_token 으로만 접근 (앱 단에서 토큰 필터링)

DROP POLICY IF EXISTS consultations_admin_all ON public.consultations;
CREATE POLICY consultations_admin_all ON public.consultations
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ----------------------------------------------------
-- consultation_files
-- ----------------------------------------------------

DROP POLICY IF EXISTS consultation_files_admin_all ON public.consultation_files;
CREATE POLICY consultation_files_admin_all ON public.consultation_files
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ----------------------------------------------------
-- consultation_logs
-- ----------------------------------------------------

DROP POLICY IF EXISTS consultation_logs_admin_all ON public.consultation_logs;
CREATE POLICY consultation_logs_admin_all ON public.consultation_logs
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ----------------------------------------------------
-- reference_links
-- ----------------------------------------------------

DROP POLICY IF EXISTS reference_links_anon_insert ON public.reference_links;
CREATE POLICY reference_links_anon_insert ON public.reference_links
  FOR INSERT TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS reference_links_admin_all ON public.reference_links;
CREATE POLICY reference_links_admin_all ON public.reference_links
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================
-- 7) Storage 버킷 (콘솔에서 1회 생성 필요 — 여기선 주석으로 안내)
-- ============================================================
--
--   private 버킷 2개를 콘솔 UI 에서 만드세요:
--     · consultation-files   (50MB, mime: pdf/jpg/png/heic)
--     · reference-images     (20MB, mime: jpg/png/webp)
--
--   어드민은 signed URL 로만 접근합니다.
-- ============================================================

COMMIT;

-- ============================================================
-- 8) 검증 쿼리 (실행 후 아래 SELECT 로 테이블/정책 확인)
-- ============================================================
--
-- SELECT tablename, policyname, cmd, roles FROM pg_policies
--   WHERE schemaname='public' AND tablename IN (
--     'consultations','consultation_files','consultation_logs','reference_links'
--   )
--   ORDER BY tablename, policyname;
--
-- SELECT enumlabel FROM pg_enum
--   WHERE enumtypid IN (
--     'consultation_status'::regtype,
--     'consultation_move_in'::regtype,
--     'consultation_budget'::regtype,
--     'consultation_scope'::regtype,
--     'consultation_contact_pref'::regtype
--   )
--   ORDER BY enumsortorder;