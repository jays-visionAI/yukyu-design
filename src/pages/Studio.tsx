import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header, Footer } from '../components/Layout';
import StudioRenderer from '../components/StudioRenderer';
import SpatialRenderer from '../components/SpatialRenderer';
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

        {/* ============================================================
           제안서 — 공간들 (닥꽁노트 제안서 스타일)
           · 선택한 평면의 각 방(거실/주방/침실/욕실/다용도실) 을
             카드 그리드로 나열하고, 각 공간의 평면 + 가구 시안을
             컨셉에 맞춰 미리 보여줍니다.
           ============================================================ */}
        <section className="studio-rooms" aria-label="공간별 시안">
          <header className="studio-rooms__header">
            <div>
              <p className="studio-eyebrow">PROPOSAL — ROOMS</p>
              <h2>공간들</h2>
              <p className="studio-rooms__lead">
                {selectedApartment.name} · {selectedUnit.name} 평면을 {selectedConcept.name} 컨셉으로 재구성한 결과입니다.
                각 공간을 클릭하면 해당 영역으로 강조됩니다.
              </p>
            </div>
            <div className="studio-rooms__meta">
              <span><strong>{selectedUnit.plan.rooms.length}</strong>개 공간</span>
              <span><strong>{selectedUnit.area}</strong>㎡</span>
              <span><strong>{selectedUnit.bedrooms}</strong>Bed · <strong>{selectedUnit.bathrooms}</strong>Bath</span>
            </div>
          </header>

          <div className="studio-rooms__grid">
            {selectedUnit.plan.rooms.map((room) => (
              <article
                key={room.id}
                className={`studio-room studio-room--${room.kind}${generated ? ' is-generated' : ''}`}
              >
                <div className="studio-room__media">
                  <SpatialRenderer room={room} concept={concept} generated={generated} />
                </div>
                <div className="studio-room__body">
                  <div className="studio-room__head">
                    <span className={`studio-room__kind studio-room__kind--${room.kind}`}>
                      {room.kind === 'living' && '거실'}
                      {room.kind === 'kitchen' && '주방'}
                      {room.kind === 'bedroom' && (room.name.includes('안방') ? '안방' : '침실')}
                      {room.kind === 'bathroom' && '욕실'}
                      {room.kind === 'utility' && '다용도실'}
                    </span>
                    <strong>{room.name}</strong>
                  </div>
                  <dl className="studio-room__spec">
                    <div><dt>면적</dt><dd>{(room.width * room.depth).toFixed(1)}㎡</dd></div>
                    <div><dt>가로</dt><dd>{room.width.toFixed(1)}m</dd></div>
                    <div><dt>세로</dt><dd>{room.depth.toFixed(1)}m</dd></div>
                    <div><dt>천장</dt><dd>{room.height.toFixed(2)}m</dd></div>
                  </dl>
                  <p className="studio-room__desc">
                    {room.kind === 'living' && '소파·테이블·TV를 벽면과 도어 정렬로 배치해 동선 폭을 확보합니다.'}
                    {room.kind === 'kitchen' && '싱크대·아일랜드·냉장고를 삼각 동선으로 배치하고 식사 공간과 분리합니다.'}
                    {room.kind === 'bedroom' && '침대·협탁·衣柜를 직각 정렬해 수납과 통행을 동시에 확보합니다.'}
                    {room.kind === 'bathroom' && '세면대·변기·욕조를 결로 방지 배선으로 분리해 결로·누수를 차단합니다.'}
                    {room.kind === 'utility' && '세탁기·건조기·수납장을 일렬 정렬해 동선을 단축시킵니다.'}
                  </p>
                  <ul className="studio-room__chips" aria-label="적용 마감재">
                    {room.kind === 'living' && (
                      <>
                        <li>{selectedConcept.id === 'warm' ? '오크 원목' : selectedConcept.id === 'modern' ? '스톤 그레이' : '린넨 베이지'}</li>
                        <li>간접조명 3000K</li>
                      </>
                    )}
                    {room.kind === 'kitchen' && (
                      <>
                        <li>인조대리석 상판</li>
                        <li>매트 그레이 도어</li>
                      </>
                    )}
                    {room.kind === 'bedroom' && (
                      <>
                        <li>강화 마루</li>
                        <li>흡음 벽지</li>
                        <li>시스템 衣柜</li>
                      </>
                    )}
                    {room.kind === 'bathroom' && (
                      <>
                        <li>포세린 타일 600×600</li>
                        <li>방수 도막</li>
                      </>
                    )}
                    {room.kind === 'utility' && (
                      <>
                        <li>슬립 방수 시트</li>
                        <li>제습 환기팬</li>
                      </>
                    )}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        </section>

        <div className="studio-quote-cta">
          <div><strong>이 컨셉으로 실제 견적을 받아볼까요?</strong><p>선택한 아파트, 유닛 타입과 컨셉을 견적 상담에 함께 전달합니다.</p></div>
          <Link to={quotePath} className="btn btn-accent">견적 신청으로 이어가기 →</Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
