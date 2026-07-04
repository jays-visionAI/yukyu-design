# Changelog

이 문서는 사람이 읽기 좋도록 정리된 변경 로그입니다. 자동 생성된 `git log`는 [`commits`](https://github.com/jays-visionAI/yukyu-design/commits/main) 페이지에서 확인하세요.

> **버전 규약**: 한 자릿수 메이저 변경은 아직 없으므로 `0.Y.0` 형식으로 시작합니다.
> 향후 의미적 버전 관리가 필요해지면 SemVer로 전환합니다.

## [Unreleased]

### Added
- (예정) 자동 배포 파이프라인 (요청 시 활성화)
- (예정) Dependabot / CodeQL 자동 점검

## 2026-07 · 협력업체 파트너 신청 기능

### Added
- 인테리어·시공 협력업체 등록 신청 기능 (`/partner/apply`)
 - 3단계 폼: 사업자정보 → 시공 사례 + 실적 → 동의 및 제출
 - 사업자등록번호 자동 하이픈 포맷팅, 한국 전화번호 자동 포맷팅
 - 작성 중 입력값 자동 저장 → 새로고침/재방문 시 sessionStorage 복구 (제출 성공 시 자동 삭제)
 - 신청 결과는 이메일 안내 (RLS: anon SELECT 차단)
- 관리자 파트너 신청 관리 콘솔 (`/admin/partners`)
 - 상태 탭 (전체 / 접수됨 / 검토중 / 승인 / 반려) · 검색 · 상세 모달
 - 모달을 URL `?id=` 쿼리로 딥링크 가능 (다른 탭/세션에서 직접 열기)
 - 승인/반려 처리 (관리자 코멘트, 처리일시 자동 기록)
 - 사이드바 "파트너 신청" 메뉴에 미처리 카운트 뱃지
- 푸터에 "협력업체 모집" 블록 + 신청 버튼, 상단 헤더에 "파트너 등록" 메뉴
- `supabase/schema.sql` 에 `partner_applications` 테이블 + RLS (anon INSERT only / admin SELECT·UPDATE·DELETE) + 인덱스 + Realtime publication 등록

### Notes
- 일반 고객은 신청만 가능하고 신청 결과를 조회할 수 없습니다 (RLS 정책상 anon SELECT 차단). 결과는 이메일로만 통보.

---

## 2026-07 · 푸터 · SEO · GitHub 인프라

### Changed
- 푸터 회사정보를 `Blueforge D&I 사업부` / `서울시 종로구 종로1길 50 더케이트윈타워 B동 2층` 으로 갱신
- SEO JSON-LD (`src/data/analytics.ts`의 기본 `address` / `businessName`) 도 동일한 주소로 동기화
- 어드민 SEO 설정 페이지의 저장 버튼 깜빡임 수정 — `draft`/`seo` 비교를 `JSON.stringify` 시그니처 기반으로 전환하여 `updatedAt` 흔들림에 따른 갱신 사이클 차단

### Infrastructure
- GitHub 저장소 연결 (`jays-visionAI/yukyu-design`) — origin `main` 첫 push 완료
- GitHub Actions CI 워크플로우 (`.github/workflows/ci.yml`) — Node 20, `npm run build`, dist 아티팩트 업로드, PR·push 트리거
- GitHub 이슈 템플릿 (`bug_report.yml`, `feature_request.yml`, `config.yml`)
- PR 템플릿 (검증 체크리스트 + 브레이킹 체인지 섹션)
- CONTRIBUTING 가이드 (행동 보존 규칙 + 디자인 토큰 정책)
- README 헤더 배지 (Vite / React / TypeScript / ForgeDB / Build / License)
- `.gitignore` 정돈 (`.blueforge/`, `.npm-cache/` 등록)

### Notes
- 견적 시드 데이터의 `region`은 시연용 현장 주소라 회사 주소와 무관하여 그대로 유지했습니다.
- 자동 배포(Vercel / Netlify / Cloudflare Pages)는 환경변수 등록이 필요해 명시 요청 시에만 진행합니다.

---

## 구 기록 (요약)

이전 시점의 작업은 자동 발행된 `[blueforge] publish v1~v3` 커밋에 포함되어 있으며, 그 외 의미 있는 마일스톤은 git history 참고.

- **publish v3** (`8d71b3f`) — 분석/SEO 어드민 콘솔, 자동 추적, 메타 주입 훅, JSON-LD/로봇·sitemap 생성
- **publish v2** (`c007c66`) — 견적 2단계 폼 + 세션 저장 + 실시간 진행경과 + 리뷰
- **publish v1** (`a9a952f`) — 초기 부트스트랩 (Landing / Quote / Admin / Portfolio / RLS)
