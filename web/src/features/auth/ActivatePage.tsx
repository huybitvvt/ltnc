import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  Container,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { Visibility, VisibilityOff, VpnKeyOutlined, LockOutlined } from '@mui/icons-material';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useAuth } from './AuthContext';

export const ActivatePage: React.FC = () => {
  const { activate } = useAuth();
  const navigate = useNavigate();

  const [inviteCode, setInviteCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }

    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không trùng khớp');
      return;
    }

    setLoading(true);
    try {
      await activate(inviteCode.trim().toUpperCase(), password);
      navigate('/login', {
        state: { message: 'Kích hoạt tài khoản thành công! Vui lòng đăng nhập với mật khẩu mới.' },
      });
    } catch (err: any) {
      const apiMsg = err.response?.data?.error?.message || err.message || 'Kích hoạt tài khoản thất bại';
      setError(apiMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #059669 100%)',
        p: 2,
      }}
    >
      <Container maxWidth="sm">
        <Card
          sx={{
            borderRadius: 4,
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
            backdropFilter: 'blur(16px)',
            background: 'rgba(255, 255, 255, 0.95)',
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              py: 3.5,
              px: 4,
              textAlign: 'center',
              background: 'linear-gradient(135deg, #065f46 0%, #059669 100%)',
              color: 'white',
            }}
          >
            <Typography variant="h5" fontWeight={800} gutterBottom>
              Kích hoạt tài khoản
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              Nhập mã mời được quản lý cấp (mã có hiệu lực trong vòng 24 giờ)
            </Typography>
          </Box>

          <CardContent sx={{ p: { xs: 3, sm: 5 } }}>
            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <TextField
                  label="Mã kích hoạt (Invite Code)"
                  placeholder="Ví dụ: INV-A1B2C3D4"
                  required
                  fullWidth
                  variant="outlined"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  disabled={loading}
                  autoFocus
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <VpnKeyOutlined color="action" />
                      </InputAdornment>
                    ),
                  }}
                  helperText="Mã gồm tiền tố INV- và chuỗi ký tự ngẫu nhiên"
                />

                <TextField
                  label="Đặt mật khẩu mới"
                  type={showPassword ? 'text' : 'password'}
                  required
                  fullWidth
                  variant="outlined"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  helperText="Tối thiểu 6 ký tự"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockOutlined color="action" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                          aria-label="Hiện/ẩn mật khẩu"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                <TextField
                  label="Xác nhận mật khẩu mới"
                  type={showPassword ? 'text' : 'password'}
                  required
                  fullWidth
                  variant="outlined"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                />

                <Button
                  type="submit"
                  variant="contained"
                  color="success"
                  size="large"
                  fullWidth
                  disabled={loading}
                  sx={{
                    py: 1.5,
                    fontSize: '1rem',
                    fontWeight: 700,
                    borderRadius: 2,
                    textTransform: 'none',
                    boxShadow: '0 10px 15px -3px rgba(5, 150, 105, 0.3)',
                  }}
                >
                  {loading ? 'Đang kích hoạt...' : 'Kích hoạt ngay'}
                </Button>

                <Button
                  component={RouterLink}
                  to="/login"
                  variant="text"
                  color="inherit"
                  sx={{ textTransform: 'none', fontWeight: 600 }}
                >
                  Đã có tài khoản? Quay lại đăng nhập
                </Button>
              </Box>
            </form>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};
