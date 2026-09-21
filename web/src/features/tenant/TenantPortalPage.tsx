import React from 'react';
import { Box, Typography, Card, CardContent, Grid, Button, Paper } from '@mui/material';
import {
  MeetingRoom as RoomIcon,
  ReceiptLong as ReceiptIcon,
  ReportProblem as TicketIcon,
} from '@mui/icons-material';
import { useAuth } from '../auth/AuthContext';

export const TenantPortalPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={800} letterSpacing={-0.5} gutterBottom>
          Xin chào, {user?.fullName || user?.login}!
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Cổng thông tin cư dân TroHub - Theo dõi thông tin phòng thuê, hóa đơn và gửi phản ánh.
        </Typography>
      </Box>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <RoomIcon color="primary" />
                <Typography variant="h6" fontWeight={700}>
                  Thông tin phòng thuê
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Xem chi tiết hợp đồng thuê, danh sách dịch vụ và quy định tòa nhà.
              </Typography>
              <Button variant="outlined" size="small" fullWidth>
                Xem chi tiết phòng
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <ReceiptIcon color="warning" />
                <Typography variant="h6" fontWeight={700}>
                  Hóa đơn & Tiền phòng
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Tra cứu hóa đơn hàng tháng, lịch sử thanh toán và biên nhận tiền phòng.
              </Typography>
              <Button variant="outlined" color="warning" size="small" fullWidth>
                Xem hóa đơn
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <TicketIcon color="error" />
                <Typography variant="h6" fontWeight={700}>
                  Báo cáo sự cố
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Gửi yêu cầu sửa chữa thiết bị, sự cố điện nước tới quản lý tòa nhà.
              </Typography>
              <Button variant="outlined" color="error" size="small" fullWidth>
                Gửi phản ánh
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ p: 3, borderRadius: 3, bgcolor: 'primary.lighter', border: '1px solid', borderColor: 'primary.main' }}>
        <Typography variant="subtitle1" fontWeight={700} color="primary.main" gutterBottom>
          Hỗ trợ trực tiếp
        </Typography>
        <Typography variant="body2" color="text.primary">
          Nếu có bất kỳ thắc mắc khẩn cấp nào về an ninh hoặc tiện ích, vui lòng liên hệ trực tiếp với Chủ trọ hoặc Nhân viên quản lý tòa nhà.
        </Typography>
      </Paper>
    </Box>
  );
};
