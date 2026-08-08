import { Link, NavLink } from 'react-router-dom';

export function Header() {
  return (
    <header className="app-header">
      <div
        className="container row-between"
        style={{ width: '100%' }}
      >
        <Link to="/" className="logo" aria-label="Yukyu Design 홈">
          <span className="logo-mark">Y</span>
          <span>
            Yukyu <span style={{ color: 'var(--color-accent)' }}>Design</span>
          </span>
        </Link>
        <nav className="row" style={{ gap: 'var(--space-2)' }}>
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `btn btn-ghost btn-sm ${isActive ? 'is-active' : ''}`
            }
          >
            홈
          </NavLink>
          <NavLink
            to="/studio"
            className={({ isActive }) =>
              `btn btn-ghost btn-sm ${isActive ? 'is-active' : ''}`
            }
          >
            스튜디오
          </NavLink>
          <NavLink
            to="/partner/apply"
            className={({ isActive }) =>
              `btn btn-ghost btn-sm ${isActive ? 'is-active' : ''}`
            }
          >
            파트너 등록
          </NavLink>
          <NavLink to="/quote" className="btn btn-accent btn-sm">
            견적 문의
          </NavLink>
        </nav>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="app-footer">
      <div
        className="container"
        style={{ display: 'flex', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}
      >
        <div>
          <div className="logo">
            <span className="logo-mark">Y</span>
            <span>
              Yukyu <span style={{ color: 'var(--color-accent)' }}>Design</span>
            </span>
          </div>
          <p style={{ marginTop: 12, color: 'var(--color-text-tertiary)' }}>
            Clean · Calm · Considered — 프리미엄 인테리어 시공
          </p>
        </div>
        <div style={{ display: 'flex', gap: 48, flexWrap: 'wrap' }}>
          <div>
            <strong>Blueforge D&amp;I 사업부</strong>
            <p style={{ marginTop: 8 }}>서울시 종로구 종로1길 50 더케이트윈타워 B동 2층</p>
            <p>평일 10:00 - 18:00 · 점심 12:30 - 13:30</p>
          </div>
          <div>
            <strong>Contact</strong>
            <p style={{ marginTop: 8 }}>02-1234-5678</p>
            <p>hello@yukye.design</p>
          </div>
          <div>
            <strong>협력업체 모집</strong>
            <p style={{ marginTop: 8 }}>
              인테리어·시공 파트너를 모집합니다.
            </p>
            <NavLink to="/partner/apply" className="btn btn-outline btn-sm">
              파트너 등록 신청 →
            </NavLink>
          </div>
        </div>
        <div style={{ width: '100%', color: 'var(--color-text-tertiary)', fontSize: 12 }}>
          © {new Date().getFullYear()} Yukyu Design. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
