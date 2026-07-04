import type { QuoteStatus } from '../data/types';

const STATUS_MAP: Record<
  QuoteStatus,
  { label: string; cls: string }
> = {
  received: { label: '접수됨', cls: 'badge-today' },
  in_progress: { label: '진행중', cls: 'badge-waiting' },
  on_hold: { label: '보류', cls: 'badge-hot' },
  completed: { label: '완료', cls: 'badge-done' },
  cancelled: { label: '취소', cls: 'badge-hot' },
};

export default function StatusBadge({ status }: { status: QuoteStatus }) {
  const cfg = STATUS_MAP[status] ?? STATUS_MAP.received;
  return <span className={`badge ${cfg.cls}`}>{cfg.label}</span>;
}
