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
  Divider,
} from '@mui/material';
import { Visibility, VisibilityOff, LockOutlined, AccountCircle } from '@mui/icons-material';
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import { useAuth } from './AuthContext';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fromLocation = (location.state as any)?.from?.pathname;
  const stateMessage = (location.state as any)?.message;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const user = await login(loginId.trim(), password);
      // Điều hướng theo vai trò người dùng
      if (fromLocation && fromLocation !== '/login') {
        navigate(fromLocation, { replace: true });
      } else if (user.role === 'TENANT') {
        navigate('/tenant', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err: any) {
      const apiMsg = err.response?.data?.error?.message || err.message || 'Đăng nhập không thành công';
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
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0284c7 100%)',
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
              py: 4,
              px: 4,
              textAlign: 'center',
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              background: 'linear-gradient(135deg, #1e3a8a 0%, #0284c7 100%)',
            }}
          >
            <Typography variant="h4" fontWeight={800} letterSpacing={-0.5} gutterBottom>
              TroHub
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              Hệ thống quản lý chuỗi nhà trọ thông minh & tinh gọn
            </Typography>
          </Box>

          <CardContent sx={{ p: { xs: 3, sm: 5 } }}>
            {stateMessage && (
              <Alert severity="info" sx={{ mb: 3 }}>
                {stateMessage}
              </Alert>
            )}

            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <TextField
                  label="Tên đăng nhập / Số điện thoại"
                  required
                  fullWidth
                  variant="outlined"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  disabled={loading}
                  autoFocus
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <AccountCircle color="action" />
                      </InputAdornment>
                    ),
                  }}
                />

                <TextField
                  label="Mật khẩu"
                  type={showPassword ? 'text' : 'password'}
                  required
                  fullWidth
                  variant="outlined"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
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

                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  fullWidth
                  disabled={loading}
                  sx={{
                    py: 1.5,
                    fontSize: '1rem',
                    fontWeight: 700,
                    borderRadius: 2,
                    textTransform: 'none',
                    boxShadow: '0 10px 15px -3px rgba(2, 132, 199, 0.3)',
                  }}
                >
                  {loading ? 'Đang xác thực...' : 'Đăng nhập'}
                </Button>
              </Box>
            </form>

            <Divider sx={{ my: 3 }} />

            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Bạn là nhân viên mới hoặc khách thuê có mã mời?
              </Typography>
              <Button
                component={RouterLink}
                to="/activate"
                variant="outlined"
                color="secondary"
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  mt: 1,
                }}
              >
                Kích hoạt tài khoản bằng mã mời
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};
