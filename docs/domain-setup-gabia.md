# yukyu.kr 도메인 연결 가이드 (가비아)

> 이 문서는 가비아(Gabia)에서 `yukyu.kr` 을 구매한 후, ForgeDB STATIC 호스팅(`{slug}.forgedb.app`)에 커스텀 도메인으로 연결하는 절차를 안내합니다.

---

## 0. 현재 상태 정리

| 항목 | 값 |
|------|-----|
| 프로젝트 | Yukyu Design |
| 프로젝트 ID | `3911ddc3-b022-44d8-b5c9-b15e8c5adc81` |
| 배포 URL | `https://<배포슬러그>.forgedb.app` *(콘솔에서 확인)* |
| 도메인 등록기관 | **가비아** |
| 연결 대상 도메인 | `yukyu.kr` (apex) + `www.yukyu.kr` (서브) |

---

## 1. ForgeDB 콘솔에서 배포 슬러그 확인

1. https://forgedb.cloud 로그인
2. 본 프로젝트 선택 → 좌측 **Hosting** 메뉴
3. **도메인 / Deployments** 항목에서 현재 배포된 호스트 확인
   - 예: `yukyu-design.forgedb.app`
   - 또는 `yukyu-design-3911ddc3.forgedb.app`
4. 이 값을 **Deployment Target** 라고 부르겠습니다. 아래 단계에서 사용합니다.

---

## 2. ForgeDB 콘솔에서 커스텀 도메인 추가

1. 같은 Hosting 페이지에서 **Add Custom Domain** 또는 **도메인 추가** 클릭
2. 도메인 입력: `yukyu.kr`
3. `www.yukyu.kr` 도 추가 (둘 다 입력 권장)
4. 콘솔이 안내하는 **DNS 설정 값**을 메모합니다.

> ⚠️ ForgeDB 콘솔은 보통 아래 둘 중 하나의 값을 안내합니다:
>
> **A. CNAME (서브도메인만 가능)** — `www.yukyu.kr` → `<slug>.forgedb.app`
>
> **B. A 레코드 (apex 도메인용)** — `yukyu.kr` → `76.76.21.21` (또는 콘솔 안내 IP)
>
> 어떤 값이 안내되는지에 따라 아래 3단계의 입력이 달라집니다.

---

## 3. 가비아 DNS 설정

가비아 My가비아 → 도메인 관리 → `yukyu.kr` → **DNS 관리 / 정보변경** → **DNS 설정** 페이지로 이동합니다.

### 3-1. `www.yukyu.kr` (서브도메인) — CNAME 레코드

| 항목 | 값 |
|------|-----|
| 호스트 이름 | `www` |
| 레코드 타입 | `CNAME` |
| 값 / 목적지 | `<배포슬러그>.forgedb.app` *(1단계에서 확인한 값)* |
| TTL | 3600 (기본값) |

> 가비아에서 CNAME의 "값" 입력란에 `forgedb.app` 슬러그 부분이 자동으로 붙지 않으므로 **반드시 전체 호스트명**(예: `yukyu-design.forgedb.app`)을 입력해야 합니다.

### 3-2. `yukyu.kr` (apex / root 도메인)

가비아는 apex 도메인에 `A 레코드` 만 지원합니다 (CNAME 미지원). 따라서 ForgeDB 콘솔이 안내한 IP로 A 레코드를 설정합니다.

| 항목 | 값 |
|------|-----|
| 호스트 이름 | `@` (또는 비워둠) |
| 레코드 타입 | `A` |
| 값 / 목적지 | ForgeDB 콘솔이 안내한 IP (예: `76.76.21.21`) |
| TTL | 3600 |

> ⚠️ 가비아 apex A 레코드의 흔한 함정:
> - 기존에 `A @ -> (가비아 파킹 IP)` 가 남아있으면 덮어쓰기
> - 네임서버가 가비아 기본이 아닐 경우(예: 카페24로 이전한 경우) 가비아 DNS 설정이 적용되지 않음. **네임서버가 `ns.gabia.co.kr` / `ns1.gabia.co.kr` / `ns.gabia.net` 인지 먼저 확인**하세요.

### 3-3. (선택) www → apex 리디렉션

`www.yukyu.kr` 와 `yukyu.kr` 둘 다 같은 사이트로 연결되도록 한 후, **하나만 정식(canonical)으로** 운영할 것을 권장합니다.

SEO 기본값(`canonicalUrl`)을 `https://yukyu.kr` 로 설정하고 `www` 도메인도 정상 동작하게 두면 됩니다.

---

## 4. SSL 인증서 발급 (자동)

ForgeDB 콘솔에서 커스텀 도메인을 추가하면 자동으로 **Let's Encrypt SSL 인증서**가 발급·갱신됩니다.

- 평균 5분 ~ 30분 소요 (DNS 전파 시간에 따라)
- 콘솔에서 도메인 옆 상태 표시가 `Valid` 또는 ✓ 표시로 바뀌면 완료

DNS 설정 후 콘솔에서 **Verify / 다시 확인** 버튼을 눌러 강제 트리거할 수 있습니다.

---

## 5. DNS 전파 확인

전파는 보통 즉시 ~ 최대 48시간 (보통 5~30분). 다음 명령으로 확인합니다.

```bash
# apex 도메인
nslookup yukyu.kr

# www 서브도메인
nslookup www.yukyu.kr

# 또는 온라인 도구 사용
# https://dnschecker.org
```

확인 항목:
- `yukyu.kr` → ForgeDB 안내 IP (예: `76.76.21.21`)
- `www.yukyu.kr` → `yukyu-design.forgedb.app` CNAME

---

## 6. 프로젝트 코드에 도메인 반영

### 6-1. 환경변수 추가

`.env` 파일에 (또는 ForgeDB 콘솔 환경설정에):

```env
# 사이트가 실제로 운영될 도메인 — SEO canonical / og:url / sitemap absolute URL 생성에 사용
VITE_PUBLIC_SITE_URL=https://yukyu.kr
```

### 6-2. SEO 설정 업데이트

`/admin/seo` 페이지에서 다음 값을 설정 (또는 코드 기본값 변경):

- **canonicalUrl**: `https://yukyu.kr`
- **ogImageUrl**: `https://yukyu.kr/og-cover.jpg` (실제 OG 이미지 업로드 후 URL)
- **robotsPolicy**: `index,follow` (운영 시작 시)
- **sitemapEnabled**: `true`

### 6-3. 검색엔진 등록

운영 시작 후:

- **Google Search Console**: `https://search.google.com/search-console` → 속성 추가 → `도메인` 방식 권장 (DNS TXT 레코드 인증)
- **Naver Search Advisor**: `https://searchadvisor.naver.com` → 사이트 등록 → HTML 태그 또는 메타태그 방식

검증 토큰(meta 태그 값)은 `/admin/seo` → **소유 확인** 섹션에 입력하면 모든 페이지 `<head>` 에 자동 주입됩니다.

---

## 7. 운영 전 체크리스트

- [ ] DNS 전파 완료 (`nslookup` 으로 IP / CNAME 확인)
- [ ] ForgeDB 콘솔에서 SSL 인증서 상태 `Valid`
- [ ] `https://yukyu.kr` 직접 접속 → 정상 렌더 (브라우저 자물쇠 표시 확인)
- [ ] `https://www.yukyu.kr` → 정상 렌더 (또는 `https://yukyu.kr` 로 리다이렉트)
- [ ] `/sitemap.xml` → 도메인이 `yukyu.kr` 로 출력
- [ ] `/robots.txt` → Sitemap 절대 URL 이 `yukyu.kr` 로 출력
- [ ] `/admin/seo` 대시보드의 Google 미리보기에서 URL 이 `yukyu.kr` 로 표시
- [ ] OG 미리보기에서 이미지가 정상 표시 (OG 이미지 1200x630 권장)

---

## 8. 트러블슈팅

### "사이트에 연결할 수 없음" / SSL 발급 실패

| 원인 | 확인 / 해결 |
|------|------------|
| DNS 미전파 | `nslookup` 으로 IP / CNAME 확인. 최대 48시간 대기 |
| apex CNAME 시도 | 가비아는 apex 에 CNAME 안 됨. **A 레코드** 로 변경 |
| 가비아 네임서버가 아님 | 도메인 정보에서 네임서버 확인. 가비아 DNS 사용 시 `ns.gabia.co.kr` 등이어야 함 |
| 1개 도메인만 인증서 발급 | www 와 apex 둘 다 콘솔에 등록했는지 확인 |
| 캐싱된 CNAME | 가비아 설정 저장 후 5~10분 대기. 브라우저 시크릿 창으로 테스트 |

### www 없이 apex 만 연결되는 경우

일부 CDN은 apex CNAME 을 지원하지 않습니다. 가비아의 apex A 레코드 IP가 바뀌면(ForgeDB 인프라 변경) 사이트가 잠시 끊길 수 있습니다. 이런 경우:

1. 가비아에서 `www.yukyu.kr` 만 CNAME 으로 연결
2. apex(`@`) 를 `URL Redirect` 로 `https://www.yukyu.kr` 로 리디렉트 (가비아 자체 기능)

이 방식이 apex IP 변경 리스크를 없앱니다.

### 도메인 검수 / 심사 안내

`.kr` 도메인은 한국인터넷진흥원(KISA) 등록 후 사용 가능합니다. 가비아에서 구매 시점에 이미 등록 절차가 완료된 상태이므로 별도 작업 없습니다. 단, **외부에서 한국 사용자에게 공개**할 사이트의 경우 정보통신망법 준수 사항 (개인정보처리방침, 사업자 정보 표시 등)을 확인하세요.

---

## 9. 참고 자료

- ForgeDB 콘솔: https://forgedb.cloud
- 가비아 DNS 설정 가이드: https://customer.gabia.com
- Google Search Console: https://search.google.com/search-console
- Naver Search Advisor: https://searchadvisor.naver.com
- DNS 전파 확인: https://dnschecker.org