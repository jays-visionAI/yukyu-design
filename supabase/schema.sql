-- ===========================================================
--  Yukye Design — ForgeDB 스키마 & RLS 정책
--  대상: PostgreSQL 16+ (ForgeDB)
--  버전: 2.0 (파트너 시스템 확장)
-- ===========================================================

-- ---------- 0. 헬퍼 함수 ----------
create or replace function public.forge_uid()
returns uuid
language sql
stable
as $$
  select nullif(
    current_setting('request.jwt.claim.sub', true),
    ''
  )::uuid;
$$;

create or replace function public.forge_role()
returns text
language sql
stable
as $$
  select coalesce(
    current_setting('request.jwt.claim.role', true),
    'anon'
  );
$$;

create or replace function public.forge_share_token()
returns text
language sql
stable
as $$
  select nullif(
    current_setting('request.jwt.claim.token', true),
    ''
  );
$$;

-- ---------- 1. 사용자 및 파트너 테이블 ----------

-- 사용자 역할(Role) 관리
-- ForgeDB의 auth.users와 1:1로 매핑됩니다.
create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  updated_at timestamptz,
  full_name text,
  avatar_url text,
  role text not null default 'general_user'
    check (role in ('admin', 'partner', 'general_user'))
);

-- 파트너 상세 정보
create table if not exists public.partners (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- 회사 정보
  company_name text not null,
  business_registration_number text,
  ceo_name text,
  address text,
  main_regions text[],

  -- 담당자 정보
  contact_person_name text,
  phone_number text,
  email text unique not null, -- auth.users.email과 동기화

  -- 소개 및 증빙 자료
  introduction text,
  business_license_url text, -- 파일은 ForgeDB Storage에 업로드 후 URL 저장
  portfolio_url text
);
create index if not exists idx_partners_user_id on public.partners(user_id);
create index if not exists idx_partners_email on public.partners(email);


-- 파트너 포트폴리오 (파트너가 직접 등록하는 시공 실적)
create table if not exists public.partner_portfolios (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  site_name text not null,
  customer_name text,
  construction_type text,
  construction_cost bigint,
  photos text[], -- 이미지 URL 배열 (최대 20개)
  description text,
  published boolean not null default false -- 관리자 승인 후 노출
);
create index if not exists idx_partner_portfolios_partner_id on public.partner_portfolios(partner_id);


-- ---------- 2. 기존 테이블 (견적, 포트폴리오 등) ----------

-- 시공 견적 (quotes)
create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  customer_name text not null,
  phone text not null,
  email text,
  region text not null,
  preferred_contact_time text,
  space_type text not null,
  area_size integer not null,
  budget text not null,
  move_in_date date,
  space_types text[] not null default '{}',
  styles text[] not null default '{}',
  additional_requests text,
  status text not null default 'received'
    check (status in ('received','in_progress','on_hold','completed','cancelled')),
  admin_memo text,
  contract_amount bigint,
  progress_percent integer not null default 0
    check (progress_percent between 0 and 100),
  review jsonb,
  manager_id uuid,
  share_token uuid not null default gen_random_uuid()
);
create index if not exists idx_quotes_created_at_desc on public.quotes(created_at desc);
create index if not exists idx_quotes_status on public.quotes(status);
create index if not exists idx_quotes_share_token on public.quotes(share_token);

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
create index if not exists idx_progress_updates_quote_id on public.progress_updates(quote_id, at desc);

-- 포트폴리오 (관리자가 등록)
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
create index if not exists idx_portfolio_published on public.portfolio(published, featured);

-- 스튜디오 아파트 및 표준 유닛 평면
create table if not exists public.apartments (
  id text primary key,
  created_at timestamptz not null default now(),
  brand text not null,
  name text not null,
  location text not null,
  published boolean not null default true
);
create index if not exists idx_apartments_brand on public.apartments(brand, name);

create table if not exists public.apartment_units (
  id text primary key,
  apartment_id text not null references public.apartments(id) on delete cascade,
  created_at timestamptz not null default now(),
  name text not null,
  area integer not null check (area > 0),
  bedrooms integer not null check (bedrooms >= 0),
  bathrooms integer not null check (bathrooms >= 0),
  plan jsonb not null,
  published boolean not null default true
);
create index if not exists idx_apartment_units_apartment_id on public.apartment_units(apartment_id);

-- 파트너 신청
create table if not exists public.partner_applications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null default 'submitted'
    check (status in ('submitted','reviewing','approved','rejected')),
  business jsonb not null,
  cases jsonb not null default '[]',
  performance jsonb not null,
  agreement jsonb not null,
  note text,
  admin_memo text,
  processed_at timestamptz,
  applicant_email text generated always as ((business->>'contactEmail')) stored,
  applicant_company text generated always as ((business->>'companyName')) stored
);
create index if not exists idx_partner_apps_created_at_desc on public.partner_applications(created_at desc);
create index if not exists idx_partner_apps_status on public.partner_applications(status);

-- ---------- 3. RLS (Row Level Security) ----------

-- 모든 테이블에 RLS 활성화
alter table public.user_profiles enable row level security;
alter table public.partners enable row level security;
alter table public.partner_portfolios enable row level security;
alter table public.quotes enable row level security;
alter table public.progress_updates enable row level security;
alter table public.portfolio enable row level security;
alter table public.apartments enable row level security;
alter table public.apartment_units enable row level security;
alter table public.partner_applications enable row level security;

-- user_profiles
-- 사용자는 자신의 프로필만 보거나 수정할 수 있습니다.
drop policy if exists "user_profiles_select_own" on public.user_profiles;
create policy "user_profiles_select_own" on public.user_profiles for select
  using (id = public.forge_uid());
drop policy if exists "user_profiles_update_own" on public.user_profiles;
create policy "user_profiles_update_own" on public.user_profiles for update
  using (id = public.forge_uid());

-- partners
-- 파트너는 자신의 정보만 보거나 수정할 수 있습니다. 관리자는 모든 파트너 정보를 봅니다.
drop policy if exists "partners_select_own_or_admin" on public.partners;
create policy "partners_select_own_or_admin" on public.partners for select
  using (user_id = public.forge_uid() or public.forge_role() = 'admin');
drop policy if exists "partners_update_own" on public.partners;
create policy "partners_update_own" on public.partners for update
  using (user_id = public.forge_uid());
-- 파트너 정보 생성은 관리자만 가능 (승인 프로세스)
drop policy if exists "partners_insert_admin" on public.partners;
create policy "partners_insert_admin" on public.partners for insert
  with check (public.forge_role() = 'admin');

-- partner_portfolios
-- 파트너는 자신의 포트폴리오를 생성, 조회, 수정, 삭제할 수 있습니다.
-- 일반 사용자와 관리자는 published=true인 포트폴리오만 볼 수 있습니다.
drop policy if exists "partner_portfolios_select_published_or_own" on public.partner_portfolios;
create policy "partner_portfolios_select_published_or_own" on public.partner_portfolios for select
  using (published = true or (select p.user_id from public.partners p where p.id = partner_id) = public.forge_uid());
drop policy if exists "partner_portfolios_manage_own" on public.partner_portfolios;
create policy "partner_portfolios_manage_own" on public.partner_portfolios for all
  using ((select p.user_id from public.partners p where p.id = partner_id) = public.forge_uid());
-- 관리자는 모든 포트폴리오를 관리할 수 있습니다.
drop policy if exists "partner_portfolios_admin_full_access" on public.partner_portfolios;
create policy "partner_portfolios_admin_full_access" on public.partner_portfolios for all
  using (public.forge_role() = 'admin');


-- quotes (기존 정책 유지)
drop policy if exists "quotes_insert_public" on public.quotes;
create policy "quotes_insert_public" on public.quotes for insert with check (true);
drop policy if exists "quotes_select_scoped" on public.quotes;
create policy "quotes_select_scoped" on public.quotes for select using (public.forge_role() = 'authenticated' OR share_token::text = public.forge_share_token());
drop policy if exists "quotes_update_admin" on public.quotes;
create policy "quotes_update_admin" on public.quotes for update using (public.forge_role() = 'authenticated');
drop policy if exists "quotes_delete_admin" on public.quotes;
create policy "quotes_delete_admin" on public.quotes for delete using (public.forge_role() = 'authenticated');

-- progress_updates (기존 정책 유지)
drop policy if exists "progress_insert_typed" on public.progress_updates;
create policy "progress_insert_typed" on public.progress_updates for insert with check (case public.forge_role() when 'authenticated' then true else author_role in ('customer','system') and visible_to_customer = true end);
drop policy if exists "progress_select_visible" on public.progress_updates;
create policy "progress_select_visible" on public.progress_updates for select using (visible_to_customer = true OR public.forge_role() = 'authenticated');
drop policy if exists "progress_update_admin" on public.progress_updates;
create policy "progress_update_admin" on public.progress_updates for update using (public.forge_role() = 'authenticated');
drop policy if exists "progress_delete_admin" on public.progress_updates;
create policy "progress_delete_admin" on public.progress_updates for delete using (public.forge_role() = 'authenticated');

-- portfolio (기존 정책 유지)
drop policy if exists "portfolio_select_published" on public.portfolio;
create policy "portfolio_select_published" on public.portfolio for select using (published = true OR public.forge_role() = 'authenticated');
drop policy if exists "portfolio_write_admin" on public.portfolio;
create policy "portfolio_write_admin" on public.portfolio for all using (public.forge_role() = 'authenticated');

-- apartments / apartment_units
-- 공개된 표준 유닛은 누구나 조회하고, 관리자는 데이터를 관리합니다.
drop policy if exists "apartments_select_published" on public.apartments;
create policy "apartments_select_published" on public.apartments for select using (published = true OR public.forge_role() = 'authenticated');
drop policy if exists "apartments_write_admin" on public.apartments;
create policy "apartments_write_admin" on public.apartments for all using (public.forge_role() = 'authenticated');
drop policy if exists "apartment_units_select_published" on public.apartment_units;
create policy "apartment_units_select_published" on public.apartment_units for select using (published = true OR public.forge_role() = 'authenticated');
drop policy if exists "apartment_units_write_admin" on public.apartment_units;
create policy "apartment_units_write_admin" on public.apartment_units for all using (public.forge_role() = 'authenticated');

-- partner_applications (기존 정책 유지)
drop policy if exists "partner_insert_public" on public.partner_applications;
create policy "partner_insert_public" on public.partner_applications for insert with check (true);
drop policy if exists "partner_select_admin" on public.partner_applications;
create policy "partner_select_admin" on public.partner_applications for select using (public.forge_role() = 'authenticated');
drop policy if exists "partner_update_admin" on public.partner_applications;
create policy "partner_update_admin" on public.partner_applications for update using (public.forge_role() = 'authenticated');
drop policy if exists "partner_delete_admin" on public.partner_applications;
create policy "partner_delete_admin" on public.partner_applications for delete using (public.forge_role() = 'authenticated');


-- ---------- 4. Realtime 활성화 ----------
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end $$;

alter publication supabase_realtime add table
  public.quotes,
  public.progress_updates,
  public.portfolio,
  public.apartments,
  public.apartment_units,
  public.partner_applications,
  public.user_profiles,
  public.partners,
  public.partner_portfolios;
