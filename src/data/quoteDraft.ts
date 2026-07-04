import type { Quote } from './types';

export interface QuoteDraft {
  customerName: string;
  phone: string;
  email: string;
  region: string;
  preferredContactTime: string;
  spaceType: string;
  areaSize: string; // input uses string
  budget: string;
  moveInDate: string;
  spaceTypes: string[];
  styles: string[];
  additionalRequests: string;
}

export const EMPTY_DRAFT: QuoteDraft = {
  customerName: '',
  phone: '',
  email: '',
  region: '',
  preferredContactTime: '',
  spaceType: '',
  areaSize: '',
  budget: '',
  moveInDate: '',
  spaceTypes: [],
  styles: [],
  additionalRequests: '',
};

const KEY = 'yukye_design_quote_draft_v1';

export function loadDraft(): QuoteDraft {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw) return { ...EMPTY_DRAFT, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return EMPTY_DRAFT;
}

export function saveDraft(d: QuoteDraft) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(d));
  } catch {
    /* ignore */
  }
}

export function clearDraft() {
  sessionStorage.removeItem(KEY);
}

export function draftToQuote(
  draft: QuoteDraft
): Omit<
  Quote,
  'id' | 'createdAt' | 'updates' | 'progressPercent' | 'status' | 'shareToken'
> {
  return {
    customerName: draft.customerName.trim(),
    phone: draft.phone.trim(),
    email: draft.email.trim() || undefined,
    region: draft.region.trim(),
    preferredContactTime: draft.preferredContactTime || undefined,
    spaceType: (draft.spaceType || 'other') as Quote['spaceType'],
    areaSize: Math.max(1, parseInt(draft.areaSize || '0', 10) || 0),
    budget: draft.budget,
    moveInDate: draft.moveInDate || undefined,
    spaceTypes: draft.spaceTypes,
    styles: draft.styles,
    additionalRequests: draft.additionalRequests.trim() || undefined,
  };
}
