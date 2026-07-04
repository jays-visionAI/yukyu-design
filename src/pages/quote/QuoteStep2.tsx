import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header, Footer } from '../../components/Layout';
import Stepper from '../../components/Stepper';
import { loadDraft, saveDraft, draftToQuote } from '../../data/quoteDraft';
import {
  BUDGET_OPTIONS,
  SPACE_ROOMS,
  SPACE_TYPE_OPTIONS,
  STYLE_OPTIONS,
} from '../../lib/format';
import { useData } from '../../data/DataContext';
import { useToast } from '../../components/Toast';

export default function QuoteStep2() {
  const navigate = useNavigate();
  const { createQuote } = useData();
  const toast = useToast();
  const [draft, setDraft] = useState(() => loadDraft());
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!draft.customerName) {
      // Step 1을 거치지 않고 직접 들어온 경우
      navigate('/quote', { replace: true });
    }
  }, [draft.customerName, navigate]);

  useEffect(() => {
    saveDraft(draft);
  }, [draft]);

  function setField<K extends keyof typeof draft>(
    key: K,
    value: (typeof draft)[K]
  ) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function toggle(arr: string[], v: string): string[] {
    return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
  }

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!draft.spaceType) next.spaceType = '공간 유형을 선택해 주세요.';
    if (!draft.areaSize || Number(draft.areaSize) <= 0)
      next.areaSize = '평수를 입력해 주세요.';
    if (!draft.budget) next.budget = '예상 예산을 선택해 주세요.';
    if (draft.spaceTypes.length === 0)
      next.spaceTypes = '시공할 공간을 1개 이상 선택해 주세요.';
    if (draft.styles.length === 0)
      next.styles = '원하시는 스타일을 1개 이상 선택해 주세요.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) {
      toast.error('필수 항목을 확인해주세요.');
      return;
    }
    const quote = createQuote(draftToQuote(draft));
    toast.success('견적 요청이 접수되었습니다!');
    // 세션 스토리지 초기화
    sessionStorage.removeItem('yukye_design_quote_draft_v1');
    // ⚠️ URL 에는 shareToken 을 전달 — PII(id) 가 아닌 추적 전용 불투명 토큰.
    navigate(`/quote/done?t=${encodeURIComponent(quote.shareToken)}`);
  }

  return (
    <>
      <Header />
      <main className="container" style={{ padding: '40px 24px 80px' }}>
        <div className="row-between" style={{ marginBottom: 'var(--space-6)' }}>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => navigate('/quote')}
          >
            ‹ 이전 단계
          </button>
          <span style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>
            STEP 2 / 2
          </span>
        </div>
        <Stepper steps={[{ label: '고객정보' }, { label: '시공정보' }]} current={1} />

        <div
          style={{
            maxWidth: 880,
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
              시공 정보를 알려주세요
            </h2>
            <p
              style={{
                color: 'var(--color-text-secondary)',
                marginBottom: 'var(--space-6)',
              }}
            >
              모든 항목을 입력하셔야 정확한 견적 안내가 가능합니다.
            </p>
            <form onSubmit={submit} className="stack" style={{ gap: 'var(--space-6)' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 'var(--space-4)',
                }}
              >
                <div className="field">
                  <label className="field-label" htmlFor="space-type">
                    공간 유형<span className="req">*</span>
                  </label>
                  <select
                    id="space-type"
                    className="select"
                    value={draft.spaceType}
                    onChange={(e) => setField('spaceType', e.target.value)}
                  >
                    <option value="">선택해 주세요</option>
                    {SPACE_TYPE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  {errors.spaceType && (
                    <div className="field-error">{errors.spaceType}</div>
                  )}
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="area">
                    평수<span className="req">*</span>
                  </label>
                  <input
                    id="area"
                    className="input"
                    inputMode="numeric"
                    placeholder="예: 32"
                    value={draft.areaSize}
                    onChange={(e) =>
                      setField('areaSize', e.target.value.replace(/[^0-9]/g, ''))
                    }
                  />
                  {errors.areaSize && (
                    <div className="field-error">{errors.areaSize}</div>
                  )}
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 'var(--space-4)',
                }}
              >
                <div className="field">
                  <label className="field-label" htmlFor="budget">
                    예상 예산<span className="req">*</span>
                  </label>
                  <select
                    id="budget"
                    className="select"
                    value={draft.budget}
                    onChange={(e) => setField('budget', e.target.value)}
                  >
                    <option value="">선택해 주세요</option>
                    {BUDGET_OPTIONS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                  {errors.budget && (
                    <div className="field-error">{errors.budget}</div>
                  )}
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="movein">
                    입주 예정일 (선택)
                  </label>
                  <input
                    id="movein"
                    type="date"
                    className="input"
                    value={draft.moveInDate}
                    onChange={(e) => setField('moveInDate', e.target.value)}
                  />
                </div>
              </div>

              <div className="field">
                <label className="field-label">
                  시공할 공간<span className="req">*</span>
                </label>
                <div className="checkbox-grid">
                  {SPACE_ROOMS.map((r) => {
                    const checked = draft.spaceTypes.includes(r);
                    return (
                      <label
                        key={r}
                        className={`check-pill ${checked ? 'checked' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setField('spaceTypes', toggle(draft.spaceTypes, r))
                          }
                        />
                        {r}
                      </label>
                    );
                  })}
                </div>
                {errors.spaceTypes && (
                  <div className="field-error">{errors.spaceTypes}</div>
                )}
              </div>

              <div className="field">
                <label className="field-label">
                  원하시는 스타일<span className="req">*</span>
                </label>
                <div className="checkbox-grid">
                  {STYLE_OPTIONS.map((s) => {
                    const checked = draft.styles.includes(s);
                    return (
                      <label
                        key={s}
                        className={`check-pill ${checked ? 'checked' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setField('styles', toggle(draft.styles, s))
                          }
                        />
                        {s}
                      </label>
                    );
                  })}
                </div>
                {errors.styles && (
                  <div className="field-error">{errors.styles}</div>
                )}
              </div>

              <div className="field">
                <label className="field-label" htmlFor="note">
                  추가 요청사항 (선택)
                </label>
                <textarea
                  id="note"
                  className="textarea"
                  placeholder="꼭 반영되었으면 하는 부분, 라이프 스타일 등을 자유롭게 적어주세요."
                  value={draft.additionalRequests}
                  onChange={(e) => setField('additionalRequests', e.target.value)}
                />
              </div>

              <div className="row" style={{ justifyContent: 'space-between' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => navigate('/quote')}
                >
                  ‹ 이전 단계
                </button>
                <button type="submit" className="btn btn-primary btn-lg">
                  견적 신청 완료
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
