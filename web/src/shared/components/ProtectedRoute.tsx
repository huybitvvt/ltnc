import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress, Typography, Button, Paper } from '@mui/material';
import { useAuth } from '../../features/auth/AuthContext';
import { UserRole } from '../../features/auth/types';

interface ProtectedRouteProps {
  children: React.ReactElement;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          bgcolor: 'background.default',
          gap: 2,
        }}
      >
        <CircularProgress color="primary" />
        <Typography variant="body2" color="text.secondary">
          Đang xác thực phiên làm việc...
        </Typography>
      </Box>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '80vh',
          p: 3,
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 4,
            maxWidth: 480,
            textAlign: 'center',
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="h5" color="error" gutterBottom fontWeight={700}>
            403 - Không có quyền truy cập
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Tài khoản của bạn ({user.role}) không có quyền truy cập vào phân hệ này.
          </Typography>
          <Button variant="contained" onClick={() => window.history.back()}>
            Quay lại
          </Button>
        </Paper>
      </Box>
    );
  }

  return children;
};
