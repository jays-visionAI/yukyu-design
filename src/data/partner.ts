// ============================================================
//  Partner — 협력업체(인테리어/시공) 신청 도메인 타입
// ------------------------------------------------------------
//  - 인테리어 업체, 시공 업체 등이 "파트너"로 등록 신청할 때 쓰는 폼 모델.
//  - 상태: 'submitted'(접수) → 'reviewing'(검토중) → 'approved'(승인) |
//          'rejected'(반려)
//  - 사업자 정보 / 시공 사례 / 실적 정보 / 동의 항목 으로 구성.
//  - 연락처 등 PII 는 마스킹 함수로 안전하게 노출.
// ============================================================

export type PartnerStatus = 'submitted' | 'reviewing' | 'approved' | 'rejected';

export type PartnerBusinessType =
  | 'interior_design' // 인테리어 디자인
  | 'construction' // 시공 전문
  | 'design_and_build' // 디자인 + 시공 일괄
  | 'partial' // 부분 시공 (도배/욕실/주방 등)
  | 'other';

export interface PartnerBusinessInfo {
  /** 회사/상호명 */
  companyName: string;
  /** 사업자등록번호 (숫자/하이픈, 검증은 클라이언트 형식 검사) */
  businessNumber: string;
  /** 대표자명 */
  ceoName: string;
  /** 사업자 구분 (위 PartnerBusinessType 중 하나) */
  businessType: PartnerBusinessType;
  /** 설립 연도 (4자리, optional) */
  establishedYear?: number;
  /** 소재지 */
  address: string;
  /** 담당자 이름 */
  contactName: string;
  /** 담당자 직함 */
  contactRole?: string;
  /** 연락처 */
  contactPhone: string;
  /** 이메일 */
  contactEmail: string;
  /** 웹사이트 (optional) */
  websiteUrl?: string;
}

export interface PartnerCasePhoto {
  /** 브라우저에서 미리보기 가능한 이미지 data URL */
  dataUrl: string;
  /** 원본 파일명 */
  name: string;
  /** MIME 타입 */
  type: string;
  /** 파일 크기(byte) */
  size: number;
}

export interface PartnerCase {
  /** 시공 사례 제목 */
  title: string;
  /** 시공 유형 (예: 아파트 32평 / 단독주택 / 오피스) */
  spaceType: string;
  /** 시공 면적 (평수) */
  areaSize: number;
  /** 시공 지역 */
  location: string;
  /** 시공 기간 (주 단위) */
  durationWeeks: number;
  /** 공사 예산대 (예: "3,000~4,000만원") */
  budget: string;
  /** 시공 완료 연도 */
  completedYear: number;
  /** 사용 자재/스타일 메모 (예: "천연 대리석 + 원목") */
  materials?: string;
  /** 간단한 설명 */
  description: string;
  /** 시공 사례 사진 (최대 5장) */
  photos: PartnerCasePhoto[];
}

export interface PartnerPerformance {
  /** 누적 시공 건수 (최근 3년) */
  totalProjects: number;
  /** 최근 1년 시공 건수 */
  recentYearProjects: number;
  /** 평균 시공 면적 (평수, 0 가능) */
  avgAreaSize: number;
  /** 주요 시공 지역들 (최대 5개) */
  primaryRegions: string[];
  /** 전문 분야 다중선택 */
  specialties: PartnerBusinessType[];
  /** 보유 자격증/면허 (텍스트, optional) */
  certifications?: string;
  /** 평균 공사기간 (주 단위) */
  avgDurationWeeks: number;
}

export interface PartnerAgreement {
  /** 사업자등록증·인감증명서 사본 보관 동의 */
  agreeInfoStorage: boolean;
  /** 파트너 등록 심사 후 연락 동의 */
  agreeContact: boolean;
  /** 정산/계약 진행 시 추가 서류 제출 동의 */
  agreeAdditionalDocs: boolean;
  /** 개인정보 제3자 제공 동의 (없음, 내부 검토용) */
  agreePrivacy: boolean;
}

export interface PartnerApplication {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: PartnerStatus;

  business: PartnerBusinessInfo;
  cases: PartnerCase[]; // 최소 1개 이상
  performance: PartnerPerformance;
  agreement: PartnerAgreement;

  /** 자유 추가 메모 */
  note?: string;

  /** 관리자 코멘트 (반려 사유 등) */
  adminMemo?: string;
  /** 처리 일시 (status 가 approved/rejected 로 바뀐 시각) */
  processedAt?: string;
  /** 처리한 관리자 식별자 (optional) */
  processedBy?: string;
}

// ------------------------------------------------------------
//  기본값
// ------------------------------------------------------------

export const PARTNER_SPECIALTY_LABELS: Record<PartnerBusinessType, string> = {
  interior_design: '인테리어 디자인',
  construction: '시공 전문',
  design_and_build: '디자인+시공 일괄',
  partial: '부분 시공',
  other: '기타',
};

export const PARTNER_STATUS_LABELS: Record<PartnerStatus, string> = {
  submitted: '접수됨',
  reviewing: '검토중',
  approved: '승인',
  rejected: '반려',
};

// ------------------------------------------------------------
//  헬퍼
// ------------------------------------------------------------

/** 사업자등록번호 형식 검사 (NNN-NN-NNNNN). 형식만 검사, 실존 여부는 별도 API 필요. */
export function validateBusinessNumber(input: string): boolean {
  const cleaned = input.replace(/[^0-9]/g, '');
  if (cleaned.length !== 10) return false;
  // 간단 가중치 검증 (국세청 알고리즘과 동일 형식)
  const digits = cleaned.split('').map(Number);
  const weights = [1, 3, 7, 1, 3, 7, 1, 3, 5];
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += digits[i] * weights[i];
  sum += Math.floor((digits[8] * 5) / 10);
  const check = (10 - (sum % 10)) % 10;
  return check === digits[9];
}

/** PII 마스킹 — 관리자 리스트/카드 뷰에서 사용 */
export function maskPhone(phone: string): string {
  if (!phone) return '';
  const digits = phone.replace(/[^0-9]/g, '');
  if (digits.length < 7) return phone;
  return `${digits.slice(0, 3)}-****-${digits.slice(-4)}`;
}

export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return email;
  const [local, domain] = email.split('@');
  if (local.length <= 2) return `${local[0] ?? '*'}***@${domain}`;
  return `${local.slice(0, 2)}***@${domain}`;
}

export function maskBusinessNumber(bizNo: string): string {
  const c = bizNo.replace(/[^0-9]/g, '');
  if (c.length < 6) return bizNo;
  return `${c.slice(0, 3)}-**-**${c.slice(-2)}`;
}

/** 빈 신청 폼 초기값 (UI 에서 단계별로 채워감) */
export function emptyPartnerDraft(): Omit<
  PartnerApplication,
  'id' | 'createdAt' | 'updatedAt' | 'status'
> {
  return {
    business: {
      companyName: '',
      businessNumber: '',
      ceoName: '',
      businessType: 'design_and_build',
      address: '',
      contactName: '',
      contactRole: '',
      contactPhone: '',
      contactEmail: '',
      websiteUrl: '',
    },
    cases: [
      {
        title: '',
        spaceType: '',
        areaSize: 0,
        location: '',
        durationWeeks: 0,
        budget: '',
        completedYear: new Date().getFullYear(),
        materials: '',
        description: '',
        photos: [],
      },
    ],
    performance: {
      totalProjects: 0,
      recentYearProjects: 0,
      avgAreaSize: 0,
      primaryRegions: [],
      specialties: [],
      certifications: '',
      avgDurationWeeks: 0,
    },
    agreement: {
      agreeInfoStorage: false,
      agreeContact: false,
      agreeAdditionalDocs: false,
      agreePrivacy: false,
    },
    note: '',
  };
}