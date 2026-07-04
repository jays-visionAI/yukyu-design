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
  coverColor: string; // CSS color for the gradient cover (no real images)
  coverAccent: string;
  tags: string[];
  featured: boolean;
  published: boolean;
  createdAt: string;
}
