export interface StudioUnit {
  id: string;
  name: string;
  area: number;
  bedrooms: number;
  bathrooms: number;
  plan: StudioPlan;
}

export interface StudioApartment {
  id: string;
  brand: string;
  name: string;
  location: string;
  units: StudioUnit[];
}

export interface StudioPlan {
  width: number;
  depth: number;
  rooms: StudioRoom[];
}

export interface StudioRoom {
  id: string;
  name: string;
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  kind: 'living' | 'kitchen' | 'bedroom' | 'bathroom' | 'utility';
}

export const STUDIO_APARTMENTS: StudioApartment[] = [
  {
    id: 'raemian-one-bailey',
    brand: '래미안',
    name: '래미안 원베일리',
    location: '서울 서초구 반포동',
    units: [
      {
        id: 'rb-59a', name: '59㎡ A타입', area: 59, bedrooms: 3, bathrooms: 2,
        plan: {
          width: 10.4, depth: 8.2,
          rooms: [
            { id: 'living', name: '거실', x: 0, z: 0, width: 5.8, depth: 4.2, height: 2.4, kind: 'living' },
            { id: 'kitchen', name: '주방', x: 5.8, z: 0, width: 4.6, depth: 3.1, height: 2.4, kind: 'kitchen' },
            { id: 'bed-1', name: '안방', x: 0, z: 4.2, width: 4, depth: 4, height: 2.4, kind: 'bedroom' },
            { id: 'bed-2', name: '침실 2', x: 4, z: 4.2, width: 3.2, depth: 4, height: 2.4, kind: 'bedroom' },
            { id: 'bath', name: '욕실', x: 7.2, z: 3.1, width: 3.2, depth: 2.5, height: 2.4, kind: 'bathroom' },
            { id: 'utility', name: '다용도실', x: 7.2, z: 5.6, width: 3.2, depth: 2.6, height: 2.4, kind: 'utility' },
          ],
        },
      },
      {
        id: 'rb-84a', name: '84㎡ A타입', area: 84, bedrooms: 3, bathrooms: 2,
        plan: {
          width: 12.8, depth: 9.2,
          rooms: [
            { id: 'living', name: '거실', x: 0, z: 0, width: 7, depth: 4.8, height: 2.45, kind: 'living' },
            { id: 'kitchen', name: '주방', x: 7, z: 0, width: 5.8, depth: 3.5, height: 2.45, kind: 'kitchen' },
            { id: 'bed-1', name: '안방', x: 0, z: 4.8, width: 4.8, depth: 4.4, height: 2.45, kind: 'bedroom' },
            { id: 'bed-2', name: '침실 2', x: 4.8, z: 4.8, width: 3.8, depth: 4.4, height: 2.45, kind: 'bedroom' },
            { id: 'bed-3', name: '침실 3', x: 8.6, z: 3.5, width: 4.2, depth: 3.2, height: 2.45, kind: 'bedroom' },
            { id: 'bath', name: '욕실', x: 8.6, z: 6.7, width: 2.1, depth: 2.5, height: 2.45, kind: 'bathroom' },
            { id: 'utility', name: '다용도실', x: 10.7, z: 6.7, width: 2.1, depth: 2.5, height: 2.45, kind: 'utility' },
          ],
        },
      },
    ],
  },
  {
    id: 'xi-dh-honors-hills',
    brand: '자이',
    name: '디에이치 아너힐즈',
    location: '서울 강남구 개포동',
    units: [
      {
        id: 'xi-84a', name: '84㎡ 4Bay', area: 84, bedrooms: 3, bathrooms: 2,
        plan: {
          width: 13.2, depth: 8.8,
          rooms: [
            { id: 'living', name: '거실', x: 0, z: 0, width: 7.4, depth: 4.5, height: 2.5, kind: 'living' },
            { id: 'kitchen', name: '주방', x: 7.4, z: 0, width: 5.8, depth: 3.3, height: 2.5, kind: 'kitchen' },
            { id: 'bed-1', name: '안방', x: 0, z: 4.5, width: 4.5, depth: 4.3, height: 2.5, kind: 'bedroom' },
            { id: 'bed-2', name: '침실 2', x: 4.5, z: 4.5, width: 4.1, depth: 4.3, height: 2.5, kind: 'bedroom' },
            { id: 'bed-3', name: '침실 3', x: 8.6, z: 3.3, width: 4.6, depth: 3.2, height: 2.5, kind: 'bedroom' },
            { id: 'bath', name: '욕실', x: 8.6, z: 6.5, width: 2.3, depth: 2.3, height: 2.5, kind: 'bathroom' },
            { id: 'utility', name: '다용도실', x: 10.9, z: 6.5, width: 2.3, depth: 2.3, height: 2.5, kind: 'utility' },
          ],
        },
      },
      {
        id: 'xi-101', name: '101㎡ 판상형', area: 101, bedrooms: 4, bathrooms: 2,
        plan: {
          width: 14.5, depth: 9.6,
          rooms: [
            { id: 'living', name: '거실', x: 0, z: 0, width: 8, depth: 5, height: 2.5, kind: 'living' },
            { id: 'kitchen', name: '주방', x: 8, z: 0, width: 6.5, depth: 3.6, height: 2.5, kind: 'kitchen' },
            { id: 'bed-1', name: '안방', x: 0, z: 5, width: 4.8, depth: 4.6, height: 2.5, kind: 'bedroom' },
            { id: 'bed-2', name: '침실 2', x: 4.8, z: 5, width: 3.7, depth: 4.6, height: 2.5, kind: 'bedroom' },
            { id: 'bed-3', name: '침실 3', x: 8.5, z: 3.6, width: 3, depth: 3, height: 2.5, kind: 'bedroom' },
            { id: 'bed-4', name: '침실 4', x: 11.5, z: 3.6, width: 3, depth: 3, height: 2.5, kind: 'bedroom' },
            { id: 'bath', name: '욕실', x: 8.5, z: 6.6, width: 3, depth: 3, height: 2.5, kind: 'bathroom' },
            { id: 'utility', name: '다용도실', x: 11.5, z: 6.6, width: 3, depth: 3, height: 2.5, kind: 'utility' },
          ],
        },
      },
    ],
  },
  {
    id: 'hillstate-songdo',
    brand: '힐스테이트',
    name: '힐스테이트 송도 더스카이',
    location: '인천 연수구 송도동',
    units: [
      {
        id: 'hs-84a', name: '84㎡ A타입', area: 84, bedrooms: 3, bathrooms: 2,
        plan: {
          width: 12.5, depth: 9.4,
          rooms: [
            { id: 'living', name: '거실', x: 0, z: 0, width: 7.2, depth: 4.7, height: 2.45, kind: 'living' },
            { id: 'kitchen', name: '주방', x: 7.2, z: 0, width: 5.3, depth: 3.6, height: 2.45, kind: 'kitchen' },
            { id: 'bed-1', name: '안방', x: 0, z: 4.7, width: 4.5, depth: 4.7, height: 2.45, kind: 'bedroom' },
            { id: 'bed-2', name: '침실 2', x: 4.5, z: 4.7, width: 3.6, depth: 4.7, height: 2.45, kind: 'bedroom' },
            { id: 'bed-3', name: '침실 3', x: 8.1, z: 3.6, width: 4.4, depth: 3.4, height: 2.45, kind: 'bedroom' },
            { id: 'bath', name: '욕실', x: 8.1, z: 7, width: 2.2, depth: 2.4, height: 2.45, kind: 'bathroom' },
            { id: 'utility', name: '다용도실', x: 10.3, z: 7, width: 2.2, depth: 2.4, height: 2.45, kind: 'utility' },
          ],
        },
      },
    ],
  },
];
