export interface PortfolioItem {
  id: string;
  title: string;
  category: 'residential' | 'commercial' | 'office' | 'partial';
  spaceType: string;
  area: number; // 평수
  location: string;
  year: number;
  durationWeeks: number;
  budget: string; // "3,500만원"
  description: string;
  coverColor: string; // 이미지 없을 때 폴백으로 쓰이는 CSS color
  coverAccent: string;
  /**
   * 시공 사진 URL 목록. 첫 번째 이미지가 카드 커버로 사용되며,
   * AdminPortfolio 에서 URL 직접 입력 또는 관리자 Storage 업로드로 채워집니다.
   * 데이터베이스(FogreDB) 의 portfolio.images 컬럼 (text[]) 과 동기화됩니다.
   */
  images: string[];
  tags: string[];
  featured: boolean;
  published: boolean;
  createdAt: string;
}
