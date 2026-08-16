import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header, Footer } from '../../components/Layout';
import { useToast } from '../../components/Toast';
import {
  loadConsultDraft,
  saveConsultDraft,
} from '../../data/consultDraft';
import {
  CONTACT_PREF_OPTIONS,
  type ContactPref,
} from '../../data/consultation';

/**
 *  고객 상담 신청 — Step 01: 기본정보
 *  · UI 명세서 기준: 카드형 입력 그룹, 풀폭 검정 CTA, 모노톤 3단계
 *  · 진행 표시: 좌측 STEP 01 · 우측 1 / 19 (총 19단계 — Step 02 까지만 실구현, 나머지는 placeholder 안내)
 */
export default function ConsultStep1() {
  const navigate = useNavigate();
  const toast = useToast();
  const [draft, setDraft] = useState(() => loadConsultDraft());
  const [errors, setErrors] = useState<string[]>([]);
  const [emailTouched, setEmailTouched] = useState(
    () => Boolean(loadConsultDraft().email)
  );

  useEffect(() => {
    saveConsultDraft(draft);
  }, [draft]);

  function setField<K extends keyof typeof draft>(
    key: K,
    value: (typeof draft)[K]
  ) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function toggleContactPref(p: ContactPref) {
    setDraft((d) => ({
      ...d,
      contactPrefs: d.contactPrefs.includes(p)
        ? d.contactPrefs.filter((x) => x !== p)
        : [...d.contactPrefs, p],
    }));
  }

  function validate(): boolean {
    const next: string[] = [];
    if (!draft.name.trim()) next.push('성함');
    if (!draft.phone.trim()) next.push('연락처');
    else if (!/^[\d\-\s()]{8,20}$/.test(draft.phone.trim()))
      next.push('연락처 형식');
    if (!draft.apartment.trim()) next.push('아파트명 / 동·호수');
    setErrors(next);
    return next.length === 0;
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) {
      toast.error('아래 항목을 채워 주세요.');
      return;
    }
    navigate('/consult/step-2');
  }

  return (
    <>
      <Header />
      <main
        className="container"
        style={{ padding: '40px 24px 96px', maxWidth: 760 }}
      >
        {/* 상단 진행 영역 */}
        <div
          className="row-between"
          style={{ marginBottom: 'var(--space-6)' }}
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
            STEP 01
          </span>
          <span
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: 'var(--color-text-tertiary)',
            }}
          >
            1 / 19
          </span>
        </div>

        {/* 섹션 헤더 */}
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
            기본정보
          </h1>
          <p
            style={{
              fontSize: 15,
              fontWeight: 400,
              color: 'var(--color-text-secondary)',
              lineHeight: 1.55,
            }}
          >
            연락드릴 정보를 남겨 주세요. 1~2단계만 채우셔도 접수됩니다.
          </p>
        </div>

        {/* 입력 그룹 — 카드형 풀폭 박스 */}
        <form
          onSubmit={submit}
          style={{ display: 'flex', flexDirection: 'column', gap: 28 }}
        >
          <Field label="성함" required>
            <input
              type="text"
              className="input consult-input"
              placeholder="서상재"
              value={draft.name}
              onChange={(e) => setField('name', e.target.value)}
              autoComplete="name"
            />
          </Field>

          <Field label="연락처" required>
            <input
              type="tel"
              className="input consult-input"
              placeholder="01023345666"
              value={draft.phone}
              onChange={(e) =>
                setField('phone', e.target.value.replace(/[^\d\-]/g, ''))
              }
              autoComplete="tel"
            />
          </Field>

          <Field label="이메일">
            <input
              type="email"
              className="input consult-input"
              placeholder="sangky94@gmail.com"
              value={draft.email}
              onChange={(e) => {
                setField('email', e.target.value);
                setEmailTouched(true);
              }}
              autoComplete="email"
              style={{
                background: emailTouched ? 'var(--ink-100)' : 'var(--ink-50)',
              }}
            />
          </Field>

          <Field label="아파트명 / 동·호수" required>
            <input
              type="text"
              className="input consult-input"
              placeholder="동탄롯데캐슬"
              value={draft.apartment}
              onChange={(e) => setField('apartment', e.target.value)}
            />
          </Field>

          <Field label="연락 받기 좋은 시간" hint="중복 선택 가능">
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                marginTop: 8,
              }}
            >
              {CONTACT_PREF_OPTIONS.map((opt) => {
                const checked = draft.contactPrefs.includes(opt.value);
                return (
                  <label
                    key={opt.value}
                    className={`consult-option ${checked ? 'is-checked' : ''}`}
                  >
                    <span className="consult-checkbox" aria-hidden>
                      {checked && <CheckIcon />}
                    </span>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleContactPref(opt.value)}
                      style={{ display: 'none' }}
                    />
                    <span>{opt.label}</span>
                  </label>
                );
              })}
            </div>
          </Field>

          {/* 에러 박스 */}
          {errors.length > 0 && (
            <div
              role="alert"
              style={{
                padding: '14px 18px',
                background: '#fef2f2',
                borderLeft: '3px solid #fca5a5',
                borderRadius: 4,
                color: 'var(--color-text-secondary)',
                fontSize: 14,
              }}
            >
              아래 항목을 채워 주세요 —{' '}
              <strong style={{ color: 'var(--color-text-primary)' }}>
                {errors.join(' · ')}
              </strong>
            </div>
          )}

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
            다음 단계로 →
          </button>
        </form>
      </main>
      <Footer />
    </>
  );
}

// ============================================================
//  내부 컴포넌트 — Field & 체크 아이콘
// ============================================================

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div
        className="row-between"
        style={{ marginBottom: 8, alignItems: 'center' }}
      >
        <label
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
        </label>
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