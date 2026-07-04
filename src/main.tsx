import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { DataProvider } from './data/DataContext';
import { AnalyticsProvider } from './data/AnalyticsContext';
import { PartnerProvider } from './data/PartnerContext';
import { ToastProvider } from './components/Toast';
import './styles/theme.css';

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
