import { Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import QuoteStep1 from './pages/quote/QuoteStep1';
import QuoteStep2 from './pages/quote/QuoteStep2';
import QuoteDone from './pages/quote/QuoteDone';
import QuoteTrack from './pages/quote/QuoteTrack';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminQuotes from './pages/admin/AdminQuotes';
import AdminPortfolio from './pages/admin/AdminPortfolio';
import AdminReviews from './pages/admin/AdminReviews';
import AdminLayout from './pages/admin/AdminLayout';
import NotFound from './pages/NotFound';
import RequireAdmin from './components/RequireAdmin';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/quote" element={<QuoteStep1 />} />
      <Route path="/quote/step-2" element={<QuoteStep2 />} />
      <Route path="/quote/done" element={<QuoteDone />} />
      <Route path="/quote/track/:id" element={<QuoteTrack />} />

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
        <Route path="quotes" element={<AdminQuotes />} />
        <Route path="quotes/:id" element={<AdminQuotes />} />
        <Route path="portfolio" element={<AdminPortfolio />} />
        <Route path="reviews" element={<AdminReviews />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
