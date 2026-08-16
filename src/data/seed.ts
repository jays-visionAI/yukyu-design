import type { Quote, ProgressUpdate, CustomerReview } from './types';
import type { PortfolioItem } from './portfolio';
import type { Consultation, ConsultationLog, ConsultationFile, ReferenceLink } from './consultation';

function iso(daysAgo: number, hour = 9) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

function pu(
  partial: Partial<ProgressUpdate> & Pick<ProgressUpdate, 'title'>
): ProgressUpdate {
  return {
    id: `seed_${Math.random().toString(36).slice(2, 10)}`,
    at: iso(0),
    authorRole: 'admin',
    authorName: 'Yukyu Studio',
    category: 'progress',
    visibleToCustomer: true,
    ...partial,
  };
}

const sampleUpdates: ProgressUpdate[] = [
  pu({ at: iso(12), category: 'milestone', title: '계약 체결 완료', message: '시공 계약이 정식 체결되었어요. 시작일 안내드립니다.' }),
  pu({ at: iso(10), category: 'milestone', title: '자재 발주 및 입고', message: '주방 자재 및 바닥재가 현장으로 입고되었습니다.' }),
  pu({ at: iso(7), category: 'progress', title: '철거 작업 시작', message: '안전 점검 후 철거가 진행 중입니다. (Day 1)' }),
  pu({ at: iso(6), category: 'progress', title: '철거 완료', message: '예정대로 철거가 완료되어 청소 후 다음 공정으로 넘어갑니다.' }),
  pu({ at: iso(4), category: 'progress', title: '전기/설비 배선', message: '콘센트 위치 및 조명 배선이 진행되었습니다.' }),
  pu({ at: iso(2), category: 'progress', title: '중간 점검 요청드립니다', message: '고객님께서 직접 현장을 확인해주시면 좋겠습니다.' }),
];

const review1: CustomerReview = {
  rating: 5,
  comment: '꼼꼼하고 일정이 정확해서 좋았어요. 결과물도 만족스럽습니다!',
  submittedAt: iso(1),
  ratings: {
    communication: 5,
    quality: 5,
    schedule: 4,
    cleanliness: 5,
    overall: 5,
  },
};

const review2: CustomerReview = {
  rating: 4,
  comment: '전반적으로 만족합니다. 사소한 부분에서 디테일이 조금 더했으면 좋겠어요.',
  submittedAt: iso(20),
  ratings: {
    communication: 5,
    quality: 4,
    schedule: 4,
    cleanliness: 4,
    overall: 4,
  },
};

export function seedQuotes(): Quote[] {
  return [
    {
      id: 'qt_demo_001',
      createdAt: iso(12),
      customerName: '김민서',
      phone: '010-1234-5678',
      email: 'minseo@example.com',
      region: '서울 강남구 청담동',
      preferredContactTime: '평일 오후',
      spaceType: 'apartment',
      areaSize: 32,
      budget: '3,000만원대',
      moveInDate: iso(-20),
      spaceTypes: ['거실', '주방', '안방'],
      styles: ['모던', '내추럴'],
      additionalRequests: '수납 공간을 많이 확보하고 싶어요.',
      status: 'in_progress',
      progressPercent: 55,
      updates: sampleUpdates,
      contractAmount: 32000000,
      managerId: 'admin',
      shareToken: 'demo-tk-ms01-0000-0001-aaaa-aaaaaaaaaaaa',
    },
    {
      id: 'qt_demo_002',
      createdAt: iso(30),
      customerName: '이도윤',
      phone: '010-9876-5432',
      region: '경기 성남시 분당구',
      spaceType: 'villa',
      areaSize: 48,
      budget: '5,000만원대',
      spaceTypes: ['거실', '주방', '안방', '드레스룸'],
      styles: ['북유럽'],
      additionalRequests: '아이 방을 따로 꾸며주세요.',
      status: 'completed',
      progressPercent: 100,
      updates: [
        ...sampleUpdates.slice(0, 4),
        pu({ at: iso(15), category: 'milestone', title: '공사 완료 및 인도', message: '고객님과 함께 최종 점검을 마쳤습니다.' }),
      ],
      review: review1,
      contractAmount: 54000000,
      managerId: 'admin',
      shareToken: 'demo-tk-dy02-0000-0002-bbbb-bbbbbbbbbbbb',
    },
    {
      id: 'qt_demo_003',
      createdAt: iso(45),
      customerName: '박서준',
      phone: '010-2222-3333',
      region: '서울 마포구 연남동',
      spaceType: 'apartment',
      areaSize: 24,
      budget: '2,000만원대',
      spaceTypes: ['거실', '서재'],
      styles: ['미니멀'],
      status: 'completed',
      progressPercent: 100,
      updates: [
        ...sampleUpdates.slice(0, 3),
        pu({ at: iso(30), category: 'milestone', title: '공사 완료' }),
      ],
      review: review2,
      contractAmount: 21500000,
      managerId: 'admin',
      shareToken: 'demo-tk-sj03-0000-0003-cccc-cccccccccccc',
    },
    {
      id: 'qt_demo_004',
      createdAt: iso(1),
      customerName: '정유진',
      phone: '010-5555-6666',
      region: '서울 송파구 잠실동',
      spaceType: 'apartment',
      areaSize: 28,
      budget: '3,000만원대',
      spaceTypes: ['거실', '주방'],
      styles: ['모던', '내추럴'],
      status: 'received',
      progressPercent: 5,
      updates: [
        pu({
          at: iso(1),
          category: 'milestone',
          title: '견적 요청이 접수되었습니다',
          message: '담당자가 24시간 내로 연락드립니다.',
        }),
      ],
      managerId: 'admin',
      shareToken: 'demo-tk-yj04-0000-0004-dddd-dddddddddddd',
    },
    {
      id: 'qt_demo_005',
      createdAt: iso(3),
      customerName: '최하늘',
      phone: '010-7777-8888',
      region: '서울 용산구 이촌동',
      spaceType: 'house',
      areaSize: 60,
      budget: '7,000만원대',
      spaceTypes: ['거실', '주방', '안방', '욕실', '드레스룸'],
      styles: ['클래식', '내추럴'],
      status: 'in_progress',
      progressPercent: 40,
      updates: sampleUpdates.slice(0, 5),
      contractAmount: 72000000,
      managerId: 'admin',
      shareToken: 'demo-tk-hn05-0000-0005-eeee-eeeeeeeeeeee',
    },
  ];
}

export function seedPortfolio(): PortfolioItem[] {
  return [
    {
      id: 'pf_001',
      title: '청담 더 라운지',
      category: 'residential',
      spaceType: '아파트 32평',
      area: 32,
      location: '서울 강남구 청담동',
      year: 2024,
      durationWeeks: 8,
      budget: '3,200만원',
      description: '우드 톤과 라운지형 가구로 따뜻하면서도 도시적인 감각을 살린 거실 인테리어.',
            images: ['https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=1200&q=80&auto=format&fit=crop', 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80&auto=format&fit=crop'],
  coverColor: '#0B3D91',
      coverAccent: '#C9A961',
      tags: ['거실', '모던', '우드'],
      featured: true,
      published: true,
      createdAt: iso(60),
    },
    {
      id: 'pf_002',
      title: '분당 북유러운 가족집',
      category: 'residential',
      spaceType: '빌라 48평',
      area: 48,
      location: '경기 성남시 분당구',
      year: 2024,
      durationWeeks: 10,
      budget: '5,400만원',
      description: '4인 가족을 위한 따뜻한 톤의 북유럽 스타일, 아이 방까지 자연스럽게 연결.',
            images: ['https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1200&q=80&auto=format&fit=crop', 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200&q=80&auto=format&fit=crop'],
  coverColor: '#1F8A55',
      coverAccent: '#FFD479',
      tags: ['주방', '북유럽', '가족'],
      featured: true,
      published: true,
      createdAt: iso(120),
    },
    {
      id: 'pf_003',
      title: '연남 미니멀 스튜디오',
      category: 'residential',
      spaceType: '원룸 18평',
      area: 18,
      location: '서울 마포구 연남동',
      year: 2025,
      durationWeeks: 4,
      budget: '1,600만원',
      description: '1인 가구를 위한 절제된 미니멀 디자인, 수납과 모션 라인을 동시에.',
            images: ['https://images.unsplash.com/photo-1631679706909-1844bbd07221?w=1200&q=80&auto=format&fit=crop'],
  coverColor: '#1A1D24',
      coverAccent: '#E08A1F',
      tags: ['원룸', '미니멀', '수납'],
      featured: false,
      published: true,
      createdAt: iso(90),
    },
    {
      id: 'pf_004',
      title: '성수 카페 리모델링',
      category: 'commercial',
      spaceType: '상가 22평',
      area: 22,
      location: '서울 성동구 성수동',
      year: 2025,
      durationWeeks: 6,
      budget: '2,800만원',
      description: '고객 동선을 고려한 동선과 좌석 배치, 따뜻한 우드 + 브릭 조합.',
            images: ['https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=1200&q=80&auto=format&fit=crop', 'https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=1200&q=80&auto=format&fit=crop'],
      coverColor: '#8A5A00',
      coverAccent: '#FFE2E2',
      tags: ['상업', '카페', '리모델링'],
      featured: true,
      published: true,
      createdAt: iso(40),
    },
    {
      id: 'pf_005',
      title: '판교 오피스 라운지',
      category: 'office',
      spaceType: '오피스 80평',
      area: 80,
      location: '경기 성남시 판교',
      year: 2024,
      durationWeeks: 14,
      budget: '9,800만원',
      description: '직원 wellness를 위한 라운지, 포커스룸, 카폐터 영역 동선 분리.',
            images: ['https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&q=80&auto=format&fit=crop'],
      coverColor: '#1F6FAA',
      coverAccent: '#D9F0E2',
      tags: ['오피스', '라운지', '웰니스'],
      featured: false,
      published: true,
      createdAt: iso(200),
    },
    {
      id: 'pf_006',
      title: '잠실 주방 리모델링',
      category: 'partial',
      spaceType: '아파트 28평',
      area: 28,
      location: '서울 송파구 잠실동',
      year: 2025,
      durationWeeks: 3,
      budget: '1,200만원',
      description: '타일·싱크대·냉장고 일체 교체, 식기세척기 신규 설치.',
            images: ['https://images.unsplash.com/photo-1556909172-54557c7e4fb7?w=1200&q=80&auto=format&fit=crop'],
      coverColor: '#C93535',
      coverAccent: '#FFF4D9',
      tags: ['주방', '부분시공'],
      featured: false,
      published: true,
      createdAt: iso(20),
    },
  ];
}

// ============================================================
//  Consultation 시드 — 어드민이 처음 진입했을 때 빈 화면이
//  되지 않도록 데모용 상담 4건 + 활동 로그 / 첨부 / 링크를
//  함께 제공합니다. 로컬 모드(localStorage) 에서만 보이며,
//  ForgeDB 모드에서는 서버 데이터가 우선합니다.
// ============================================================

export interface SeedConsultationBundle {
  consultations: Consultation[];
  logs: Record<string, ConsultationLog[]>;
  files: Record<string, ConsultationFile[]>;
  links: Record<string, ReferenceLink[]>;
}

function isoFull(daysAgo: number, hour = 10, min = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, min, 0, 0);
  return d.toISOString();
}

function mkShareToken(): string {
  return `shr_${Math.random().toString(36).slice(2, 10)}${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

export function seedConsultations(): SeedConsultationBundle {
  const c1: Consultation = {
    id: 'cs_seed_001',
    createdAt: isoFull(0, 9, 30),
    updatedAt: isoFull(0, 11, 5),
    name: '김민지',
    phone: '01012345678',
    email: 'minji.kim@example.com',
    apartment: '래미안 원베일리 1101동 1502호',
    contactPrefs: ['morning', 'afternoon'],
    moveIn: '1_3m',
    budget: 'budget_150',
    remodelScope: 'partial',
    remodelAreas: ['주방가구', '거실', '안방욕실', '조명'],
    supplyArea: 32,
    status: 'received',
    assignedAdmin: undefined,
    adminMemo: '',
    shareToken: mkShareToken(),
  };
  const c2: Consultation = {
    id: 'cs_seed_002',
    createdAt: isoFull(1, 14, 12),
    updatedAt: isoFull(1, 14, 12),
    name: '박준호',
    phone: '01098765432',
    email: 'junho.park@example.com',
    apartment: '동탄 롯데캐슬 203동 804호',
    contactPrefs: ['evening'],
    moveIn: 'within_1m',
    budget: 'budget_200_plus',
    remodelScope: 'full',
    remodelAreas: [],
    supplyArea: 28,
    status: 'contacted',
    assignedAdmin: 'admin_choi',
    adminMemo: '저녁 7시 이후 통화 가능. 빠른 진행 선호.',
    shareToken: mkShareToken(),
  };
  const c3: Consultation = {
    id: 'cs_seed_003',
    createdAt: isoFull(3, 16, 40),
    updatedAt: isoFull(2, 10, 15),
    name: '이수영',
    phone: '01055667788',
    email: undefined,
    apartment: '힐스테이트 평촌 305동 1101호',
    contactPrefs: ['any'],
    moveIn: 'after_3m',
    budget: 'budget_100',
    remodelScope: 'styling',
    remodelAreas: ['도배', '바닥', '조명'],
    supplyArea: 24,
    status: 'consulting',
    assignedAdmin: 'admin_lee',
    adminMemo: '스타일링 시공 — 도배/바닥 위주. 예산 협의 필요.',
    shareToken: mkShareToken(),
  };
  const c4: Consultation = {
    id: 'cs_seed_004',
    createdAt: isoFull(7, 11, 0),
    updatedAt: isoFull(4, 9, 30),
    name: '정유진',
    phone: '01033445566',
    email: 'yujin.jung@example.com',
    apartment: '자곡 래미안 108동 502호',
    contactPrefs: ['morning'],
    moveIn: '1_3m',
    budget: 'budget_150',
    remodelScope: 'partial',
    remodelAreas: ['아트월', '현관', 'ROOM 1', 'ROOM 2'],
    supplyArea: 36,
    status: 'proposal',
    assignedAdmin: 'admin_park',
    adminMemo: '제안서 발송 완료. 피드백 대기 중.',
    shareToken: mkShareToken(),
  };
  const consultations = [c1, c2, c3, c4];

  const logs: Record<string, ConsultationLog[]> = {
    cs_seed_001: [
      {
        id: 'cl_seed_001_a',
        consultationId: 'cs_seed_001',
        actorName: 'System',
        eventType: 'created',
        createdAt: c1.createdAt,
      },
    ],
    cs_seed_002: [
      {
        id: 'cl_seed_002_a',
        consultationId: 'cs_seed_002',
        actorName: 'System',
        eventType: 'created',
        createdAt: c2.createdAt,
      },
      {
        id: 'cl_seed_002_b',
        consultationId: 'cs_seed_002',
        actorName: 'Admin',
        eventType: 'status_changed',
        payload: { status: 'contacted' },
        createdAt: c2.updatedAt,
      },
    ],
    cs_seed_003: [
      {
        id: 'cl_seed_003_a',
        consultationId: 'cs_seed_003',
        actorName: 'System',
        eventType: 'created',
        createdAt: c3.createdAt,
      },
      {
        id: 'cl_seed_003_b',
        consultationId: 'cs_seed_003',
        actorName: 'Admin',
        eventType: 'assigned',
        payload: { adminId: 'admin_lee' },
        createdAt: c3.createdAt,
      },
      {
        id: 'cl_seed_003_c',
        consultationId: 'cs_seed_003',
        actorName: 'Admin',
        eventType: 'status_changed',
        payload: { status: 'consulting' },
        createdAt: c3.updatedAt,
      },
    ],
    cs_seed_004: [
      {
        id: 'cl_seed_004_a',
        consultationId: 'cs_seed_004',
        actorName: 'System',
        eventType: 'created',
        createdAt: c4.createdAt,
      },
      {
        id: 'cl_seed_004_b',
        consultationId: 'cs_seed_004',
        actorName: 'Admin',
        eventType: 'assigned',
        payload: { adminId: 'admin_park' },
        createdAt: c4.createdAt,
      },
      {
        id: 'cl_seed_004_c',
        consultationId: 'cs_seed_004',
        actorName: 'Admin',
        eventType: 'status_changed',
        payload: { status: 'proposal' },
        createdAt: c4.updatedAt,
      },
    ],
  };

  const files: Record<string, ConsultationFile[]> = {
    cs_seed_003: [
      {
        id: 'cf_seed_003_a',
        consultationId: 'cs_seed_003',
        fileType: 'site_photo',
        storagePath: 'local://cs_seed_003/거실_현장.jpg',
        originalName: '거실_현장.jpg',
        uploadedBy: 'admin_lee',
        createdAt: isoFull(2, 12, 0),
      },
    ],
  };

  const links: Record<string, ReferenceLink[]> = {
    cs_seed_004: [
      {
        id: 'rl_seed_004_a',
        consultationId: 'cs_seed_004',
        url: 'https://www.instagram.com/p/Cxxxxxx',
        category: 'instagram',
        label: '고객 레퍼런스 — 우드 아트월',
        addedBy: 'admin_park',
        createdAt: isoFull(5, 14, 0),
      },
      {
        id: 'rl_seed_004_b',
        consultationId: 'cs_seed_004',
        url: 'https://pin.it/abcd1234',
        category: 'pinterest',
        label: '현관 인테리어 무드',
        addedBy: 'admin_park',
        createdAt: isoFull(5, 14, 5),
      },
    ],
  };

  return { consultations, logs, files, links };
}
