/**
 * 공간유형(spaceType) 별로 시공 공간(rooms)과 스타일(styles) 풀을 정의합니다.
 *
 * 견적 신청 Step 2에서 공간유형이 바뀌면 이 카탈로그를 참조하여
 *   1) 옵션 체크박스 그리드를 동적으로 교체하고
 *   2) 기존에 선택돼 있던 값 중 새 풀에 없는 것은 자동 제거합니다.
 *
 * DB 컬럼은 변경하지 않습니다 — quotes.space_types / quotes.styles 는
 * TEXT[] 그대로 유지되므로 어드민/리포팅 호환성에 영향이 없습니다.
 */

export interface SpaceCatalog {
  /** 시공할 공간 옵션 풀 (체크박스 렌더용) */
  rooms: string[];
  /** 원하시는 스타일 옵션 풀 */
  styles: string[];
  /** 옵션 영역 위에 노출되는 1줄 안내문 */
  hint?: string;
}

/**
 * spaceType 값(key) ↔ SpaceCatalog 매핑.
 * Quote.spaceType 유니온에 정의된 7개 값을 모두 커버하며,
 * 알 수 없는 값이 들어오면 'other' 로 폴백합니다.
 */
export const SPACE_CATALOG: Record<string, SpaceCatalog> = {
  apartment: {
    rooms: [
      '거실',
      '주방',
      '안방',
      '작은방',
      '드레스룸',
      '서재',
      '욕실',
      '베란다',
      '현관',
      '다용도실',
    ],
    styles: ['모던', '미니멀', '내추럴', '북유럽', '클래식', '프렌치', 'Japandi'],
    hint: '아파트 전용 옵션이에요. 필요한 공간만 골라 주세요.',
  },
  villa: {
    rooms: ['거실', '주방', '안방', '욕실', '베란다', '현관', '다용도실'],
    styles: [
      '모던',
      '미니멀',
      '내추럴',
      '북유럽',
      '클래식',
      '한국 전통',
      'Japandi',
    ],
    hint: '빌라/투룸에 자주 쓰는 공간만 보여드려요.',
  },
  officetel: {
    rooms: [
      '거실겸침실',
      '주방',
      '욕실',
      '베란다',
      '현관',
      '드레스룸',
      '서재',
    ],
    styles: ['모던', '미니멀', '북유럽', '산업'],
    hint: '좁은 평수에 맞춘 실용형 옵션만 노출합니다.',
  },
  house: {
    rooms: [
      '거실',
      '주방',
      '안방',
      '작은방',
      '드레스룸',
      '서재',
      '욕실',
      '베란다',
      '현관',
      '다용도실',
      '마당',
      '옥상',
      '창고',
    ],
    styles: [
      '내추럴',
      '한국 전통',
      '북유럽',
      '모던',
      '미니멀',
      'Japandi',
      '클래식',
    ],
    hint: '단독주택/전원주택에 어울리는 옵션을 모아뒀어요.',
  },
  office: {
    rooms: [
      'OA존',
      '미팅룸',
      '임원실',
      '직원휴게실',
      '회의실',
      '서버실',
      '리셉션',
      '화장실',
    ],
    styles: ['모던', '미니멀', '산업', '클래식'],
    hint: '업무 공간에 최적화된 옵션이에요.',
  },
  commercial: {
    rooms: ['매장', '진열대', '카운터', '고객대기실', '사무존', '창고', '화장실', '간판'],
    styles: ['모던', '산업', '미니멀', '프렌치'],
    hint: '상가/매장 사장님을 위한 옵션이에요.',
  },
  other: {
    rooms: [
      '거실',
      '주방',
      '안방',
      '작은방',
      '드레스룸',
      '서재',
      '욕실',
      '베란다',
      '현관',
      '다용도실',
    ],
    styles: [
      '모던',
      '미니멀',
      '내추럴',
      '북유럽',
      '클래식',
      '산업',
      '프렌치',
      '한국 전통',
      'Japandi',
    ],
    hint: '기타 공간 — 일반적인 옵션을 모두 보여드려요.',
  },
};

/**
 * spaceType 값으로 카탈로그를 안전하게 조회합니다.
 * - 빈 문자열/정의되지 않은 값은 'other' 폴백을 반환합니다.
 */
export function getSpaceCatalog(spaceType: string | undefined | null): SpaceCatalog {
  const key = spaceType && SPACE_CATALOG[spaceType] ? spaceType : 'other';
  return SPACE_CATALOG[key];
}

/**
 * 카탈로그 교체 시 — 현재 선택된 값들 중 새 풀에 남아있는 것만 유지.
 * rooms 와 styles 각각에 대해 동작합니다.
 */
export function pruneToCatalog(
  selected: string[],
  pool: string[]
): string[] {
  const set = new Set(pool);
  return selected.filter((v) => set.has(v));
}