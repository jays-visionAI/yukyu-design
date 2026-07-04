import { Link } from 'react-router-dom';
import { Header, Footer } from '../components/Layout';

export default function NotFound() {
  return (
    <>
      <Header />
      <main
        className="container"
        style={{ padding: '80px 24px', textAlign: 'center' }}
      >
        <div style={{ fontSize: 96, fontWeight: 800, color: 'var(--color-primary)' }}>
          404
        </div>
        <h1 style={{ fontSize: 'var(--text-2xl)', marginTop: 12 }}>
          페이지를 찾을 수 없습니다
        </h1>
        <p
          style={{
            color: 'var(--color-text-secondary)',
            margin: '16px 0 24px',
          }}
        >
          요청하신 페이지가 존재하지 않거나 이동되었습니다.
        </p>
        <Link to="/" className="btn btn-primary">
          홈으로 이동
        </Link>
      </main>
      <Footer />
    </>
  );
}
