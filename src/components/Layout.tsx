import { Link, NavLink } from 'react-router-dom';

export function Header() {
  return (
    <header className="app-header">
      <div
        className="container row-between"
        style={{ width: '100%' }}
      >
        <Link to="/" className="logo" aria-label="Yukye Design 홈">
          <span className="logo-mark">Y</span>
          <span>
            Yukye <span style={{ color: 'var(--color-accent)' }}>Design</span>
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
              Yukye <span style={{ color: 'var(--color-accent)' }}>Design</span>
            </span>
          </div>
          <p style={{ marginTop: 12, color: 'var(--color-text-tertiary)' }}>
            Clean · Calm · Considered — 프리미엄 인테리어 시공
          </p>
        </div>
        <div style={{ display: 'flex', gap: 48, flexWrap: 'wrap' }}>
          <div>
            <strong>Yukye Design</strong>
            <p style={{ marginTop: 8 }}>서울 강남구 청담동 123-45 2층</p>
            <p>평일 10:00 - 18:00 · 점심 12:30 - 13:30</p>
          </div>
          <div>
            <strong>Contact</strong>
            <p style={{ marginTop: 8 }}>02-1234-5678</p>
            <p>hello@yukye.design</p>
          </div>
        </div>
        <div style={{ width: '100%', color: 'var(--color-text-tertiary)', fontSize: 12 }}>
          © {new Date().getFullYear()} Yukye Design. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
