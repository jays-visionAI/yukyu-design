import type { QuoteStatus } from '../data/types';

const STATUS_MAP: Record<
  QuoteStatus,
  { label: string; cls: string }
> = {
  received: { label: '접수됨', cls: 'badge-solid' },
  in_progress: { label: '진행중', cls: 'badge-tinted' },
  on_hold: { label: '보류', cls: 'badge-outline' },
  completed: { label: '완료', cls: 'badge-solid' },
  cancelled: { label: '취소', cls: 'badge-outline' },
};

export default function StatusBadge({ status }: { status: QuoteStatus }) {
  const cfg = STATUS_MAP[status] ?? STATUS_MAP.received;
  return <span className={`badge ${cfg.cls}`}>{cfg.label}</span>;
}

/* ============================================================
   범용 Mono 배지
   · tone: 'solid'   — 검정 배경 + 흰 글씨 (강조)
   · tone: 'tinted'  — 옅은 회색 배경 + 검정 글씨 (중립)
   · tone: 'outline' — 투명 배경 + 회색 보더 (보조)
   · tone: 'inverse' — 흰 배경 + 검정 보더 (선택된 항목)
   ============================================================ */
export type MonoTone = 'solid' | 'tinted' | 'outline' | 'inverse';

const TONE_CLS: Record<MonoTone, string> = {
  solid: 'badge-solid',
  tinted: 'badge-tinted',
  outline: 'badge-outline',
  inverse: 'badge-inverse',
};

export function MonoBadge({
  tone = 'solid',
  children,
}: {
  tone?: MonoTone;
  children: React.ReactNode;
}) {
  return <span className={`badge ${TONE_CLS[tone]}`}>{children}</span>;
}
