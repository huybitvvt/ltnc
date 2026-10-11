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
  Checkbox,
  FormControlLabel,
  TablePagination,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import KeyIcon from '@mui/icons-material/VpnKey';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import LockIcon from '@mui/icons-material/Lock';
import CopyIcon from '@mui/icons-material/ContentCopy';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../shared/api/client';
import { ApiResponse } from '../auth/types';

interface UserItem {
  id: string;
  login: string;
  role: string;
  enabled: boolean;
}

export const UsersPage: React.FC = () => {
  const queryClient = useQueryClient();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newLogin, setNewLogin] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);

  const [inviteModalCode, setInviteModalCode] = useState<string | null>(null);
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [assignmentUser, setAssignmentUser] = useState<UserItem | null>(null);
  const [assignedIds, setAssignedIds] = useState<string[]>([]);
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const { data: buildings = [] } = useQuery({
    queryKey: ['buildings', 'assignments'],
    queryFn: async () => (await apiClient.get<ApiResponse<Array<{id: string; name: string}>>>('/buildings')).data.data,
  });

  // Fetch danh sách STAFF
  const { data: usersData, isLoading, refetch } = useQuery({
    queryKey: ['users', 'STAFF', page],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<UserItem[]>>('/users', {params: {role: 'STAFF', page, size: 20}});
      return { content: res.data.data, totalElements: res.data.meta?.totalElements ?? res.data.data.length };
    },
  });

  // Mutation tạo STAFF mới
  const createStaffMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post<ApiResponse<any>>('/users', {
        login: newLogin.trim(),
        buildingIds: [],
      });
      return res.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setCreateDialogOpen(false);
      setNewLogin('');
      setInviteModalCode(data.inviteCode);
      setSnackbarMessage('Tạo tài khoản nhân viên thành công!');
    },
    onError: (err: any) => {
      setCreateError(err.response?.data?.error?.message || err.message || 'Lỗi khi tạo nhân viên');
    },
  });

  // Mutation bật/tắt trạng thái
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      await apiClient.put(`/users/${id}/status`, { enabled });
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
      const res = await apiClient.post<ApiResponse<{ inviteCode: string }>>(`/users/${userId}/reissue-invite`);
      return res.data.data.inviteCode;
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

  const openAssignments = async (staff: UserItem) => {
    setAssignmentUser(staff);
    setAssignedIds([]);
    setAssignmentLoading(true);
    try {
      const res = await apiClient.get<ApiResponse<string[]>>(`/users/${staff.id}/assignments`);
      setAssignedIds(res.data.data);
    } catch (err: any) {
      setAssignmentUser(null);
      setSnackbarMessage(err.response?.data?.message || 'Không thể tải phân công');
    } finally { setAssignmentLoading(false); }
  };
  const saveAssignments = async () => {
    if (!assignmentUser) return;
    setAssignmentLoading(true);
    try {
      await apiClient.put(`/users/${assignmentUser.id}/assignments`, {buildingIds: assignedIds});
      setAssignmentUser(null);
      setSnackbarMessage('Đã cập nhật phân công tòa nhà');
    } catch (err: any) { setSnackbarMessage(err.response?.data?.message || 'Không thể lưu phân công'); }
    finally { setAssignmentLoading(false); }
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
              <TableCell align="right" sx={{ fontWeight: 700 }}>
                Thao tác
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                  <CircularProgress size={32} />
                </TableCell>
              </TableRow>
            ) : !usersData || usersData.content.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  Chưa có nhân viên nào trong hệ thống
                </TableCell>
              </TableRow>
            ) : (
              usersData.content.map((staff) => (
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
                  <TableCell align="right">
                    <Button size="small" onClick={() => void openAssignments(staff)}>Phân công tòa</Button>
                    <Tooltip title={staff.enabled ? 'Cấp mã đặt lại mật khẩu (24 giờ)' : 'Cấp mã kích hoạt (24 giờ)'}>
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
      <TablePagination component="div" count={usersData?.totalElements || 0} page={page}
        onPageChange={(_, value) => setPage(value)} rowsPerPage={20} rowsPerPageOptions={[20]} />
      <Dialog open={!!assignmentUser} onClose={() => !assignmentLoading && setAssignmentUser(null)} fullWidth maxWidth="sm">
        <DialogTitle>Phân công: {assignmentUser?.login}</DialogTitle>
        <DialogContent>
          {assignmentLoading ? <CircularProgress size={24} /> : buildings.length === 0 ? <Typography>Chưa có tòa nhà.</Typography> : buildings.map(building => (
            <Box key={building.id}><FormControlLabel label={building.name} control={<Checkbox checked={assignedIds.includes(building.id)}
              onChange={(_, checked) => setAssignedIds(ids => checked ? [...ids, building.id] : ids.filter(id => id !== building.id))} />} /></Box>
          ))}
        </DialogContent>
        <DialogActions><Button disabled={assignmentLoading} onClick={() => setAssignmentUser(null)}>Hủy</Button>
          <Button variant="contained" disabled={assignmentLoading} onClick={() => void saveAssignments()}>Lưu phân công</Button></DialogActions>
      </Dialog>

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
              <Alert severity="info">Nhân viên dùng mã mời để tự đặt mật khẩu và kích hoạt tài khoản.</Alert>
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
        <DialogTitle fontWeight={700}>Mã kích hoạt / đặt lại mật khẩu</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Mã dùng một lần trong <strong>24 giờ</strong>. Tài khoản chưa kích hoạt dùng trang kích hoạt; tài khoản đang hoạt động dùng trang đặt lại mật khẩu.
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
