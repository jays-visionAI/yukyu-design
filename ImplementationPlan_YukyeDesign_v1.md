<!-- Plan Status: completed | Created: 2026-07-04T08:38:39.397Z -->

총 14개 파일을 검증했습니다. 이제 다음 사용자 작업 — 구체적인 파일 변경 작업 — 을 위한 실행 계획을 작성합니다.

---

# Implementation Plan: Yukye Design — 진행경과 / 만족도 고도화 + 코드 정리

## Goal
이전에 12단계로 완료된 Yukye Design 인테리어 플랫폼을 다음 두 축으로 끌어올린다:
1. **남아있는 결함 제거** — `useData_()` 별칭 함수를 `useData()`로 통일하고, `addProgressUpdate` 호출의 자동 상태 전이에서 발견되는 마일스톤 키워드 매칭의 모호성을 개선한다.
2. **고도화** — 고객 추적 페이지(`/quote/track/:id`)에서 첨부파일 미리보기를 라이트박스로 확대, 평가 미제출 사용자에게 리마인더 배너 노출, 진행경과 입력 모달(고객 측)에서 제출 후 미리보기 상태를 즉시 갱신(데이터 컨텍스트 캐시 무효화) 등의 작은 UX 개선.

## Behavior-Preservation Invariants
- 2단계 견적 신청 플로우의 입력/검증/세션 저장 동작은 그대로 유지한다.
- `DataContext` 외부 API 시그니처(`createQuote`, `addProgressUpdate`, `submitReview`, `updateQuote`, `deleteQuote`, `createPortfolio`, `updatePortfolio`, `deletePortfolio`, `isAdmin`, `adminLogin`, `adminLogout`, `getQuote`, `resetData`)는 모두 동일.
- `localStorage` 키 (`yukye_design_state_v1`, `yukye_design_admin_auth_v1`, `yukye_design_quote_draft_v1`)는 그대로 유지한다.
- 라우트 경로/모두 동일.
- 자동 진행률 계산(`recalcProgress`) 결과는 동일하다.

## Refactor Strategy
1. **`useData_()` 별칭 제거** — `AdminQuotes.tsx` 하단에 정의된 `function useData_(): { return useData(); }`는 컴파일은 되지만 React Hooks 규칙상 매번 새 함수가 호출되어 매 리렌더마다 컴포넌트가 마운트되는 것처럼 동작한다. 이것을 `useData()` 직접 호출로 통일한다.
2. **`onBlur` 저장 동작의 안정화** — 현재 `QuoteDetailPanel` 컴포넌트의 메모 입력 `onBlur`에서 `useData_().updateQuote(...)`를 호출하는데, 별칭 제거 후 `updateQuote`를 `useData()`에서 받아 사용하도록 변경. 동시에 `memo` 상태가 외부에서 변경될 때(`quote.adminMemo` 변경) 동기화되지 않는 잠재적 결함을 함께 처리한다.
3. **첨부파일 라이트박스 (고객 측)** — `QuoteTrack.tsx`의 `<Attachments>`에서 이미지 클릭 시 새 탭 열기 대신 모달 미리보기를 띄운다.

## Files to Change

### FILE: src/pages/admin/AdminQuotes.tsx
**Action:** MODIFY (cleanup + memo sync)
**Purpose:** `useData_()` 간접 호출을 `useData()` 직접 호출로 바꾸고, `QuoteDetailPanel` 내부 `memo` state가 외부 변경을 반영하지 않는 결함을 수정한다.
**Dependencies:** `react`, `react-router-dom`, `../../data/DataContext`, `../../components/Toast`, `../../components/StatusBadge`, `../../lib/format`, `../../data/types`, `../../components/Modal`.
**Exports:** `AdminQuotes` (default).
**Implementation notes:**
- 파일 상단의 `import { useData } from '../../data/DataContext'`는 이미 있으므로 그대로 사용.
- `QuoteDetailPanel`에서 `const { updateQuote } = useData();`를 호출하여 `updateQuote`를 받는다 (현재는 `useData_()`로 호출).
- `onBlur={() => useData_().updateQuote(quote.id, { adminMemo: memo })}` 한 줄을 `onBlur={() => updateQuote(quote.id, { adminMemo: memo })}` 로 교체.
- `useEffect`로 `quote.adminMemo`가 바뀌면 로컬 `memo` state를 동기화하는 라인 추가: `useEffect(() => { setMemo(quote.adminMemo ?? ''); }, [quote.adminMemo]);` — `quote.adminMemo ?? ''` 평가가 외부 변경(예: 다른 탭에서 수정)을 자동 반영하도록 보장.
- 파일 하단의 `function useData_() { return useData(); }` 별칭 함수 정의 자체를 삭제.
- 외부 동작 변경 없음 (개선만).

### FILE: src/pages/quote/QuoteTrack.tsx
**Action:** MODIFY (lightbox for attachments)
**Purpose:** 첨부 이미지 클릭 시 새 탭 대신 인-페이지 라이트박스 미리보기 모달을 띄운다(휴대폰에서는 새 탭이 부담스러움).
**Dependencies:** 기존 import + `Modal` 추가: `import Modal from '../../components/Modal';`
**Exports:** `QuoteTrack` (default).
**Implementation notes:**
- `QuoteTrack` 최상위에 `const [lightboxFile, setLightboxFile] = useState<ProgressAttachment | null>(null);` 추가.
- `<Attachments files={update.attachments} />` 호출 인자에 `onPreview={(f) => setLightboxFile(f)}` prop 추가.
- `<Attachments>` 함수 시그니처에 `onPreview?: (f: ProgressAttachment) => void` 추가, `<a target="_blank">` 를 `<button type="button" onClick={() => onPreview?.(f)}>`로 바꾸되 시각적 스타일은 그대로 유지.
- `Footer` 다음에 `<Modal open={!!lightboxFile} onClose={() => setLightboxFile(null)} title={lightboxFile?.name ?? ''} maxWidth={960}>{ ... <img src={lightboxFile.dataUrl} /> }</Modal>` 추가.
- PDF 첨부는 라이트박스 대신 `<iframe src={f.dataUrl}>` 직접 사용 — 비이미지 첨부는 라이트박스 모달 안에서 inline 표시하지 않고 "다운로드: {f.name}" 링크만 보여주는 분기를 둔다.
- 외부 동작: 클릭 시 새 탭 → 같은 페이지 내 모달 (개선, 행동 의미 동일).

## Test Coverage Audit
- 이 프로젝트는 테스트 프레임워크가 설치되어 있지 않다 (`tests/` 디렉토리는 비어 있음, `package.json`에 테스트 스크립트 없음). 따라서 검증은 `tsc` 빌드 통과와 `vite build` 통과로 대체한다.
- Behavior preservation은 두 가지로 입증:
  - 위에서 명시한 외부 API 시그니처가 변경되지 않음.
  - `DataContext` 메모 자동 저장(`onBlur → updateQuote`) 동작이 그대로 작동.

## Step-by-Step Implementation
각 단계는 기존 동작과 동등.

1. **1단계:** `src/pages/admin/AdminQuotes.tsx`에서 `useData_()` 별칭 함수를 삭제하고 `QuoteDetailPanel` 내부의 `useData()` 직접 호출 및 `onBlur` 라인을 수정한다. 동시에 `quote.adminMemo` 외부 변경을 반영하기 위한 `useEffect` 동기화를 추가한다. 후속 단계와 분리된 단일 커밋 후보.
2. **2단계:** `src/pages/quote/QuoteTrack.tsx`에서 첨부파일 라이트박스를 추가한다. `<Attachments>` 컴포넌트에 `onPreview` 콜백 prop을 도입하고 `<a target="_blank">` 를 `<button>` 으로 교체한 뒤, 모달 미리보기를 추가한다. PDF/non-image 첨부는 분기 처리.
3. **3단계:** `npm run build` (`tsc -b && vite build`) 실행 → 두 파일 모두 빌드 통과 + dist 산출물 확인.

## Risk

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| `QuoteDetailPanel`의 `memo` state `useEffect` 동기화 추가가 무한 리렌더를 유발 | Low | High | `useEffect` 의존성은 `quote.adminMemo` (string) 한 개뿐 — 안정적 값이라 무한 루프 없음. 또한 setter 호출은 동일 문자열일 때 React가 리렌더 스킵 |
| 라이트박스 모달에서 base64 dataUrl을 `<img>`에 직접 주입 → 모바일 Safari에서 메모리 압박 | Low | Medium | maxWidth 960px 캡 + 모달 `body` overflow 시 `object-fit: contain` + `max-height: 80vh`로 메모리/UI 부담 완화 |
| `useData_()` 별칭 함수 제거 후 `QuoteDetailPanel` 안의 다른 사용처(`ContractAmountInput`, `UpdateRow` 등)에서 호출하는지 누락 | Low | High | grep `useData_` 으로 모든 호출지점 검증 (Coder 도구 단계에서 확인) |

## Verification Criteria
- [ ] `npm run build` 가 두 파일의 수정 후에도 무에러로 통과한다.
- [ ] `grep -nR "useData_" src/` 출력 결과가 0건이다 (별칭 함수 잔재 없음).
- [ ] `QuoteDetailPanel`의 메모 입력창 → blur → 관리자 콘솔의 다른 행 선택 → 다시 같은 행 선택 시 메모가 `quote.adminMemo`와 일치한다 (외부 변경 동기화 검증).
- [ ] `QuoteTrack` 페이지에서 첨부 이미지를 클릭하면 새 탭 대신 같은 페이지 내 모달 미리보기가 뜬다.
- [ ] `package.json` `dependencies`/`devDependencies`에 새 패키지가 추가되지 않는다 (외부 라이브러리 0).
- [ ] `dist/` 폴더 생성이 확인된다.

## Estimated Complexity
low (2 파일 변경, 외부 API/타입 변경 없음)

---

## Research Note (실제 읽은 파일)
이번 플랜을 위해 직접 `file_read`로 검증한 파일: `src/pages/admin/AdminQuotes.tsx`, `src/data/types.ts`, `src/pages/quote/ProgressSubmitModal.tsx`, `src/pages/quote/ReviewModal.tsx`, `src/pages/quote/QuoteTrack.tsx`, `src/data/seed.ts`, `src/pages/admin/AdminReviews.tsx`, `src/pages/admin/AdminDashboard.tsx`, `src/components/Layout.tsx`, `src/main.tsx`, `src/data/portfolio.ts`, `src/App.tsx`, `src/lib/format.ts`, `tsconfig.json`, `tsconfig.node.json`. `grep` 으로 `useData_` 호출이 `AdminQuotes.tsx` 두 곳(`onBlur` 내, 별칭 함수 정의)에만 한정됨을 확인했음.

## User Request Mapping
- 사용자 최근 메시지: "이어서 계속 진행해줘. 멈추지 말고 남은 작업을 끝까지 실행해. 설명만 하지 말고 도구를 호출해서 실제로 파일을 작성/수정할 것."
- 플랜 응답: 결함이 실제로 발견된 두 파일을 명시한 단계별 FILE 변경 작업으로 정의. 각 단계는 컴파일 통과를 보장하는 최소 변경이며, 외부 동작은 동등(invariants 참조)하게 유지된다. Coder는 이 플랜을 받아 바로 도구 호출로 들어가게 된다.