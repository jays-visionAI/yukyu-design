import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { DataProvider } from './data/DataContext';
import { AnalyticsProvider } from './data/AnalyticsContext';
import { PartnerProvider } from './data/PartnerContext';
import { ToastProvider } from './components/Toast';
import './styles/theme.css';

// ⚠️ local 데모 모드(=ForgeDB 환경변수 미설정)에서 검증 편의를 위한 1회성
//    admin auth prefetch. ForgeDB 모드(URL 키 세팅 시)에서는 실행되지 않습니다.
//    운영 환경에서 ForgeDB 모드로 동작하면 이 분기는 false 가 되어 prefetch 가
//    일어나지 않습니다.
try {
  const url = (import.meta.env.VITE_FORGEDB_URL as string | undefined)?.trim();
  if (!url && !localStorage.getItem('yukye_design_admin_auth_v1')) {
    localStorage.setItem('yukye_design_admin_auth_v1', '1');
  }
} catch {
  /* SSR / storage disabled 환경에서는 무시 */
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <DataProvider>
        <AnalyticsProvider>
          <PartnerProvider>
            <ToastProvider>
              <App />
            </ToastProvider>
          </PartnerProvider>
        </AnalyticsProvider>
      </DataProvider>
    </BrowserRouter>
  </React.StrictMode>
);
