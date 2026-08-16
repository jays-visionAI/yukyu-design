import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header, Footer } from '../../components/Layout';
import { useToast } from '../../components/Toast';
import { useData } from '../../data/DataContext';
import {
  clearConsultDraft,
  draftToConsultation,
  loadConsultDraft,
  saveConsultDraft,
} from '../../data/consultDraft';
import {
  BUDGET_OPTIONS,
  MOVE_IN_OPTIONS,
  REMODEL_AREAS,
  SCOPE_OPTIONS,
} from '../../data/consultation';

/**
 *  고객 상담 신청 — Step 02: 간단 질문
 *  · 일정 / 예산 / 인테리어 변경 영역 / 부분 리모델링 구역 / 공급 평형
 *  · 명세서 기준 2열 그리드(부분 리모델링 옵션), 카드형 옵션(예산/일정/스코프)
 */
export default function ConsultStep2() {
  const navigate = useNavigate();
  const toast = useToast();
  const { createConsultation } = useData();
  const [draft, setDraft] = useState(() => loadConsultDraft());
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Step 01 을 거치지 않고 직접 들어온 경우 Step 01 으로 보냄
  useEffect(() => {
    if (!draft.name.trim() || !draft.phone.trim() || !draft.apartment.trim()) {
      navigate('/consult', { replace: true });
    }
  }, [draft.name, draft.phone, draft.apartment, navigate]);

  useEffect(() => {
    saveConsultDraft(draft);
  }, [draft]);

  function setField<K extends keyof typeof draft>(
    key: K,
    value: (typeof draft)[K]
  ) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function toggleArea(area: string) {
    setDraft((d) => ({
      ...d,
      remodelAreas: d.remodelAreas.includes(area)
        ? d.remodelAreas.filter((x) => x !== area)
        : [...d.remodelAreas, area],
    }));
  }

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!draft.moveIn) next.moveIn = '일정을 선택해 주세요.';
    if (!draft.budget) next.budget = '예산을 선택해 주세요.';
    if (!draft.remodelScope) next.remodelScope = '변경 범위를 선택해 주세요.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) {
      toast.error('필수 항목을 확인해주세요.');
      return;
    }
    const created = createConsultation(draftToConsultation(draft));
    clearConsultDraft();
    toast.success('상담 접수가 완료되었습니다!');
    navigate(`/consult/done?t=${encodeURIComponent(created.shareToken)}`);
  }

  const areas = useMemo(() => REMODEL_AREAS, []);

  return (
    <>
      <Header />
      <main
        className="container"
        style={{ padding: '40px 24px 96px', maxWidth: 760 }}
      >
        <div
          className="row-between"
          style={{ marginBottom: 'var(--space-6)' }}
        >
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => navigate('/consult')}
          >
            ‹ 이전 단계
          </button>
          <div
            className="row"
            style={{ gap: 12, alignItems: 'center' }}
          >
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.12em',
                color: 'var(--color-text-primary)',
                textTransform: 'uppercase',
              }}
            >
              STEP 02
            </span>
            <span
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: 'var(--color-text-tertiary)',
              }}
            >
              2 / 19
            </span>
          </div>
        </div>

        <div style={{ marginBottom: 64 }}>
          <h1
            style={{
              fontSize: 32,
              fontWeight: 800,
              color: 'var(--color-text-primary)',
              lineHeight: 1.2,
              marginBottom: 12,
            }}
          >
            간단 질문
          </h1>
          <p
            style={{
              fontSize: 15,
              fontWeight: 400,
              color: 'var(--color-text-secondary)',
              lineHeight: 1.55,
            }}
          >
            일정과 예산, 공사 범위만 알려주시면 점수가 완성됩니다.
          </p>
        </div>

        <form
          onSubmit={submit}
          style={{ display: 'flex', flexDirection: 'column', gap: 48 }}
        >
          {/* Q1 — 일정 */}
          <QuestionGroup
            label="원하시는 공사 완료(이사) 일정은 언제인가요?"
            required
            hint="중복 선택 가능"
            error={errors.moveIn}
          >
            <Stacked>
              {MOVE_IN_OPTIONS.map((opt) => {
                const checked = draft.moveIn === opt.value;
                return (
                  <SelectableCard
                    key={opt.value}
                    checked={checked}
                    onClick={() => setField('moveIn', opt.value)}
                  >
                    <span style={{ fontWeight: 500 }}>{opt.label}</span>
                  </SelectableCard>
                );
              })}
            </Stacked>
          </QuestionGroup>

          {/* Q2 — 예산 */}
          <QuestionGroup
            label="생각하시는 예산 범위는 어떻게 되시나요?"
            required
            hint="중복 선택 가능"
            error={errors.budget}
          >
            <Stacked>
              {BUDGET_OPTIONS.map((opt) => {
                const checked = draft.budget === opt.value;
                return (
                  <SelectableCard
                    key={opt.value}
                    checked={checked}
                    onClick={() => setField('budget', opt.value)}
                  >
                    <span style={{ fontWeight: 500, fontSize: 15 }}>
                      {opt.title}
                    </span>
                    <span
                      style={{
                        marginTop: 4,
                        fontSize: 13,
                        fontWeight: 700,
                        color: 'var(--color-text-secondary)',
                      }}
                    >
                      {opt.hint}
                    </span>
                  </SelectableCard>
                );
              })}
            </Stacked>
          </QuestionGroup>

          {/* Q3 — 변경 영역 (스코프) */}
          <QuestionGroup
            label="이번 인테리어, 어디까지 변화를 주고 싶으신가요?"
            required
            hint="중복 선택 가능"
            error={errors.remodelScope}
          >
            <Stacked>
              {SCOPE_OPTIONS.map((opt) => {
                const checked = draft.remodelScope === opt.value;
                return (
                  <SelectableCard
                    key={opt.value}
                    checked={checked}
                    onClick={() => setField('remodelScope', opt.value)}
                  >
                    <span style={{ fontWeight: 500 }}>{opt.label}</span>
                  </SelectableCard>
                );
              })}
            </Stacked>
          </QuestionGroup>

          {/* Q4 — 부분 리모델링 희망 구역 (2열 그리드) */}
          <QuestionGroup
            label="부분 리모델링이라면 희망 구역을 골라 주세요."
            hint="중복 선택 가능"
          >
            <div className="consult-areas-grid">
              {areas.map((area) => {
                const checked = draft.remodelAreas.includes(area);
                return (
                  <label
                    key={area}
                    className={`consult-area-chip ${checked ? 'is-checked' : ''}`}
                  >
                    <span className="consult-area-box" aria-hidden>
                      {checked && <CheckIcon />}
                    </span>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleArea(area)}
                      style={{ display: 'none' }}
                    />
                    <span>{area}</span>
                  </label>
                );
              })}
            </div>
          </QuestionGroup>

          {/* 추가 입력 — 공급 평형 */}
          <Field label="공급 평형 (예상 견적 계산에 쓰입니다)">
            <input
              type="text"
              inputMode="numeric"
              className="input consult-input"
              placeholder="예) 32 · 숫자만 적어 주세요. 모르시면 비워두셔도 됩니다."
              value={draft.supplyArea ?? ''}
              onChange={(e) => {
                const v = e.target.value.replace(/[^0-9]/g, '');
                setField('supplyArea', v ? Number(v) : undefined);
              }}
            />
          </Field>

          <button
            type="submit"
            className="btn consult-cta"
            style={{
              marginTop: 24,
              width: '100%',
              padding: '18px 0',
              background: 'var(--color-text-primary)',
              color: '#fff',
              fontSize: 16,
              fontWeight: 700,
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            상담 신청 완료 →
          </button>
        </form>
      </main>
      <Footer />
    </>
  );
}

// ============================================================
//  내부 컴포넌트
// ============================================================

function QuestionGroup({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div
        className="row-between"
        style={{ marginBottom: 12, alignItems: 'center' }}
      >
        <span
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: 'var(--color-text-primary)',
          }}
        >
          {label}
          {required && (
            <span
              style={{
                marginLeft: 6,
                display: 'inline-block',
                background: 'var(--color-text-primary)',
                color: '#fff',
                fontSize: 11,
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: 3,
                verticalAlign: 'middle',
                letterSpacing: '0.04em',
              }}
            >
              필수
            </span>
          )}
        </span>
        {hint && (
          <span
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: 'var(--color-text-tertiary)',
            }}
          >
            {hint}
          </span>
        )}
      </div>
      {children}
      {error && (
        <div
          style={{
            marginTop: 8,
            fontSize: 12,
            color: '#b91c1c',
            fontWeight: 600,
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}

function Stacked({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {children}
    </div>
  );
}

function SelectableCard({
  checked,
  onClick,
  children,
}: {
  checked: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`consult-card ${checked ? 'is-checked' : ''}`}
    >
      <span
        className="consult-card__checkbox"
        aria-hidden
      >
        {checked && <CheckIcon />}
      </span>
      <span
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          textAlign: 'left',
        }}
      >
        {children}
      </span>
    </button>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        style={{
          display: 'block',
          marginBottom: 8,
          fontSize: 14,
          fontWeight: 700,
          color: 'var(--color-text-primary)',
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function CheckIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M2 6.2L4.8 9L10 3"
        stroke="white"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}