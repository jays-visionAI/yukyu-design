import { useMemo } from 'react';
import { useData } from '../../data/DataContext';
import { StarStatic } from '../../components/StarRating';
import { formatDate } from '../../lib/format';

export default function AdminReviews() {
  const { quotes } = useData();
  const reviewed = useMemo(
    () =>
      quotes
        .filter((q) => q.review)
        .sort(
          (a, b) =>
            +new Date(b.review!.submittedAt) -
            +new Date(a.review!.submittedAt)
        ),
    [quotes]
  );

  const avg = useMemo(() => {
    if (reviewed.length === 0) return 0;
    return (
      reviewed.reduce((s, q) => s + (q.review?.rating ?? 0), 0) /
      reviewed.length
    );
  }, [reviewed]);

  return (
    <div style={{ padding: '32px 36px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 'var(--text-2xl)' }}>고객 평가</h1>
        <p style={{ color: 'var(--color-text-secondary)' }}>
          공사 완료 후 고객이 남긴 별점과 코멘트를 확인합니다.
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 2fr',
          gap: 16,
        }}
      >
        <div className="card card-tight" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
            평균 만족도
          </div>
          <div
            style={{
              fontSize: 64,
              fontWeight: 800,
              color: 'var(--color-warning)',
              lineHeight: 1,
              margin: '8px 0',
            }}
          >
            {avg.toFixed(1)}
          </div>
          <StarStatic value={Math.round(avg)} size={22} />
          <div
            style={{
              marginTop: 8,
              fontSize: 13,
              color: 'var(--color-text-tertiary)',
            }}
          >
            총 {reviewed.length}건
          </div>
        </div>

        <div className="card card-tight">
          {reviewed.length === 0 ? (
            <div className="empty">아직 등록된 평가가 없습니다.</div>
          ) : (
            <div className="stack" style={{ gap: 16 }}>
              {reviewed.map((q) => (
                <div
                  key={q.id}
                  style={{
                    padding: 16,
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <div
                    className="row-between"
                    style={{ marginBottom: 8 }}
                  >
                    <div>
                      <strong>{q.customerName}</strong>{' '}
                      <span style={{ color: 'var(--color-text-tertiary)' }}>
                        · {q.spaceTypes.join(', ')} · {q.areaSize}평
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: 12,
                        color: 'var(--color-text-tertiary)',
                      }}
                    >
                      {formatDate(q.review!.submittedAt)}
                    </span>
                  </div>
                  <div
                    className="row"
                    style={{ marginBottom: 8, alignItems: 'center', gap: 8 }}
                  >
                    <StarStatic value={q.review!.rating} size={18} />
                    <strong>{q.review!.rating}.0</strong>
                  </div>
                  {q.review!.comment && (
                    <p
                      style={{
                        background: 'var(--color-bg-muted)',
                        padding: 12,
                        borderRadius: 'var(--radius-sm)',
                        fontSize: 14,
                        marginBottom: 8,
                      }}
                    >
                      "{q.review!.comment}"
                    </p>
                  )}
                  {q.review!.ratings && (
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: 8,
                        fontSize: 12,
                      }}
                    >
                      {(
                        [
                          ['소통', q.review!.ratings.communication],
                          ['품질', q.review!.ratings.quality],
                          ['일정', q.review!.ratings.schedule],
                          ['현장관리', q.review!.ratings.cleanliness],
                        ] as const
                      ).map(([l, v]) => (
                        <div
                          key={l}
                          style={{
                            background: 'var(--color-bg-page)',
                            padding: 8,
                            borderRadius: 'var(--radius-sm)',
                            textAlign: 'center',
                          }}
                        >
                          <div>{l}</div>
                          <strong style={{ color: 'var(--color-primary)' }}>
                            {v}.0
                          </strong>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
