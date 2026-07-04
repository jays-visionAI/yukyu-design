import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useData } from '../../data/DataContext';
import { useAnalytics } from '../../data/AnalyticsContext';
import { useToast } from '../../components/Toast';

export default function AdminLayout() {
  const { adminLogout, quotes, backendMode } = useData();
  const { events } = useAnalytics();
  const navigate = useNavigate();
  const toast = useToast();

  const newCount = quotes.filter((q) => q.status === 'received').length;
  // 최근 24시간 트래픽 (헤더 미니 위젯 용도)
  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const todayPv = events.filter((e) => +new Date(e.at) >= dayAgo).length;

  function logout() {
    adminLogout();
    toast.push('로그아웃되었습니다.');
    navigate('/admin/login');
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside
        style={{
          width: 240,
          background: 'var(--color-primary)',
          color: '#fff',
          display: 'flex',
          flexDirection: 'column',
          position: 'sticky',
          top: 0,
          height: '100vh',
        }}
      >
        <div
          style={{
            padding: 24,
            borderBottom: '1px solid rgba(255,255,255,.1)',
          }}
        >
          <div className="row" style={{ gap: 10 }}>
            <span
              className="logo-mark"
              style={{
                background: 'var(--color-accent)',
                color: 'var(--color-primary)',
              }}
            >
              Y
            </span>
            <div>
              <div style={{ fontWeight: 800 }}>Yukyu Design</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,.7)' }}>
                Admin Console
              </div>
            </div>
          </div>
        </div>
        <nav style={{ padding: 16, flex: 1 }}>
          <SidebarLink to="/admin/dashboard">대시보드</SidebarLink>
          <SidebarLink to="/admin/analytics">
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              트래픽 분석
              {todayPv > 0 && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: 999,
                    background: 'rgba(255,255,255,.18)',
                    color: '#fff',
                  }}
                >
                  {todayPv}
                </span>
              )}
            </span>
          </SidebarLink>
          <SidebarLink to="/admin/quotes" badge={newCount}>
            접수 관리
          </SidebarLink>
          <SidebarLink to="/admin/portfolio">포트폴리오</SidebarLink>
          <SidebarLink to="/admin/reviews">고객 평가</SidebarLink>
          <div
            style={{
              margin: '12px 8px 4px',
              fontSize: 11,
              fontWeight: 600,
              color: 'rgba(255,255,255,.4)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            설정
          </div>
          <SidebarLink to="/admin/seo">SEO 설정</SidebarLink>
        </nav>
        <div style={{ padding: 16, borderTop: '1px solid rgba(255,255,255,.1)' }}>
          <div
            title={
              backendMode === 'forgedb'
                ? 'ForgeDB (PostgreSQL) 연결됨'
                : '오프라인 모드 — localStorage + 시드 데이터'
            }
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 12,
              padding: '8px 10px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(255,255,255,.06)',
              fontSize: 11,
              color: 'rgba(255,255,255,.75)',
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background:
                  backendMode === 'forgedb' ? '#5DD39E' : 'var(--color-accent)',
                boxShadow:
                  backendMode === 'forgedb'
                    ? '0 0 0 3px rgba(93,211,158,.25)'
                    : '0 0 0 3px rgba(201,169,97,.25)',
              }}
            />
            <span style={{ fontWeight: 600, letterSpacing: '0.04em' }}>
              {backendMode === 'forgedb' ? 'FORGEDB' : 'LOCAL'}
            </span>
            <span style={{ marginLeft: 'auto', opacity: 0.7 }}>
              {backendMode === 'forgedb' ? '실시간 동기화' : '데모 모드'}
            </span>
          </div>
          <button
            onClick={logout}
            className="btn btn-block"
            style={{
              background: 'rgba(255,255,255,.1)',
              color: '#fff',
              border: '1px solid rgba(255,255,255,.2)',
            }}
          >
            로그아웃
          </button>
        </div>
      </aside>
      <main style={{ flex: 1, minWidth: 0 }}>
        <Outlet />
      </main>
    </div>
  );
}

function SidebarLink({
  to,
  children,
  badge,
}: {
  to: string;
  children: React.ReactNode;
  badge?: number;
}) {
  return (
    <NavLink
      to={to}
      end
      style={({ isActive }) => ({
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 14px',
        borderRadius: 'var(--radius-md)',
        background: isActive ? 'rgba(255,255,255,.12)' : 'transparent',
        color: '#fff',
        fontWeight: isActive ? 600 : 500,
        fontSize: 'var(--text-sm)',
        marginBottom: 4,
      })}
    >
      <span>{children}</span>
      {badge !== undefined && badge > 0 && (
        <span
          style={{
            background: 'var(--color-accent)',
            color: 'var(--color-primary)',
            padding: '1px 8px',
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          {badge}
        </span>
      )}
    </NavLink>
  );
}
