// ============================================================
//  고객 상담 신청 (Consultation) 도메인 타입
//  · Quote 와 분리된 별도 엔티티 — UI 명세서 Step 01/02 의
//    입력 구조와 19단계 진행 흐름에 맞춤.
// ============================================================

export type ConsultationStatus =
  | 'received'    // 신규 접수
  | 'contacted'   // 첫 연락 완료
  | 'consulting'  // 상담중
  | 'proposal'    // 제안서 발송
  | 'contracted'  // 계약
  | 'on_hold'     // 보류
  | 'cancelled'   // 취소
  | 'completed';  // 완료

export type ContactPref = 'any' | 'morning' | 'afternoon' | 'evening';

export type MoveIn = 'within_1m' | '1_3m' | 'after_3m';

export type BudgetTier = 'budget_100' | 'budget_150' | 'budget_200_plus';

export type RemodelScope = 'full' | 'partial' | 'styling';

/** 부분 리모델링 옵션 (한글 라벨) — DB text[] 그대로 저장 */
export const REMODEL_AREAS: string[] = [
  '현관', '거실', '아트월', '실링팬',
  '주방가구', 'ROOM 1', 'ROOM 2', 'ROOM 3',
  '주방발코니', '거실발코니', '샷시', '방문',
  '문틀', '걸레받이', '천장몰딩', '중문설치',
  '공용욕실', '안방욕실', '마루', '장판',
  '조명', '스위치·콘센트',
];

export const CONTACT_PREF_OPTIONS: { value: ContactPref; label: string }[] = [
  { value: 'any', label: '언제든 괜찮아요' },
  { value: 'morning', label: '오전 (9~12시)' },
  { value: 'afternoon', label: '오후 (12~18시)' },
  { value: 'evening', label: '저녁 (18시 이후)' },
];

export const MOVE_IN_OPTIONS: { value: MoveIn; label: string }[] = [
  { value: 'within_1m', label: '한 달 이내 (빠른 진행이 필요해요)' },
  { value: '1_3m', label: '2~3달 이내 (여유 있게 꼼꼼히 준비하고 싶어요)' },
  { value: 'after_3m', label: '3달 이후 (미리 상담받고 계획하려 해요)' },
];

export const BUDGET_OPTIONS: {
  value: BudgetTier;
  title: string;
  hint: string;
}[] = [
  { value: 'budget_100', title: '가성비 위주로 실속 있게', hint: '평당 약 100만 원 내외' },
  { value: 'budget_150', title: '기본에 충실하면서 포인트만 확실하게', hint: '평당 약 150만 원 내외' },
  { value: 'budget_200_plus', title: '고급 자재와 디테일한 디자인 레이어로 반영', hint: '평당 약 200만 원 이상' },
];

export const SCOPE_OPTIONS: { value: RemodelScope; label: string }[] = [
  { value: 'full', label: '전체 리모델링 (낡시부터 마감까지 싹 바꾸고 싶어요)' },
  { value: 'partial', label: '부분 리모델링 (살릴 곳은 살리고 필요한 곳만 고칠래요)' },
  { value: 'styling', label: '스타일링 / 기본 마감 (도배, 필름, 바닥 정도로 분위기만 바꿀래요)' },
];

export interface ConsultationFile {
  id: string;
  consultationId: string;
  fileType: 'floor_plan' | 'site_photo' | 'pdf' | 'drawing' | 'other';
  storagePath: string;
  originalName: string;
  mimeType?: string;
  sizeBytes?: number;
  uploadedBy?: string;
  createdAt: string;
}

export interface ConsultationLog {
  id: string;
  consultationId: string;
  actorId?: string;
  actorName?: string;
  eventType:
    | 'created'
    | 'status_changed'
    | 'assigned'
    | 'memo_added'
    | 'contacted'
    | 'file_attached'
    | 'note';
  payload?: Record<string, unknown>;
  createdAt: string;
}

export interface ReferenceLink {
  id: string;
  consultationId: string;
  url: string;
  category: 'instagram' | 'pinterest' | 'youtube' | 'blog' | 'other';
  label?: string;
  addedBy?: string;
  createdAt: string;
}

export interface Consultation {
  id: string;
  createdAt: string;
  updatedAt: string;

  // Step 01
  name: string;
  phone: string;
  email?: string;
  apartment: string;
  contactPrefs: ContactPref[];

  // Step 02
  moveIn?: MoveIn;
  budget?: BudgetTier;
  remodelScope?: RemodelScope;
  remodelAreas: string[];
  supplyArea?: number;

  // 운영
  status: ConsultationStatus;
  assignedAdmin?: string;
  adminMemo?: string;

  /** 고객이 자기 상담 건을 추적할 때 사용하는 불투명 토큰 (UUID) */
  shareToken: string;
}

// ============================================================
//  UI 표시용 라벨 맵
// ============================================================

export const CONSULTATION_STATUS_LABEL: Record<ConsultationStatus, string> = {
  received: '신규',
  contacted: '연락완료',
  consulting: '상담중',
  proposal: '제안서발송',
  contracted: '계약',
  on_hold: '보류',
  cancelled: '취소',
  completed: '완료',
};

export const MOVE_IN_LABEL: Record<MoveIn, string> = {
  within_1m: '한 달 이내',
  '1_3m': '2~3달 이내',
  after_3m: '3달 이후',
};

export const BUDGET_LABEL: Record<BudgetTier, string> = {
  budget_100: '평당 약 100만 원 내외',
  budget_150: '평당 약 150만 원 내외',
  budget_200_plus: '평당 약 200만 원 이상',
};

export const SCOPE_LABEL: Record<RemodelScope, string> = {
  full: '전체 리모델링',
  partial: '부분 리모델링',
  styling: '스타일링 / 기본 마감',
};

export const CONTACT_PREF_LABEL: Record<ContactPref, string> = {
  any: '언제든',
  morning: '오전',
  afternoon: '오후',
  evening: '저녁',
};