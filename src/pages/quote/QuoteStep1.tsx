import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header, Footer } from '../../components/Layout';
import Stepper from '../../components/Stepper';
import { loadDraft, saveDraft } from '../../data/quoteDraft';
import { REGION_OPTIONS } from '../../lib/format';
import { useToast } from '../../components/Toast';

export default function QuoteStep1() {
  const navigate = useNavigate();
  const toast = useToast();
  const [draft, setDraft] = useState(() => loadDraft());
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    saveDraft(draft);
  }, [draft]);

  function setField<K extends keyof typeof draft>(
    key: K,
    value: (typeof draft)[K]
  ) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!draft.customerName.trim()) next.customerName = '이름을 입력해 주세요.';
    if (!draft.phone.trim()) next.phone = '연락처를 입력해 주세요.';
    else if (!/^[\d\-\s()]{8,20}$/.test(draft.phone.trim()))
      next.phone = '올바른 연락처 형식이 아닙니다.';
    if (!draft.region.trim()) next.region = '시공 지역을 선택해 주세요.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) {
      toast.error('필수 항목을 확인해주세요.');
      return;
    }
    navigate('/quote/step-2');
  }

  return (
    <>
      <Header />
      <main className="container" style={{ padding: '40px 24px 80px' }}>
        <div
          className="row-between"
          style={{ marginBottom: 'var(--space-6)' }}
        >
          <a href="/quote" className="btn btn-ghost btn-sm">
            ‹ 메인으로
          </a>
          <span style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>
            STEP 1 / 2
          </span>
        </div>
        <Stepper steps={[{ label: '고객정보' }, { label: '시공정보' }]} current={0} />

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: 'var(--space-8)',
            maxWidth: 760,
            margin: '0 auto',
          }}
        >
          <div className="card">
            <h2
              style={{
                fontSize: 'var(--text-2xl)',
                marginBottom: 'var(--space-2)',
              }}
            >
              고객 정보를 알려주세요
            </h2>
            <p
              style={{
                color: 'var(--color-text-secondary)',
                marginBottom: 'var(--space-6)',
              }}
            >
              담당자가 24시간 내로 연락드립니다. 모든 정보는 안전하게
              보관됩니다.
            </p>
            <form onSubmit={submit} className="stack" style={{ gap: 'var(--space-5)' }}>
              <div className="field">
                <label className="field-label" htmlFor="name">
                  이름<span className="req">*</span>
                </label>
                <input
                  id="name"
                  className="input"
                  placeholder="홍길동"
                  value={draft.customerName}
                  onChange={(e) => setField('customerName', e.target.value)}
                />
                {errors.customerName && (
                  <div className="field-error">{errors.customerName}</div>
                )}
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 'var(--space-4)',
                }}
              >
                <div className="field">
                  <label className="field-label" htmlFor="phone">
                    연락처<span className="req">*</span>
                  </label>
                  <input
                    id="phone"
                    className="input"
                    placeholder="010-1234-5678"
                    inputMode="tel"
                    value={draft.phone}
                    onChange={(e) => setField('phone', e.target.value)}
                  />
                  {errors.phone && <div className="field-error">{errors.phone}</div>}
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="email">
                    이메일 (선택)
                  </label>
                  <input
                    id="email"
                    type="email"
                    className="input"
                    placeholder="you@example.com"
                    value={draft.email}
                    onChange={(e) => setField('email', e.target.value)}
                  />
                </div>
              </div>

              <div className="field">
                <label className="field-label" htmlFor="region">
                  시공 지역<span className="req">*</span>
                </label>
                <select
                  id="region"
                  className="select"
                  value={draft.region}
                  onChange={(e) => setField('region', e.target.value)}
                >
                  <option value="">선택해 주세요</option>
                  {REGION_OPTIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                {errors.region && <div className="field-error">{errors.region}</div>}
              </div>

              <div className="field">
                <label className="field-label" htmlFor="pref">
                  연락 받기 좋은 시간 (선택)
                </label>
                <select
                  id="pref"
                  className="select"
                  value={draft.preferredContactTime}
                  onChange={(e) => setField('preferredContactTime', e.target.value)}
                >
                  <option value="">상관없음</option>
                  <option value="평일 오전">평일 오전</option>
                  <option value="평일 오후">평일 오후</option>
                  <option value="평일 저녁">평일 저녁</option>
                  <option value="주말 오전">주말 오전</option>
                  <option value="주말 오후">주말 오후</option>
                </select>
              </div>

              <div className="row" style={{ justifyContent: 'flex-end' }}>
                <button type="submit" className="btn btn-primary btn-lg">
                  다음 단계로 →
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
