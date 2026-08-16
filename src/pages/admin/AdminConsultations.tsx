import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useData } from '../../data/DataContext';
import { useToast } from '../../components/Toast';
import {
  CONSULTATION_STATUS_LABEL,
  BUDGET_LABEL,
  MOVE_IN_LABEL,
  SCOPE_LABEL,
  type Consultation,
  type ConsultationFile,
  type ConsultationStatus,
  type ContactPref,
  type ReferenceLink,
} from '../../data/consultation';
// ============================================================
//  어드민 — 상담 관리 (목록 + 상세 통합)
//  · AdminQuotes 와 동일 패턴: 좌측 테이블 / 우측 슬라이드 상세 패널
//  · 상세 3탭: 고객 정보 / 활동 & 메모 / 진행 & 일정
// ============================================================

const STATUS_FILTERS: { value: ConsultationStatus | 'all'; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'received', label: '신규' },
  { value: 'contacted', label: '연락완료' },
  { value: 'consulting', label: '상담중' },
  { value: 'proposal', label: '제안서발송' },
  { value: 'contracted', label: '계약' },
  { value: 'on_hold', label: '보류' },
  { value: 'cancelled', label: '취소' },
  { value: 'completed', label: '완료' },
];

const ASSIGNABLE_ADMINS: { id: string; name: string }[] = [
  { id: 'admin', name: '기본 관리자' },
  { id: 'admin_choi', name: '최실장' },
  { id: 'admin_lee', name: '이매니저' },
  { id: 'admin_park', name: '박매니저' },
];

export default function AdminConsultations() {
  const { consultations, consultationLogs, backendMode, deleteConsultation } = useData();
  const toast = useToast();
  const navigate = useNavigate();
  const { id: routeId } = useParams();
  const [filter, setFilter] = useState<ConsultationStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (routeId) setSelectedId(routeId);
  }, [routeId]);

  const filtered = useMemo(() => {
    return consultations
      .filter((c) => (filter === 'all' ? true : c.status === filter))
      .filter((c) => {
        if (!search.trim()) return true;
        const s = search.trim().toLowerCase();
        return (
          c.name.toLowerCase().includes(s) ||
          c.phone.includes(s) ||
          c.apartment.toLowerCase().includes(s) ||
          c.id.toLowerCase().includes(s)
        );
      })
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }, [consultations, filter, search]);

  function select(id: string) {
    setSelectedId(id);
    navigate(`/admin/consultations/${id}`, { replace: true });
  }

  function downloadCsv() {
    const rows: (string | number)[][] = [
      [
        '접수번호',
        '접수일',
        '고객명',
        '연락처',
        '이메일',
        '아파트',
        '연락시간',
        '일정',
        '예산',
        '스코프',
        '희망구역',
        '공급평형',
        '상태',
        '담당자',
        '메모',
      ],
      ...filtered.map((c) => [
        c.id.slice(-8).toUpperCase(),
        c.createdAt,
        c.name,
        c.phone,
        c.email ?? '',
        c.apartment,
        c.contactPrefs.join('/'),
        c.moveIn ? MOVE_IN_LABEL[c.moveIn] : '',
        c.budget ? BUDGET_LABEL[c.budget] : '',
        c.remodelScope ? SCOPE_LABEL[c.remodelScope] : '',
        c.remodelAreas.join('/'),
        c.supplyArea ?? '',
        CONSULTATION_STATUS_LABEL[c.status],
        ASSIGNABLE_ADMINS.find((a) => a.id === c.assignedAdmin)?.name ?? '',
        c.adminMemo ?? '',
      ]),
    ];
    const escape = (c: string | number) =>
      `="${String(c ?? '').replace(/"/g, '""')}"`;
    const csv = rows
      .map((r) => r.map((v) => escape(typeof v === 'number' ? String(v) : v)).join(','))
      .join('\n');
    const blob = new Blob(['\ufeff' + csv], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `yukyu_consultations_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV 다운로드 완료');
  }

  function clearAll() {
    if (backendMode === 'forgedb') {
      toast.push('ForgeDB 콘솔 SQL Editor 에서 DELETE FROM public.consultations 실행 후 DELETE FROM public.consultation_logs 를 실행해 주세요.');
      return;
    }
    if (!confirm('로컬 상담 데이터를 초기화합니다. 되돌릴 수 없습니다.')) return;
    consultations.forEach((c) => deleteConsultation(c.id));
    toast.success('초기화되었습니다.');
  }

  const selected = selectedId
    ? consultations.find((c) => c.id === selectedId) ?? null
    : null;

  return (
    <div style={{ padding: '32px 36px' }}>
      <div
        className="row-between"
        style={{ marginBottom: 24, flexWrap: 'wrap', gap: 12 }}
      >
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)' }}>상담 관리</h1>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            신규로 접수된 고객 상담을 검색·배정·진행 관리합니다.
          </p>
        </div>
        <div className="row">
          <button className="btn btn-outline btn-sm" onClick={downloadCsv}>
            ⬇ CSV 다운로드
          </button>
          <button className="btn btn-ghost btn-sm" onClick={clearAll}>
            데모 데이터 초기화
          </button>
        </div>
      </div>

      <div className="card card-tight">
        <div
          className="row-between"
          style={{ marginBottom: 16, gap: 12, flexWrap: 'wrap' }}
        >
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                className={`check-pill ${filter === f.value ? 'checked' : ''}`}
                onClick={() => setFilter(f.value)}
                style={{ cursor: 'pointer' }}
              >
                {f.label}
                <span
                  style={{
                    marginLeft: 6,
                    color: 'var(--color-text-tertiary)',
                    fontSize: 12,
                  }}
                >
                  {f.value === 'all'
                    ? consultations.length
                    : consultations.filter((c) => c.status === f.value).length}
                </span>
              </button>
            ))}
          </div>
          <input
            className="input"
            style={{ width: 280 }}
            placeholder="이름/연락처/아파트/접수번호 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="table-wrap">
          <table className="consult-admin-table">
            <thead>
              <tr>
                <th>접수번호</th>
                <th>고객명</th>
                <th>연락처</th>
                <th>아파트</th>
                <th>일정 · 예산</th>
                <th>스코프</th>
                <th>상태</th>
                <th>접수일</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    style={{
                      padding: 40,
                      textAlign: 'center',
                      color: 'var(--color-text-tertiary)',
                    }}
                  >
                    조건에 맞는 상담이 없습니다.
                  </td>
                </tr>
              )}
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => select(c.id)}
                  className={selectedId === c.id ? 'is-selected' : ''}
                >
                  <td
                    style={{
                      fontFamily: 'var(--font-family-num)',
                      fontSize: 12,
                      color: 'var(--color-text-tertiary)',
                    }}
                  >
                    {c.id.slice(-8).toUpperCase()}
                  </td>
                  <td style={{ fontWeight: 600 }}>{c.name}</td>
                  <td>{c.phone}</td>
                  <td
                    style={{
                      maxWidth: 200,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {c.apartment}
                  </td>
                  <td>
                    <div>{c.moveIn ? MOVE_IN_LABEL[c.moveIn] : '—'}</div>
                    <div
                      style={{
                        fontSize: 12,
                        color: 'var(--color-text-tertiary)',
                      }}
                    >
                      {c.budget ? BUDGET_LABEL[c.budget] : ''}
                    </div>
                  </td>
                  <td
                    style={{
                      fontSize: 13,
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    {c.remodelScope ? SCOPE_LABEL[c.remodelScope] : '—'}
                  </td>
                  <td>
                    <span
                      className="consult-status-pill"
                      data-status={c.status}
                    >
                      {CONSULTATION_STATUS_LABEL[c.status]}
                    </span>
                  </td>
                  <td
                    style={{
                      fontSize: 12,
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    {new Date(c.createdAt).toLocaleDateString('ko-KR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <DetailPanel
          consultation={selected}
          logs={consultationLogs[selected.id] ?? []}
          onClose={() => {
            setSelectedId(null);
            navigate('/admin/consultations', { replace: true });
          }}
        />
      )}
    </div>
  );
}

// ============================================================
//  상세 슬라이드 패널 (3탭 + 액션바)
// ============================================================

type Tab = 'info' | 'activity' | 'schedule';

function DetailPanel({
  consultation,
  logs,
  onClose,
}: {
  consultation: Consultation;
  logs: import('../../data/consultation').ConsultationLog[];
  onClose: () => void;
}) {
  const {
    setConsultationStatus,
    assignConsultation,
    updateConsultation,
    deleteConsultation,
    addConsultationFile,
    removeConsultationFile,
    addReferenceLink,
    removeReferenceLink,
    consultationFiles,
    referenceLinks,
  } = useData();
  const files = consultationFiles[consultation.id] ?? [];
  const links = referenceLinks[consultation.id] ?? [];
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('info');
  const [memo, setMemo] = useState(consultation.adminMemo ?? '');

  useEffect(() => {
    setMemo(consultation.adminMemo ?? '');
  }, [consultation.adminMemo, consultation.id]);

  const assignedName = ASSIGNABLE_ADMINS.find(
    (a) => a.id === consultation.assignedAdmin
  )?.name;

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15,23,42,.35)',
          zIndex: 90,
        }}
      />
      <aside
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 'min(720px, 100vw)',
          background: '#fff',
          boxShadow: 'var(--shadow-xl)',
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <header
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'var(--color-primary)',
            color: '#fff',
          }}
        >
          <div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.7)' }}>
              접수번호 {consultation.id.slice(-8).toUpperCase()}
            </div>
            <div style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>
              {consultation.name} · {consultation.phone}
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn btn-sm"
            style={{
              background: 'rgba(255,255,255,.15)',
              color: '#fff',
            }}
          >
            ✕ 닫기
          </button>
        </header>

        {/* 액션바 */}
        <div
          style={{
            padding: '14px 24px',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
            alignItems: 'center',
            background: 'var(--ink-50)',
          }}
        >
          <select
            className="select"
            style={{ minWidth: 140, padding: '6px 10px' }}
            value={consultation.assignedAdmin ?? ''}
            onChange={(e) => {
              const v = e.target.value || null;
              assignConsultation(consultation.id, v, 'Admin');
              toast.success(v ? '담당자가 배정되었습니다.' : '담당자 배정이 해제되었습니다.');
            }}
          >
            <option value="">담당자 미배정</option>
            {ASSIGNABLE_ADMINS.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>

          <select
            className="select"
            style={{ minWidth: 140, padding: '6px 10px' }}
            value={consultation.status}
            onChange={(e) => {
              const v = e.target.value as ConsultationStatus;
              setConsultationStatus(consultation.id, v, 'Admin');
              toast.success('상태가 변경되었습니다.');
            }}
          >
            {STATUS_FILTERS.filter((f) => f.value !== 'all').map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>

          <div style={{ flex: 1 }} />

          <a
            href={`tel:${consultation.phone}`}
            className="btn btn-sm btn-outline"
            style={{ textDecoration: 'none' }}
          >
            📞 전화
          </a>
          <a
            href={`sms:${consultation.phone}`}
            className="btn btn-sm btn-outline"
            style={{ textDecoration: 'none' }}
          >
            💬 문자
          </a>
          {consultation.email && (
            <a
              href={`mailto:${consultation.email}`}
              className="btn btn-sm btn-outline"
              style={{ textDecoration: 'none' }}
            >
              ✉ 이메일
            </a>
          )}
        </div>

        {/* 탭 */}
        <div className="consult-detail-tabs" style={{ padding: '0 24px' }}>
          <button
            className={`consult-detail-tab ${tab === 'info' ? 'is-active' : ''}`}
            onClick={() => setTab('info')}
          >
            고객 정보
          </button>
          <button
            className={`consult-detail-tab ${tab === 'activity' ? 'is-active' : ''}`}
            onClick={() => setTab('activity')}
          >
            활동 & 메모
          </button>
          <button
            className={`consult-detail-tab ${tab === 'schedule' ? 'is-active' : ''}`}
            onClick={() => setTab('schedule')}
          >
            진행 & 일정
          </button>
        </div>

        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: '24px',
          }}
        >
          {tab === 'info' && (
            <InfoTab
              consultation={consultation}
              assignedName={assignedName}
              files={files}
              links={links}
              onAddFile={(f) => addConsultationFile(consultation.id, f)}
              onRemoveFile={(fileId) => removeConsultationFile(consultation.id, fileId)}
              onAddLink={(l) => addReferenceLink(consultation.id, l)}
              onRemoveLink={(linkId) => removeReferenceLink(consultation.id, linkId)}
            />
          )}
          {tab === 'activity' && (
            <ActivityTab
              logs={logs}
              memo={memo}
              onMemoChange={setMemo}
              onMemoSave={() => {
                updateConsultation(consultation.id, { adminMemo: memo });
                toast.success('메모가 저장되었습니다.');
              }}
            />
          )}
          {tab === 'schedule' && (
            <ScheduleTab
              consultation={consultation}
              onDelete={() => {
                if (
                  !confirm(
                    `${consultation.name} 님의 상담을 삭제하시겠습니까? 되돌릴 수 없습니다.`
                  )
                )
                  return;
                deleteConsultation(consultation.id);
                toast.success('삭제되었습니다.');
                onClose();
              }}
            />
          )}
        </div>
      </aside>
    </>
  );
}

// ============================================================
//  탭 — 고객 정보
// ============================================================

function InfoTab({
  consultation,
  assignedName,
  files,
  links,
  onAddFile,
  onRemoveFile,
  onAddLink,
  onRemoveLink,
}: {
  consultation: Consultation;
  assignedName?: string;
  files: ConsultationFile[];
  links: ReferenceLink[];
  onAddFile: (file: Omit<ConsultationFile, 'id' | 'consultationId' | 'createdAt'>) => void;
  onRemoveFile: (fileId: string) => void;
  onAddLink: (link: Omit<ReferenceLink, 'id' | 'consultationId' | 'createdAt'>) => void;
  onRemoveLink: (linkId: string) => void;
}) {
  const c = consultation;
  return (
    <div>
      <Section title="Step 01 — 기본정보">
        <KV label="성함" value={c.name} />
        <KV label="연락처" value={c.phone} />
        <KV label="이메일" value={c.email ?? '—'} />
        <KV label="아파트" value={c.apartment} />
        <KV
          label="연락 시간"
          value={
            c.contactPrefs.length > 0 ? (
              <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                {c.contactPrefs.map((p: ContactPref) => (
                  <span
                    key={p}
                    style={{
                      padding: '2px 8px',
                      borderRadius: 999,
                      background: 'var(--ink-100)',
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {CONTACT_PREFS_LABEL[p]}
                  </span>
                ))}
              </div>
            ) : (
              '—'
            )
          }
        />
      </Section>

      <Section title="Step 02 — 간단 질문">
        <KV
          label="공사 완료 일정"
          value={c.moveIn ? MOVE_IN_LABEL[c.moveIn] : '—'}
        />
        <KV label="예산" value={c.budget ? BUDGET_LABEL[c.budget] : '—'} />
        <KV
          label="변경 범위"
          value={c.remodelScope ? SCOPE_LABEL[c.remodelScope] : '—'}
        />
        <KV
          label="희망 구역"
          value={
            c.remodelAreas.length > 0 ? (
              <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                {c.remodelAreas.map((a) => (
                  <span
                    key={a}
                    style={{
                      padding: '2px 8px',
                      borderRadius: 999,
                      background: 'var(--ink-100)',
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {a}
                  </span>
                ))}
              </div>
            ) : (
              '—'
            )
          }
        />
        <KV
          label="공급 평형"
          value={c.supplyArea ? `${c.supplyArea}평` : '—'}
        />
      </Section>

      <Section title="운영">
        <KV
          label="담당자"
          value={assignedName ?? '미배정'}
        />
        <KV
          label="상태"
          value={
            <span
              className="consult-status-pill"
              data-status={c.status}
            >
              {CONSULTATION_STATUS_LABEL[c.status]}
            </span>
          }
        />
        <KV
          label="접수일"
          value={new Date(c.createdAt).toLocaleString('ko-KR')}
        />
        <KV
          label="최근 변경"
          value={new Date(c.updatedAt).toLocaleString('ko-KR')}
        />
      </Section>

      <FilesAndLinksSection
        files={files}
        links={links}
        onAddFile={onAddFile}
        onRemoveFile={onRemoveFile}
        onAddLink={onAddLink}
        onRemoveLink={onRemoveLink}
      />
    </div>
  );
}

// ============================================================
//  첨부파일 + 추천 링크 (InfoTab 내부에서 사용)
// ============================================================

const FILE_TYPE_LABEL: Record<ConsultationFile['fileType'], string> = {
  floor_plan: '평면도',
  site_photo: '현장 사진',
  pdf: 'PDF',
  drawing: '도면',
  other: '기타',
};

const LINK_CATEGORY_LABEL: Record<ReferenceLink['category'], string> = {
  instagram: 'Instagram',
  pinterest: 'Pinterest',
  youtube: 'YouTube',
  blog: 'Blog',
  other: '기타',
};

function FilesAndLinksSection({
  files,
  links,
  onAddFile,
  onRemoveFile,
  onAddLink,
  onRemoveLink,
}: {
  files: ConsultationFile[];
  links: ReferenceLink[];
  onAddFile: (file: Omit<ConsultationFile, 'id' | 'consultationId' | 'createdAt'>) => void;
  onRemoveFile: (fileId: string) => void;
  onAddLink: (link: Omit<ReferenceLink, 'id' | 'consultationId' | 'createdAt'>) => void;
  onRemoveLink: (linkId: string) => void;
}) {
  return (
    <>
      <Section title="첨부파일">
        <FileAdder onAdd={onAddFile} />
        <ul style={{ listStyle: 'none', padding: 0, margin: '12px 0 0' }}>
          {files.length === 0 && (
            <li
              style={{
                fontSize: 13,
                color: 'var(--color-text-tertiary)',
                padding: '8px 0',
              }}
            >
              등록된 첨부파일이 없습니다.
            </li>
          )}
          {files.map((f) => (
            <li
              key={f.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 0',
                borderBottom: '1px solid var(--color-border)',
                gap: 8,
              }}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--color-text-primary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  [{FILE_TYPE_LABEL[f.fileType]}] {f.originalName}
                </div>
                {f.storagePath && (
                  <div
                    style={{
                      fontSize: 11,
                      color: 'var(--color-text-tertiary)',
                      fontFamily: 'var(--font-family-num)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {f.storagePath}
                  </div>
                )}
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  if (confirm(`${f.originalName} 을(를) 삭제하시겠습니까?`)) {
                    onRemoveFile(f.id);
                  }
                }}
              >
                삭제
              </button>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="추천 링크">
        <LinkAdder onAdd={onAddLink} />
        <ul style={{ listStyle: 'none', padding: 0, margin: '12px 0 0' }}>
          {links.length === 0 && (
            <li
              style={{
                fontSize: 13,
                color: 'var(--color-text-tertiary)',
                padding: '8px 0',
              }}
            >
              등록된 링크가 없습니다.
            </li>
          )}
          {links.map((l) => (
            <li
              key={l.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 0',
                borderBottom: '1px solid var(--color-border)',
                gap: 8,
              }}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--color-text-primary)',
                  }}
                >
                  [{LINK_CATEGORY_LABEL[l.category]}]
                  {l.label ? ` ${l.label}` : ''}
                </div>
                <a
                  href={l.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    fontSize: 12,
                    color: 'var(--color-text-secondary)',
                    textDecoration: 'underline',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    display: 'block',
                  }}
                >
                  {l.url}
                </a>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  if (confirm('이 링크를 삭제하시겠습니까?')) {
                    onRemoveLink(l.id);
                  }
                }}
              >
                삭제
              </button>
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}

function FileAdder({
  onAdd,
}: {
  onAdd: (file: Omit<ConsultationFile, 'id' | 'consultationId' | 'createdAt'>) => void;
}) {
  const [fileType, setFileType] = useState<ConsultationFile['fileType']>('floor_plan');
  const [name, setName] = useState('');
  const [path, setPath] = useState('');
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        onAdd({
          fileType,
          originalName: name.trim(),
          storagePath: path.trim() || `local://${name.trim()}`,
        });
        setName('');
        setPath('');
      }}
      style={{
        display: 'grid',
        gridTemplateColumns: '120px 1fr 1.4fr auto',
        gap: 8,
        alignItems: 'center',
      }}
    >
      <select
        className="select"
        value={fileType}
        onChange={(e) => setFileType(e.target.value as ConsultationFile['fileType'])}
        style={{ padding: '6px 8px', fontSize: 13 }}
      >
        {(Object.keys(FILE_TYPE_LABEL) as ConsultationFile['fileType'][]).map((t) => (
          <option key={t} value={t}>
            {FILE_TYPE_LABEL[t]}
          </option>
        ))}
      </select>
      <input
        className="input"
        placeholder="파일명"
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={{ padding: '6px 10px', fontSize: 13 }}
      />
      <input
        className="input"
        placeholder="저장 경로 (선택, 예: storage/cs_xxx/도면.pdf)"
        value={path}
        onChange={(e) => setPath(e.target.value)}
        style={{ padding: '6px 10px', fontSize: 13 }}
      />
      <button type="submit" className="btn btn-primary btn-sm" disabled={!name.trim()}>
        추가
      </button>
    </form>
  );
}

function LinkAdder({
  onAdd,
}: {
  onAdd: (link: Omit<ReferenceLink, 'id' | 'consultationId' | 'createdAt'>) => void;
}) {
  const [category, setCategory] = useState<ReferenceLink['category']>('instagram');
  const [label, setLabel] = useState('');
  const [url, setUrl] = useState('');
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!url.trim()) return;
        onAdd({
          category,
          label: label.trim() || undefined,
          url: url.trim(),
        });
        setLabel('');
        setUrl('');
      }}
      style={{
        display: 'grid',
        gridTemplateColumns: '120px 1fr 1.8fr auto',
        gap: 8,
        alignItems: 'center',
      }}
    >
      <select
        className="select"
        value={category}
        onChange={(e) => setCategory(e.target.value as ReferenceLink['category'])}
        style={{ padding: '6px 8px', fontSize: 13 }}
      >
        {(Object.keys(LINK_CATEGORY_LABEL) as ReferenceLink['category'][]).map((c) => (
          <option key={c} value={c}>
            {LINK_CATEGORY_LABEL[c]}
          </option>
        ))}
      </select>
      <input
        className="input"
        placeholder="라벨 (선택)"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        style={{ padding: '6px 10px', fontSize: 13 }}
      />
      <input
        className="input"
        placeholder="https://..."
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        style={{ padding: '6px 10px', fontSize: 13 }}
      />
      <button type="submit" className="btn btn-primary btn-sm" disabled={!url.trim()}>
        추가
      </button>
    </form>
  );
}

const CONTACT_PREFS_LABEL: Record<ContactPref, string> = {
  any: '언제든',
  morning: '오전',
  afternoon: '오후',
  evening: '저녁',
};

// ============================================================
//  탭 — 활동 & 메모
// ============================================================

function ActivityTab({
  logs,
  memo,
  onMemoChange,
  onMemoSave,
}: {
  logs: import('../../data/consultation').ConsultationLog[];
  memo: string;
  onMemoChange: (v: string) => void;
  onMemoSave: () => void;
}) {
  const sortedLogs = useMemo(
    () => [...logs].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
    [logs]
  );

  return (
    <div>
      <Section title="관리 메모">
        <textarea
          className="textarea"
          placeholder="내부 메모를 작성하세요 (고객에게는 노출되지 않습니다)"
          value={memo}
          onChange={(e) => onMemoChange(e.target.value)}
          rows={4}
        />
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            marginTop: 8,
          }}
        >
          <button className="btn btn-primary btn-sm" onClick={onMemoSave}>
            메모 저장
          </button>
        </div>
      </Section>

      <Section title="활동 타임라인">
        {sortedLogs.length === 0 && (
          <div
            style={{
              color: 'var(--color-text-tertiary)',
              fontSize: 13,
              padding: 12,
            }}
          >
            아직 등록된 활동이 없습니다.
          </div>
        )}
        <div className="consult-timeline">
          {sortedLogs.map((l) => (
            <div
              key={l.id}
              className="consult-timeline-item"
              data-type={l.eventType}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: 4,
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  {LOG_EVENT_LABEL[l.eventType]}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    color: 'var(--color-text-tertiary)',
                  }}
                >
                  {new Date(l.createdAt).toLocaleString('ko-KR')}
                </span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                {l.actorName ?? 'System'}
                {l.payload && (
                  <span style={{ marginLeft: 6, color: 'var(--color-text-tertiary)' }}>
                    · {JSON.stringify(l.payload)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

const LOG_EVENT_LABEL: Record<
  import('../../data/consultation').ConsultationLog['eventType'],
  string
> = {
  created: '📝 상담 접수',
  status_changed: '🔄 상태 변경',
  assigned: '👤 담당자 배정',
  memo_added: '📋 메모 추가',
  contacted: '📞 연락 시도',
  file_attached: '📎 파일 첨부',
  note: '메모',
};

// ============================================================
//  탭 — 진행 & 일정 (담당자 / 상태 / 위험 표시 + 삭제)
// ============================================================

function ScheduleTab({
  consultation,
  onDelete,
}: {
  consultation: Consultation;
  onDelete: () => void;
}) {
  const hoursAgo = Math.round(
    (Date.now() - new Date(consultation.createdAt).getTime()) / (1000 * 60 * 60)
  );
  const over24h = hoursAgo > 24 && consultation.status === 'received';

  return (
    <div>
      <Section title="진행 상태">
        <KV
          label="접수 후 경과"
          value={
            <span style={{ color: over24h ? '#b91c1c' : 'inherit', fontWeight: over24h ? 700 : 500 }}>
              {hoursAgo < 1
                ? '방금 접수'
                : `${hoursAgo}시간 경과${over24h ? ' · 24시간 내 연락 필요' : ''}`}
            </span>
          }
        />
        <KV
          label="현재 상태"
          value={
            <span
              className="consult-status-pill"
              data-status={consultation.status}
            >
              {CONSULTATION_STATUS_LABEL[consultation.status]}
            </span>
          }
        />
        {consultation.status === 'received' && !consultation.assignedAdmin && (
          <div
            style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 8,
              background: '#fef2f2',
              borderLeft: '3px solid #fca5a5',
              fontSize: 13,
            }}
          >
            <strong>미배정</strong> — 상단 액션바에서 담당자를 지정해 주세요.
          </div>
        )}
      </Section>

      <Section title="위험 작업">
        <button
          type="button"
          className="btn btn-outline btn-sm"
          style={{ color: '#b91c1c', borderColor: '#fca5a5' }}
          onClick={onDelete}
        >
          이 상담 삭제 (되돌릴 수 없음)
        </button>
      </Section>
    </div>
  );
}

// ============================================================
//  공용 — Section / KV
// ============================================================

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h3
        style={{
          fontSize: 'var(--text-md)',
          fontWeight: 700,
          color: 'var(--color-text-primary)',
          marginBottom: 12,
        }}
      >
        {title}
      </h3>
      <div
        style={{
          background: 'var(--color-bg-page)',
          padding: 16,
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-border)',
        }}
      >
        {children}
      </div>
    </div>
  );
}

function KV({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '120px 1fr',
        alignItems: 'start',
        gap: 12,
        marginBottom: 8,
      }}
    >
      <div
        style={{
          fontSize: 12,
          color: 'var(--color-text-tertiary)',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 14, color: 'var(--color-text-primary)' }}>
        {value}
      </div>
    </div>
  );
}