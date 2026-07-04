export function formatCurrency(n: number | undefined | null): string {
  if (n === undefined || n === null) return '-';
  if (n >= 100000000) return `${(n / 100000000).toFixed(1)}억`;
  if (n >= 10000) return `${Math.round(n / 10000).toLocaleString()}만`;
  return n.toLocaleString();
}

export function formatKRW(n: number | undefined | null): string {
  if (n === undefined || n === null) return '-';
  return `${n.toLocaleString()}원`;
}

export function formatDate(
  iso: string | undefined | null,
  withTime = false
): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  if (!withTime) return `${y}.${m}.${dd}`;
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${y}.${m}.${dd} ${hh}:${mm}`;
}

export function relativeTime(iso: string | undefined | null): string {
  if (!iso) return '';
  const d = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return '방금';
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}일 전`;
  return formatDate(iso);
}

export function fileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

export const SPACE_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'apartment', label: '아파트' },
  { value: 'villa', label: '빌라/투룸' },
  { value: 'officetel', label: '오피스텔' },
  { value: 'house', label: '단독주택/전원주택' },
  { value: 'office', label: '오피스/업무공간' },
  { value: 'commercial', label: '상가/매장' },
  { value: 'other', label: '기타' },
];

export const SPACE_TYPE_LABEL: Record<string, string> = Object.fromEntries(
  SPACE_TYPE_OPTIONS.map((o) => [o.value, o.label])
);

export const SPACE_ROOMS = [
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
];

export const STYLE_OPTIONS = [
  '모던',
  '미니멀',
  '내추럴',
  '북유럽',
  '클래식',
  '산업',
  '프렌치',
  '한국 전통',
  'Japandi',
];

export const BUDGET_OPTIONS = [
  '1,000만원 미만',
  '1,000만원대',
  '2,000만원대',
  '3,000만원대',
  '4,000만원대',
  '5,000만원대',
  '6,000-7,000만원대',
  '8,000만원 이상',
];

export const REGION_OPTIONS = [
  '서울 강남구',
  '서울 강북구',
  '서울 강서·마포·영등포',
  '서울 송파·강동',
  '서울 성동·광진·동대문',
  '서울 종로·중구·용산',
  '서울 기타',
  '경기 성남·분당',
  '경기 수원·용인',
  '경기 기타',
  '인천',
  '부산',
  '대구',
  '기타',
];
