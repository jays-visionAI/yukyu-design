# ForgeDB 어드민 계정 설정 가이드

> **사용자 위치**: Yukyu Design — 인테리어 시공 플랫폼
> **목표**: ForgeDB 콘솔에서 가입한 계정을 어드민 콘솔(`/admin/login`)에 로그인 가능하게 만들기
> **소요 시간**: 5분

---

## 왜 이 문서가 필요한가

`src/data/DataContext.tsx`의 `adminLogin`은 보안을 위해 **자동 가입 폴백을 제거**했습니다. 이는 "누구나 빈 폼으로 첫 로그인 시도를 하면 어드민이 되어버리는" 취약점을 막기 위한 것입니다. 따라서 운영 환경에서는:

1. 콘솔에서 **먼저 어드민 계정을 직접 가입**하고
2. 그 자격증명으로만 `/admin/login`에서 로그인할 수 있습니다.

아래 절차대로 진행하면 됩니다.

---

## STEP 0. 사전 조건 확인

- [ ] ForgeDB 콘솔(https://forgedb.cloud)에 로그인되어 있다
- [ ] 프로젝트가 생성되어 있고 `supabase/schema.sql`이 이미 적용되어 있다
- [ ] `.env` 파일에 `VITE_FORGEDB_URL`, `VITE_FORGEDB_PROJECT_ID`, `VITE_FORGEDB_ANON_KEY` 세 값이 모두 채워져 있다
- [ ] `npm run dev`로 띄운 사이트가 `FORGEDB` 모드로 표시된다 (사이드바 `LOCAL` → `FORGEDB`)

하나라도 충족되지 않으면 [README § ForgeDB 모드 활성화](../README.md#forgedb-모드-활성화)를 먼저 완료하세요.

---

## STEP 1. 콘솔에서 어드민 계정 가입

### 1-1. 콘솔 진입

```
https://forgedb.cloud
→ 로그인
→ 해당 프로젝트 선택
→ 좌측 메뉴 "Auth" 탭 → 상단 "Users" 서브탭
```

### 1-2. "Add user" / "Create user" 클릭

| 필드 | 값 |
|------|----|
| Email | `admin@yukye.local` (또는 본인 운영 이메일) |
| Password | 충분히 강한 비밀번호 (12자+, 대소문자+숫자+기호) |
| Auto Confirm | ✅ (이메일 확인 단계 건너뛰기) |

**Save** 클릭.

> ⚠️ 실제 운영에서는 콘솔에서 직접 만든 강제 비밀번호를 사용자에게 별도로 안전하게 전달해야 합니다. 비밀번호 평문은 절대로 저장·이메일에 보관하지 마세요.

### 1-3. 사용자 ID 확보

생성 직후 Users 목록에 표시되는 **User UID** (UUID) 를 메모장에 복사해 둡니다.
예: `a4d559c7-6a90-4b0b-bf4e-1234567890ab`

> 필요 없습니다 — 어드민 승격 SQL이 이메일로 자동 조회합니다. 그래도 디버깅용으로 보관해두면 좋습니다.

---

## STEP 2. 어드민 권한 승격 SQL 실행

### 2-1. 콘솔 → SQL Editor 진입

좌측 메뉴 "SQL Editor" 클릭 → 새 쿼리 창 열기

### 2-2. `supabase/admin_bootstrap.sql` 내용 붙여넣기

프로젝트 루트의 `supabase/admin_bootstrap.sql` 파일 전체 내용을 복사해 SQL Editor에 붙여넣습니다.

### 2-3. 본인 이메일로 교체

파일 안의 두 군데 플레이스홀더를 본인 이메일로 교체합니다:

```sql
-- 1번째 교체 (A 블록)
target_email text := 'admin@yukye.local';  -- ← 본인 이메일로 교체

-- 2번째 교체 (B 블록 결과 확인)
where u.email = 'admin@yukye.local';  -- ← 본인 이메일로 교체
```

**Find & Replace**로 한 번에 바꾸는 것을 권장합니다.

### 2-4. 실행

`Run` (또는 `Ctrl/Cmd + Enter`) 클릭.

### 2-5. 결과 검증

출력에 다음이 보여야 합니다:

```
NOTICE:  [부트스트랩] 사용자 admin@yukye.local 에게 authenticated role 메타 부여 완료 (rows=1)
NOTICE:  [부트스트랩] manager_id NULL quote 자동 배정 완료

 user_id | email               | role
---------+---------------------+------------------
 ...     | admin@yukye.local   | authenticated   ✓
```

`role` 컬럼이 `authenticated`로 나오면 어드민 승격 성공입니다.

---

## STEP 3. 사이트에서 로그인 테스트

### 3-1. dev 서버 재시작 (선택)

`.env` 가 이미 있다면 일반적으로 재시작은 필요 없습니다. 하지만 role 메타를 변경한 직후에는 한 번 재시작해 클라이언트 세션을 초기화하는 게 안전합니다.

```bash
# 별도 터미널에서 현재 dev 서버를 종료 후 재실행
npm run dev
```

### 3-2. `/admin/login` 접속

브라우저에서 `http://localhost:5173/admin/login` 접속.

> 📌 `/admin/login` 은 Blueforge preview 미들웨어의 영향을 받지 않습니다 (정적 라우트).

### 3-3. 자격증명 입력

| 필드 | 값 |
|------|----|
| 아이디 | STEP 1-2에서 가입한 이메일의 **`@ 앞 부분`** (또는 이메일 전체) |
| 비밀번호 | STEP 1-2에서 설정한 비밀번호 |

> 예: `admin@yukye.local` 로 가입했다면
> - 아이디 칸에 `admin` 만 입력해도 동작 (`adminLogin`이 자동으로 `@yukye.local`을 붙여줌)
> - 또는 이메일 전체 `admin@yukye.local` 입력도 OK

### 3-4. 로그인 클릭

성공 시 `/admin/dashboard`로 자동 이동합니다. 사이드바 표시가 `LOCAL` → `FORGEDB`로 바뀌어 있는지도 함께 확인하세요.

---

## STEP 4. (선택) 어드민 콘솔 빠른 점검 체크리스트

| 항목 | 위치 | 기대값 |
|------|------|--------|
| KPI 카드 숫자 | `/admin/dashboard` | 본인이 등록한 견적 건수만큼 표시 |
| 접수 목록 | `/admin/quotes` | 본인 quote 노출, 메모·상태 변경 가능 |
| 포트폴리오 | `/admin/portfolio` | CRUD 정상 |
| 리뷰 집계 | `/admin/reviews` | 고객 평가가 들어오면 자동 반영 |
| 파트너 신청 | `/admin/partners` | 신청자 INSERT 직후 목록에 등장 |

---

## 트러블슈팅

### 로그인은 성공했는데 콘솔이 비어 보임

- 콘솔 SQL Editor에서 D 블록("사후 검증")을 실행해 보세요.
- `quotes_visible_to_admin` row_count 가 **0 이상**으로 나와야 정상.
- 0이라면 forge_role()이 여전히 anon으로 잡혀 있는 것 → STEP 2-4 부트스트랩 SQL을 다시 실행.

### "아이디 또는 비밀번호가 올바르지 않습니다."

- 콘솔 **Auth → Users** 목록에 해당 이메일이 존재하는지 확인.
- 부트스트랩 SQL의 `target_email`이 가입한 이메일과 정확히 일치하는지 (대소문자, 공백, 도메인) 확인.
- 비밀번호에 공백·특수문자가 들어가 있었다면 STEP 1-2에서 그대로 입력했는지 확인.

### 부트스트랩 SQL 실행 시 `auth.users does not exist` 에러

- 일부 ForgeDB 변형에서는 auth 스키마가 다를 수 있습니다.
- 콘솔에서 `select * from information_schema.schemata where schema_name like '%auth%'` 실행 후 실제 스키마명 확인.
- 발견된 스키마(예: `forgedb_auth`)로 A 블록의 `auth.users`를 일괄 교체.

### "role" 컬럼이 여전히 빈 문자열로 나옴

- 콘솔 Auth → Users → 해당 사용자 → "Raw App Meta Data" 또는 "User Metadata" 탭에서 수동으로 `role: "authenticated"` JSON 추가 후 저장.
- 이후 SQL Editor에서 다시 `select raw_user_meta_data->>'role' from auth.users where email='...'` 로 확인.

---

## 운영 노트

1. **service_role 키는 절대 프론트엔드에 노출하지 마세요.**
   어드민 권한 승격은 *항상 콘솔 SQL Editor* 또는 별도 운영 스크립트(서비스 롤 키 사용)에서만 수행합니다.

2. **비밀번호는 정기적으로 로테이션**합니다 (90일 권장).

3. **추가 어드민이 필요하면** STEP 1~2를 반복합니다 (이메일만 다르게).

4. **퇴임 어드민은** 콘솔에서 사용자 삭제 + `auth.users` 의 role 메타를 `null` 로 되돌리거나 계정을 비활성화합니다.

5. SQL 부트스트랩은 멱등성 보장: 동일 이메일로 두 번 실행해도 `coalesce`로 안전하게 동작합니다.
