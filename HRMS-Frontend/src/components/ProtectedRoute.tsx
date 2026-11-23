import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { isLoggedIn } from '../lib/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  permission?: string;
}

export default function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
  const location = useLocation();

  if (!isLoggedIn()) {
    if (fallback && location.pathname === '/') {
      return <>{fallback}</>;
    }
    // Landing page is always the first page for logged-out users
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
