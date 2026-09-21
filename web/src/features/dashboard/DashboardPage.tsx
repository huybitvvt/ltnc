import React from 'react';
import { Box, Typography, Grid, Paper, Card, CardContent, Button } from '@mui/material';
import {
  Apartment as BuildingIcon,
  MeetingRoom as RoomIcon,
  People as TenantIcon,
  Receipt as InvoiceIcon,
} from '@mui/icons-material';
import { useAuth } from '../auth/AuthContext';
import { useNavigate } from 'react-router-dom';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const stats = [
    { title: 'Khu nhà', value: '—', icon: <BuildingIcon fontSize="large" color="primary" />, path: '/buildings' },
    { title: 'Tổng số phòng', value: '—', icon: <RoomIcon fontSize="large" color="secondary" />, path: '/buildings' },
    { title: 'Khách thuê', value: '—', icon: <TenantIcon fontSize="large" color="success" />, path: '/tenants' },
    { title: 'Hóa đơn chờ thu', value: '—', icon: <InvoiceIcon fontSize="large" color="warning" />, path: '/invoices' },
  ];

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={800} letterSpacing={-0.5} gutterBottom>
          Xin chào, {user?.fullName || user?.login}!
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Hệ thống quản lý nhà trọ TroHub - Phiên làm việc vai trò {user?.role}.
        </Typography>
      </Box>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {stats.map((stat) => (
          <Grid item xs={12} sm={6} md={3} key={stat.title}>
            <Card
              sx={{
                borderRadius: 3,
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 3 }}>
                <Box>
                  <Typography variant="body2" color="text.secondary" fontWeight={600} gutterBottom>
                    {stat.title}
                  </Typography>
                  <Typography variant="h4" fontWeight={700}>
                    {stat.value}
                  </Typography>
                </Box>
                <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 2 }}>{stat.icon}</Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Paper
        sx={{
          p: 4,
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
        }}
      >
        <Typography variant="h6" fontWeight={700} gutterBottom>
          Lối tắt chức năng nhanh
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Chọn chức năng bạn muốn thực hiện tiếp theo:
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          {user?.role === 'OWNER' && (
            <Button variant="contained" onClick={() => navigate('/users')}>
              Quản lý nhân viên
            </Button>
          )}
          <Button variant="outlined" onClick={() => navigate('/status')}>
            Kiểm tra kết nối Backend API
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};
