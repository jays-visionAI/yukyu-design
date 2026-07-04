// ============================================================
//  PartnerContext — 협력업체 신청 데이터 레이어
// ------------------------------------------------------------
//  - localStorage 영속화가 기본 동작 (local 모드 데모)
//  - ForgeDB 모드면 partner_applications 테이블과 자동 동기화
//  - RLS 정책:
//      · anon(=일반 고객)은 INSERT 만 가능 (자기 신청 등록)
//      · SELECT 는 인증된 사용자(관리자)만 가능 → 일반 고객은 신청 후
//        결과 확인 불가, 이메일로만 안내
// ============================================================

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type {
  PartnerApplication,
  PartnerStatus,
} from './partner';
import { getForge, isForgeConfigured } from './forgeClient';

const LS_KEY = 'yukye_design_partner_applications_v1';
const MAX_RECORDS = 1000;

export interface PartnerContextValue {
  applications: PartnerApplication[];
  /** 일반 사용자(anon) 신청 등록 — 자기 신청 결과를 반환 */
  submitApplication: (
    draft: Omit<PartnerApplication, 'id' | 'createdAt' | 'updatedAt' | 'status'>
  ) => PartnerApplication;
  /** 관리자 전용: 상태 전이 */
  updateApplicationStatus: (
    id: string,
    status: PartnerStatus,
    options?: { adminMemo?: string }
  ) => void;
  /** 관리자 전용: 신청 단건 조회 */
  getApplication: (id: string) => PartnerApplication | undefined;
  /** 데모용 초기화 (관리자 콘솔) */
  resetApplications: () => void;
  /** 백엔드 모드 */
  backendMode: 'forgedb' | 'local';
  /** ForgeDB 모드에서 hydrate 가 끝났는지 여부 */
  isReady: boolean;
}

const PartnerContext = createContext<PartnerContextValue | null>(null);

// ------------------------------------------------------------
//  localStorage 헬퍼
// ------------------------------------------------------------

function loadLocal(): PartnerApplication[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PartnerApplication[];
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    /* ignore */
  }
  return [];
}

function saveLocal(apps: PartnerApplication[]) {
  try {
    const trimmed = apps.slice(-MAX_RECORDS);
    localStorage.setItem(LS_KEY, JSON.stringify(trimmed));
  } catch {
    /* quota — 무시 */
  }
}

function genId(prefix = 'pa') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// ------------------------------------------------------------
//  ForgeDB row 매핑
// ------------------------------------------------------------

interface ApplicationRow {
  id: string;
  created_at: string;
  updated_at: string;
  status: PartnerStatus;
  business: PartnerApplication['business'];
  cases: PartnerApplication['cases'];
  performance: PartnerApplication['performance'];
  agreement: PartnerApplication['agreement'];
  note: string | null;
  admin_memo: string | null;
  processed_at: string | null;
  processed_by: string | null;
}

function rowToApplication(row: ApplicationRow): PartnerApplication {
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    status: row.status,
    business: row.business,
    cases: row.cases ?? [],
    performance: row.performance,
    agreement: row.agreement,
    note: row.note ?? '',
    adminMemo: row.admin_memo ?? undefined,
    processedAt: row.processed_at ?? undefined,
    processedBy: row.processed_by ?? undefined,
  };
}

function applicationToInsertRow(app: PartnerApplication): Record<string, unknown> {
  return {
    business: app.business,
    cases: app.cases,
    performance: app.performance,
    agreement: app.agreement,
    note: app.note ?? null,
    status: app.status,
  };
}

function statusPatchToRow(status: PartnerStatus, memo?: string): Record<string, unknown> {
  const out: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (status === 'approved' || status === 'rejected') {
    out.processed_at = new Date().toISOString();
  }
  if (memo !== undefined) out.admin_memo = memo || null;
  return out;
}

// ============================================================
//  Provider
// ============================================================

export function PartnerProvider({ children }: { children: ReactNode }) {
  const backendMode: 'forgedb' | 'local' = isForgeConfigured ? 'forgedb' : 'local';
  const [applications, setApplications] = useState<PartnerApplication[]>(() =>
    backendMode === 'local' ? loadLocal() : []
  );
  const [isReady, setIsReady] = useState<boolean>(backendMode === 'local');

  // local 모드: 영속화
  useEffect(() => {
    if (backendMode === 'local') saveLocal(applications);
  }, [applications, backendMode]);

  // ForgeDB 모드: 초기 hydrate + Realtime
  useEffect(() => {
    if (backendMode !== 'forgedb') return;
    let cancelled = false;
    let channel: { unsubscribe: () => void | Promise<void> } | null = null;

    async function hydrate() {
      try {
        const fb = getForge();
        // ⚠️ RLS: anon 은 INSERT 만 가능. SELECT 는 인증된 사용자(=관리자)만.
        // 관리자 로그인 상태일 때만 목록을 가져옵니다. 비로그인 anon 은 빈 배열로 시작.
        const { data: session } = await fb.auth.getSession();
        const isAuthed = !!session?.session;
        if (!isAuthed) {
          if (!cancelled) setIsReady(true);
          return;
        }
        const { data, error } = await fb
          .from('partner_applications')
          .select('*')
          .order('created_at', { ascending: false });
        if (cancelled) return;
        if (error) {
          console.error('[ForgeDB] partner hydrate 실패:', error);
          setIsReady(true);
          return;
        }
        const apps: PartnerApplication[] = ((data ?? []) as ApplicationRow[]).map(
          rowToApplication
        );
        setApplications(apps);
        setIsReady(true);
      } catch (err) {
        console.error('[ForgeDB] partner hydrate 예외:', err);
        setIsReady(true);
      }
    }
    void hydrate();

    // Realtime: 관리자가 다른 세션에서 변경해도 자동 반영
    try {
      const fb = getForge();
      const ch = fb.channel('yukye-partner');
      ch.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'partner_applications' },
        (payload: { new: ApplicationRow | null; old: { id?: string } | null }) => {
          if (cancelled) return;
          const row = payload.new;
          if (row) {
            const mapped = rowToApplication(row);
            setApplications((prev) => {
              const exists = prev.some((a) => a.id === mapped.id);
              return exists
                ? prev.map((a) => (a.id === mapped.id ? mapped : a))
                : [mapped, ...prev];
            });
          } else if (payload.old?.id) {
            setApplications((prev) => prev.filter((a) => a.id !== payload.old!.id));
          }
        }
      ).subscribe((status: string) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('[ForgeDB] Partner Realtime 상태:', status);
        }
      });
      channel = ch as unknown as { unsubscribe: () => void | Promise<void> };
    } catch (err) {
      console.warn('[ForgeDB] Partner Realtime 구독 실패:', err);
    }

    return () => {
      cancelled = true;
      if (channel) void channel.unsubscribe();
    };
  }, [backendMode]);

  // ---------- Actions ----------

  const submitApplication: PartnerContextValue['submitApplication'] = useCallback(
    (draft) => {
      const now = new Date().toISOString();
      const local: PartnerApplication = {
        ...draft,
        id: genId('pa'),
        createdAt: now,
        updatedAt: now,
        status: 'submitted',
      };
      setApplications((prev) => [local, ...prev]);

      if (backendMode === 'forgedb') {
        (async () => {
          try {
            const fb = getForge();
            const { data, error } = await fb
              .from('partner_applications')
              .insert(applicationToInsertRow(local))
              .select('id')
              .single();
            if (error || !data) {
              console.error('[ForgeDB] submitApplication 실패 (로컬에 저장됨):', error);
              return;
            }
            const serverId = (data as { id: string }).id;
            setApplications((prev) =>
              prev.map((a) => (a.id === local.id ? { ...a, id: serverId } : a))
            );
          } catch (err) {
            console.error('[ForgeDB] submitApplication 예외:', err);
          }
        })();
      }
      return local;
    },
    [backendMode]
  );

  const updateApplicationStatus: PartnerContextValue['updateApplicationStatus'] =
    useCallback(
      (id, status, options) => {
        const now = new Date().toISOString();
        setApplications((prev) =>
          prev.map((a) => {
            if (a.id !== id) return a;
            const next: PartnerApplication = {
              ...a,
              status,
              updatedAt: now,
              adminMemo: options?.adminMemo ?? a.adminMemo,
              processedAt:
                status === 'approved' || status === 'rejected' ? now : a.processedAt,
            };
            return next;
          })
        );
        if (backendMode === 'forgedb') {
          try {
            getForge()
              .from('partner_applications')
              .update(statusPatchToRow(status, options?.adminMemo))
              .eq('id', id)
              .then(({ error }) => {
                if (error)
                  console.error('[ForgeDB] updateApplicationStatus 실패:', error);
              });
          } catch (err) {
            console.error('[ForgeDB] updateApplicationStatus 예외:', err);
          }
        }
      },
      [backendMode]
    );

  const getApplication: PartnerContextValue['getApplication'] = useCallback(
    (id) => applications.find((a) => a.id === id),
    [applications]
  );

  const resetApplications: PartnerContextValue['resetApplications'] = useCallback(() => {
    if (backendMode === 'local') {
      localStorage.removeItem(LS_KEY);
      setApplications([]);
    }
    // ForgeDB 모드에서는 별도 RPC 필요 → 데모는 no-op
  }, [backendMode]);

  const value = useMemo<PartnerContextValue>(
    () => ({
      applications,
      submitApplication,
      updateApplicationStatus,
      getApplication,
      resetApplications,
      backendMode,
      isReady,
    }),
    [
      applications,
      submitApplication,
      updateApplicationStatus,
      getApplication,
      resetApplications,
      backendMode,
      isReady,
    ]
  );

  return <PartnerContext.Provider value={value}>{children}</PartnerContext.Provider>;
}

export function usePartner(): PartnerContextValue {
  const ctx = useContext(PartnerContext);
  if (!ctx) throw new Error('usePartner must be used within PartnerProvider');
  return ctx;
}