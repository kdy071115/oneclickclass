import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getSession } from '../auth/session';
import { useRole, type UserRole } from '../hooks/useRole';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const location = useLocation();
  return getSession() ? children : <Navigate to="/login" replace state={{ from: location.pathname }} />;
}

export function RoleGuard({ allowed, children }: { allowed: readonly UserRole[]; children: ReactNode }) {
  const { role } = useRole();
  return allowed.includes(role) ? children : <Navigate to="/dashboard" replace />;
}
