export type QuoteStatus =
  | 'received' // 접수됨 (대기)
  | 'in_progress' // 공사 진행중
  | 'on_hold' // 보류
  | 'completed' // 완료
  | 'cancelled';

export type SpaceType =
  | 'apartment'
  | 'villa'
  | 'officetel'
  | 'house'
  | 'office'
  | 'commercial'
  | 'other';

export interface Quote {
  id: string;
  createdAt: string; // ISO

  // Step 1: 고객정보
  customerName: string;
  phone: string;
  email?: string;
  region: string; // 거주/시공 지역
  preferredContactTime?: string;

  // Step 2: 시공정보
  spaceType: SpaceType;
  areaSize: number; // 평수
  budget: string; // "1,000만원대" 같은 라벨
  moveInDate?: string; // ISO
  spaceTypes: string[]; // 시공 공간 (거실, 주방, ...)
  styles: string[]; // 인테리어 스타일
  additionalRequests?: string;

  // 시공 진행 관리
  status: QuoteStatus;
  adminMemo?: string;
  contractAmount?: number; // 최종 계약 금액 (원)
  progressPercent: number; // 0~100, 자동 계산 가능

  // 진행경과 타임라인
  updates: ProgressUpdate[];

  // 만족도 평가
  review?: CustomerReview;

  // 담당자
  managerId?: string;

  /**
   * 고객이 /quote/track/:shareToken 으로 자기 시공 건만 안전하게 조회할 수 있는
   * 불투명한 식별자. RLS 의 forge_share_token() 헬퍼와 짝을 이룹니다.
   */
  shareToken: string;
}

export interface ProgressUpdate {
  id: string;
  at: string; // ISO
  authorRole: 'admin' | 'customer' | 'system';
  authorName: string;
  category:
    | 'milestone' // 주요 마일스톤 (계약, 철거, etc.)
    | 'progress' // 진행 상황
    | 'issue' // 이슈
    | 'evidence' // 증빙자료 (사진/영수증)
    | 'note'; // 일반 메모
  title: string;
  message?: string;
  attachments?: ProgressAttachment[];
  // 외부 노출 여부 (고객에게 보낼지)
  visibleToCustomer: boolean;
}

export interface ProgressAttachment {
  id: string;
  name: string;
  size: number; // bytes
  type: string; // mime
  /** base64 data URL (mock storage in localStorage) */
  dataUrl: string;
  uploadedAt: string;
}

export interface CustomerReview {
  rating: number; // 1-5
  comment?: string;
  submittedAt: string;
  /** 만족도 항목별 점수 */
  ratings?: {
    communication: number;
    quality: number;
    schedule: number;
    cleanliness: number;
    overall: number;
  };
}
