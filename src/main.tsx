import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { DataProvider } from './data/DataContext';
import { AnalyticsProvider } from './data/AnalyticsContext';
import { ToastProvider } from './components/Toast';
import './styles/theme.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <DataProvider>
        <AnalyticsProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </AnalyticsProvider>
      </DataProvider>
    </BrowserRouter>
  </React.StrictMode>
);
