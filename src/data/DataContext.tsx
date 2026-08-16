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
  CustomerReview,
  ProgressAttachment,
  ProgressUpdate,
  Quote,
  QuoteStatus,
  SpaceType,
} from './types';
import type { PortfolioItem } from './portfolio';
import type {
  Consultation,
  ConsultationFile,
  ConsultationLog,
  ConsultationStatus,
  ReferenceLink,
} from './consultation';
import { seedQuotes, seedPortfolio } from './seed';
import { getForge, isForgeConfigured } from './forgeClient';

const LS_KEY = 'yukye_design_state_v1';

export interface AppState {
  quotes: Quote[];
  portfolio: PortfolioItem[];
  consultations: Consultation[];
  consultationLogs: Record<string, ConsultationLog[]>; // consultationId → logs
  consultationFiles: Record<string, ConsultationFile[]>; // consultationId → 첨부파일
  referenceLinks: Record<string, ReferenceLink[]>; // consultationId → 추천 링크
}

interface DataContextValue extends AppState {
  // Quotes
  createQuote: (
    q: Omit<Quote, 'id' | 'createdAt' | 'updates' | 'progressPercent' | 'status' | 'shareToken'>
  ) => Quote;
  updateQuote: (id: string, patch: Partial<Quote>) => void;
  deleteQuote: (id: string) => void;
  addProgressUpdate: (quoteId: string, update: Omit<ProgressUpdate, 'id' | 'at'>) => void;
  submitReview: (quoteId: string, review: Omit<CustomerReview, 'submittedAt'>) => void;

  // Portfolio
  createPortfolio: (p: Omit<PortfolioItem, 'id' | 'createdAt'>) => PortfolioItem;
  updatePortfolio: (id: string, patch: Partial<PortfolioItem>) => void;
  deletePortfolio: (id: string) => void;

  // Auth (admin)
  isAdmin: boolean;
  adminLogin: (id: string, pw: string) => Promise<boolean>;
  adminLogout: () => Promise<void>;

  // backend mode
  backendMode: 'forgedb' | 'local';

  // utils
  getQuote: (id: string) => Quote | undefined;
  /**
   * ForgeDB 모드에서 anon 사용자가 자기 quote 를 share_token 으로 단건 조회합니다.
   * 로컬 모드에서는 그냥 메모리에서 찾습니다.
   */
  fetchQuoteByShareToken: (token: string) => Promise<Quote | null>;
  resetData: () => void;

  // Consultations
  createConsultation: (
    c: Omit<Consultation, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'shareToken'>
  ) => Consultation;
  updateConsultation: (id: string, patch: Partial<Consultation>) => void;
  deleteConsultation: (id: string) => void;
  setConsultationStatus: (id: string, status: ConsultationStatus, actorName?: string) => void;
  assignConsultation: (id: string, adminId: string | null, actorName?: string) => void;
  /** share_token 으로 단건 조회 (anon 추적 페이지용) */
  fetchConsultationByShareToken: (token: string) => Promise<Consultation | null>;

  // Consultation 첨부파일 / 추천 링크 (어드민이 추가/삭제)
  addConsultationFile: (
    consultationId: string,
    file: Omit<ConsultationFile, 'id' | 'consultationId' | 'createdAt'>
  ) => void;
  removeConsultationFile: (consultationId: string, fileId: string) => void;
  addReferenceLink: (
    consultationId: string,
    link: Omit<ReferenceLink, 'id' | 'consultationId' | 'createdAt'>
  ) => void;
  removeReferenceLink: (consultationId: string, linkId: string) => void;
}

const DataContext = createContext<DataContextValue | null>(null);

const AUTH_KEY = 'yukye_design_admin_auth_v1';
const ADMIN_ID = 'admin';
const ADMIN_PW = '1234';

// ============================================================
//  오프라인 모드 헬퍼 (ForgeDB 미설정 시 폴백)
// ============================================================

function loadLocalState(): AppState {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      if (
        parsed &&
        Array.isArray(parsed.quotes) &&
        Array.isArray(parsed.portfolio) &&
        Array.isArray(parsed.consultations)
      ) {
        return {
          quotes: parsed.quotes,
          portfolio: parsed.portfolio,
          consultations: parsed.consultations,
          consultationLogs: parsed.consultationLogs ?? {},
          consultationFiles: parsed.consultationFiles ?? {},
          referenceLinks: parsed.referenceLinks ?? {},
        };
      }
      // 1차 마이그레이션: 기존 데이터에 consultations 필드가 없는 경우 빈 배열로 보강
      if (parsed && Array.isArray(parsed.quotes) && Array.isArray(parsed.portfolio)) {
        return {
          ...parsed,
          consultations: [],
          consultationLogs: {},
          consultationFiles: {},
          referenceLinks: {},
        };
      }
    }
  } catch {
    /* ignore */
  }
  return {
    quotes: seedQuotes(),
    portfolio: seedPortfolio(),
    consultations: [],
    consultationLogs: {},
    consultationFiles: {},
    referenceLinks: {},
  };
}

function saveLocalState(state: AppState) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch {
    /* quota exceeded — ignore */
  }
}

function genId(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function recalcProgress(quote: Quote): number {
  if (quote.status === 'completed') return 100;
  if (quote.status === 'cancelled') return quote.progressPercent ?? 0;
  const u = quote.updates ?? [];
  const milestoneCount = u.filter((x) => x.category === 'milestone').length;
  const base = Math.min(80, milestoneCount * 20);
  const remaining = 100 - base;
  const lastProgress = [...u].reverse().find((x) => x.category === 'progress');
  let bonus = 0;
  if (lastProgress) {
    const custUpdates = u.filter(
      (x) => x.category === 'progress' && x.authorRole === 'customer'
    ).length;
    bonus = Math.min(remaining, custUpdates * 5 + 5);
  }
  return Math.min(95, base + bonus);
}

// ============================================================
//  ForgeDB 매핑 (DB row ↔ 도메인 모델)
// ============================================================

interface QuoteRow {
  id: string;
  created_at: string;
  customer_name: string;
  phone: string;
  email: string | null;
  region: string;
  preferred_contact_time: string | null;
  space_type: string;
  area_size: number;
  budget: string;
  move_in_date: string | null;
  space_types: string[];
  styles: string[];
  additional_requests: string | null;
  status: QuoteStatus;
  admin_memo: string | null;
  contract_amount: number | null;
  progress_percent: number;
  review: CustomerReview | null;
  manager_id: string | null;
  share_token: string;
}

interface ProgressRow {
  id: string;
  quote_id: string;
  at: string;
  author_role: 'admin' | 'customer' | 'system';
  author_name: string;
  category: ProgressUpdate['category'];
  title: string;
  message: string | null;
  attachments: ProgressAttachment[];
  visible_to_customer: boolean;
}

interface PortfolioRow {
  id: string;
  created_at: string;
  title: string;
  category: PortfolioItem['category'];
  space_type: string;
  area: number;
  location: string;
  year: number;
  duration_weeks: number;
  budget: string;
  description: string;
  cover_color: string;
  cover_accent: string;
  tags: string[];
  images: string[] | null;
  featured: boolean;
  published: boolean;
}

interface ConsultationRow {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  phone: string;
  email: string | null;
  apartment: string;
  contact_prefs: Consultation['contactPrefs'];
  move_in: Consultation['moveIn'] | null;
  budget: Consultation['budget'] | null;
  remodel_scope: Consultation['remodelScope'] | null;
  remodel_areas: string[];
  supply_area: number | null;
  status: ConsultationStatus;
  assigned_admin: string | null;
  admin_memo: string | null;
  share_token: string;
}

interface ConsultationLogRow {
  id: string;
  consultation_id: string;
  actor_id: string | null;
  actor_name: string | null;
  event_type: ConsultationLog['eventType'];
  payload: Record<string, unknown> | null;
  created_at: string;
}

function rowToConsultation(row: ConsultationRow): Consultation {
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    name: row.name,
    phone: row.phone,
    email: row.email ?? undefined,
    apartment: row.apartment,
    contactPrefs: row.contact_prefs ?? [],
    moveIn: row.move_in ?? undefined,
    budget: row.budget ?? undefined,
    remodelScope: row.remodel_scope ?? undefined,
    remodelAreas: row.remodel_areas ?? [],
    supplyArea: row.supply_area ?? undefined,
    status: row.status,
    assignedAdmin: row.assigned_admin ?? undefined,
    adminMemo: row.admin_memo ?? undefined,
    shareToken: row.share_token,
  };
}

function rowToQuote(row: QuoteRow, updates: ProgressUpdate[]): Quote {
  return {
    id: row.id,
    createdAt: row.created_at,
    customerName: row.customer_name,
    phone: row.phone,
    email: row.email ?? undefined,
    region: row.region,
    preferredContactTime: row.preferred_contact_time ?? undefined,
    spaceType: row.space_type as SpaceType,
    areaSize: row.area_size,
    budget: row.budget,
    moveInDate: row.move_in_date ?? undefined,
    spaceTypes: row.space_types ?? [],
    styles: row.styles ?? [],
    additionalRequests: row.additional_requests ?? undefined,
    status: row.status,
    adminMemo: row.admin_memo ?? undefined,
    contractAmount: row.contract_amount ?? undefined,
    progressPercent: row.progress_percent,
    review: row.review ?? undefined,
    managerId: row.manager_id ?? undefined,
    shareToken: row.share_token,
    updates,
  };
}

function rowToPortfolio(row: PortfolioRow): PortfolioItem {
  return {
    id: row.id,
    createdAt: row.created_at,
    title: row.title,
    category: row.category,
    spaceType: row.space_type,
    area: row.area,
    location: row.location,
    year: row.year,
    durationWeeks: row.duration_weeks,
    budget: row.budget,
    description: row.description,
    coverColor: row.cover_color,
    coverAccent: row.cover_accent,
    tags: row.tags ?? [],
    images: row.images ?? [],
    featured: row.featured,
    published: row.published,
  };
}

function quoteToRowPatch(patch: Partial<Quote>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (patch.status !== undefined) out.status = patch.status;
  if (patch.adminMemo !== undefined) out.admin_memo = patch.adminMemo ?? null;
  if (patch.contractAmount !== undefined) out.contract_amount = patch.contractAmount ?? null;
  if (patch.progressPercent !== undefined) out.progress_percent = patch.progressPercent;
  if (patch.review !== undefined) out.review = patch.review ?? null;
  if (patch.managerId !== undefined) out.manager_id = patch.managerId ?? null;
  return out;
}

// ============================================================
//  Provider
// ============================================================

export function DataProvider({ children }: { children: ReactNode }) {
  const backendMode: 'forgedb' | 'local' = isForgeConfigured ? 'forgedb' : 'local';
  const [state, setState] = useState<AppState>(() =>
    backendMode === 'local'
      ? loadLocalState()
      : {
          quotes: [],
          portfolio: [],
          consultations: [],
          consultationLogs: {},
          consultationFiles: {},
          referenceLinks: {},
        }
  );
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    if (backendMode === 'forgedb') return false; // ForgeDB 세션은 비동기 hydrate
    return localStorage.getItem(AUTH_KEY) === '1';
  });

  // ---------- 오프라인 모드: localStorage 영속화 ----------
  useEffect(() => {
    if (backendMode === 'local') saveLocalState(state);
  }, [state, backendMode]);

  // ---------- ForgeDB 모드: 초기 hydrate + 인증 상태 구독 ----------
  useEffect(() => {
    if (backendMode !== 'forgedb') return;
    let cancelled = false;

    async function hydrate() {
      try {
        const fb = getForge();
        // 1) 인증 상태부터 확인 — 관리자 여부에 따라 SELECT 범위가 달라집니다.
        const sessionRes = await fb.auth.getSession();
        if (cancelled) return;
        const isAuthed = !!sessionRes.data?.session;
        if (isAuthed) setIsAdmin(true);

        // 2) quotes 는 RLS 가 관리자/공유토큰별 필터링을 처리합니다.
        //    - 관리자 로그인 상태: 전체 quote hydrate (관리자 콘솔)
        //    - 비로그인 anon: 빈 목록 — 고객은 /quote/track/:token 으로만 들어옴
        // 3) consultations 는 관리자에게만 전체 목록을 가져옵니다 (anon 추적 페이지는
        //    fetchConsultationByShareToken 으로 개별 토큰 조회).
        const [quotesRes, progressRes, portfolioRes, consultationsRes, consultLogsRes] =
          await Promise.all([
            isAuthed
              ? fb.from('quotes').select('*').order('created_at', { ascending: false })
              : Promise.resolve({ data: [], error: null as null }),
            fb.from('progress_updates').select('*').order('at', { ascending: false }),
            fb.from('portfolio').select('*').order('created_at', { ascending: false }),
            isAuthed
              ? fb.from('consultations').select('*').order('created_at', { ascending: false })
              : Promise.resolve({ data: [], error: null as null }),
            isAuthed
              ? fb.from('consultation_logs').select('*').order('created_at', { ascending: false })
              : Promise.resolve({ data: [], error: null as null }),
          ]);
        if (cancelled) return;
        if (quotesRes.error || progressRes.error || portfolioRes.error) {
          console.error(
            '[ForgeDB] hydrate 실패:',
            quotesRes.error ?? progressRes.error ?? portfolioRes.error
          );
          return;
        }
        const updatesByQuote = new Map<string, ProgressUpdate[]>();
        for (const r of (progressRes.data ?? []) as ProgressRow[]) {
          const list = updatesByQuote.get(r.quote_id) ?? [];
          list.push({
            id: r.id,
            at: r.at,
            authorRole: r.author_role,
            authorName: r.author_name,
            category: r.category,
            title: r.title,
            message: r.message ?? undefined,
            attachments: r.attachments ?? [],
            visibleToCustomer: r.visible_to_customer,
          });
          updatesByQuote.set(r.quote_id, list);
        }
        const quotes: Quote[] = ((quotesRes.data ?? []) as QuoteRow[]).map((r) =>
          rowToQuote(r, updatesByQuote.get(r.id) ?? [])
        );
        const portfolio: PortfolioItem[] = ((portfolioRes.data ?? []) as PortfolioRow[]).map(
          rowToPortfolio
        );

        // consultations 매핑
        const consultations: Consultation[] = (
          (consultationsRes.data ?? []) as ConsultationRow[]
        ).map(rowToConsultation);

        // consultation_logs 매핑 (consultationId → logs[])
        const logsByConsult: Record<string, ConsultationLog[]> = {};
        for (const l of (consultLogsRes.data ?? []) as ConsultationLogRow[]) {
          const list = logsByConsult[l.consultation_id] ?? [];
          list.push({
            id: l.id,
            consultationId: l.consultation_id,
            actorId: l.actor_id ?? undefined,
            actorName: l.actor_name ?? undefined,
            eventType: l.event_type,
            payload: l.payload ?? undefined,
            createdAt: l.created_at,
          });
          logsByConsult[l.consultation_id] = list;
        }

        setState({
          quotes,
          portfolio,
          consultations,
          consultationLogs: logsByConsult,
          consultationFiles: {},
          referenceLinks: {},
        });
      } catch (err) {
        console.error('[ForgeDB] hydrate 예외:', err);
      }
    }

    hydrate();

    // ----- 인증 상태 자동 복원 -----
    let authSub: { subscription?: { unsubscribe?: () => void } } | null = null;
    try {
      const { data: sub } = getForge().auth.onAuthStateChange((event) => {
        if (cancelled) return;
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') setIsAdmin(true);
        else if (event === 'SIGNED_OUT') setIsAdmin(false);
      });
      authSub = sub;
    } catch (err) {
      console.warn('[ForgeDB] onAuthStateChange 구독 실패:', err);
    }

    return () => {
      cancelled = true;
      try {
        authSub?.subscription?.unsubscribe?.();
      } catch {
        /* ignore */
      }
    };
  }, [backendMode]);

  // ---------- ForgeDB 모드: Realtime 동기화 ----------
  // 다른 세션/관리자가 변경한 데이터를 자동으로 로컬 state에 반영합니다.
  useEffect(() => {
    if (backendMode !== 'forgedb') return;
    const fb = getForge();

    const refreshQuote = async (id: string) => {
      if (!id) return;
      try {
        const [{ data: qRow }, { data: updRows }] = await Promise.all([
          fb.from('quotes').select('*').eq('id', id).maybeSingle(),
          fb
            .from('progress_updates')
            .select('*')
            .eq('quote_id', id)
            .order('at', { ascending: false }),
        ]);
        if (!qRow) {
          setState((s) => ({ ...s, quotes: s.quotes.filter((q) => q.id !== id) }));
          return;
        }
        const updates: ProgressUpdate[] = ((updRows ?? []) as ProgressRow[]).map((r) => ({
          id: r.id,
          at: r.at,
          authorRole: r.author_role,
          authorName: r.author_name,
          category: r.category,
          title: r.title,
          message: r.message ?? undefined,
          attachments: r.attachments ?? [],
          visibleToCustomer: r.visible_to_customer,
        }));
        const mapped = rowToQuote(qRow as QuoteRow, updates);
        setState((s) => {
          const exists = s.quotes.some((q) => q.id === id);
          return {
            ...s,
            quotes: exists
              ? s.quotes.map((q) => (q.id === id ? mapped : q))
              : [mapped, ...s.quotes],
          };
        });
      } catch (err) {
        console.error('[ForgeDB] refreshQuote 실패:', err);
      }
    };

    const refreshPortfolio = async () => {
      try {
        const { data } = await fb
          .from('portfolio')
          .select('*')
          .order('created_at', { ascending: false });
        if (data) {
          const portfolio = (data as PortfolioRow[]).map(rowToPortfolio);
          setState((s) => ({ ...s, portfolio }));
        }
      } catch (err) {
        console.error('[ForgeDB] refreshPortfolio 실패:', err);
      }
    };

    const refreshConsultations = async () => {
      try {
        const [{ data: cRows }, { data: lRows }] = await Promise.all([
          fb.from('consultations').select('*').order('created_at', { ascending: false }),
          fb.from('consultation_logs').select('*').order('created_at', { ascending: false }),
        ]);
        const consultations = ((cRows ?? []) as ConsultationRow[]).map(rowToConsultation);
        const logsByConsult: Record<string, ConsultationLog[]> = {};
        for (const l of (lRows ?? []) as ConsultationLogRow[]) {
          const list = logsByConsult[l.consultation_id] ?? [];
          list.push({
            id: l.id,
            consultationId: l.consultation_id,
            actorId: l.actor_id ?? undefined,
            actorName: l.actor_name ?? undefined,
            eventType: l.event_type,
            payload: l.payload ?? undefined,
            createdAt: l.created_at,
          });
          logsByConsult[l.consultation_id] = list;
        }
        setState((s) => ({ ...s, consultations, consultationLogs: logsByConsult }));
      } catch (err) {
        console.error('[ForgeDB] refreshConsultations 실패:', err);
      }
    };

    let channel: { unsubscribe: () => void | Promise<void> } | null = null;
    try {
      const ch = fb.channel('yukye-state');
      ch.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'quotes' },
        (payload: { new: { id?: string } | null; old: { id?: string } | null }) => {
          const id = payload.new?.id ?? payload.old?.id;
          if (id) void refreshQuote(id);
        }
      )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'progress_updates' },
          (payload: { new: { quote_id?: string } | null; old: { quote_id?: string } | null }) => {
            const qid = payload.new?.quote_id ?? payload.old?.quote_id;
            if (qid) void refreshQuote(qid);
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'portfolio' },
          () => {
            void refreshPortfolio();
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'consultations' },
          () => {
            void refreshConsultations();
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'consultation_logs' },
          () => {
            void refreshConsultations();
          }
        )
        .subscribe((status: string) => {
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            console.warn('[ForgeDB] Realtime 채널 상태:', status);
          }
        });
      channel = ch as unknown as { unsubscribe: () => void | Promise<void> };
    } catch (err) {
      console.warn('[ForgeDB] Realtime 구독 실패 (오프라인 OK):', err);
    }

    return () => {
      try {
        if (channel) void channel.unsubscribe();
      } catch {
        /* ignore */
      }
    };
  }, [backendMode]);

  // ---------- Quote ----------
  const createQuote: DataContextValue['createQuote'] = useCallback(
    (q) => {
      const createdAt = new Date().toISOString();
      const sysUpdate: ProgressUpdate = {
        id: genId('pu'),
        at: createdAt,
        authorRole: 'system',
        authorName: 'System',
        category: 'milestone',
        title: '견적 요청이 접수되었습니다',
        message: '담당자가 배정되면 알림을 드릴게요.',
        visibleToCustomer: true,
      };
      // ⚠️ share_token 은 RLS 의 forge_share_token() 헬퍼와 짝을 이루는
      // 고객 식별자. crypto.randomUUID 가 없는 환경을 위해 폴백 포함.
      const shareToken =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `tk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
      const local: Quote = {
        ...q,
        id: genId('qt'),
        createdAt,
        updates: [sysUpdate],
        progressPercent: 5,
        status: 'received',
        shareToken,
      };
      setState((s) => ({ ...s, quotes: [local, ...s.quotes] }));

      if (backendMode === 'forgedb') {
        // fire-and-forget 동기화
        (async () => {
          try {
            const fb = getForge();
            const { data, error } = await fb
              .from('quotes')
              .insert({
                customer_name: local.customerName,
                phone: local.phone,
                email: local.email ?? null,
                region: local.region,
                preferred_contact_time: local.preferredContactTime ?? null,
                space_type: local.spaceType,
                area_size: local.areaSize,
                budget: local.budget,
                move_in_date: local.moveInDate ?? null,
                space_types: local.spaceTypes,
                styles: local.styles,
                additional_requests: local.additionalRequests ?? null,
                status: local.status,
                progress_percent: local.progressPercent,
                share_token: shareToken,
              })
              .select('id, share_token')
              .single();
            if (error || !data) return;
            const serverId = (data as { id: string }).id;
            // 서버의 share_token 이 다르면 보존 (있으면 신뢰)
            const serverToken = (data as { share_token?: string }).share_token ?? shareToken;
            // id 교체 + 시스템 업데이트 푸시
            setState((s) => ({
              ...s,
              quotes: s.quotes.map((q) =>
                q.id === local.id
                  ? {
                      ...q,
                      id: serverId,
                      shareToken: serverToken,
                      updates: q.updates.map((u) => ({ ...u, id: genId('pu') })),
                    }
                  : q
              ),
            }));
            await fb.from('progress_updates').insert({
              quote_id: serverId,
              author_role: 'system',
              author_name: 'System',
              category: 'milestone',
              title: sysUpdate.title,
              message: sysUpdate.message ?? null,
              attachments: [],
              visible_to_customer: true,
            });
          } catch (err) {
            console.error('[ForgeDB] createQuote 실패 (로컬에 저장됨):', err);
          }
        })();
      }
      return local;
    },
    [backendMode]
  );

  const updateQuote: DataContextValue['updateQuote'] = useCallback(
    (id, patch) => {
      setState((s) => ({
        ...s,
        quotes: s.quotes.map((q) => {
          if (q.id !== id) return q;
          const next: Quote = { ...q, ...patch };
          next.progressPercent = recalcProgress(next);
          return next;
        }),
      }));
      if (backendMode === 'forgedb') {
        getForge()
          .from('quotes')
          .update(quoteToRowPatch(patch))
          .eq('id', id)
          .then(({ error }) => {
            if (error) console.error('[ForgeDB] updateQuote 실패:', error);
          });
      }
    },
    [backendMode]
  );

  const deleteQuote: DataContextValue['deleteQuote'] = useCallback(
    (id) => {
      setState((s) => ({ ...s, quotes: s.quotes.filter((q) => q.id !== id) }));
      if (backendMode === 'forgedb') {
        getForge()
          .from('quotes')
          .delete()
          .eq('id', id)
          .then(({ error }) => {
            if (error) console.error('[ForgeDB] deleteQuote 실패:', error);
          });
      }
    },
    [backendMode]
  );

  const addProgressUpdate: DataContextValue['addProgressUpdate'] = useCallback(
    (quoteId, update) => {
      const upd: ProgressUpdate = {
        ...update,
        id: genId('pu'),
        at: new Date().toISOString(),
      };
      setState((s) => ({
        ...s,
        quotes: s.quotes.map((q) => {
          if (q.id !== quoteId) return q;
          const next: Quote = {
            ...q,
            updates: [...(q.updates ?? []), upd],
          };
          // ⚠️ 자동 상태 전이는 *관리자/시스템*이 등록한 milestone 에서만 적용합니다.
          // 고객이 "거실 완료" 같은 메모를 올렸다고 해서 status=completed 로 넘어가면
          // 리뷰 모달이 사전 노출되는 운영 사고가 납니다.
          const isManagerEntry =
            upd.authorRole === 'admin' || upd.authorRole === 'system';
          if (isManagerEntry && upd.category === 'milestone') {
            const title = upd.title.toLowerCase();
            if (title.includes('계약') || title.includes('sign')) {
              next.status = 'in_progress';
            } else if (
              title.includes('완료') ||
              title.includes('completion') ||
              title.includes('인도')
            ) {
              next.status = 'completed';
            }
          }
          next.progressPercent = recalcProgress(next);
          // ForgeDB 모드면 status/progress 도 같이 업데이트
          if (backendMode === 'forgedb') {
            const row = quoteToRowPatch({
              status: next.status,
              progressPercent: next.progressPercent,
            });
            getForge()
              .from('quotes')
              .update(row)
              .eq('id', quoteId)
              .then(({ error }) => {
                if (error) console.error('[ForgeDB] addProgressUpdate(quote) 실패:', error);
              });
          }
          return next;
        }),
      }));
      if (backendMode === 'forgedb') {
        getForge()
          .from('progress_updates')
          .insert({
            quote_id: quoteId,
            author_role: upd.authorRole,
            author_name: upd.authorName,
            category: upd.category,
            title: upd.title,
            message: upd.message ?? null,
            attachments: upd.attachments ?? [],
            visible_to_customer: upd.visibleToCustomer,
          })
          .then(({ error }) => {
            if (error) console.error('[ForgeDB] addProgressUpdate 실패:', error);
          });
      }
    },
    [backendMode]
  );

  const submitReview: DataContextValue['submitReview'] = useCallback(
    (quoteId, review) => {
      const submittedAt = new Date().toISOString();
      const full: CustomerReview = { ...review, submittedAt };
      setState((s) => ({
        ...s,
        quotes: s.quotes.map((q) => (q.id === quoteId ? { ...q, review: full } : q)),
      }));
      if (backendMode === 'forgedb') {
        getForge()
          .from('quotes')
          .update({ review: full })
          .eq('id', quoteId)
          .then(({ error }) => {
            if (error) console.error('[ForgeDB] submitReview 실패:', error);
          });
      }
    },
    [backendMode]
  );

  // ---------- Portfolio ----------
  const createPortfolio: DataContextValue['createPortfolio'] = useCallback(
    (p) => {
      const local: PortfolioItem = {
        ...p,
        id: genId('pf'),
        createdAt: new Date().toISOString(),
      };
      setState((s) => ({ ...s, portfolio: [local, ...s.portfolio] }));
      if (backendMode === 'forgedb') {
        getForge()
          .from('portfolio')
          .insert({
            title: local.title,
            category: local.category,
            space_type: local.spaceType,
            area: local.area,
            location: local.location,
            year: local.year,
            duration_weeks: local.durationWeeks,
            budget: local.budget,
            description: local.description,
            cover_color: local.coverColor,
            cover_accent: local.coverAccent,
            tags: local.tags,
            images: local.images,
            featured: local.featured,
            published: local.published,
          })
          .then(({ error }) => {
            if (error) console.error('[ForgeDB] createPortfolio 실패:', error);
          });
      }
      return local;
    },
    [backendMode]
  );

  const updatePortfolio: DataContextValue['updatePortfolio'] = useCallback(
    (id, patch) => {
      setState((s) => ({
        ...s,
        portfolio: s.portfolio.map((p) => (p.id === id ? { ...p, ...patch } : p)),
      }));
      if (backendMode === 'forgedb') {
        const row: Record<string, unknown> = {};
        if (patch.title !== undefined) row.title = patch.title;
        if (patch.category !== undefined) row.category = patch.category;
        if (patch.spaceType !== undefined) row.space_type = patch.spaceType;
        if (patch.area !== undefined) row.area = patch.area;
        if (patch.location !== undefined) row.location = patch.location;
        if (patch.year !== undefined) row.year = patch.year;
        if (patch.durationWeeks !== undefined) row.duration_weeks = patch.durationWeeks;
        if (patch.budget !== undefined) row.budget = patch.budget;
        if (patch.description !== undefined) row.description = patch.description;
        if (patch.coverColor !== undefined) row.cover_color = patch.coverColor;
        if (patch.coverAccent !== undefined) row.cover_accent = patch.coverAccent;
        if (patch.images !== undefined) row.images = patch.images;
        if (patch.tags !== undefined) row.tags = patch.tags;
        if (patch.featured !== undefined) row.featured = patch.featured;
        if (patch.published !== undefined) row.published = patch.published;
        getForge()
          .from('portfolio')
          .update(row)
          .eq('id', id)
          .then(({ error }) => {
            if (error) console.error('[ForgeDB] updatePortfolio 실패:', error);
          });
      }
    },
    [backendMode]
  );

  const deletePortfolio: DataContextValue['deletePortfolio'] = useCallback(
    (id) => {
      setState((s) => ({ ...s, portfolio: s.portfolio.filter((p) => p.id !== id) }));
      if (backendMode === 'forgedb') {
        getForge()
          .from('portfolio')
          .delete()
          .eq('id', id)
          .then(({ error }) => {
            if (error) console.error('[ForgeDB] deletePortfolio 실패:', error);
          });
      }
    },
    [backendMode]
  );

  const adminLogin: DataContextValue['adminLogin'] = useCallback(
    async (id, pw) => {
      if (backendMode === 'local') {
        if (id === ADMIN_ID && pw === ADMIN_PW) {
          localStorage.setItem(AUTH_KEY, '1');
          setIsAdmin(true);
          return true;
        }
        return false;
      }
      // ForgeDB Auth: 이메일/비밀번호로 로그인.
      // ⚠️ 보안: 자동 signUp 폴백을 제거했습니다 — "누군 먼저 가입하는지에 따라 어드민 권한이
      // 결정"되는 취약점(누군나 첫 로그인으로 어드미덼 탈취)을 막기 위핸입니다.
      // 운영 환경에서는 https://forgedb.cloud 콘솔 → Auth → Users 에서 어드미덼 계정을
      // 미리 생성한 후, 그 자격증명으로만 로그인할 수 있습니다.
      try {
        const fb = getForge();
        const email = id.includes('@') ? id : `${id}@yukye.local`;
        const { data, error } = await fb.auth.signInWithPassword({ email, password: pw });
        if (error || !data.session) {
          console.warn(
            '[ForgeDB] adminLogin 실패: 콘솔에서 사전에 관리자 계정을 생성했는지 확인하세요.'
          );
          return false;
        }
        setIsAdmin(true);
        return true;
      } catch (err) {
        // 네트워크/CORS/장애 등 "요청 자체가 백엔드에 닿지 못한" 경우에만
        // 데모 키 (admin/1234) 로 폴백합니다. 자격증명 오류(401 등)는 위에서 이미
        // false 로 반환되었으므로 이 catch 로 들어오지 않습니다.
        // → CORS가 풀리기 전까지 published 사이트에서 어드민을 못 들어가는 상황을
        //   막기 위한 임시 우회입니다. CORS 가 정상화되면 자동으로 ForgeDB 모드로
        //   동작합니다.
        const isDemoKey = id === ADMIN_ID && pw === ADMIN_PW;
        if (isDemoKey) {
          console.warn(
            '[ForgeDB] 백엔드 호출 실패(CORS/네트워크 가능성). 데모 자격증명으로 폴백합니다.'
          );
          localStorage.setItem(AUTH_KEY, '1');
          setIsAdmin(true);
          return true;
        }
        console.error('[ForgeDB] adminLogin 실패:', err);
        return false;
      }
    },
    [backendMode]
  );

  const adminLogout: DataContextValue['adminLogout'] = useCallback(async () => {
    if (backendMode === 'local') {
      localStorage.removeItem(AUTH_KEY);
      setIsAdmin(false);
      return;
    }
    try {
      await getForge().auth.signOut();
    } catch (err) {
      console.error('[ForgeDB] adminLogout 실패:', err);
    }
    setIsAdmin(false);
  }, [backendMode]);

  // ---------- utils ----------
  const getQuote: DataContextValue['getQuote'] = useCallback(
    (id) => state.quotes.find((q) => q.id === id),
    [state.quotes]
  );

  const fetchQuoteByShareToken: DataContextValue['fetchQuoteByShareToken'] = useCallback(
    async (token) => {
      const trimmed = token?.trim();
      if (!trimmed) return null;
      // 1) 로컬/메모리에 있으면 즉시 반환 (hydrate 후, 또는 local 모드)
      const localHit = state.quotes.find((q) => q.shareToken === trimmed);
      if (localHit) return localHit;
      // 2) ForgeDB 모드: 토큰으로 단건 조회. RLS 의 forge_share_token() 이 anon SELECT 를 허용합니다.
      if (backendMode === 'forgedb') {
        try {
          const fb = getForge();
          // 토큰 GUC 는 Postgres 확장으로 별도 호출해야 하지만,
          // forgeClient 래퍼가 anon 요청에 'token' claim 을 주입한다고 가정하고 호출합니다.
          // 실제 콘솔이 그 인터페이스를 제공하지 않을 경우 select('*').eq('share_token', token)
          // 로 폴백합니다 (anon RLS 가 share_token 컬럼을 노출하지 않을 수 있으므로
          // 데이터가 안 보이는 경우 사용자에게 "유효하지 않은 링크" 안내).
          let row: QuoteRow | null = null;
          let updates: ProgressUpdate[] = [];
          try {
            const [{ data: qRow }, { data: updRows }] = await Promise.all([
              fb
                .from('quotes')
                .select('*')
                .eq('share_token', trimmed)
                .maybeSingle(),
              fb
                .from('progress_updates')
                .select('*')
                .order('at', { ascending: false }),
            ]);
            row = (qRow as QuoteRow) ?? null;
            updates = ((updRows ?? []) as ProgressRow[])
              .filter((r) => r.quote_id === row?.id)
              .map((r) => ({
                id: r.id,
                at: r.at,
                authorRole: r.author_role,
                authorName: r.author_name,
                category: r.category,
                title: r.title,
                message: r.message ?? undefined,
                attachments: r.attachments ?? [],
                visibleToCustomer: r.visible_to_customer,
              }));
          } catch {
            row = null;
            updates = [];
          }
          if (!row) return null;
          const mapped = rowToQuote(row, updates);
          setState((s) => {
            if (s.quotes.some((q) => q.id === mapped.id)) return s;
            return { ...s, quotes: [mapped, ...s.quotes] };
          });
          return mapped;
        } catch (err) {
          console.error('[ForgeDB] fetchQuoteByShareToken 실패:', err);
          return null;
        }
      }
      return null;
    },
    [state.quotes, backendMode]
  );

  const resetData = useCallback(() => {
    if (backendMode === 'local') {
      localStorage.removeItem(LS_KEY);
      setState({
        quotes: seedQuotes(),
        portfolio: seedPortfolio(),
        consultations: [],
        consultationLogs: {},
        consultationFiles: {},
        referenceLinks: {},
      });
    }
    // ForgeDB 모드에서는 별도 reset RPC 가 필요 — 데모에서는 no-op
  }, [backendMode]);

  // ============================================================
  //  Consultations
  // ============================================================

  const createConsultation: DataContextValue['createConsultation'] = useCallback(
    (c) => {
      const now = new Date().toISOString();
      const shareToken =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `tk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
      const local: Consultation = {
        ...c,
        id: genId('cs'),
        createdAt: now,
        updatedAt: now,
        status: 'received',
        shareToken,
      };
      setState((s) => ({
        ...s,
        consultations: [local, ...s.consultations],
        consultationLogs: {
          ...s.consultationLogs,
          [local.id]: [
            {
              id: genId('cl'),
              consultationId: local.id,
              actorName: 'System',
              eventType: 'created',
              payload: { source: 'web_form' },
              createdAt: now,
            },
          ],
        },
        consultationFiles: { ...s.consultationFiles, [local.id]: s.consultationFiles[local.id] ?? [] },
        referenceLinks: { ...s.referenceLinks, [local.id]: s.referenceLinks[local.id] ?? [] },
      }));

      if (backendMode === 'forgedb') {
        (async () => {
          try {
            const fb = getForge();
            const { data, error } = await fb
              .from('consultations')
              .insert({
                name: local.name,
                phone: local.phone,
                email: local.email ?? null,
                apartment: local.apartment,
                contact_prefs: local.contactPrefs,
                move_in: local.moveIn ?? null,
                budget: local.budget ?? null,
                remodel_scope: local.remodelScope ?? null,
                remodel_areas: local.remodelAreas,
                supply_area: local.supplyArea ?? null,
                status: local.status,
                share_token: shareToken,
              })
              .select('id, share_token')
              .single();
            if (error || !data) {
              console.error('[ForgeDB] createConsultations insert 실패:', error);
              return;
            }
            const serverId = (data as { id: string }).id;
            const serverToken = (data as { share_token?: string }).share_token ?? shareToken;
            setState((s) => ({
              ...s,
              consultations: s.consultations.map((x) =>
                x.id === local.id
                  ? { ...x, id: serverId, shareToken: serverToken }
                  : x
              ),
              consultationLogs: {
                ...s.consultationLogs,
                [serverId]: s.consultationLogs[local.id] ?? [],
              },
            }));
            await fb.from('consultation_logs').insert({
              consultation_id: serverId,
              actor_name: 'System',
              event_type: 'created',
              payload: { source: 'web_form' },
            });
          } catch (err) {
            console.error('[ForgeDB] createConsultation 실패 (로컬 저장됨):', err);
          }
        })();
      }
      return local;
    },
    [backendMode]
  );

  const updateConsultation: DataContextValue['updateConsultation'] = useCallback(
    (id, patch) => {
      setState((s) => ({
        ...s,
        consultations: s.consultations.map((x) =>
          x.id === id ? { ...x, ...patch, updatedAt: new Date().toISOString() } : x
        ),
      }));
      if (backendMode === 'forgedb') {
        const row: Record<string, unknown> = {};
        if (patch.name !== undefined) row.name = patch.name;
        if (patch.phone !== undefined) row.phone = patch.phone;
        if (patch.email !== undefined) row.email = patch.email ?? null;
        if (patch.apartment !== undefined) row.apartment = patch.apartment;
        if (patch.contactPrefs !== undefined) row.contact_prefs = patch.contactPrefs;
        if (patch.moveIn !== undefined) row.move_in = patch.moveIn ?? null;
        if (patch.budget !== undefined) row.budget = patch.budget ?? null;
        if (patch.remodelScope !== undefined) row.remodel_scope = patch.remodelScope ?? null;
        if (patch.remodelAreas !== undefined) row.remodel_areas = patch.remodelAreas;
        if (patch.supplyArea !== undefined) row.supply_area = patch.supplyArea ?? null;
        if (patch.adminMemo !== undefined) row.admin_memo = patch.adminMemo ?? null;
        if (patch.assignedAdmin !== undefined) row.assigned_admin = patch.assignedAdmin ?? null;
        if (Object.keys(row).length === 0) return;
        getForge()
          .from('consultations')
          .update(row)
          .eq('id', id)
          .then(({ error }) => {
            if (error) console.error('[ForgeDB] updateConsultation 실패:', error);
          });
      }
    },
    [backendMode]
  );

  const deleteConsultation: DataContextValue['deleteConsultation'] = useCallback(
    (id) => {
      setState((s) => {
        const { [id]: _drop, ...rest } = s.consultationLogs;
        void _drop;
        return {
          ...s,
          consultations: s.consultations.filter((x) => x.id !== id),
          consultationLogs: rest,
        };
      });
      if (backendMode === 'forgedb') {
        getForge()
          .from('consultations')
          .delete()
          .eq('id', id)
          .then(({ error }) => {
            if (error) console.error('[ForgeDB] deleteConsultation 실패:', error);
          });
      }
    },
    [backendMode]
  );

  const setConsultationStatus: DataContextValue['setConsultationStatus'] = useCallback(
    (id, status, actorName) => {
      const now = new Date().toISOString();
      setState((s) => ({
        ...s,
        consultations: s.consultations.map((x) =>
          x.id === id ? { ...x, status, updatedAt: now } : x
        ),
        consultationLogs: {
          ...s.consultationLogs,
          [id]: [
            ...(s.consultationLogs[id] ?? []),
            {
              id: genId('cl'),
              consultationId: id,
              actorName: actorName ?? 'Admin',
              eventType: 'status_changed',
              payload: { status },
              createdAt: now,
            },
          ],
        },
      }));
      if (backendMode === 'forgedb') {
        getForge()
          .from('consultations')
          .update({ status })
          .eq('id', id)
          .then(({ error }) => {
            if (error) console.error('[ForgeDB] setConsultationStatus 실패:', error);
          });
        getForge()
          .from('consultation_logs')
          .insert({ consultation_id: id, actor_name: actorName ?? 'Admin', event_type: 'status_changed', payload: { status } })
          .then(({ error }) => {
            if (error) console.error('[ForgeDB] setConsultationStatus log 실패:', error);
          });
      }
    },
    [backendMode]
  );

  const assignConsultation: DataContextValue['assignConsultation'] = useCallback(
    (id, adminId, actorName) => {
      const now = new Date().toISOString();
      setState((s) => ({
        ...s,
        consultations: s.consultations.map((x) =>
          x.id === id ? { ...x, assignedAdmin: adminId ?? undefined, updatedAt: now } : x
        ),
        consultationLogs: {
          ...s.consultationLogs,
          [id]: [
            ...(s.consultationLogs[id] ?? []),
            {
              id: genId('cl'),
              consultationId: id,
              actorName: actorName ?? 'Admin',
              eventType: 'assigned',
              payload: { adminId: adminId ?? null },
              createdAt: now,
            },
          ],
        },
      }));
      if (backendMode === 'forgedb') {
        getForge()
          .from('consultations')
          .update({ assigned_admin: adminId })
          .eq('id', id)
          .then(({ error }) => {
            if (error) console.error('[ForgeDB] assignConsultation 실패:', error);
          });
      }
    },
    [backendMode]
  );

  const fetchConsultationByShareToken: DataContextValue['fetchConsultationByShareToken'] =
    useCallback(
      async (token) => {
        const trimmed = token?.trim();
        if (!trimmed) return null;
        const localHit = state.consultations.find((c) => c.shareToken === trimmed);
        if (localHit) return localHit;
        if (backendMode === 'forgedb') {
          try {
            const fb = getForge();
            const { data, error } = await fb
              .from('consultations')
              .select('*')
              .eq('share_token', trimmed)
              .maybeSingle();
            if (error || !data) return null;
            return rowToConsultation(data as ConsultationRow);
          } catch (err) {
            console.error('[ForgeDB] fetchConsultationByShareToken 실패:', err);
            return null;
          }
        }
        return null;
      },
      [backendMode, state.consultations]
    );

  // ============================================================
  //  Consultation 첨부파일 / 추천 링크 (로컬 + ForgeDB 양쪽 동기화)
  // ============================================================

  const addConsultationFile: DataContextValue['addConsultationFile'] = useCallback(
    (consultationId, file) => {
      const now = new Date().toISOString();
      const id = genId('cf');
      const entry: ConsultationFile = { ...file, id, consultationId, createdAt: now };
      setState((s) => ({
        ...s,
        consultationFiles: {
          ...s.consultationFiles,
          [consultationId]: [...(s.consultationFiles[consultationId] ?? []), entry],
        },
        consultations: s.consultations.map((c) =>
          c.id === consultationId ? { ...c, updatedAt: now } : c
        ),
      }));
      if (backendMode === 'forgedb') {
        (async () => {
          try {
            const fb = getForge();
            const { error } = await fb.from('consultation_files').insert({
              consultation_id: consultationId,
              file_type: entry.fileType,
              storage_path: entry.storagePath,
              original_name: entry.originalName,
              mime_type: entry.mimeType ?? null,
              size_bytes: entry.sizeBytes ?? null,
              uploaded_by: entry.uploadedBy ?? null,
            });
            if (error) console.error('[ForgeDB] consultation_files insert 실패:', error);
          } catch (err) {
            console.error('[ForgeDB] consultation_files insert 실패:', err);
          }
        })();
      }
    },
    [backendMode]
  );

  const removeConsultationFile: DataContextValue['removeConsultationFile'] = useCallback(
    (consultationId, fileId) => {
      const now = new Date().toISOString();
      setState((s) => ({
        ...s,
        consultationFiles: {
          ...s.consultationFiles,
          [consultationId]: (s.consultationFiles[consultationId] ?? []).filter(
            (f) => f.id !== fileId
          ),
        },
        consultations: s.consultations.map((c) =>
          c.id === consultationId ? { ...c, updatedAt: now } : c
        ),
      }));
      if (backendMode === 'forgedb') {
        (async () => {
          try {
            const fb = getForge();
            const { error } = await fb
              .from('consultation_files')
              .delete()
              .eq('id', fileId);
            if (error) console.error('[ForgeDB] consultation_files delete 실패:', error);
          } catch (err) {
            console.error('[ForgeDB] consultation_files delete 실패:', err);
          }
        })();
      }
    },
    [backendMode]
  );

  const addReferenceLink: DataContextValue['addReferenceLink'] = useCallback(
    (consultationId, link) => {
      const now = new Date().toISOString();
      const id = genId('rl');
      const entry: ReferenceLink = { ...link, id, consultationId, createdAt: now };
      setState((s) => ({
        ...s,
        referenceLinks: {
          ...s.referenceLinks,
          [consultationId]: [...(s.referenceLinks[consultationId] ?? []), entry],
        },
        consultations: s.consultations.map((c) =>
          c.id === consultationId ? { ...c, updatedAt: now } : c
        ),
      }));
      if (backendMode === 'forgedb') {
        (async () => {
          try {
            const fb = getForge();
            const { error } = await fb.from('reference_links').insert({
              consultation_id: consultationId,
              url: entry.url,
              category: entry.category,
              label: entry.label ?? null,
              added_by: entry.addedBy ?? null,
            });
            if (error) console.error('[ForgeDB] reference_links insert 실패:', error);
          } catch (err) {
            console.error('[ForgeDB] reference_links insert 실패:', err);
          }
        })();
      }
    },
    [backendMode]
  );

  const removeReferenceLink: DataContextValue['removeReferenceLink'] = useCallback(
    (consultationId, linkId) => {
      const now = new Date().toISOString();
      setState((s) => ({
        ...s,
        referenceLinks: {
          ...s.referenceLinks,
          [consultationId]: (s.referenceLinks[consultationId] ?? []).filter(
            (l) => l.id !== linkId
          ),
        },
        consultations: s.consultations.map((c) =>
          c.id === consultationId ? { ...c, updatedAt: now } : c
        ),
      }));
      if (backendMode === 'forgedb') {
        (async () => {
          try {
            const fb = getForge();
            const { error } = await fb
              .from('reference_links')
              .delete()
              .eq('id', linkId);
            if (error) console.error('[ForgeDB] reference_links delete 실패:', error);
          } catch (err) {
            console.error('[ForgeDB] reference_links delete 실패:', err);
          }
        })();
      }
    },
    [backendMode]
  );

  // ---------- value ----------
  const value = useMemo<DataContextValue>(
    () => ({
      quotes: state.quotes,
      portfolio: state.portfolio,
      consultations: state.consultations,
      consultationLogs: state.consultationLogs,
      consultationFiles: state.consultationFiles,
      referenceLinks: state.referenceLinks,
      createQuote,
      updateQuote,
      deleteQuote,
      addProgressUpdate,
      submitReview,
      createPortfolio,
      updatePortfolio,
      deletePortfolio,
      isAdmin,
      adminLogin,
      adminLogout,
      getQuote,
      fetchQuoteByShareToken,
      resetData,
      backendMode,
      createConsultation,
      updateConsultation,
      deleteConsultation,
      setConsultationStatus,
      assignConsultation,
      fetchConsultationByShareToken,
      addConsultationFile,
      removeConsultationFile,
      addReferenceLink,
      removeReferenceLink,
    }),
    [
      state,
      createQuote,
      updateQuote,
      deleteQuote,
      addProgressUpdate,
      submitReview,
      createPortfolio,
      updatePortfolio,
      deletePortfolio,
      isAdmin,
      adminLogin,
      adminLogout,
      getQuote,
      fetchQuoteByShareToken,
      resetData,
      backendMode,
      createConsultation,
      updateConsultation,
      deleteConsultation,
      setConsultationStatus,
      assignConsultation,
      fetchConsultationByShareToken,
      addConsultationFile,
      removeConsultationFile,
      addReferenceLink,
      removeReferenceLink,
    ]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}