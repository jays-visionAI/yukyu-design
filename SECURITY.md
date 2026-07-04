# Security Policy

> 이 문서는 외부 사용자가 취약점을 안전하게 제보할 수 있도록 마련되었습니다.
> 내부 보안 사양은 다루지 않습니다.

## Supported Versions

| 버전 (branch / tag) | 지원 |
|---------------------|------|
| `main`              | ✅ 보안 패치 적용 |
| 기타 브랜치 / 포크  | ❌ 보장 없음 |

릴리스 태그가 없으므로, 보안 패치는 항상 `main`에 머지되고 GitHub Actions CI를 통과한 빌드가 정식 인스턴스로 배포됩니다.

## Reporting a Vulnerability

1. **GitHub Issue 작성은 피해주세요** — 공개 이력에 노출될 위험이 있습니다.
2. **이메일**: `security@blueforge.kr` (제목에 `[yukyu-design]` prefix 권장)
3. 또는 GitHub의 [Security Advisories](https://github.com/jays-visionAI/yukyu-design/security/advisories/new) Private Report 사용

영어로 작성해 주셔도 되고 한국어로 작성해 주셔도 됩니다. 48시간 내 1차 회신을 드립니다.

### 제보 시 포함해 주실 정보
- 영향 범위 (예: 무인증 접근 / 관리자 권한 상승 / RLS 우회 / XSS / SSRF …)
- 재현 단계 또는 최소 PoC (URL, 입력값, 환경)
- 영향도 평가 (CVSS 점수가 있으시면 함께)
- 제보자 공개 여부 (`Acknowledge` 섹션 노출 희망 여부)

### PGP / 공개 키
필요 시 `security@blueforge.kr` 회신에 공개 키를 동봉해 드립니다. 첫 제보에는 키 교환 없이 진행해도 충분합니다.

## Scope

다음 영역은 이 프로젝트의 보안 범위에 포함됩니다.

| 영역 | 포함 |
|------|------|
| 인증 / ForgeDB Auth 흐름 (`src/pages/admin/AdminLogin.tsx`) | ✅ |
| RLS 정책 (`supabase/schema.sql`의 헬퍼 함수 + 정책) | ✅ |
| 공유 토큰 (`share_token`) 추측·충돌·오용 | ✅ |
| CSV 다운로드 / 데이터 export 경로 | ✅ |
| 첨부파일 base64 업로드 (`progress_attachments`) | ✅ |
| 클라이언트 분석 / 추적 (`src/data/AnalyticsContext.tsx`) | ✅ |
| 의존성 (`@forgedb/client`, `react`, `vite` 등) | ⚠️ 보안 패치는 `npm audit` / `dependabot` 기준 |

다음은 보안과 직접 관련이 없으나 검토는 합니다.
- 디자인 시스템 토큰 누락
- 사용성 결함 (예: 저장 버튼 깜빡임 등 UI 결함)

## Out of Scope

- 자체 호스팅된 외부 도메인(third-party API)을 통한 공격 (별도 책임자에게 신고)
- 사전 동의 없는 소셜 엔지니어링 테스트
- 자동화된 광범위 스캐닝 (rate-limit 정책 준수, 미준수 시 차단)

## Response Plan

1. **48시간 내 1차 회신** — 접수 확인 + 우선순위 안내
2. **7일 내 조사 완료** — 영향 범위 검증 후 패치 작업 착수
3. **14일 내 패치 머지** — 심각도가 높을수록 단축될 수 있음
4. **공개 시점 협의** — 패치 적용 후 `GHSA-…` 어드바이저리 또는 README 보안 섹션 업데이트, 제보자 크레딧 명시 여부 확인
5. **CVE 발행 필요 시** — GitHub Security Advisory 통해 자동 발행 (MITRE에 자동 등록)

## Hall of Fame (Acknowledge)

민감한 취약점을 제보하신 분들의 이름을 안전 패치 공개 후 README에 게재하고 있습니다. 원치 않으시면 익명으로 처리됩니다.
