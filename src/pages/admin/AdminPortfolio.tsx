import { useState } from 'react';
import { useData } from '../../data/DataContext';
import { useToast } from '../../components/Toast';
import Modal from '../../components/Modal';
import { formatCurrency } from '../../lib/format';
import type { PortfolioItem } from '../../data/portfolio';

const CATEGORY_LABEL: Record<PortfolioItem['category'], string> = {
  residential: '주거',
  commercial: '상업',
  office: '오피스',
  partial: '부분 시공',
};

const PRESET_GRADIENTS: Array<[string, string]> = [
  ['#0B3D91', '#C9A961'],
  ['#1F8A55', '#FFD479'],
  ['#1A1D24', '#E08A1F'],
  ['#8A5A00', '#FFE2E2'],
  ['#1F6FAA', '#D9F0E2'],
  ['#C93535', '#FFF4D9'],
  ['#5C6470', '#FFFFFF'],
  ['#0B3D91', '#1F8A55'],
];

export default function AdminPortfolio() {
  const { portfolio, createPortfolio, updatePortfolio, deletePortfolio } = useData();
  const toast = useToast();
  const [editing, setEditing] = useState<PortfolioItem | null>(null);
  const [creating, setCreating] = useState(false);

  function togglePublish(p: PortfolioItem) {
    updatePortfolio(p.id, { published: !p.published });
    toast.success(p.published ? '비공개로 전환' : '공개 처리되었습니다.');
  }
  function toggleFeatured(p: PortfolioItem) {
    updatePortfolio(p.id, { featured: !p.featured });
    toast.success(p.featured ? '추천에서 제외' : '추천으로 등록');
  }
  function remove(p: PortfolioItem) {
    if (!confirm(`"${p.title}" 을(를) 삭제할까요?`)) return;
    deletePortfolio(p.id);
    toast.success('삭제되었습니다.');
  }

  return (
    <div style={{ padding: '32px 36px' }}>
      <div
        className="row-between"
        style={{ marginBottom: 24, flexWrap: 'wrap', gap: 12 }}
      >
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)' }}>포트폴리오</h1>
          <p
            style={{
              color: 'var(--color-text-secondary)',
              fontSize: 14,
            }}
          >
            시공 사례를 등록하고 노출 여부를 관리합니다.
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setCreating(true)}
        >
          + 새 포트폴리오
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 16,
        }}
      >
        {portfolio.map((p) => (
          <div
            key={p.id}
            className="card card-tight"
            style={{ padding: 0, overflow: 'hidden' }}
          >
            <div
              style={{
                height: 140,
                background: `linear-gradient(135deg, ${p.coverColor} 0%, ${p.coverAccent} 140%)`,
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'space-between',
                padding: 12,
                color: '#fff',
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  background: 'rgba(0,0,0,.3)',
                  padding: '4px 8px',
                  borderRadius: 999,
                }}
              >
                {CATEGORY_LABEL[p.category]}
              </span>
              <span
                style={{
                  fontSize: 11,
                  background: 'rgba(0,0,0,.3)',
                  padding: '4px 8px',
                  borderRadius: 999,
                }}
              >
                {p.year}
              </span>
            </div>
            <div style={{ padding: 16 }}>
              <h3
                style={{
                  fontSize: 'var(--text-md)',
                  fontWeight: 700,
                  marginBottom: 4,
                }}
              >
                {p.title}
              </h3>
              <div
                style={{
                  fontSize: 12,
                  color: 'var(--color-text-tertiary)',
                  marginBottom: 8,
                }}
              >
                {p.location} · {p.spaceType} · {p.durationWeeks}주
              </div>
              <p
                style={{
                  fontSize: 13,
                  color: 'var(--color-text-secondary)',
                  marginBottom: 12,
                  minHeight: 36,
                }}
              >
                {p.description}
              </p>
              <div
                className="row-between"
                style={{
                  fontSize: 12,
                  marginBottom: 12,
                }}
              >
                <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                  {p.budget}
                </span>
                <span style={{ color: 'var(--color-text-tertiary)' }}>
                  {p.tags.join(' · ')}
                </span>
              </div>
              <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
                <button
                  className={`btn btn-sm ${p.published ? 'btn-outline' : 'btn-ghost'}`}
                  onClick={() => togglePublish(p)}
                >
                  {p.published ? '🌍 공개' : '🔒 비공개'}
                </button>
                <button
                  className={`btn btn-sm ${p.featured ? 'btn-accent' : 'btn-outline'}`}
                  onClick={() => toggleFeatured(p)}
                >
                  {p.featured ? '⭐ 추천' : '＋ 추천'}
                </button>
                <button
                  className="btn btn-sm btn-ghost"
                  onClick={() => setEditing(p)}
                >
                  편집
                </button>
                <button
                  className="btn btn-sm btn-ghost"
                  style={{ color: 'var(--color-danger)' }}
                  onClick={() => remove(p)}
                >
                  삭제
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {(creating || editing) && (
        <PortfolioFormModal
          item={editing}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
          onSubmit={(data) => {
            if (editing) {
              updatePortfolio(editing.id, data);
              toast.success('수정되었습니다.');
            } else {
              createPortfolio(data as Omit<PortfolioItem, 'id' | 'createdAt'>);
              toast.success('새 포트폴리오가 추가되었습니다.');
            }
            setEditing(null);
            setCreating(false);
          }}
        />
      )}
    </div>
  );
}

function PortfolioFormModal({
  item,
  onClose,
  onSubmit,
}: {
  item: PortfolioItem | null;
  onClose: () => void;
  onSubmit: (data: Partial<PortfolioItem>) => void;
}) {
  const [form, setForm] = useState<Partial<PortfolioItem>>(
    item ?? {
      title: '',
      category: 'residential',
      spaceType: '',
      area: 0,
      location: '',
      year: new Date().getFullYear(),
      durationWeeks: 0,
      budget: '',
      description: '',
      coverColor: '#0B3D91',
      coverAccent: '#C9A961',
      tags: [],
      featured: false,
      published: true,
    }
  );

  function setField<K extends keyof PortfolioItem>(
    k: K,
    v: PortfolioItem[K]
  ) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title?.trim() || !form.budget?.trim()) return;
    onSubmit(form);
  }

  return (
    <Modal
      open
      title={item ? '포트폴리오 수정' : '새 포트폴리오'}
      onClose={onClose}
      maxWidth={760}
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose}>
            취소
          </button>
          <button className="btn btn-primary" onClick={submit}>
            {item ? '수정 완료' : '추가'}
          </button>
        </>
      }
    >
      <form onSubmit={submit} className="stack" style={{ gap: 16 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 12,
          }}
        >
          <div className="field">
            <label className="field-label">제목</label>
            <input
              className="input"
              value={form.title ?? ''}
              onChange={(e) => setField('title', e.target.value)}
            />
          </div>
          <div className="field">
            <label className="field-label">카테고리</label>
            <select
              className="select"
              value={form.category}
              onChange={(e) =>
                setField('category', e.target.value as PortfolioItem['category'])
              }
            >
              {Object.entries(CATEGORY_LABEL).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: 12,
          }}
        >
          <div className="field">
            <label className="field-label">공간</label>
            <input
              className="input"
              placeholder="아파트 32평"
              value={form.spaceType ?? ''}
              onChange={(e) => setField('spaceType', e.target.value)}
            />
          </div>
          <div className="field">
            <label className="field-label">평수</label>
            <input
              className="input"
              inputMode="numeric"
              value={form.area ?? 0}
              onChange={(e) =>
                setField('area', parseInt(e.target.value, 10) || 0)
              }
            />
          </div>
          <div className="field">
            <label className="field-label">지역</label>
            <input
              className="input"
              value={form.location ?? ''}
              onChange={(e) => setField('location', e.target.value)}
            />
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: 12,
          }}
        >
          <div className="field">
            <label className="field-label">연도</label>
            <input
              className="input"
              inputMode="numeric"
              value={form.year ?? 2025}
              onChange={(e) =>
                setField('year', parseInt(e.target.value, 10) || 2025)
              }
            />
          </div>
          <div className="field">
            <label className="field-label">시공 기간(주)</label>
            <input
              className="input"
              inputMode="numeric"
              value={form.durationWeeks ?? 0}
              onChange={(e) =>
                setField('durationWeeks', parseInt(e.target.value, 10) || 0)
              }
            />
          </div>
          <div className="field">
            <label className="field-label">예산</label>
            <input
              className="input"
              placeholder="3,200만원"
              value={form.budget ?? ''}
              onChange={(e) => setField('budget', e.target.value)}
            />
          </div>
        </div>

        <div className="field">
          <label className="field-label">설명</label>
          <textarea
            className="textarea"
            value={form.description ?? ''}
            onChange={(e) => setField('description', e.target.value)}
          />
        </div>

        <div className="field">
          <label className="field-label">태그 (콤마로 구분)</label>
          <input
            className="input"
            value={form.tags?.join(', ') ?? ''}
            onChange={(e) =>
              setField(
                'tags',
                e.target.value
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean)
              )
            }
          />
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 12,
          }}
        >
          <div className="field">
            <label className="field-label">커버 색상</label>
            <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
              {PRESET_GRADIENTS.map(([c, a], i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setField('coverColor', c);
                    setField('coverAccent', a);
                  }}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: `linear-gradient(135deg, ${c}, ${a})`,
                    border:
                      form.coverColor === c
                        ? '3px solid var(--color-primary)'
                        : '1px solid var(--color-border)',
                    cursor: 'pointer',
                  }}
                  aria-label={`색상 ${i + 1}`}
                />
              ))}
            </div>
            <div
              className="row"
              style={{ gap: 8, marginTop: 12 }}
            >
              <input
                className="input"
                value={form.coverColor ?? ''}
                onChange={(e) => setField('coverColor', e.target.value)}
                placeholder="#0B3D91"
              />
              <input
                className="input"
                value={form.coverAccent ?? ''}
                onChange={(e) => setField('coverAccent', e.target.value)}
                placeholder="#C9A961"
              />
            </div>
          </div>
          <div className="field">
            <label className="field-label">미리보기</label>
            <div
              style={{
                height: 140,
                borderRadius: 'var(--radius-md)',
                background: `linear-gradient(135deg, ${form.coverColor} 0%, ${form.coverAccent} 140%)`,
                padding: 12,
                color: '#fff',
                display: 'flex',
                alignItems: 'flex-end',
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  background: 'rgba(0,0,0,.3)',
                  padding: '4px 8px',
                  borderRadius: 999,
                }}
              >
                {form.title || '제목 미입력'}
              </span>
            </div>
            <div
              className="row"
              style={{
                marginTop: 12,
                gap: 12,
                flexWrap: 'wrap',
              }}
            >
              <label className="row" style={{ gap: 6 }}>
                <input
                  type="checkbox"
                  checked={!!form.published}
                  onChange={(e) => setField('published', e.target.checked)}
                />
                공개
              </label>
              <label className="row" style={{ gap: 6 }}>
                <input
                  type="checkbox"
                  checked={!!form.featured}
                  onChange={(e) => setField('featured', e.target.checked)}
                />
                메인 추천
              </label>
            </div>
          </div>
        </div>

        <div
          style={{
            background: 'var(--color-bg-muted)',
            borderRadius: 'var(--radius-md)',
            padding: 12,
            fontSize: 13,
            color: 'var(--color-text-secondary)',
          }}
        >
          예상 노출 가격: <strong>{formatCurrency(parseInt((form.budget ?? '0').replace(/[^0-9]/g, '')) * 10000)}</strong>
        </div>
      </form>
    </Modal>
  );
}
