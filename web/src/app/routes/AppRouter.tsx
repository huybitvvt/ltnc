import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from '@/features/auth/LoginPage';
import { ActivatePage } from '@/features/auth/ActivatePage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { TenantPortalPage } from '@/features/tenant/TenantPortalPage';
import { UsersPage } from '@/features/users/UsersPage';
import { ConnectionStatusPage } from '@/features/status/ConnectionStatusPage';
import { AppLayout } from '@/shared/components/AppLayout';
import { ProtectedRoute } from '@/shared/components/ProtectedRoute';
import { useAuth } from '@/features/auth/AuthContext';

const HomeRedirect: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }
  if (user.role === 'TENANT') {
    return <Navigate to="/tenant" replace />;
  }
  return <Navigate to="/dashboard" replace />;
};

export const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/activate" element={<ActivatePage />} />

        {/* Protected Routes inside AppLayout */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<HomeRedirect />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={['OWNER', 'STAFF']}>
                <DashboardPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/tenant"
            element={
              <ProtectedRoute allowedRoles={['TENANT']}>
                <TenantPortalPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/users"
            element={
              <ProtectedRoute allowedRoles={['OWNER']}>
                <UsersPage />
              </ProtectedRoute>
            }
          />

          <Route path="/status" element={<ConnectionStatusPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};
