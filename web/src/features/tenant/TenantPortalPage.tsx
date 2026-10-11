import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import RoomIcon from '@mui/icons-material/MeetingRoom';
import ReceiptIcon from '@mui/icons-material/ReceiptLong';
import TicketIcon from '@mui/icons-material/ReportProblem';
import PeopleIcon from '@mui/icons-material/People';
import { useAuth } from '../auth/AuthContext';
import { contractsApi } from '../contracts/contractsApi';
import { ContractMemberResponse, ContractSummary } from '../contracts/types';
import { formatMoney } from '../../shared/money';

export const TenantPortalPage: React.FC = () => {
  const { user } = useAuth();
  const [contracts, setContracts] = useState<ContractSummary[]>([]);
  const [members, setMembers] = useState<ContractMemberResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTenantContracts = async () => {
      try {
        setLoading(true);
        const data = await contractsApi.listContracts();
        setContracts(data);
        if (data.length > 0) {
          const active = data.find((c) => c.status === 'ACTIVE') || data[0];
          const mems = await contractsApi.listContractMembers(active.id);
          setMembers(mems);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Không thể tải thông tin hợp đồng');
      } finally {
        setLoading(false);
      }
    };

    loadTenantContracts();
  }, []);

  const activeContract = contracts.find((c) => c.status === 'ACTIVE') || (contracts.length > 0 ? contracts[0] : null);

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: { xs: 2, md: 3 } }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={800} letterSpacing={-0.5} gutterBottom>
          Xin chào, {user?.fullName || user?.login}!
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Cổng thông tin cư dân TroHub - Theo dõi thông tin phòng thuê, hợp đồng và thành viên cùng phòng.
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Grid thẻ chức năng */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <RoomIcon color="primary" />
                <Typography variant="h6" fontWeight={700}>
                  Phòng đang ở
                </Typography>
              </Box>
              {loading ? (
                <CircularProgress size={24} />
              ) : activeContract ? (
                <Box>
                  <Typography variant="h5" fontWeight={800} color="primary" gutterBottom>
                    Phòng {activeContract.roomNumber}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {activeContract.buildingName}
                  </Typography>
                  <Typography variant="caption" color="text.disabled" display="block" mt={1}>
                    Thời hạn: {activeContract.actualStartDate} → {activeContract.plannedEndExclusive}
                  </Typography>
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Bạn hiện chưa có hợp đồng thuê hoạt động nào.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <ReceiptIcon color="warning" />
                <Typography variant="h6" fontWeight={700}>
                  Giá thuê & Tiền cọc
                </Typography>
              </Box>
              {loading ? (
                <CircularProgress size={24} />
              ) : activeContract ? (
                <Box>
                  <Typography variant="body1">
                    Tiền phòng: <strong>{formatMoney(activeContract.rent)}/tháng</strong>
                  </Typography>
                  <Typography variant="body2" color="text.secondary" mt={0.5}>
                    Tiền cọc quy định: {formatMoney(activeContract.depositRequired)}
                  </Typography>
                  <Chip
                    label={activeContract.status === 'ACTIVE' ? 'Hợp đồng có hiệu lực' : activeContract.status}
                    color="success"
                    size="small"
                    sx={{ mt: 1.5, fontWeight: 600 }}
                  />
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Không có dữ liệu hợp đồng
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', height: '100%' }}>
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
              <Chip label="Sẵn sàng gửi phản ánh" color="info" size="small" variant="outlined" />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Chi tiết thành viên cùng phòng */}
      {activeContract && (
        <Paper sx={{ p: 3, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
          <Stack direction="row" alignItems="center" spacing={1} mb={2}>
            <PeopleIcon color="primary" />
            <Typography variant="h6" fontWeight={700}>
              Danh sách thành viên đăng ký cùng phòng ({members.length})
            </Typography>
          </Stack>
          <Divider sx={{ mb: 2 }} />

          {members.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Chưa có danh sách thành viên.
            </Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead sx={{ backgroundColor: 'rgba(0,0,0,0.02)' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Họ và tên</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Số điện thoại</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>CCCD</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Ngày vào ở</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Vai trò</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {members.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell sx={{ fontWeight: 600 }}>{m.fullName}</TableCell>
                      <TableCell>{m.phone}</TableCell>
                      <TableCell>{m.citizenIdMasked}</TableCell>
                      <TableCell>{m.joinedOn}</TableCell>
                      <TableCell>
                        {m.isRepresentative ? (
                          <Chip label="Đại diện hợp đồng" color="primary" size="small" />
                        ) : (
                          <Chip label="Người ở cùng" size="small" variant="outlined" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}
    </Box>
  );
};
