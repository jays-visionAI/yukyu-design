// ============================================================
//  PartnerApply — 인테리어/시공업체 파트너 등록 신청 페이지
// ------------------------------------------------------------
//  · 일반 사용자(anon)도 접근 가능 — 신청만 가능, 결과는 이메일로 안내
//  · 3단계 폼: 사업자정보 → 시공사례 + 실적 → 동의 및 제출
//  · 사업자등록번호 형식 검증, 필수 항목 검증, 동의 항목 검증
// ============================================================

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Header, Footer } from '../../components/Layout';
import { usePartner } from '../../data/PartnerContext';
import {
  emptyPartnerDraft,
  PARTNER_SPECIALTY_LABELS,
  validateBusinessNumber,
  type PartnerApplication,
  type PartnerBusinessInfo,
  type PartnerBusinessType,
  type PartnerCase,
  type PartnerPerformance,
  type PartnerAgreement,
} from '../../data/partner';
import { useToast } from '../../components/Toast';

type Step = 1 | 2 | 3;

// 사용자가 페이지를 떠났다가 돌아와도 임시로 입력값을 복구하기 위한 키.
// 제출 성공 시 제거. 로컬스토리지가 아닌 세션스토리지를 쓰는 이유는
// 브라우저 탭을 닫으면 사라져서 (1) 민감한 사업자 정보가 디스크에 남지 않고,
// (2) 다음 방문 시 새 신청으로 깨끗하게 시작하기 위함.
const DRAFT_KEY = 'yukye_design_partner_draft_v1';

const BUSINESS_TYPE_OPTIONS: PartnerBusinessType[] = [
  'interior_design',
  'construction',
  'design_and_build',
  'partial',
  'other',
];

const BUDGET_PRESETS = [
  '1,000만원 미만',
  '1,000~2,000만원',
  '2,000~3,000만원',
  '3,000~4,000만원',
  '4,000~5,000만원',
  '5,000만원~1억',
  '1억 이상',
];

const REGION_PRESETS = [
  '서울 강남구',
  '서울 강서구',
  '서울 송파구',
  '서울 마포구',
  '서울 용산구',
  '서울 종로구',
  '경기 성남시',
  '경기 분당구',
  '경기 고양시',
  '인천 연수구',
  '부산 해운대구',
];

export default function PartnerApply() {
  const navigate = useNavigate();
  const { submitApplication, backendMode } = usePartner();
  const toast = useToast();

  const [step, setStep] = useState<Step>(1);
  const [draft, setDraft] = useState(() => emptyPartnerDraft());
  const [restored, setRestored] = useState<boolean>(false);
  const skipPersistRef = useRef<boolean>(false);

  // ---------- 임시 저장 / 복구 ----------
  // 마운트 시 sessionStorage 에 저장된 draft 가 있으면 사용자에게 알리고 복구.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (!raw) {
        setRestored(true);
        return;
      }
      const parsed = JSON.parse(raw) as Omit<
        PartnerApplication,
        'id' | 'createdAt' | 'updatedAt' | 'status'
      >;
      // 최소한의 형태 검증 (business 객체가 있는지로 빠르게)
      if (parsed && typeof parsed === 'object' && parsed.business) {
        skipPersistRef.current = true; // 복구한 값을 곧바로 다시 저장하지 않게
        setDraft(parsed);
        setRestored(true);
        toast.push('이전에 작성 중이던 내용이 복구되었습니다.');
      } else {
        setRestored(true);
      }
    } catch {
      setRestored(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 입력 변경 시 자동 저장. restored=false 일 때는 아직 복구 시도 전이므로 무시.
  useEffect(() => {
    if (!restored) return;
    if (skipPersistRef.current) {
      skipPersistRef.current = false;
      return;
    }
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      /* quota — 무시 */
    }
  }, [draft, restored]);

  const updateBusiness = (patch: Partial<PartnerBusinessInfo>) =>
    setDraft((d) => ({ ...d, business: { ...d.business, ...patch } }));

  // 사업자등록번호를 000-00-00000 형태로 자동 포맷팅 (사용자 입력 편의성).
  // 검증 로직은 숫자만 비교하므로 하이픈 포함/미포함 모두 통과합니다.
  const formatBusinessNumber = (raw: string): string => {
    const digits = raw.replace(/[^0-9]/g, '').slice(0, 10);
    if (digits.length <= 3) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
  };

  // 한국 전화번호 자동 하이픈 포맷팅 (휴대폰·지역번호-국번호-번호).
  // 숫자만 추출해 10~11자리에 맞춰 그룹핑합니다.
  const formatPhoneNumber = (raw: string): string => {
    const digits = raw.replace(/[^0-9]/g, '').slice(0, 11);
    if (digits.length === 0) return '';
    if (digits.startsWith('02')) {
      // 서울 지역번호 (02-XXX-XXXX 또는 02-XXXX-XXXX)
      if (digits.length <= 2) return digits;
      if (digits.length <= 5) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
      if (digits.length <= 9)
        return `${digits.slice(0, 2)}-${digits.slice(2, digits.length - 4)}-${digits.slice(-4)}`;
      return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
    }
    // 휴대폰 / 기타 (010·011·016·017·018·019 / 031·032·...)
    if (digits.length <= 3) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  };

  const updateCase = (idx: number, patch: Partial<PartnerCase>) =>
    setDraft((d) => ({
      ...d,
      cases: d.cases.map((c, i) => (i === idx ? { ...c, ...patch } : c)),
    }));

  const addCase = () =>
    setDraft((d) => ({
      ...d,
      cases: [
        ...d.cases,
        {
          title: '',
          spaceType: '',
          areaSize: 0,
          location: '',
          durationWeeks: 0,
          budget: '',
          completedYear: new Date().getFullYear(),
          materials: '',
          description: '',
        },
      ],
    }));

  const removeCase = (idx: number) =>
    setDraft((d) => ({
      ...d,
      cases: d.cases.length > 1 ? d.cases.filter((_, i) => i !== idx) : d.cases,
    }));

  const updatePerformance = (patch: Partial<PartnerPerformance>) =>
    setDraft((d) => ({ ...d, performance: { ...d.performance, ...patch } }));

  const updateAgreement = (patch: Partial<PartnerAgreement>) =>
    setDraft((d) => ({ ...d, agreement: { ...d.agreement, ...patch } }));

  const toggleSpecialty = (sp: PartnerBusinessType) => {
    const cur = draft.performance.specialties;
    updatePerformance({
      specialties: cur.includes(sp) ? cur.filter((x) => x !== sp) : [...cur, sp],
    });
  };

  const toggleRegion = (region: string) => {
    const cur = draft.performance.primaryRegions;
    if (cur.includes(region)) {
      updatePerformance({ primaryRegions: cur.filter((x) => x !== region) });
    } else if (cur.length < 5) {
      updatePerformance({ primaryRegions: [...cur, region] });
    } else {
      toast.push('주요 시공 지역은 최대 5개까지 선택할 수 있어요.');
    }
  };

  // -------- 검증 --------
  const businessErrors = useMemo(() => {
    const e: Record<string, string> = {};
    const b = draft.business;
    if (!b.companyName.trim()) e.companyName = '회사/상호명을 입력해 주세요.';
    if (!b.businessNumber.trim()) e.businessNumber = '사업자등록번호를 입력해 주세요.';
    else if (!validateBusinessNumber(b.businessNumber))
      e.businessNumber = '사업자등록번호 형식이 올바르지 않습니다 (NNN-NN-NNNNN).';
    if (!b.ceoName.trim()) e.ceoName = '대표자명을 입력해 주세요.';
    if (!b.address.trim()) e.address = '소재지를 입력해 주세요.';
    if (!b.contactName.trim()) e.contactName = '담당자 이름을 입력해 주세요.';
    if (!b.contactPhone.trim()) e.contactPhone = '담당자 연락처를 입력해 주세요.';
    else if (!/^[0-9\-+() ]{9,20}$/.test(b.contactPhone))
      e.contactPhone = '연락처 형식이 올바르지 않습니다.';
    if (!b.contactEmail.trim()) e.contactEmail = '담당자 이메일을 입력해 주세요.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.contactEmail))
      e.contactEmail = '이메일 형식이 올바르지 않습니다.';
    return e;
  }, [draft.business]);

  const casesErrors = useMemo(() => {
    return draft.cases.map((c) => {
      const e: Record<string, string> = {};
      if (!c.title.trim()) e.title = '시공 사례 제목을 입력해 주세요.';
      if (!c.spaceType.trim()) e.spaceType = '시공 유형을 입력해 주세요.';
      if (!c.areaSize || c.areaSize <= 0) e.areaSize = '시공 면적을 입력해 주세요.';
      if (!c.location.trim()) e.location = '시공 지역을 입력해 주세요.';
      if (!c.durationWeeks || c.durationWeeks <= 0)
        e.durationWeeks = '시공 기간을 입력해 주세요.';
      if (!c.budget.trim()) e.budget = '예산대를 선택/입력해 주세요.';
      if (!c.description.trim()) e.description = '시공 사례 설명을 입력해 주세요.';
      return e;
    });
  }, [draft.cases]);

  const performanceErrors = useMemo(() => {
    const e: Record<string, string> = {};
    const p = draft.performance;
    if (!p.totalProjects || p.totalProjects < 0)
      e.totalProjects = '누적 시공 건수를 입력해 주세요.';
    if (!p.recentYearProjects || p.recentYearProjects < 0)
      e.recentYearProjects = '최근 1년 시공 건수를 입력해 주세요.';
    if (p.recentYearProjects > p.totalProjects)
      e.recentYearProjects = '최근 1년 건수는 누적 건수보다 클 수 없습니다.';
    if (p.specialties.length === 0)
      e.specialties = '전문 분야를 최소 1개 이상 선택해 주세요.';
    if (p.primaryRegions.length === 0)
      e.primaryRegions = '주요 시공 지역을 최소 1개 이상 선택해 주세요.';
    if (!p.avgDurationWeeks || p.avgDurationWeeks <= 0)
      e.avgDurationWeeks = '평균 공사기간을 입력해 주세요.';
    return e;
  }, [draft.performance]);

  const agreementErrors = useMemo(() => {
    const e: Record<string, string> = {};
    const a = draft.agreement;
    if (!a.agreeInfoStorage) e.agreeInfoStorage = '사업자 정보 보관에 동의해 주세요.';
    if (!a.agreeContact) e.agreeContact = '심사 후 연락에 동의해 주세요.';
    if (!a.agreeAdditionalDocs)
      e.agreeAdditionalDocs = '추가 서류 제출에 동의해 주세요.';
    if (!a.agreePrivacy) e.agreePrivacy = '개인정보 처리에 동의해 주세요.';
    return e;
  }, [draft.agreement]);

  const step1Valid = Object.keys(businessErrors).length === 0;
  const step2Valid =
    casesErrors.every((e) => Object.keys(e).length === 0) &&
    Object.keys(performanceErrors).length === 0;
  const step3Valid = Object.keys(agreementErrors).length === 0;

  const goNext = () => {
    if (step === 1) {
      if (!step1Valid) {
        toast.push('사업자 정보를 모두 올바르게 입력해 주세요.');
        return;
      }
      setStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (step === 2) {
      if (!step2Valid) {
        toast.push('시공 사례와 실적 정보를 모두 입력해 주세요.');
        return;
      }
      setStep(3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goPrev = () => {
    if (step > 1) {
      setStep((s) => (s - 1) as Step);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!step3Valid) {
      toast.push('필수 동의 항목에 모두 동의해 주세요.');
      return;
    }
    if (!step1Valid || !step2Valid) {
      toast.push('입력 내용을 다시 확인해 주세요.');
      setStep(1);
      return;
    }
    const app = submitApplication(draft);
    // 제출 성공 → 임시 저장본 제거 (다음 방문은 새 신청으로 시작)
    try {
      sessionStorage.removeItem(DRAFT_KEY);
    } catch {
      /* ignore */
    }
    // 완료 페이지로 이동하며 id 전달
    navigate(`/partner/done?id=${encodeURIComponent(app.id)}`);
  };

  return (
    <>
      <Header />
      <main className="container" style={{ paddingTop: 40, paddingBottom: 80 }}>
        {/* 헤더 섹션 */}
        <section style={{ marginBottom: 32 }}>
          <div className="row" style={{ gap: 8, marginBottom: 8 }}>
            <Link
              to="/"
              className="btn btn-ghost btn-sm"
              style={{ padding: '4px 10px' }}
            >
              ← 홈으로
            </Link>
          </div>
          <h1 className="text-3xl" style={{ fontSize: 32, fontWeight: 800 }}>
            파트너 등록 신청
          </h1>
          <p style={{ marginTop: 8, color: 'var(--color-text-secondary)' }}>
            인테리어 디자인·시공 파트너를 모집합니다. 아래 정보를 입력해 주시면
            담당자가 검토 후 연락드립니다.
          </p>
          <div
            style={{
              marginTop: 12,
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-primary-light)',
              color: 'var(--color-primary)',
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            ℹ️ 이 신청 페이지는 <strong>협력업체 전용</strong>입니다. 일반 고객은
            견적 문의 페이지에서 신청해 주세요.
          </div>
        </section>

        {/* 스텝퍼 */}
        <Stepper currentStep={step} />

        <form onSubmit={handleSubmit}>
          {step === 1 && (
            <StepBusinessInfo
              business={draft.business}
              errors={businessErrors}
              onChange={updateBusiness}
              onBusinessNumberChange={(v) =>
                updateBusiness({ businessNumber: formatBusinessNumber(v) })
              }
              onContactPhoneChange={(v) =>
                updateBusiness({ contactPhone: formatPhoneNumber(v) })
              }
            />
          )}

          {step === 2 && (
            <StepCasesPerformance
              cases={draft.cases}
              casesErrors={casesErrors}
              performance={draft.performance}
              performanceErrors={performanceErrors}
              onCaseChange={updateCase}
              onCaseAdd={addCase}
              onCaseRemove={removeCase}
              onPerformanceChange={updatePerformance}
              onSpecialtyToggle={toggleSpecialty}
              onRegionToggle={toggleRegion}
            />
          )}

          {step === 3 && (
            <StepAgreement
              draft={draft}
              agreement={draft.agreement}
              errors={agreementErrors}
              onAgreementChange={updateAgreement}
              onNoteChange={(v) => setDraft((d) => ({ ...d, note: v }))}
              backendMode={backendMode}
            />
          )}

          {/* 액션 바 */}
          <div
            className="row-between"
            style={{
              marginTop: 32,
              padding: '20px 0',
              borderTop: '1px solid var(--color-border)',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div>
              {step > 1 && (
                <button
                  type="button"
                  onClick={goPrev}
                  className="btn btn-outline"
                >
                  ← 이전 단계
                </button>
              )}
            </div>
            <div className="row" style={{ gap: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>
                {step}/3 단계
              </span>
              {step < 3 ? (
                <button type="button" onClick={goNext} className="btn btn-primary">
                  다음 단계 →
                </button>
              ) : (
                <button type="submit" className="btn btn-primary">
                  신청 제출하기
                </button>
              )}
            </div>
          </div>
        </form>
      </main>
      <Footer />
    </>
  );
}

// ============================================================
//  Stepper
// ============================================================

function Stepper({ currentStep }: { currentStep: Step }) {
  const steps = [
    { num: 1, label: '사업자 정보' },
    { num: 2, label: '시공 사례 + 실적' },
    { num: 3, label: '동의 및 제출' },
  ];
  return (
    <div className="stepper">
      {steps.map((s) => (
        <div
          key={s.num}
          className={
            'step-node' +
            (currentStep === s.num ? ' active' : currentStep > s.num ? ' done' : '')
          }
        >
          <span className="step-circle">{currentStep > s.num ? '✓' : s.num}</span>
          <span>{s.label}</span>
        </div>
      ))}
      {steps.slice(0, -1).map((_, i) => (
        <div
          key={`c-${i}`}
          className={'step-connector' + (currentStep > i + 1 ? ' active' : '')}
        />
      ))}
    </div>
  );
}

// ============================================================
//  Step 1 — 사업자 정보
// ============================================================

function StepBusinessInfo({
  business,
  errors,
  onChange,
  onBusinessNumberChange,
  onContactPhoneChange,
}: {
  business: PartnerBusinessInfo;
  errors: Record<string, string>;
  onChange: (patch: Partial<PartnerBusinessInfo>) => void;
  onBusinessNumberChange: (raw: string) => void;
  onContactPhoneChange: (raw: string) => void;
}) {
  return (
    <div className="card stack" style={{ gap: 24 }}>
      <h2 style={{ fontSize: 20 }}>사업자 기본 정보</h2>

      <div className="grid-2">
        <Field
          label="회사/상호명"
          required
          error={errors.companyName}
          input={
            <input
              className="input"
              value={business.companyName}
              onChange={(e) => onChange({ companyName: e.target.value })}
              placeholder="예: 디자인하우스 인테리어"
            />
          }
        />
        <Field
          label="사업자등록번호"
          required
          error={errors.businessNumber}
          hint="형식: 123-45-67890"
          input={
            <input
              className="input"
              value={business.businessNumber}
              onChange={(e) => onBusinessNumberChange(e.target.value)}
              placeholder="000-00-00000"
              inputMode="numeric"
              maxLength={12}
            />
          }
        />
        <Field
          label="대표자명"
          required
          error={errors.ceoName}
          input={
            <input
              className="input"
              value={business.ceoName}
              onChange={(e) => onChange({ ceoName: e.target.value })}
              placeholder="홍길동"
            />
          }
        />
        <Field
          label="설립 연도"
          error={errors.establishedYear}
          hint="선택 입력"
          input={
            <input
              className="input"
              type="number"
              value={business.establishedYear ?? ''}
              onChange={(e) =>
                onChange({
                  establishedYear: e.target.value ? Number(e.target.value) : undefined,
                })
              }
              placeholder="2018"
              min={1900}
              max={new Date().getFullYear()}
            />
          }
        />
        <Field
          label="사업자 구분"
          required
          input={
            <select
              className="select"
              value={business.businessType}
              onChange={(e) =>
                onChange({ businessType: e.target.value as PartnerBusinessType })
              }
            >
              {BUSINESS_TYPE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {PARTNER_SPECIALTY_LABELS[opt]}
                </option>
              ))}
            </select>
          }
        />
        <Field
          label="회사 소재지"
          required
          error={errors.address}
          input={
            <input
              className="input"
              value={business.address}
              onChange={(e) => onChange({ address: e.target.value })}
              placeholder="서울시 강남구 테헤란로 123"
            />
          }
        />
        <Field
          label="담당자 이름"
          required
          error={errors.contactName}
          input={
            <input
              className="input"
              value={business.contactName}
              onChange={(e) => onChange({ contactName: e.target.value })}
              placeholder="김담당"
            />
          }
        />
        <Field
          label="담당자 직함"
          hint="선택 입력"
          input={
            <input
              className="input"
              value={business.contactRole ?? ''}
              onChange={(e) => onChange({ contactRole: e.target.value })}
              placeholder="팀장 / 실장 / 대표 등"
            />
          }
        />
        <Field
          label="담당자 연락처"
          required
          error={errors.contactPhone}
          input={
            <input
              className="input"
              value={business.contactPhone}
              onChange={(e) => onContactPhoneChange(e.target.value)}
              placeholder="010-1234-5678"
              inputMode="tel"
              maxLength={13}
            />
          }
        />
        <Field
          label="담당자 이메일"
          required
          error={errors.contactEmail}
          hint="심사 결과를 받을 이메일 주소"
          input={
            <input
              className="input"
              type="email"
              value={business.contactEmail}
              onChange={(e) => onChange({ contactEmail: e.target.value })}
              placeholder="contact@company.com"
            />
          }
        />
        <Field
          label="회사 웹사이트"
          hint="선택 입력 (URL)"
          input={
            <input
              className="input"
              type="url"
              value={business.websiteUrl ?? ''}
              onChange={(e) => onChange({ websiteUrl: e.target.value })}
              placeholder="https://example.com"
            />
          }
        />
      </div>
    </div>
  );
}

// ============================================================
//  Step 2 — 시공 사례 + 실적
// ============================================================

function StepCasesPerformance({
  cases,
  casesErrors,
  performance,
  performanceErrors,
  onCaseChange,
  onCaseAdd,
  onCaseRemove,
  onPerformanceChange,
  onSpecialtyToggle,
  onRegionToggle,
}: {
  cases: PartnerCase[];
  casesErrors: Record<string, string>[];
  performance: PartnerPerformance;
  performanceErrors: Record<string, string>;
  onCaseChange: (idx: number, patch: Partial<PartnerCase>) => void;
  onCaseAdd: () => void;
  onCaseRemove: (idx: number) => void;
  onPerformanceChange: (patch: Partial<PartnerPerformance>) => void;
  onSpecialtyToggle: (sp: PartnerBusinessType) => void;
  onRegionToggle: (region: string) => void;
}) {
  return (
    <div className="stack" style={{ gap: 24 }}>
      {/* 시공 사례 */}
      <div className="card stack" style={{ gap: 20 }}>
        <div className="row-between">
          <h2 style={{ fontSize: 20 }}>시공 사례</h2>
          <span style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>
            최소 1개 이상의 사례를 입력해 주세요
          </span>
        </div>

        {cases.map((c, idx) => {
          const errs = casesErrors[idx] ?? {};
          return (
            <div
              key={idx}
              style={{
                padding: 20,
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-bg-muted)',
                position: 'relative',
              }}
            >
              <div className="row-between" style={{ marginBottom: 16 }}>
                <strong style={{ fontSize: 15 }}>사례 #{idx + 1}</strong>
                {cases.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onCaseRemove(idx)}
                    className="btn btn-ghost btn-sm"
                  >
                    삭제
                  </button>
                )}
              </div>

              <div className="grid-2">
                <Field
                  label="시공 제목"
                  required
                  error={errs.title}
                  input={
                    <input
                      className="input"
                      value={c.title}
                      onChange={(e) => onCaseChange(idx, { title: e.target.value })}
                      placeholder="예: 판교 신혼집 32평 풀 인테리어"
                    />
                  }
                />
                <Field
                  label="시공 유형"
                  required
                  error={errs.spaceType}
                  input={
                    <input
                      className="input"
                      value={c.spaceType}
                      onChange={(e) => onCaseChange(idx, { spaceType: e.target.value })}
                      placeholder="아파트 / 단독주택 / 오피스"
                    />
                  }
                />
                <Field
                  label="시공 면적 (평)"
                  required
                  error={errs.areaSize}
                  input={
                    <input
                      className="input"
                      type="number"
                      value={c.areaSize || ''}
                      onChange={(e) =>
                        onCaseChange(idx, { areaSize: Number(e.target.value) || 0 })
                      }
                      placeholder="32"
                      min={1}
                    />
                  }
                />
                <Field
                  label="시공 지역"
                  required
                  error={errs.location}
                  input={
                    <input
                      className="input"
                      value={c.location}
                      onChange={(e) => onCaseChange(idx, { location: e.target.value })}
                      placeholder="서울 강남구"
                    />
                  }
                />
                <Field
                  label="시공 기간 (주)"
                  required
                  error={errs.durationWeeks}
                  input={
                    <input
                      className="input"
                      type="number"
                      value={c.durationWeeks || ''}
                      onChange={(e) =>
                        onCaseChange(idx, {
                          durationWeeks: Number(e.target.value) || 0,
                        })
                      }
                      placeholder="6"
                      min={1}
                    />
                  }
                />
                <Field
                  label="완료 연도"
                  input={
                    <input
                      className="input"
                      type="number"
                      value={c.completedYear || ''}
                      onChange={(e) =>
                        onCaseChange(idx, {
                          completedYear: Number(e.target.value) || new Date().getFullYear(),
                        })
                      }
                      min={2000}
                      max={new Date().getFullYear()}
                    />
                  }
                />
                <Field
                  label="예산대"
                  required
                  error={errs.budget}
                  fullWidth
                  input={
                    <select
                      className="select"
                      value={c.budget}
                      onChange={(e) => onCaseChange(idx, { budget: e.target.value })}
                    >
                      <option value="">선택</option>
                      {BUDGET_PRESETS.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  }
                />
                <Field
                  label="사용 자재/스타일"
                  hint="선택 입력 (예: 원목 + 천연석)"
                  fullWidth
                  input={
                    <input
                      className="input"
                      value={c.materials ?? ''}
                      onChange={(e) => onCaseChange(idx, { materials: e.target.value })}
                      placeholder="원목, 천연 대리석, 모던 미니멀"
                    />
                  }
                />
                <Field
                  label="시공 설명"
                  required
                  error={errs.description}
                  hint="주요 특징·고객 요구사항·결과물을 자유롭게 작성해 주세요."
                  fullWidth
                  input={
                    <textarea
                      className="textarea"
                      value={c.description}
                      onChange={(e) =>
                        onCaseChange(idx, { description: e.target.value })
                      }
                      placeholder="주방 확장 + 거실 리모델링 + 안방 드레스룸 신규 시공..."
                      rows={3}
                    />
                  }
                />
              </div>
            </div>
          );
        })}

        <button type="button" onClick={onCaseAdd} className="btn btn-outline">
          + 시공 사례 추가
        </button>
      </div>

      {/* 실적 정보 */}
      <div className="card stack" style={{ gap: 20 }}>
        <h2 style={{ fontSize: 20 }}>실적 정보</h2>

        <div className="grid-3">
          <Field
            label="누적 시공 건수 (최근 3년)"
            required
            error={performanceErrors.totalProjects}
            input={
              <input
                className="input"
                type="number"
                value={performance.totalProjects || ''}
                onChange={(e) =>
                  onPerformanceChange({
                    totalProjects: Number(e.target.value) || 0,
                  })
                }
                min={0}
              />
            }
          />
          <Field
            label="최근 1년 시공 건수"
            required
            error={performanceErrors.recentYearProjects}
            input={
              <input
                className="input"
                type="number"
                value={performance.recentYearProjects || ''}
                onChange={(e) =>
                  onPerformanceChange({
                    recentYearProjects: Number(e.target.value) || 0,
                  })
                }
                min={0}
              />
            }
          />
          <Field
            label="평균 시공 면적 (평)"
            hint="선택 입력"
            input={
              <input
                className="input"
                type="number"
                value={performance.avgAreaSize || ''}
                onChange={(e) =>
                  onPerformanceChange({ avgAreaSize: Number(e.target.value) || 0 })
                }
                min={0}
              />
            }
          />
          <Field
            label="평균 공사기간 (주)"
            required
            error={performanceErrors.avgDurationWeeks}
            input={
              <input
                className="input"
                type="number"
                value={performance.avgDurationWeeks || ''}
                onChange={(e) =>
                  onPerformanceChange({
                    avgDurationWeeks: Number(e.target.value) || 0,
                  })
                }
                min={1}
              />
            }
          />
        </div>

        {/* 전문 분야 */}
        <Field
          label="전문 분야"
          required
          error={performanceErrors.specialties}
          hint="중복 선택 가능"
        >
          <div className="checkbox-grid" style={{ marginTop: 6 }}>
            {BUSINESS_TYPE_OPTIONS.map((sp) => (
              <label
                key={sp}
                className={
                  'check-pill' + (performance.specialties.includes(sp) ? ' checked' : '')
                }
              >
                <input
                  type="checkbox"
                  checked={performance.specialties.includes(sp)}
                  onChange={() => onSpecialtyToggle(sp)}
                />
                {PARTNER_SPECIALTY_LABELS[sp]}
              </label>
            ))}
          </div>
        </Field>

        {/* 주요 시공 지역 */}
        <Field
          label="주요 시공 지역"
          required
          error={performanceErrors.primaryRegions}
          hint="최대 5개까지 선택"
        >
          <div className="checkbox-grid" style={{ marginTop: 6 }}>
            {REGION_PRESETS.map((r) => (
              <label
                key={r}
                className={
                  'check-pill' +
                  (performance.primaryRegions.includes(r) ? ' checked' : '')
                }
              >
                <input
                  type="checkbox"
                  checked={performance.primaryRegions.includes(r)}
                  onChange={() => onRegionToggle(r)}
                />
                {r}
              </label>
            ))}
          </div>
          {performance.primaryRegions.length > 0 && (
            <div style={{ marginTop: 10, fontSize: 13, color: 'var(--color-text-secondary)' }}>
              선택: {performance.primaryRegions.join(' · ')}
            </div>
          )}
        </Field>

        <Field
          label="보유 자격증/면허"
          hint="선택 입력 (예: 실내건축기사, 건축물무도장 시공업 등록)"
        >
          <input
            className="input"
            value={performance.certifications ?? ''}
            onChange={(e) =>
              onPerformanceChange({ certifications: e.target.value })
            }
            placeholder="실내건축기사, 건축시공기술사 등"
          />
        </Field>
      </div>
    </div>
  );
}

// ============================================================
//  Step 3 — 동의 및 제출
// ============================================================

function StepAgreement({
  draft,
  agreement,
  errors,
  onAgreementChange,
  onNoteChange,
  backendMode,
}: {
  draft: Omit<PartnerApplication, 'id' | 'createdAt' | 'updatedAt' | 'status'>;
  agreement: PartnerAgreement;
  errors: Record<string, string>;
  onAgreementChange: (patch: Partial<PartnerAgreement>) => void;
  onNoteChange: (v: string) => void;
  backendMode: 'forgedb' | 'local';
}) {
  return (
    <div className="stack" style={{ gap: 24 }}>
      {/* 요약 */}
      <div className="card stack" style={{ gap: 16 }}>
        <h2 style={{ fontSize: 20 }}>신청 내용 요약</h2>
        <SummaryRow
          items={[
            ['회사/상호명', draft.business.companyName],
            ['대표자', draft.business.ceoName],
            ['사업자구분', PARTNER_SPECIALTY_LABELS[draft.business.businessType]],
            ['담당자', `${draft.business.contactName} (${draft.business.contactEmail})`],
            ['시공 사례', `${draft.cases.length}건`],
            [
              '누적 실적',
              `${draft.performance.totalProjects}건 / 최근 1년 ${draft.performance.recentYearProjects}건`,
            ],
          ]}
        />
      </div>

      {/* 추가 메모 */}
      <div className="card stack" style={{ gap: 12 }}>
        <h2 style={{ fontSize: 20 }}>추가 메모 (선택)</h2>
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
          담당자에게 미리 알리고 싶은 내용(예: 특별 자격, 수상 이력, 레퍼런스 사이트
          URL 등)을 자유롭게 작성해 주세요.
        </p>
        <textarea
          className="textarea"
          value={draft.note ?? ''}
          onChange={(e) => onNoteChange(e.target.value)}
          rows={4}
          placeholder="2023 한국인테리어대상 수상, 한경 B2B 매거진 인터뷰 기사 등"
        />
      </div>

      {/* 동의 */}
      <div className="card stack" style={{ gap: 16 }}>
        <h2 style={{ fontSize: 20 }}>약관 동의</h2>
        <AgreementCheckbox
          checked={agreement.agreeInfoStorage}
          error={errors.agreeInfoStorage}
          onChange={(v) => onAgreementChange({ agreeInfoStorage: v })}
          title="(필수) 사업자 정보 수집·보관 동의"
          desc="심사·연락·계약 진행을 위해 입력하신 사업자 정보(회사명, 사업자등록번호, 연락처, 이메일 등)를 수집·보관합니다. 심사 결과는 이메일로 통보됩니다."
        />
        <AgreementCheckbox
          checked={agreement.agreeContact}
          error={errors.agreeContact}
          onChange={(v) => onAgreementChange({ agreeContact: v })}
          title="(필수) 심사 후 연락 동의"
          desc="담당자가 신청 내용을 검토한 후 이메일·전화로 연락드릴 수 있습니다."
        />
        <AgreementCheckbox
          checked={agreement.agreeAdditionalDocs}
          error={errors.agreeAdditionalDocs}
          onChange={(v) => onAgreementChange({ agreeAdditionalDocs: v })}
          title="(필수) 추가 서류 제출 동의"
          desc="계약 진행 단계에서 사업자등록증 사본·인감증명서·포트폴리오 추가 자료 등을 요청할 수 있습니다."
        />
        <AgreementCheckbox
          checked={agreement.agreePrivacy}
          error={errors.agreePrivacy}
          onChange={(v) => onAgreementChange({ agreePrivacy: v })}
          title="(필수) 개인정보 처리방침 동의"
          desc="수집된 정보는 내부 검토·연락 외 용도로 사용되지 않으며, 제3자에게 제공되지 않습니다."
        />

        <div
          style={{
            marginTop: 8,
            padding: '12px 14px',
            borderRadius: 'var(--radius-md)',
            background: backendMode === 'local' ? '#fff8e6' : 'var(--color-primary-light)',
            color: backendMode === 'local' ? '#8a5a00' : 'var(--color-primary)',
            fontSize: 13,
          }}
        >
          {backendMode === 'local' ? (
            <>
              ⚠️ 데모 모드 (LOCAL) — 입력하신 정보는 <strong>이 브라우저의
              localStorage</strong>에만 저장되며 실제 서버로 전송되지 않습니다.
              관리자가 같은 브라우저에서 로그인하면 콘솔에서 확인할 수 있어요.
            </>
          ) : (
            <>
              ✓ ForgeDB 모드 — 신청 정보는 보안 서버에 안전하게 저장되며, 관리자만
              조회 가능합니다.
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
//  공용 UI 헬퍼
// ============================================================

function Field({
  label,
  required,
  error,
  hint,
  input,
  fullWidth,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  input?: React.ReactNode;
  fullWidth?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={'field' + (error ? ' has-error' : '')}
      style={fullWidth ? { gridColumn: '1 / -1' } : undefined}
    >
      <label className="field-label">
        {label}
        {required && <span className="req">*</span>}
      </label>
      {hint && <div className="field-hint">{hint}</div>}
      {input ?? children}
      {error && <div className="field-error">{error}</div>}
    </div>
  );
}

function SummaryRow({ items }: { items: (readonly [string, string])[] }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 16,
      }}
    >
      {items.map(([k, v]) => (
        <div key={k}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--color-text-tertiary)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: 4,
            }}
          >
            {k}
          </div>
          <div style={{ fontWeight: 600 }}>{v || '—'}</div>
        </div>
      ))}
    </div>
  );
}

function AgreementCheckbox({
  checked,
  error,
  onChange,
  title,
  desc,
}: {
  checked: boolean;
  error?: string;
  onChange: (v: boolean) => void;
  title: string;
  desc: string;
}) {
  return (
    <label
      style={{
        display: 'flex',
        gap: 12,
        padding: 14,
        border: error
          ? '1px solid var(--color-danger)'
          : '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        cursor: 'pointer',
        background: checked ? 'var(--color-primary-light)' : '#fff',
        transition: 'all var(--transition-base)',
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ marginTop: 3, accentColor: 'var(--color-primary)' }}
      />
      <div>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
          {desc}
        </div>
      </div>
    </label>
  );
}