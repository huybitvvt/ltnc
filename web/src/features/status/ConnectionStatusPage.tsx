import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  CircularProgress,
  Stack,
  Container,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import RefreshIcon from '@mui/icons-material/Refresh';

export const ConnectionStatusPage: React.FC = () => {
  const { data, error, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['backendHealth'],
    queryFn: async () => {
      const startTime = performance.now();
      const res = await axios.get('/actuator/health');
      const latency = Math.round(performance.now() - startTime);
      return { data: res.data, latency };
    },
    retry: 1,
  });

  const isConnected = !error && data?.data?.status === 'UP';

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Card elevation={3}>
        <CardContent sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h5" component="h1" gutterBottom fontWeight="bold">
            TroHub — Trạng thái Kết nối Hệ thống
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            Kiểm tra kết nối giữa Frontend React Web và Backend Spring Boot API
          </Typography>

          {isLoading ? (
            <CircularProgress sx={{ my: 4 }} />
          ) : (
            <Stack spacing={3} alignItems="center" sx={{ my: 2 }}>
              {isConnected ? (
                <>
                  <CheckCircleIcon sx={{ fontSize: 64, color: 'success.main' }} />
                  <Chip label="ĐÃ KẾT NỐI BACKEND (UP)" color="success" size="medium" />
                  <Typography variant="body2" color="text.secondary">
                    Độ trễ phản hồi: <strong>{data?.latency} ms</strong>
                  </Typography>
                </>
              ) : (
                <>
                  <ErrorIcon sx={{ fontSize: 64, color: 'warning.main' }} />
                  <Chip
                    label={error ? 'CHƯA KẾT NỐI BACKEND' : 'TRẠNG THÁI KHÔNG XÁC ĐỊNH'}
                    color="warning"
                    size="medium"
                  />
                  <Typography variant="body2" color="text.secondary">
                    {error
                      ? 'Backend chưa được khởi động trên cổng 8080 hoặc proxy chưa kết nối.'
                      : 'Đang chờ phản hồi từ /actuator/health.'}
                  </Typography>
                </>
              )}

              <Box sx={{ mt: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={isFetching ? <CircularProgress size={16} /> : <RefreshIcon />}
                  onClick={() => refetch()}
                  disabled={isFetching}
                >
                  Kiểm tra lại
                </Button>
              </Box>
            </Stack>
          )}

          <Box sx={{ mt: 4, pt: 2, borderTop: 1, borderColor: 'divider' }}>
            <Typography variant="caption" color="text.secondary">
              TroHub v1.0.0 — Web Scaffold B1 • React 18 + Vite + Material UI
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
};
