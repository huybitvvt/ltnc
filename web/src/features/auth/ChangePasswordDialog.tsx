import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Alert,
  Box,
  Typography,
} from '@mui/material';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';

interface ChangePasswordDialogProps {
  open: boolean;
  onClose: () => void;
}

export const ChangePasswordDialog: React.FC<ChangePasswordDialogProps> = ({ open, onClose }) => {
  const { changePassword } = useAuth();
  const navigate = useNavigate();

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 6) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    setLoading(true);
    try {
      await changePassword(oldPassword, newPassword);
      onClose();
      navigate('/login', {
        state: { message: 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại.' },
      });
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message || 'Đổi mật khẩu thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle fontWeight={700}>Đổi mật khẩu</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Sau khi đổi mật khẩu, tất cả các phiên làm việc hiện tại sẽ bị thu hồi và bạn cần đăng nhập lại.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Mật khẩu hiện tại"
              type="password"
              required
              fullWidth
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              disabled={loading}
            />
            <TextField
              label="Mật khẩu mới"
              type="password"
              required
              fullWidth
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={loading}
              helperText="Tối thiểu 6 ký tự"
            />
            <TextField
              label="Xác nhận mật khẩu mới"
              type="password"
              required
              fullWidth
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={onClose} disabled={loading} color="inherit">
            Hủy
          </Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? 'Đang cập nhật...' : 'Lưu mật khẩu'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
