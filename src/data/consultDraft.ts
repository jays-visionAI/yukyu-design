import type { Consultation } from './consultation';

/**
 *  고객 상담 신청 — Step 01 / Step 02 사이의 입력값 공유용 드래프트.
 *  · 견적 신청의 quoteDraft 패턴과 동일한 sessionStorage 기반.
 *  · 제출 직후 clearConsultDraft() 호출.
 */
export interface ConsultDraft {
  // Step 01
  name: string;
  phone: string;
  email: string;
  apartment: string;
  contactPrefs: Consultation['contactPrefs'];

  // Step 02
  moveIn?: Consultation['moveIn'];
  budget?: Consultation['budget'];
  remodelScope?: Consultation['remodelScope'];
  remodelAreas: string[];
  supplyArea?: number;
}

export const EMPTY_CONSULT_DRAFT: ConsultDraft = {
  name: '',
  phone: '',
  email: '',
  apartment: '',
  contactPrefs: [],
  remodelAreas: [],
};

const KEY = 'yukye_design_consult_draft_v1';

export function loadConsultDraft(): ConsultDraft {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw) return { ...EMPTY_CONSULT_DRAFT, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return EMPTY_CONSULT_DRAFT;
}

export function saveConsultDraft(d: ConsultDraft) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(d));
  } catch {
    /* ignore */
  }
}

export function clearConsultDraft() {
  sessionStorage.removeItem(KEY);
}

/**
 *  Step 01 만 채우고 Step 02 가 비어 있어도 제출을 허용하기 위해
 *  모든 필드를 optional 로 채웁니다.
 */
export function draftToConsultation(draft: ConsultDraft): Omit<
  Consultation,
  'id' | 'createdAt' | 'updatedAt' | 'status' | 'shareToken'
> {
  return {
    name: draft.name.trim(),
    phone: draft.phone.trim(),
    email: draft.email.trim() || undefined,
    apartment: draft.apartment.trim(),
    contactPrefs: draft.contactPrefs,
    moveIn: draft.moveIn,
    budget: draft.budget,
    remodelScope: draft.remodelScope,
    remodelAreas: draft.remodelAreas,
    supplyArea: draft.supplyArea,
  };
}