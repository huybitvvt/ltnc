import React, { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Card,
  CardContent,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
} from '@mui/material';
import {
  MeetingRoom as RoomIcon,
  Receipt as InvoiceIcon,
  AttachMoney as MoneyIcon,
  Warning as DebtIcon,
  Savings as DepositIcon,
  Build as IssueIcon,
  Campaign as BroadcastIcon,
  CheckCircle as PaidIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { dashboardApi, DashboardMetrics } from './dashboardApi';
import { notificationsApi } from '../notifications/notificationsApi';
import { apiClient } from '../../shared/api/client';
import { BuildingItem } from '../property/types';
import { ApiResponse } from '../auth/types';

const formatVnd = (value?: string | number | null) => {
  if (!value) return '0 ₫';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0 ₫';
  return new Intl.NumberFormat('vi-VN').format(num) + ' ₫';
};

const getCurrentMonthString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('');
  const [billingMonth, setBillingMonth] = useState<string>(getCurrentMonthString());

  // Dialog Broadcast Notification
  const [openBroadcastDialog, setOpenBroadcastDialog] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);

  // 1. Fetch buildings list
  const { data: buildings = [] } = useQuery({
    queryKey: ['buildings'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<BuildingItem[]>>('/buildings');
      return res.data.data;
    },
    enabled: user?.role === 'OWNER' || user?.role === 'STAFF',
  });

  // 2. Fetch Dashboard Metrics
  const {
    data: metrics,
    isLoading: isMetricsLoading,
    error: metricsError,
  } = useQuery<DashboardMetrics>({
    queryKey: ['dashboardMetrics', selectedBuildingId, billingMonth],
    queryFn: () => dashboardApi.getMetrics(selectedBuildingId || undefined, billingMonth || undefined),
    enabled: user?.role === 'OWNER' || user?.role === 'STAFF',
  });

  // Mutation phát thông báo
  const broadcastMutation = useMutation({
    mutationFn: () =>
      notificationsApi.broadcastNotification({
        buildingId: selectedBuildingId,
        title: broadcastTitle,
        message: broadcastMessage,
      }),
    onSuccess: (data) => {
      setOpenBroadcastDialog(false);
      setBroadcastTitle('');
      setBroadcastMessage('');
      setSnackbarMessage(`Đã gửi thông báo đến ${data.sentCount} người thuê phòng!`);
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (err: any) => {
      setSnackbarMessage(err.response?.data?.message || 'Không thể gửi thông báo');
    },
  });

  if (user?.role === 'TENANT') {
    return (
      <Box>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" fontWeight={800} letterSpacing={-0.5} gutterBottom>
            Xin chào, {user?.fullName || user?.login}!
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Chào mừng bạn đến với cổng thông tin khách thuê TroHub.
          </Typography>
        </Box>

        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={4}>
            <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <RoomIcon color="primary" fontSize="large" />
                  <Typography variant="h6" fontWeight={700}>
                    Hợp đồng & Phòng
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Xem thời hạn thuê, giá niêm yết và chi tiết hợp đồng của bạn.
                </Typography>
                <Button variant="outlined" fullWidth onClick={() => navigate('/tenant/contracts')}>
                  Xem hợp đồng
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={4}>
            <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <InvoiceIcon color="warning" fontSize="large" />
                  <Typography variant="h6" fontWeight={700}>
                    Hóa đơn tiền phòng
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Kiểm tra số tiền cần đóng, xem chi tiết điện nước và thanh toán.
                </Typography>
                <Button variant="contained" color="warning" fullWidth onClick={() => navigate('/tenant/invoices')}>
                  Xem hóa đơn
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={4}>
            <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <IssueIcon color="error" fontSize="large" />
                  <Typography variant="h6" fontWeight={700}>
                    Báo hỏng & Bảo trì
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Gửi yêu cầu sửa chữa thiết bị, đính kèm hình ảnh mô tả sự cố.
                </Typography>
                <Button variant="outlined" color="error" fullWidth onClick={() => navigate('/operations')}>
                  Báo sự cố
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={800} letterSpacing={-0.5} gutterBottom>
            Bảng điều khiển kinh doanh & đối chiếu
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Số liệu tài chính, dòng tiền thực tế và hiện trạng phòng theo quy chuẩn đối chiếu TroHub.
          </Typography>
        </Box>

        {/* Bộ lọc Tòa nhà & Kỳ đối chiếu */}
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Tòa nhà</InputLabel>
            <Select
              value={selectedBuildingId}
              label="Tòa nhà"
              onChange={(e) => setSelectedBuildingId(e.target.value)}
            >
              <MenuItem value="">
                <em>Tất cả tòa nhà</em>
              </MenuItem>
              {buildings.map((b) => (
                <MenuItem key={b.id} value={b.id}>
                  {b.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            size="small"
            label="Kỳ đối chiếu (YYYY-MM)"
            value={billingMonth}
            onChange={(e) => setBillingMonth(e.target.value)}
            sx={{ width: 180 }}
          />

          {selectedBuildingId && (
            <Button
              variant="contained"
              color="secondary"
              startIcon={<BroadcastIcon />}
              onClick={() => setOpenBroadcastDialog(true)}
            >
              Gửi thông báo tòa
            </Button>
          )}
        </Box>
      </Box>

      {isMetricsLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {metricsError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Không thể tải dữ liệu bảng điều khiển: {(metricsError as any)?.message || 'Lỗi hệ thống'}
        </Alert>
      )}

      {metrics && (
        <>
          {/* Nhóm 1: Dòng tiền & Tài chính (BR-151..BR-158) */}
          <Typography variant="h6" fontWeight={700} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <MoneyIcon color="primary" /> Dòng tiền & Đối chiếu tài chính
          </Typography>

          <Grid container spacing={2.5} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', bgcolor: '#f8fafc' }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>
                    HÓA ĐƠN ĐÃ PHÁT HÀNH
                  </Typography>
                  <Typography variant="h5" fontWeight={800} color="primary.main" sx={{ my: 0.5 }}>
                    {formatVnd(metrics.billedAmount)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Gốc + điều chỉnh (BR-151)
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', bgcolor: '#f0fdf4' }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Typography variant="caption" color="success.main" fontWeight={700}>
                    TIỀN THỰC THU TRONG KỲ
                  </Typography>
                  <Typography variant="h5" fontWeight={800} color="success.dark" sx={{ my: 0.5 }}>
                    {formatVnd(metrics.cashCollected)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Thu tiền mặt/CK mới (BR-152)
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', bgcolor: '#fef2f2' }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Typography variant="caption" color="error.main" fontWeight={700}>
                    TIỀN HOÀN TRẢ
                  </Typography>
                  <Typography variant="h5" fontWeight={800} color="error.main" sx={{ my: 0.5 }}>
                    {formatVnd(metrics.cashRefunded)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Bút toán hoàn (BR-153)
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', bgcolor: '#eff6ff' }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Typography variant="caption" color="primary.dark" fontWeight={700}>
                    THU RÒNG THỰC TẾ
                  </Typography>
                  <Typography variant="h5" fontWeight={800} color="primary.dark" sx={{ my: 0.5 }}>
                    {formatVnd(metrics.netCash)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Thực thu trừ hoàn (BR-153)
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography variant="caption" color="warning.dark" fontWeight={700}>
                        CÔNG NỢ PHẢI THU (TỔNG HỢP)
                      </Typography>
                      <Typography variant="h5" fontWeight={800} color="warning.main" sx={{ my: 0.5 }}>
                        {formatVnd(metrics.totalDebt)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Hóa đơn còn thiếu (BR-155)
                      </Typography>
                    </Box>
                    <DebtIcon color="warning" fontSize="large" />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography variant="caption" color="info.dark" fontWeight={700}>
                        KHOẢN DƯ CHƯA XỬ LÝ
                      </Typography>
                      <Typography variant="h5" fontWeight={800} color="info.main" sx={{ my: 0.5 }}>
                        {formatVnd(metrics.totalCredit)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Thừa/Chuyển dư hóa đơn (BR-155)
                      </Typography>
                    </Box>
                    <PaidIcon color="info" fontSize="large" />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', bgcolor: '#fbfbfe' }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography variant="caption" color="secondary.main" fontWeight={700}>
                        TIỀN CỌC ĐANG GIỮ
                      </Typography>
                      <Typography variant="h5" fontWeight={800} color="secondary.main" sx={{ my: 0.5 }}>
                        {formatVnd(metrics.totalDepositHeld)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Sổ cọc mọi HĐ (BR-157, EX-17)
                      </Typography>
                    </Box>
                    <DepositIcon color="secondary" fontSize="large" />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Nhóm 2: Hiện trạng phòng & Vận hành (BR-030, BR-031, BR-160) */}
          <Typography variant="h6" fontWeight={700} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <RoomIcon color="primary" /> Hiện trạng phòng & Vận hành sự cố
          </Typography>

          <Grid container spacing={2.5} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Typography variant="body2" color="text.secondary" fontWeight={600}>
                    Tổng số phòng
                  </Typography>
                  <Typography variant="h4" fontWeight={800} sx={{ my: 0.5 }}>
                    {metrics.totalRooms}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Tất cả các phòng thuộc phạm vi
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Typography variant="body2" color="success.main" fontWeight={600}>
                    Đang có khách thuê (ACTIVE)
                  </Typography>
                  <Typography variant="h4" fontWeight={800} color="success.main" sx={{ my: 0.5 }}>
                    {metrics.occupiedRooms}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Tỷ lệ lấp đầy: {metrics.totalRooms > 0 ? Math.round((metrics.occupiedRooms / metrics.totalRooms) * 100) : 0}%
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Typography variant="body2" color="info.main" fontWeight={600}>
                    Phòng trống đón khách
                  </Typography>
                  <Typography variant="h4" fontWeight={800} color="info.main" sx={{ my: 0.5 }}>
                    {metrics.vacantBookableRooms}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Sẵn sàng cho thuê (BR-031)
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Typography variant="body2" color="error.main" fontWeight={600}>
                    Sự cố bảo trì chưa đóng
                  </Typography>
                  <Typography variant="h4" fontWeight={800} color="error.main" sx={{ my: 0.5 }}>
                    {metrics.openIssuesCount}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Khác CLOSED (BR-160)
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </>
      )}

      {/* Lối tắt chức năng nhanh */}
      <Paper
        sx={{
          p: 3,
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>
          Lối tắt thao tác nhanh
        </Typography>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <Button variant="outlined" size="small" onClick={() => navigate('/invoices')}>
            Quản lý hóa đơn
          </Button>
          <Button variant="outlined" size="small" onClick={() => navigate('/metering')}>
            Ghi chỉ số điện nước
          </Button>
          <Button variant="outlined" size="small" onClick={() => navigate('/deposits')}>
            Sổ quỹ tiền cọc
          </Button>
          <Button variant="outlined" size="small" onClick={() => navigate('/operations')}>
            Sự cố & Phản hồi
          </Button>
          <Button variant="outlined" size="small" onClick={() => navigate('/contracts')}>
            Hợp đồng thuê
          </Button>
        </Box>
      </Paper>

      {/* Dialog Phát thông báo toàn tòa */}
      <Dialog open={openBroadcastDialog} onClose={() => setOpenBroadcastDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Phát thông báo tới toàn bộ người thuê</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Thông báo sẽ được gửi đồng thời tới người đại diện của tất cả hợp đồng ACTIVE trong tòa nhà đã chọn.
          </Typography>
          <TextField
            autoFocus
            fullWidth
            label="Tiêu đề thông báo"
            value={broadcastTitle}
            onChange={(e) => setBroadcastTitle(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Nội dung thông báo"
            value={broadcastMessage}
            onChange={(e) => setBroadcastMessage(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenBroadcastDialog(false)}>Hủy</Button>
          <Button
            variant="contained"
            color="secondary"
            disabled={!broadcastTitle.trim() || !broadcastMessage.trim() || broadcastMutation.isPending}
            onClick={() => broadcastMutation.mutate()}
          >
            {broadcastMutation.isPending ? 'Đang gửi...' : 'Gửi thông báo'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!snackbarMessage}
        autoHideDuration={4000}
        onClose={() => setSnackbarMessage(null)}
        message={snackbarMessage}
      />
    </Box>
  );
};
