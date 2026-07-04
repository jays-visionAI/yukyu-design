# Contributing — Yukyu Design

Yukyu Design 인테리어 SaaS 저장소에 PR/이슈를 올릴 때의 가이드라인입니다.

## 스택

- **Vite 5** + **React 18** + **TypeScript (strict)** + **React Router 6**
- **ForgeDB** (`@forgedb/client`) — Supabase 호환 PostgreSQL 16+ BaaS
- 외부 UI 라이브러리 **0** (모달·차트·스테퍼·별점 모두 자체 구현)
- 디자인 토큰 — `src/styles/theme.css` 의 CSS 변수만 사용

## 개발 환경

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # tsc -b && vite build
```

> 데이터 모드는 환경변수 유무로 자동 전환됩니다 — `localStorage` ↔ `forgedb`. 두 모드 모두 동일한 외부 API (`DataContext`, `AnalyticsContext`) 를 사용합니다.

## 코드 규칙

### 행동 보존 (Behavior Preservation)
이 프로젝트는 **외부 API 시그니처를 안정적으로 유지하는 것**을 우선합니다. 변경 전 PR 본문에 아래 항목을 명시해 주세요:

- `DataContext` / `AnalyticsContext` 외부 함수의 시그니처 변화 유무
- `localStorage` 키 (`yukye_design_state_v1`, `yukye_design_admin_auth_v1`, `yukye_design_quote_draft_v1`) 변경 유무
- 라우트 경로/페이지 컴포넌트 default export 이름 변경 유무

### 디자인 토큰
- 색/간격/라운드/타이포는 직접 hex/px 값을 쓰지 말고 `theme.css` 의 CSS 변수를 참조합니다.
- 다크/라이트 두 가지가 필요한 경우 `data-theme` 속성으로 분기합니다.

### 포크 규칙
- 새 추상화는 **두 번 이상 중복**될 때만 만듭니다.
- 사용되지 않는 dead code, 미사용 import, 디버그용 `console.log` 는 PR에 포함하지 않습니다.

### TypeScript
- `tsc -b` 가 strict 통과해야 합니다. `any` 는 불가피할 때만 좁은 영역에 한정해 주석과 함께 사용합니다.

## 브랜치 / 커밋

- **브랜치**: `feat/<topic>`, `fix/<topic>`, `chore/<topic>` (소문자 kebab-case 권장)
- **커밋 prefix**: `feat:` / `fix:` / `refactor:` / `docs:` / `chore:` / `ci:`
- 한 커밋은 하나의 논리적 변경만 포함합니다.

## PR 절차

1. `main` 에서 최신화 후 브랜치 생성
2. 로컬에서 `npm run build` 통과 확인
3. PR 템플릿 작성 (동작/UI 변화, 검증 체크리스트 채우기)
4. CI (`.github/workflows/ci.yml`) 가 통과해야 머지 가능
5. 리뷰어의 코멘트가 모두 해소되면 squash merge

## 이슈

- 버그: 재현 절차 + 기대 동작 + 실제 동작 + 환경(브라우저/OS/모드) 을 모두 적어 주세요.
- 기능 제안: 문제/동기 + 제안하는 해결 방향 + 영향 범위를 적어 주세요.
- 템플릿: `.github/ISSUE_TEMPLATE` 참고.

## 보안

- 시크릿은 절대 커밋하지 않습니다. (`.env` 는 자동으로 `gitignore`)
- 외부 유료 API 키가 필요한 경우 ForgeDB edge function 으로 프록시합니다 — 클라이언트에 직접 노출 금지.
- 의존성 추가 PR 은 영향받는 `bundle size` 영향도 함께 적어 주세요.

## 라이선스

이 저장소는 사내용 (Proprietary) 입니다. 외부 배포·재사용 시 별도 허가가 필요합니다.
