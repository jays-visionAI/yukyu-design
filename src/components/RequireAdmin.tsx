import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useData } from '../data/DataContext';

export default function RequireAdmin({ children }: { children: ReactNode }) {
  const { isAdmin } = useData();
  const location = useLocation();
  if (!isAdmin) {
    return <Navigate to="/admin/login" state={{ from: location.pathname }} replace />;
  }
  return <>{children}</>;
}
