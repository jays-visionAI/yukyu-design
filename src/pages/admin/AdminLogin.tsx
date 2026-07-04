import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useData } from '../../data/DataContext';
import { useToast } from '../../components/Toast';

export default function AdminLogin() {
  const { adminLogin } = useData();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const ok = await adminLogin(id, pw);
      if (ok) {
        toast.success('관리자 로그인 되었습니다.');
        const dest =
          (location.state as { from?: string } | null)?.from ?? '/admin/dashboard';
        navigate(dest, { replace: true });
      } else {
        toast.error('아이디 또는 비밀번호가 올바르지 않습니다.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background:
          'linear-gradient(135deg, #0b3d91 0%, #1a3a6e 60%, #c9a961 130%)',
        padding: '24px',
      }}
    >
      <div
        className="card"
        style={{ width: '100%', maxWidth: 420, padding: 40 }}
      >
        <div
          className="row"
          style={{ justifyContent: 'center', marginBottom: 24 }}
        >
          <span className="logo-mark" style={{ width: 48, height: 48, fontSize: 22 }}>
            Y
          </span>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--color-primary)' }}>
              Yukyu Design
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
              Admin Console
            </div>
          </div>
        </div>
        <h1 style={{ fontSize: 'var(--text-xl)', marginBottom: 8 }}>
          관리자 로그인
        </h1>
        <p
          style={{
            color: 'var(--color-text-secondary)',
            marginBottom: 24,
            fontSize: 'var(--text-sm)',
          }}
        >
          데모용 계정: <strong>admin</strong> / <strong>1234</strong>
        </p>
        <form onSubmit={submit} className="stack" style={{ gap: 16 }}>
          <div className="field">
            <label className="field-label">아이디</label>
            <input
              className="input"
              autoFocus
              value={id}
              onChange={(e) => setId(e.target.value)}
              placeholder="admin"
            />
          </div>
          <div className="field">
            <label className="field-label">비밀번호</label>
            <input
              className="input"
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="••••"
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary btn-block btn-lg"
            disabled={submitting || !id || !pw}
          >
            {submitting ? '로그인 중…' : '로그인'}
          </button>
        </form>
      </div>
    </div>
  );
}
