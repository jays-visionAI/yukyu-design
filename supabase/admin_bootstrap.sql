-- ===========================================================
--  Yukye Design — 어드민 계정 부트스트랩 SQL
--  대상: ForgeDB 콘솔 → SQL Editor (https://forgedb.cloud)
--
--  용도
--  ----
--  사용자가 콘솔 Auth 탭에서 직접 가입한 계정을 *어드민으로 승격*시키거나,
--  같은 SQL 한 번 실행으로 콘솔에 새 어드민 계정을 *생성*할 수 있도록 도와주는
--  헬퍼 스크립트입니다. (어드민 권한은 RLS 정책이 `forge_role()='authenticated'`
--  로 식별하므로, 어드민이 되고 싶다면 콘솔 인증을 거쳐야 합니다.)
--
--  ⚠️ 운영 노트
--  - 이 SQL 은 site.sql(첫 가입자 누구나 어드민이 되던 취약점)을 *닫은* 상태에서
--    안전하게 어드민 권한을 부여하는 유일한 합법 경로입니다.
--  - 서비스 롤 키 없이도 ForgeDB 콘솔의 SQL Editor 에서는 충분한 권한으로 실행됩니다.
--  - 비밀번호는 해시로 저장됩니다. 콘솔에서 수동으로 정한 비밀번호와 동일하게
--    설정하거나, 별도의 "비밀번호 재설정" 메일 흐름을 사용하세요.
-- ===========================================================


-- ============================================================
--  A) 이미 가입한 계정을 어드민으로 승격
--  ----
--  사용 시나리오: 콘솔 Auth → Users 에서 직접 가입을 끝낸 뒤,
--  그 계정의 이메일을 아래 `target_email` 에 넣어 실행하세요.
--  동일 트랜잭션 안에서 검증 → role 부여 → 확인 SELECT 까지 일괄 처리합니다.
-- ============================================================

do $admin_promote$
declare
  target_email text := 'admin@yukye.local';  -- ← 본인 이메로 교체
  uid uuid;
  row_count int;
begin
  -- 1) 대상 사용자 조회
  select id into uid
  from auth.users
  where email = target_email
  limit 1;

  if uid is null then
    raise notice '[부트스트랩] auth.users 에 % 이메일을 가진 사용자가 없습니다. 먼저 콘솔 Auth 탭에서 가입을 끝내세요.', target_email;
    return;
  end if;

  -- 2) forge_role() 이 인증 사용자로 인정하도록 'authenticated' 메타 부여
  --    ForgeDB 정책은 public.forge_role() = 'authenticated' 인 경우 admin 으로 간주합니다.
  update auth.users
  set
    raw_user_meta_data =
      coalesce(raw_user_meta_data, '{}'::jsonb)
      || jsonb_build_object('role', 'authenticated'),
    updated_at = now()
  where id = uid;

  get diagnostics row_count = row_count;
  raise notice '[부트스트랩] 사용자 % 에게 authenticated role 메타 부여 완료 (rows=%)', target_email, row_count;

  -- 3) quotes.manager_id 외래키가 걸려 있는 경우, 본인을 모든 기존 quote 의 담당자로
  --    일괄 지정 (선택 사항 — 필요 없으면 이 블록을 통째 주석 처리)
  update public.quotes
  set manager_id = uid
  where manager_id is null;

  raise notice '[부트스트랩] manager_id NULL quote 자동 배정 완료';
end
$admin_promote$;


-- ============================================================
--  B) 결과 확인 SELECT (실행 후 화면에서 1건 이상 보여야 성공)
-- ============================================================
select
  u.id                                    as user_id,
  u.email,
  u.created_at,
  u.raw_user_meta_data->>'role'           as role,
  u.encrypted_password is not null         as has_password_hash
from auth.users u
where u.email = 'admin@yukye.local';  -- ← 본인 이메로 교체


-- ============================================================
--  C) (선택) 콘솔에서 직접 가입이 아직이라면, 콘솔 Auth UI 가 없는 환경을 위한
--  INSERT 형태 — ForgeDB 콘솔은 보통 Auth UI 를 제공하므로 일반적으로는 필요 없습니다.
--  만약 콘솔에 Auth 탭이 없다면 아래 형식으로 직접 가입을 만들어주세요.
-- ============================================================
-- insert into auth.users (
--   instance_id, id, aud, role, email,
--   encrypted_password, email_confirmed_at,
--   raw_app_meta_data, raw_user_meta_data,
--   created_at, updated_at, confirmation_token, email_change, email_change_token_new
-- ) values (
--   '00000000-0000-0000-0000-000000000000',
--   gen_random_uuid(),
--   'authenticated', 'authenticated',
--   'admin@yukye.local',  -- ← 본인 이메로 교체
--   crypt('여기에_안전한_비밀번호', gen_salt('bf')),  -- ← 본인 비번으로 교체 (bcrypt 해시)
--   now(),
--   '{"provider":"email","providers":["email"]}'::jsonb,
--   '{"role":"authenticated"}'::jsonb,
--   now(), now(), '', '', ''
-- );
--
-- ⚠️ 위 INSERT 는 ForgeDB 의 정확한 auth.users 스키마 버전에 따라 컬럼명이 다를 수 있어
-- 권장하지 않습니다. *콘솔 Auth UI 에서 가입 → 위 A) 블록 실행* 이 가장 안전합니다.


-- ============================================================
--  D) 사후 검증 (어드민 콘솔이 안 보일 때 진단)
-- ============================================================
-- 다음 SELECT 가 데이터를 보여주면 어드민 인증 정책이 정상 동작하는 것입니다.
-- (안 보이면 anon 으로 인증이 잡혀 있는 상태 — 콘솔에서 다시 로그아웃/로그인)
select
  'quotes_visible_to_admin' as check_name,
  count(*) as row_count
from public.quotes
where public.forge_role() = 'authenticated';

select
  'progress_visible_to_admin' as check_name,
  count(*) as row_count
from public.progress_updates;

select
  'portfolio_published' as check_name,
  count(*) as row_count
from public.portfolio
where published = true;
