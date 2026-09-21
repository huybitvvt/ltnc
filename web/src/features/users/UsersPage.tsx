import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Tooltip,
  Snackbar,
} from '@mui/material';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  VpnKey as KeyIcon,
  LockOpen as LockOpenIcon,
  Lock as LockIcon,
  ContentCopy as CopyIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../shared/api/client';
import { ApiResponse } from '../auth/types';

interface UserItem {
  id: string;
  login: string;
  role: string;
  enabled: boolean;
  createdAt: string;
}

export const UsersPage: React.FC = () => {
  const queryClient = useQueryClient();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newLogin, setNewLogin] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);

  const [inviteModalCode, setInviteModalCode] = useState<string | null>(null);
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);

  // Fetch danh sách STAFF
  const { data: usersData, isLoading, refetch } = useQuery({
    queryKey: ['users', 'STAFF'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<any>>('/users?role=STAFF');
      // res.data.data có thể là Page { content: [...] } hoặc Array
      const items = res.data.data?.content || res.data.data || [];
      return items as UserItem[];
    },
  });

  // Mutation tạo STAFF mới
  const createStaffMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post<ApiResponse<any>>('/users/staff', {
        login: newLogin.trim(),
        password: newPassword,
        buildingIds: [],
      });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setCreateDialogOpen(false);
      setNewLogin('');
      setNewPassword('');
      setSnackbarMessage('Tạo tài khoản nhân viên thành công!');
    },
    onError: (err: any) => {
      setCreateError(err.response?.data?.error?.message || err.message || 'Lỗi khi tạo nhân viên');
    },
  });

  // Mutation bật/tắt trạng thái
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      await apiClient.patch(`/users/${id}/status`, { enabled });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setSnackbarMessage('Cập nhật trạng thái người dùng thành công!');
    },
    onError: (err: any) => {
      setSnackbarMessage(err.response?.data?.error?.message || 'Không thể đổi trạng thái');
    },
  });

  // Mutation cấp lại mã mời
  const reissueInviteMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiClient.post<ApiResponse<string>>(`/users/${userId}/reissue-invite`);
      return res.data.data;
    },
    onSuccess: (code) => {
      setInviteModalCode(code);
    },
    onError: (err: any) => {
      setSnackbarMessage(err.response?.data?.error?.message || 'Không thể cấp lại mã mời');
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSnackbarMessage('Đã sao chép vào bộ nhớ tạm!');
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <div>
          <Typography variant="h5" fontWeight={700} gutterBottom>
            Quản lý Nhân viên
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Tạo và phân quyền quản lý cho nhân viên hỗ trợ vận hành tòa nhà
          </Typography>
        </div>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => refetch()}>
            Làm mới
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setCreateError(null);
              setCreateDialogOpen(true);
            }}
          >
            Thêm nhân viên
          </Button>
        </Box>
      </Box>

      <TableContainer component={Paper} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        <Table>
          <TableHead sx={{ bgcolor: 'grey.50' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Tên đăng nhập</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Vai trò</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Trạng thái</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Ngày tạo</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>
                Thao tác
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                  <CircularProgress size={32} />
                </TableCell>
              </TableRow>
            ) : !usersData || usersData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  Chưa có nhân viên nào trong hệ thống
                </TableCell>
              </TableRow>
            ) : (
              usersData.map((staff) => (
                <TableRow key={staff.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{staff.login}</TableCell>
                  <TableCell>
                    <Chip label="STAFF" color="primary" size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={staff.enabled ? 'Đang hoạt động' : 'Đã khóa'}
                      color={staff.enabled ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{staff.createdAt ? new Date(staff.createdAt).toLocaleDateString('vi-VN') : '—'}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="Cấp mã mời kích hoạt mới (24 giờ)">
                      <IconButton
                        color="secondary"
                        size="small"
                        onClick={() => reissueInviteMutation.mutate(staff.id)}
                      >
                        <KeyIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={staff.enabled ? 'Khóa tài khoản (thu hồi phiên ngay)' : 'Mở khóa tài khoản'}>
                      <IconButton
                        color={staff.enabled ? 'error' : 'success'}
                        size="small"
                        onClick={() => toggleStatusMutation.mutate({ id: staff.id, enabled: !staff.enabled })}
                      >
                        {staff.enabled ? <LockIcon fontSize="small" /> : <LockOpenIcon fontSize="small" />}
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog tạo nhân viên mới */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="xs" fullWidth>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createStaffMutation.mutate();
          }}
        >
          <DialogTitle fontWeight={700}>Thêm nhân viên mới</DialogTitle>
          <DialogContent>
            {createError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {createError}
              </Alert>
            )}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <TextField
                label="Tên đăng nhập"
                required
                fullWidth
                value={newLogin}
                onChange={(e) => setNewLogin(e.target.value)}
                placeholder="ví dụ: staff_lan"
              />
              <TextField
                label="Mật khẩu khởi tạo"
                type="password"
                required
                fullWidth
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                helperText="Tối thiểu 6 ký tự. Nhân viên có thể đổi mật khẩu sau."
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button onClick={() => setCreateDialogOpen(false)} color="inherit">
              Hủy
            </Button>
            <Button type="submit" variant="contained" disabled={createStaffMutation.isPending}>
              {createStaffMutation.isPending ? 'Đang tạo...' : 'Tạo tài khoản'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Dialog hiển thị mã mời vừa cấp */}
      <Dialog open={!!inviteModalCode} onClose={() => setInviteModalCode(null)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight={700}>Mã mời kích hoạt</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Mã mời có hiệu lực trong vòng <strong>24 giờ</strong>. Gửi mã này cho nhân viên để họ kích hoạt tài khoản.
          </Typography>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              bgcolor: 'primary.lighter',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderRadius: 2,
              border: '1px dashed',
              borderColor: 'primary.main',
            }}
          >
            <Typography variant="h6" fontWeight={800} color="primary.main" letterSpacing={1}>
              {inviteModalCode}
            </Typography>
            <IconButton onClick={() => inviteModalCode && copyToClipboard(inviteModalCode)}>
              <CopyIcon color="primary" />
            </IconButton>
          </Paper>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setInviteModalCode(null)} variant="contained">
            Đóng
          </Button>
        </DialogActions>
      </Dialog>

      {/* Thông báo Snackbar */}
      <Snackbar
        open={!!snackbarMessage}
        autoHideDuration={4000}
        onClose={() => setSnackbarMessage(null)}
        message={snackbarMessage}
      />
    </Box>
  );
};
