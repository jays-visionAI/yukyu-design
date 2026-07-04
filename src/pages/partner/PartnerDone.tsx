// ============================================================
//  PartnerDone — 파트너 신청 완료 페이지
// ------------------------------------------------------------
//  · URL 쿼리에 ?id= 가 있으면 내 신청 정보를 마스킹해서 요약 보여줌
//  · 신청 ID 만 안내 → 일반 고객은 "내 신청 조회" 같은 추가 기능 없음
//    (RLS 상 anon SELECT 차단). 결과는 이메일로 통보됨.
// ============================================================

import { Link, useSearchParams } from 'react-router-dom';
import { Header, Footer } from '../../components/Layout';
import { usePartner } from '../../data/PartnerContext';
import {
  PARTNER_SPECIALTY_LABELS,
  PARTNER_STATUS_LABELS,
  maskBusinessNumber,
  maskEmail,
  maskPhone,
} from '../../data/partner';

export default function PartnerDone() {
  const [params] = useSearchParams();
  const id = params.get('id');
  const { getApplication } = usePartner();
  const app = id ? getApplication(id) : undefined;

  return (
    <>
      <Header />
      <main className="container" style={{ paddingTop: 40, paddingBottom: 80 }}>
        <div className="card" style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: 'var(--color-primary-light)',
              color: 'var(--color-primary)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 36,
              fontWeight: 700,
              marginBottom: 20,
            }}
          >
            ✓
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>
            신청이 접수되었습니다
          </h1>
          <p
            style={{
              fontSize: 15,
              color: 'var(--color-text-secondary)',
              marginBottom: 24,
            }}
          >
            담당자가 영업일 기준 2~3일 내에 검토 후 이메일로 결과를 안내드립니다.
          </p>

          {app && (
            <div
              style={{
                textAlign: 'left',
                padding: 20,
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-bg-muted)',
                marginBottom: 24,
              }}
            >
              <h3 style={{ fontSize: 14, marginBottom: 12, color: 'var(--color-text-tertiary)' }}>
                접수 정보
              </h3>
              <SummaryRow
                items={[
                  ['신청 번호', app.id],
                  ['회사명', app.business.companyName],
                  ['대표자', app.business.ceoName],
                  [
                    '사업자구분',
                    PARTNER_SPECIALTY_LABELS[app.business.businessType],
                  ],
                  ['담당자', app.business.contactName],
                  ['연락처', maskPhone(app.business.contactPhone)],
                  ['이메일', maskEmail(app.business.contactEmail)],
                  ['사업자등록번호', maskBusinessNumber(app.business.businessNumber)],
                  [
                    '접수일시',
                    new Date(app.createdAt).toLocaleString('ko-KR', {
                      hour12: false,
                    }),
                  ],
                  ['상태', PARTNER_STATUS_LABELS[app.status]],
                ]}
              />
            </div>
          )}

          <div
            style={{
              padding: 16,
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-warning-bg, #fff8e6)',
              color: 'var(--color-warning-fg, #8a5a00)',
              fontSize: 14,
              marginBottom: 24,
              textAlign: 'left',
            }}
          >
            <strong>📌 안내 사항</strong>
            <ul style={{ marginTop: 8, paddingLeft: 20, lineHeight: 1.7 }}>
              <li>신청 후 영업일 기준 2~3일 내 담당자가 연락드립니다.</li>
              <li>승인 완료 시 별도의 파트너 가이드·정산 계좌 정보를 이메일로 발송합니다.</li>
              <li>
                신청 내용 수정은 등록하신 이메일(<strong>{maskEmail(app?.business.contactEmail ?? '')}</strong>)로 회신 요청 시
                가능합니다.
              </li>
            </ul>
          </div>

          <div className="row" style={{ justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
            <Link to="/" className="btn btn-primary">
              홈으로
            </Link>
            <Link to="/quote" className="btn btn-outline">
              견적 문의 페이지 →
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

function SummaryRow({ items }: { items: (readonly [string, string])[] }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 12,
      }}
    >
      {items.map(([k, v]) => (
        <div key={k}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--color-text-tertiary)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: 2,
            }}
          >
            {k}
          </div>
          <div style={{ fontWeight: 500, fontSize: 13 }}>{v || '—'}</div>
        </div>
      ))}
    </div>
  );
}