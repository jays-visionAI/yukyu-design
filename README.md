# Yukye Design — 프리미엄 인테리어 시공 플랫폼

2단계 견적 신청 → 실시간 진행경과 → 만족도 평가까지, 고객과 시공업체를 잇는 풀 사이클 인테리어 플랫폼.

## 스택
- **Vite 5** + **React 18** + **TypeScript (strict)** + **React Router 6**
- **ForgeDB** (`@forgedb/client`) — Supabase 호환 BaaS (PostgreSQL 16+)
- 디자인 토큰: `#0B3D91` Navy + `#C9A961` Gold, Pretendard Variable, 4px spacing grid

## 데이터 백엔드

이 프로젝트는 **두 가지 모드**로 동작합니다 — 코드 한 줄 변경 없이 자동 전환.

| 모드 | 트리거 | 저장소 | 인증 | 실시간 |
|------|--------|--------|------|--------|
| `forgedb` | `.env` 의 `VITE_FORGEDB_*` 값이 모두 채워져 있음 | ForgeDB (PostgreSQL) | ForgeDB Auth (이메일/비밀번호) | ✅ Realtime 자동 |
| `local` (기본) | 환경변수 비어 있음 | localStorage + 시드 데이터 | 데모 계정 (`admin` / `1234`) | — |

전환은 부팅 시점에 `src/data/forgeClient.ts` 의 `isForgeConfigured` 가 결정합니다.
관리자 콘솔 사이드바에 현재 모드가 표시됩니다 (`AdminLayout`).

### ForgeDB 모드 활성화

1. https://forgedb.cloud 에서 프로젝트 생성 → 콘솔 진입
2. **SQL Editor** 에서 `supabase/schema.sql` 내용 전체 실행 (테이블 4종 + 헬퍼 함수 + RLS 정책 + 인덱스 + Realtime publication)
   - 스키마 끝부분의 `do $ ... $` 블록이 자동으로:
     - `supabase_realtime` publication 을 만들고 (없으면)
     - `quotes`, `progress_updates`, `portfolio` 를 멱등하게 추가합니다.
   - `auth.users` 테이블이 존재하지 않는 ForgeDB 변형에서도 에러 없이 동작하도록 FK 가 옵션 처리되어 있습니다.
3. 콘솔 **Auth → Users** 에서 첫 관리자 계정 생성 (예: `admin@yukye.local` / 안전한 비밀번호)
   - 또는 사이트에서 `/admin/login` → 빈 아이디/비밀번호로 가입 시도 → 자동 signUp 흐름이 동작 (첫 부팅 편의)
4. 프로젝트 대시보드에서 `Project ID` 와 `anon key` 복사
5. 루트에 `.env` 파일 생성 (`.env.example` 참고):

```env
VITE_FORGEDB_URL=https://forgedb.cloud
VITE_FORGEDB_PROJECT_ID=your_project_id
VITE_FORGEDB_ANON_KEY=your_anon_key
```

6. `npm run dev` 재시작 → 부팅 시 자동으로 ForgeDB 로 hydrate (quotes, progress_updates, portfolio 모두 로드)
7. `/admin/login` 에서 3번에서 만든 계정으로 로그인 → 사이드바 표시기가 `LOCAL` → `FORGEDB` 로 자동 전환

#### 첫 관리자 자동 가입 동작
`/admin/login` 의 `adminLogin` 함수는 로그인 실패 시 **자동으로 `signUp` 을 한 번 시도**합니다. 콘솔에 사용자가 미리 만들어져 있지 않더라도 첫 부팅에서는 별도 작업 없이 가입 → 로그인이 가능합니다. 단, ForgeDB 가 이메일 확인을 요구하는 경우 콘솔 메일함을 확인하거나 콘솔에서 직접 만드는 것을 권장합니다.

### RLS 정책 요약

스키마는 `forge_role()` (Postgres `current_setting('request.jwt.claim.role')`) 과 `forge_uid()` 헬퍼, 그리고 `forge_share_token()` (`request.jwt.claim.token` GUC) 헬퍼로 모든 정책을 `TO PUBLIC` 으로 두고 분기합니다 (ForgeDB의 role 명이 Supabase와 다를 수 있는 문제 회피).

| 테이블 | anon (고객) | authenticated (관리자) |
|--------|-------------|------------------------|
| `quotes` | INSERT + SELECT (자기 `share_token` 일치 시) | ALL |
| `progress_updates` | INSERT (`author_role IN ('customer','system')` + `visible_to_customer=true`) + SELECT (visible) | ALL |
| `portfolio` | SELECT (published=true) | ALL |
| `progress_attachments` | INSERT + SELECT | ALL |

### 고객 추적 토큰 (`share_token`)

각 견적은 `gen_random_uuid()` 로 자동 생성된 `share_token` 컬럼을 갖습니다. URL 은 `/quote/track/<share_token>` 형태이며:

- **PII 보호**: `quote.id` 는 uuid 라도 운영자가 추측 가능. `share_token` 은 *불투명한 추적 전용 식별자*.
- **RLS 강화**: `quotes_select_scoped` 정책이 `(share_token::text = forge_share_token())` 만 anon SELECT 허용 → 다른 고객의 quote 를 절대 볼 수 없음.
- **ForgeDB 콘솔에서 본인이 조회**: 콘솔 SQL Editor 에서 `set request.jwt.claim.token = '<토큰>'; select * from public.quotes;` 로 자기 quote 확인 가능.

> ⚠️ 콘솔이 `forge_share_token()` GUC 를 자동 주입하지 않을 경우, `DataContext.fetchQuoteByShareToken` 은 `from('quotes').eq('share_token', token)` 로 폴백합니다. 이때 RLS 가 anon 행을 차단하면 결과가 비고 "접수 정보를 찾을 수 없어요" 안내가 노출됩니다. 이 경우 콘솔에 `set local request.jwt.claim.token = '<token>';` 후 다시 시도하거나, 콘솔 SQL 로 직접 조회하세요.

### 실시간 동기화

`backendMode === 'forgedb'` 일 때 `DataContext` 가 자동으로 `quotes` / `progress_updates` / `portfolio` 테이블에 대해 Realtime 채널을 구독합니다. 다른 세션(관리자 / 고객 / 다른 탭)에서 변경이 일어나면 **새로고침 없이** 로컬 state가 갱신됩니다.

추가 비용 없이 동시성 제약을 풀고, 관리자 두 명이 동시에 작업하거나 고객이 진행경과를 제출했을 때 즉시 반영됩니다.

### 로컬 모드 데모

환경변수가 비어 있으면 자동으로 `local` 모드로 동작합니다 — `localStorage` + 시드 데이터 5건 + `admin` / `1234` 로그인. 배포 전에 데모 미리보기·로컬 개발이 끊김 없이 동작합니다.

## 실행

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # dist/
npm run preview  # dist/ 미리보기
```

## 프로젝트 구조

```
src/
├── data/
│   ├── DataContext.tsx      # 단일 진입점 — 양 모드 모두 동일한 API + Realtime 구독
│   ├── forgeClient.ts       # @forgedb/client 래퍼 (싱글톤)
│   ├── types.ts             # 도메인 타입 (Quote / ProgressUpdate / Review ...)
│   ├── portfolio.ts         # PortfolioItem 타입
│   ├── quoteDraft.ts        # 2단계 폼 세션 저장 (sessionStorage)
│   └── seed.ts              # 오프라인 폴백용 시드 데이터
├── pages/
│   ├── Landing.tsx
│   ├── quote/               # QuoteStep1/2/Done/Track + ProgressSubmitModal + ReviewModal
│   └── admin/               # Login/Layout/Dashboard/Quotes/Portfolio/Reviews
├── components/              # Header/Footer/Modal/Stepper/StarRating/StatusBadge/Toast/RequireAdmin
└── styles/theme.css         # 디자인 토큰 + 컴포넌트 CSS

supabase/
└── schema.sql               # ForgeDB (PostgreSQL) 스키마 + 헬퍼 함수 + RLS + 인덱스

.env.example                 # 환경변수 템플릿
```

## 핵심 기능

- **고객 영역**: 2단계 견적 폼 → 세션 자동 저장 → 진행경과 추적 → 사진·증빙 업로드 → 완료 시 별점 평가
- **관리자 콘솔**: KPI 대시보드 (SVG 차트) · 접수 관리 (메모·상태·CSV) · 포트폴리오 CRUD · 리뷰 집계
- **타입 안전성**: 모든 도메인 모델에 TypeScript strict 적용
- **반응형**: 모바일 / 태블릿 / 데스크탑 대응
- **외부 UI 라이브러리 0**: 모달·스테퍼·차트·별점 모두 자체 구현
- **실시간 동기화**: ForgeDB 모드에서 다중 세션 자동 반영

## CSV 다운로드 (관리자 콘솔 · 접수 관리)

`/admin/quotes` 상단 `⬇ CSV 다운로드` 버튼은 다음 21개 컬럼을 UTF-8 BOM 포함 CSV로 내보냅니다:

`접수번호, 접수일, 고객명, 연락처, 이메일, 지역, 선호연락시간, 공간유형, 평수, 예산, 입주예정일, 시공공간, 스타일, 상태, 진행률, 계약금액, 관리메모, 평점, 평가코멘트, 평가일시, 추가요청사항`

엑셀/한글 깨짐 방지를 위해 BOM(`\ufeff`)이 자동 포함됩니다.

## 마이그레이션 노트

- `localStorage` 키 (`yukye_design_state_v1`, `yukye_design_admin_auth_v1`, `yukye_design_quote_draft_v1`) 는 그대로 유지됩니다. ForgeDB 로 전환 후에는 로컬 시드 데이터가 보이지 않게 됩니다 — 콘솔에서 시드 insert SQL 을 직접 실행하세요.
- 첨부파일은 base64 로 DB `attachments` jsonb 컬럼에 저장됩니다. 4MB 초과 파일이 잦을 경우 별도 Storage 버킷 + signed URL 패턴을 권장합니다.
- RLS 정책은 `forge_uid()` / `forge_role()` 헬퍼로 작성되어 있어 `auth.uid()` 만 쓰는 Supabase 스키마를 그대로 이식하지 마세요.
- `schema.sql` 은 다음 변형 환경에서도 동작합니다:
  - `auth.users` 가 없는 ForgeDB 변형 — `manager_id` FK 가 옵션으로 처리됨
  - `supabase_realtime` publication 이 없는 환경 — 자동 생성
  - publication 에 테이블이 이미 추가된 환경 — 멱등 (`pg_publication_tables` 체크)

## 라이선스

Proprietary — Yukye Design internal use.