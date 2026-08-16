import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Landing from './pages/Landing';
import Studio from './pages/Studio';
import QuoteStep1 from './pages/quote/QuoteStep1';
import QuoteStep2 from './pages/quote/QuoteStep2';
import QuoteDone from './pages/quote/QuoteDone';
import QuoteTrack from './pages/quote/QuoteTrack';
import ConsultStep1 from './pages/consult/ConsultStep1';
import ConsultStep2 from './pages/consult/ConsultStep2';
import ConsultDone from './pages/consult/ConsultDone';
import PartnerApply from './pages/partner/PartnerApply';
import PartnerDone from './pages/partner/PartnerDone';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminQuotes from './pages/admin/AdminQuotes';
import AdminConsultations from './pages/admin/AdminConsultations';
import AdminPortfolio from './pages/admin/AdminPortfolio';
import AdminReviews from './pages/admin/AdminReviews';
import AdminAnalytics from './pages/admin/AdminAnalytics';
import AdminSEO from './pages/admin/AdminSEO';
import AdminPartners from './pages/admin/AdminPartners';
import AdminLayout from './pages/admin/AdminLayout';
import NotFound from './pages/NotFound';
import RequireAdmin from './components/RequireAdmin';
import { useAnalytics } from './data/AnalyticsContext';
import { useSeoHead } from './data/useSeo';

function GlobalSeo() {
  useSeoHead();
  return null;
}

export default function App() {
  const location = useLocation();
  const { trackPageView } = useAnalytics();

  // 페이지 전환마다 자동 pageview 기록 (SPA에서 새로고침 없이도 count 가능)
  useEffect(() => {
    trackPageView(location.pathname);
  }, [location.pathname, trackPageView]);

  return (
    <>
      <GlobalSeo />
      <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/studio" element={<Studio />} />
      <Route path="/quote" element={<QuoteStep1 />} />
      <Route path="/quote/step-2" element={<QuoteStep2 />} />
      <Route path="/quote/done" element={<QuoteDone />} />
      <Route path="/quote/track/:id" element={<QuoteTrack />} />

      <Route path="/consult" element={<ConsultStep1 />} />
      <Route path="/consult/step-2" element={<ConsultStep2 />} />
      <Route path="/consult/done" element={<ConsultDone />} />

      <Route path="/partner/apply" element={<PartnerApply />} />
      <Route path="/partner/done" element={<PartnerDone />} />

      <Route path="/admin/login" element={<AdminLogin />} />
      <Route
        path="/admin"
        element={
          <RequireAdmin>
            <AdminLayout />
          </RequireAdmin>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="analytics" element={<AdminAnalytics />} />
        <Route path="quotes" element={<AdminQuotes />} />
        <Route path="quotes/:id" element={<AdminQuotes />} />
        <Route path="consultations" element={<AdminConsultations />} />
        <Route path="consultations/:id" element={<AdminConsultations />} />
        <Route path="portfolio" element={<AdminPortfolio />} />
        <Route path="reviews" element={<AdminReviews />} />
        <Route path="partners" element={<AdminPartners />} />
        <Route path="seo" element={<AdminSEO />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
    </>
  );
}
