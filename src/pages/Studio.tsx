import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header, Footer } from '../components/Layout';
import StudioRenderer from '../components/StudioRenderer';
import { getForge, isForgeConfigured } from '../data/forgeClient';
import { STUDIO_APARTMENTS, type StudioApartment } from '../data/studio';

const CONCEPTS = [
  { id: 'warm', name: '웜 내추럴', description: '오크 우드 · 크림 벽 · 부드러운 간접조명', color: '#c99b6b' },
  { id: 'modern', name: '모던 미니멀', description: '웜화이트 · 스톤 · 브러시드 메탈', color: '#8b9298' },
  { id: 'calm', name: '차분한 뉴트럴', description: '샌드 베이지 · 린넨 · 낮은 채도의 가구', color: '#b9a997' },
];

interface ApartmentRow {
  id: string;
  brand: string;
  name: string;
  location: string;
  apartment_units?: Array<{
    id: string;
    name: string;
    area: number;
    bedrooms: number;
    bathrooms: number;
    plan: StudioApartment['units'][number]['plan'];
  }>;
}

function mapApartment(row: ApartmentRow): StudioApartment {
  return {
    id: row.id,
    brand: row.brand,
    name: row.name,
    location: row.location,
    units: (row.apartment_units ?? []).map((unit) => ({
      id: unit.id,
      name: unit.name,
      area: unit.area,
      bedrooms: unit.bedrooms,
      bathrooms: unit.bathrooms,
      plan: unit.plan,
    })),
  };
}

export default function Studio() {
  const [apartments, setApartments] = useState(STUDIO_APARTMENTS);
  const [apartmentId, setApartmentId] = useState(STUDIO_APARTMENTS[0].id);
  const [unitId, setUnitId] = useState(STUDIO_APARTMENTS[0].units[1].id);
  const [concept, setConcept] = useState(CONCEPTS[0].id);
  const [generated, setGenerated] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (!isForgeConfigured) return;
    let cancelled = false;
    getForge()
      .from('apartments')
      .select('id, brand, name, location, apartment_units(id, name, area, bedrooms, bathrooms, plan)')
      .order('brand')
      .then(({ data, error }) => {
        if (cancelled || error || !data?.length) return;
        const next = (data as ApartmentRow[]).map(mapApartment).filter((item) => item.units.length > 0);
        if (!next.length) return;
        setApartments(next);
        setApartmentId(next[0].id);
        setUnitId(next[0].units[0].id);
      });
    return () => { cancelled = true; };
  }, []);

  const selectedApartment = useMemo(
    () => apartments.find((item) => item.id === apartmentId) ?? apartments[0],
    [apartmentId, apartments]
  );
  const selectedUnit = selectedApartment.units.find((item) => item.id === unitId) ?? selectedApartment.units[0];
  const selectedConcept = CONCEPTS.find((item) => item.id === concept) ?? CONCEPTS[0];
  const quotePath = `/quote?studioApartment=${encodeURIComponent(selectedApartment.name)}&studioUnit=${encodeURIComponent(selectedUnit.name)}&studioConcept=${encodeURIComponent(selectedConcept.name)}`;

  function changeApartment(value: string) {
    const next = apartments.find((item) => item.id === value) ?? apartments[0];
    setApartmentId(next.id);
    setUnitId(next.units[0].id);
    setGenerated(false);
  }

  function generate() {
    setIsGenerating(true);
    setGenerated(false);
    window.setTimeout(() => {
      setGenerated(true);
      setIsGenerating(false);
    }, 900);
  }

  return (
    <>
      <Header />
      <main className="container studio-page">
        <div className="studio-intro">
          <p className="studio-eyebrow">YUKYU STUDIO</p>
          <h1>우리 집에 어울리는 인테리어를 먼저 만나보세요</h1>
          <p>아파트와 표준 유닛 타입, 원하는 컨셉을 선택하면 실제 평면 데이터를 바탕으로 3D 공간을 자동 생성합니다.</p>
        </div>
        <div className="studio-layout">
          <section className="card studio-controls" aria-label="시안 설정">
            <label className="field-label" htmlFor="apartment">아파트 이름</label>
            <select id="apartment" className="input" value={apartmentId} onChange={(event) => changeApartment(event.target.value)}>
              {apartments.map((item) => <option key={item.id} value={item.id}>{item.brand} · {item.name}</option>)}
            </select>
            <p className="studio-location">{selectedApartment.location}</p>

            <label className="field-label" htmlFor="unit">유닛 타입</label>
            <select id="unit" className="input" value={unitId} onChange={(event) => { setUnitId(event.target.value); setGenerated(false); }}>
              {selectedApartment.units.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <div className="studio-unit-meta">
              <span>전용 {selectedUnit.area}㎡</span><span>방 {selectedUnit.bedrooms}</span><span>욕실 {selectedUnit.bathrooms}</span>
            </div>

            <fieldset className="studio-concepts">
              <legend className="field-label">인테리어 컨셉</legend>
              <div>
                {CONCEPTS.map((item) => (
                  <label key={item.id} className={concept === item.id ? 'is-selected' : ''}>
                    <input type="radio" name="concept" value={item.id} checked={concept === item.id} onChange={() => { setConcept(item.id); setGenerated(false); }} />
                    <span className="studio-swatch" style={{ background: item.color }} />
                    <span><strong>{item.name}</strong><small>{item.description}</small></span>
                  </label>
                ))}
              </div>
            </fieldset>
            <button type="button" className="btn btn-primary btn-lg btn-block" onClick={generate} disabled={isGenerating}>
              {isGenerating ? '공간과 재질을 생성하는 중…' : '3D 시안 생성하기'}
            </button>
            <p className="studio-note">표준 유닛의 방 위치와 치수를 기반으로 벽체, 바닥, 가구 및 컨셉 재질을 자동 구성합니다.</p>
          </section>

          <section className="studio-preview" aria-live="polite" aria-busy={isGenerating}>
            <StudioRenderer plan={selectedUnit.plan} concept={concept} generated={generated} label={`${selectedApartment.name} ${selectedUnit.name}`} />
            <div className="studio-preview__caption">
              <div><strong>{selectedConcept.name}</strong><span>{selectedApartment.name} · {selectedUnit.name}</span></div>
              {generated && <span className="badge badge-done">렌더링 완료</span>}
            </div>
          </section>
        </div>

        <div className="studio-quote-cta">
          <div><strong>이 컨셉으로 실제 견적을 받아볼까요?</strong><p>선택한 아파트, 유닛 타입과 컨셉을 견적 상담에 함께 전달합니다.</p></div>
          <Link to={quotePath} className="btn btn-accent">견적 신청으로 이어가기 →</Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
