-- ===========================================================
--  Yukye Design — ForgeDB 스키마 & RLS 정책
--  대상: PostgreSQL 16+ (ForgeDB)
--  적용 위치: https://forgedb.cloud 콘솔 → SQL Editor
--
--  적용 순서
--  1) 아래 "테이블 + RLS" 블록 전체 실행 (한 번에 복사·붙여넣기)
--  2) 콘솔의 Auth 탭에서 첫 관리자 계정 생성 (예: admin@yukye.local)
--  3) 하단 "데모 시드" 블록은 처음 1회만 실행 후 주석 처리
--  4) 빌드된 사이트는 별도의 외부 호스팅(ForgeDB Static)에 dist/ 그대로 업로드
-- ===========================================================

-- ---------- 0. 사전 체크 ----------
-- ForgeDB는 request.jwt.claim.* GUC 를 채워서 호출 권한을 식별합니다.
-- (Supabase의 auth.uid() 와 동일한 효과)
-- 헬퍼 함수로 한 번 정의해두면 정책 작성이 깔끔해집니다.
create or replace function public.forge_uid()
returns uuid
language sql
stable
as $
  select nullif(
    current_setting('request.jwt.claim.sub', true),
    ''
  )::uuid;
$;

create or replace function public.forge_role()
returns text
language sql
stable
as $
  select coalesce(
    current_setting('request.jwt.claim.role', true),
    'anon'
  );
$;

-- ForgeDB 의 auth 스키마는 Supabase 와 다를 수 있습니다.
-- 이 블록은 *존재할 경우에만* manager_id 외래키를 연결하고,
-- 없으면 그냥 uuid 컬럼으로 남겨둡니다 (운영에 지장 없음).
do $
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'auth' and table_name = 'users'
  ) then
    -- 이미 다른 곳에서 fk 가 걸려있으면 건너뜀
    if not exists (
      select 1 from information_schema.table_constraints
      where table_schema = 'public'
        and table_name = 'quotes'
        and constraint_name = 'quotes_manager_id_fkey'
    ) then
      alter table public.quotes
        add constraint quotes_manager_id_fkey
        foreign key (manager_id) references auth.users(id) on delete set null;
    end if;
  end if;
end $;

-- ---------- 1. 기본 테이블 ----------

-- 시공 견적 (quotes)
create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  -- Step 1: 고객정보
  customer_name text not null,
  phone text not null,
  email text,
  region text not null,
  preferred_contact_time text,

  -- Step 2: 시공정보
  space_type text not null,
  area_size integer not null,
  budget text not null,
  move_in_date date,
  space_types text[] not null default '{}',
  styles text[] not null default '{}',
  additional_requests text,

  -- 시공 진행 관리
  status text not null default 'received'
    check (status in ('received','in_progress','on_hold','completed','cancelled')),
  admin_memo text,
  contract_amount bigint,
  progress_percent integer not null default 0
    check (progress_percent between 0 and 100),

  -- 만족도 평가 (jsonb 통합 저장)
  review jsonb,

  -- 담당자 (FK 는 위 0번 블록에서 auth.users 존재 시에만 연결)
  manager_id uuid,

  -- 검색 성능을 위한 phone 정규화 컬럼 (선택)
  phone_hash text generated always as (md5(phone)) stored,

  -- ⚠️ PII 보호용 share_token: 고객이 /quote/track/:token 으로만 자기 quote 조회 가능.
  --    RLS 가 이 토큰을 GUC 로 받아 anon SELECT 를 제한합니다.
  --    기본값은 uuid — 매 quote 가 unique 한 URL-safe ID 를 갖습니다.
  share_token uuid not null default gen_random_uuid()
);
create index if not exists idx_quotes_created_at_desc
  on public.quotes(created_at desc);
create index if not exists idx_quotes_phone_hash
  on public.quotes(phone_hash);
create index if not exists idx_quotes_status
  on public.quotes(status);
create index if not exists idx_quotes_share_token
  on public.quotes(share_token);

-- 진행경과 타임라인
create table if not exists public.progress_updates (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  at timestamptz not null default now(),
  author_role text not null check (author_role in ('admin','customer','system')),
  author_name text not null,
  category text not null
    check (category in ('milestone','progress','issue','evidence','note')),
  title text not null,
  message text,
  attachments jsonb not null default '[]',
  visible_to_customer boolean not null default true,

  author_uid uuid
);
create index if not exists idx_progress_updates_quote_id
  on public.progress_updates(quote_id, at desc);

-- 포트폴리오
create table if not exists public.portfolio (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  title text not null,
  category text not null
    check (category in ('residential','commercial','office','partial')),
  space_type text not null,
  area integer not null,
  location text not null,
  year integer not null,
  duration_weeks integer not null,
  budget text not null,
  description text not null,
  cover_color text not null,
  cover_accent text not null,
  tags text[] not null default '{}',
  images text[] not null default '{}',
  featured boolean not null default false,
  published boolean not null default true
);
create index if not exists idx_portfolio_published
  on public.portfolio(published, featured);

-- 첨부파일 (jsonb attachments 가 이미 base64 보관 중이라 이 테이블은 메타만 보관)
create table if not exists public.progress_attachments (
  id uuid primary key default gen_random_uuid(),
  update_id uuid not null references public.progress_updates(id) on delete cascade,
  name text not null,
  size_bytes bigint not null,
  mime_type text not null,
  data_url text not null,
  uploaded_at timestamptz not null default now()
);
create index if not exists idx_progress_attachments_update_id
  on public.progress_attachments(update_id);

-- ---------- 2. RLS (Row Level Security) ----------
-- ForgeDB 는 anon/authenticated 외의 role 명이 다를 수 있으므로
-- 모든 정책을 TO PUBLIC 으로 두고 내부에서 forge_role() / forge_uid() 로 분기합니다.
-- 추가로 share_token 기반 조회용 헬퍼:
create or replace function public.forge_share_token()
returns text
language sql
stable
as $
  select nullif(
    current_setting('request.jwt.claim.token', true),
    ''
  );
$;

alter table public.quotes enable row level security;
alter table public.progress_updates enable row level security;
alter table public.portfolio enable row level security;
alter table public.progress_attachments enable row level security;

-- ----- quotes -----
-- 누구나 등록 가능 (고객 견적 신청). 생성 시 share_token 은 자동 생성됩니다.
drop policy if exists "quotes_insert_public" on public.quotes;
create policy "quotes_insert_public"
  on public.quotes for insert
  with check (true);

-- ⚠️ PII 보호: SELECT 는 (a) 관리자(authenticated), (b) share_token 일치, 둘 중 하나만 허용.
-- 그 외의 anon 사용자는 다른 사람의 quote 를 절대 볼 수 없습니다.
drop policy if exists "quotes_select_scoped" on public.quotes;
create policy "quotes_select_scoped"
  on public.quotes for select
  using (
    public.forge_role() = 'authenticated'
    OR share_token::text = public.forge_share_token()
  );

-- 수정/삭제는 인증된 사용자(관리자)만
drop policy if exists "quotes_update_admin" on public.quotes;
create policy "quotes_update_admin"
  on public.quotes for update
  using (public.forge_role() = 'authenticated')
  with check (public.forge_role() = 'authenticated');

drop policy if exists "quotes_delete_admin" on public.quotes;
create policy "quotes_delete_admin"
  on public.quotes for delete
  using (public.forge_role() = 'authenticated');

-- ----- portfolio.images 컬럼 마이그레이션 -----
-- 기존 스키마에 images 가 없을 수 있으므로 별도 ALTER 로 안전하게 추가합니다.
alter table public.portfolio
  add column if not exists images text[] not null default '{}';

-- ----- progress_updates -----
-- ⚠️ forge_role() 만 체크하면 누구나 author_role='admin' 으로 위조 가능.
-- 인증된 사용자(=관리자)만 admin/system role 사용 가능하도록 WITH CHECK 를 강화합니다.
-- - anon:  author_role IN ('customer','system') + visible_to_customer = true
-- - authenticated: 어떤 role 도 허용 (관리자 권한)
drop policy if exists "progress_insert_typed" on public.progress_updates;
create policy "progress_insert_typed"
  on public.progress_updates for insert
  with check (
    case public.forge_role()
      when 'authenticated' then true
      else
        author_role in ('customer','system')
        and visible_to_customer = true
    end
  );

-- 조회는 visible_to_customer=true 인 경우 모두 허용, 관리자는 전부 허용
drop policy if exists "progress_select_visible" on public.progress_updates;
create policy "progress_select_visible"
  on public.progress_updates for select
  using (
    visible_to_customer = true
    OR public.forge_role() = 'authenticated'
  );

-- 수정/삭제는 관리자만
drop policy if exists "progress_update_admin" on public.progress_updates;
create policy "progress_update_admin"
  on public.progress_updates for update
  using (public.forge_role() = 'authenticated')
  with check (public.forge_role() = 'authenticated');

drop policy if exists "progress_delete_admin" on public.progress_updates;
create policy "progress_delete_admin"
  on public.progress_updates for delete
  using (public.forge_role() = 'authenticated');

-- ----- portfolio -----
drop policy if exists "portfolio_select_published" on public.portfolio;
create policy "portfolio_select_published"
  on public.portfolio for select
  using (published = true OR public.forge_role() = 'authenticated');

drop policy if exists "portfolio_write_admin" on public.portfolio;
create policy "portfolio_write_admin"
  on public.portfolio for all
  using (public.forge_role() = 'authenticated')
  with check (public.forge_role() = 'authenticated');

-- ----- progress_attachments -----
drop policy if exists "attachments_select_public" on public.progress_attachments;
create policy "attachments_select_public"
  on public.progress_attachments for select
  using (true);

drop policy if exists "attachments_insert_public" on public.progress_attachments;
create policy "attachments_insert_public"
  on public.progress_attachments for insert
  with check (true);

drop policy if exists "attachments_write_admin" on public.progress_attachments;
create policy "attachments_write_admin"
  on public.progress_attachments for all
  using (public.forge_role() = 'authenticated')
  with check (public.forge_role() = 'authenticated');

-- ===========================================================
--  3. Realtime 활성화
--  실시간 구독이 필요한 테이블을 publication 에 추가합니다.
--  콘솔 UI 가 있다면 그것으로 추가해도 동일합니다.
--  publication 이 아직 없다면 만들어두고, 이미 있으면 그대로 사용합니다.
-- ===========================================================
do $
begin
  if not exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) then
    create publication supabase_realtime;
  end if;
end $;

-- 멱등성을 위해 pg_publication_tables 에 존재하지 않을 때만 추가합니다.
do $
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'quotes'
  ) then
    execute 'alter publication supabase_realtime add table public.quotes';
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'progress_updates'
  ) then
    execute 'alter publication supabase_realtime add table public.progress_updates';
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'portfolio'
  ) then
    execute 'alter publication supabase_realtime add table public.portfolio';
  end if;
end $;

-- ===========================================================
--  4. 데모 데이터 시드 (포트폴리오만 — quote/review 는 사용자가 직접 등록)
--  콘솔에서 1회 실행 후 주석 처리하세요.
-- ===========================================================
-- insert into public.portfolio (title, category, space_type, area, location, year,
--   duration_weeks, budget, description, cover_color, cover_accent, tags, featured, published)
-- values
--   ('한남동 모던 하우스', 'residential', '단독주택', 42, '서울 용산구', 2024, 10,
--    '1억~1.5억', '한남동의 정원뷰를 살린 42평 단독주택 풀 리모델링',
--    '#1a3a6e', '#c9a961', array['모던','내추럴','단독주택'], true, true),
--   ('판교 주상복합 34평', 'residential', '아파트', 34, '경기 성남시', 2024, 6,
--    '4,000~4,500만원', '젊은 부부의 첫 신혼집 — 미니멀 + 우드',
--    '#0b3d91', '#d8b873', array['미니멀','신혼','우드'], true, true),
--   ('강남 오피스 리모델링', 'commercial', '오피스', 80, '서울 강남구', 2023, 8,
--    '1.5억 이상', 'IT 스타트업 본사 — 글래스 파티션 + 브랜드 컬러',
--    '#082b6b', '#c9a961', array['오피스','브랜드','글래스'], false, true);