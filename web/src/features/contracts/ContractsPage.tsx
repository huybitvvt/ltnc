import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import UpdateIcon from '@mui/icons-material/Update';
import KeyIcon from '@mui/icons-material/Key';
import PeopleIcon from '@mui/icons-material/People';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { contractsApi } from './contractsApi';
import { BuildingItem, RoomItem } from '../property/types';
import { ContractMemberResponse, ContractSummary, RoomMeterResponse, TenantSummary } from './types';
import { useAuth } from '../auth/AuthContext';

export const ContractsPage: React.FC = () => {
  const { user } = useAuth();
  const [contracts, setContracts] = useState<ContractSummary[]>([]);
  const [buildings, setBuildings] = useState<BuildingItem[]>([]);
  const [tenants, setTenants] = useState<TenantSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modal tạo hợp đồng mới
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('');
  const [availableRooms, setAvailableRooms] = useState<RoomItem[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(
    new Date(Date.now() + 180 * 24 * 3600 * 1000).toISOString().split('T')[0]
  );
  const [rentPrice, setRentPrice] = useState<string>('');
  const [depositAmount, setDepositAmount] = useState<string>('');
  const [isNewTenantMode, setIsNewTenantMode] = useState(false);
  const [newTenantName, setNewTenantName] = useState('');
  const [newTenantPhone, setNewTenantPhone] = useState('');
  const [newTenantCitizenId, setNewTenantCitizenId] = useState('');
  const [newTenantEmail, setNewTenantEmail] = useState('');

  // Modal chi tiết & thao tác
  const [detailOpen, setDetailOpen] = useState(false);
  const [activeContract, setActiveContract] = useState<ContractSummary | null>(null);
  const [members, setMembers] = useState<ContractMemberResponse[]>([]);
  const [roomMeters, setRoomMeters] = useState<RoomMeterResponse[]>([]);
  const [detailTab, setDetailTab] = useState(0);

  // Kích hoạt nhận phòng (Handover)
  const [activateOpen, setActivateOpen] = useState(false);
  const [elecReading, setElecReading] = useState<string>('0.000');
  const [waterReading, setWaterReading] = useState<string>('0.000');

  // Gia hạn hợp đồng (Extend)
  const [extendOpen, setExtendOpen] = useState(false);
  const [newEndDate, setNewEndDate] = useState<string>('');
  const [extendReason, setExtendReason] = useState<string>('');

  // Thêm thành viên (Add member)
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [memberTenantId, setMemberTenantId] = useState<string>('');
  const [memberJoinedDate, setMemberJoinedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Cấp mã mời
  const [inviteCodeInfo, setInviteCodeInfo] = useState<{ code: string; expiresAt: string } | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [contractsData, buildingsData, tenantsData] = await Promise.all([
        contractsApi.listContracts(statusFilter === 'ALL' ? undefined : { status: statusFilter }),
        contractsApi.listBuildings(),
        contractsApi.listTenants(),
      ]);
      setContracts(contractsData);
      setBuildings(buildingsData);
      setTenants(tenantsData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể tải danh sách hợp đồng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  // Khi chọn tòa nhà trong modal tạo hợp đồng, load các phòng
  useEffect(() => {
    if (!selectedBuildingId) {
      setAvailableRooms([]);
      return;
    }
    contractsApi.listRooms(selectedBuildingId).then((rooms: RoomItem[]) => {
      // Lọc phòng bookable và chưa có người ở
      const bookable = rooms.filter((r: RoomItem) => r.bookable && r.status === 'VACANT');
      setAvailableRooms(bookable);
      if (bookable.length > 0) {
        setSelectedRoomId(bookable[0].id);
        setRentPrice(String(bookable[0].basePrice));
        setDepositAmount(String(bookable[0].depositAmount));
      } else {
        setSelectedRoomId('');
      }
    });
  }, [selectedBuildingId]);

  const handleRoomChange = (roomId: string) => {
    setSelectedRoomId(roomId);
    const r = availableRooms.find((rm: RoomItem) => rm.id === roomId);
    if (r) {
      setRentPrice(String(r.basePrice));
      setDepositAmount(String(r.depositAmount));
    }
  };

  const handleOpenDetail = async (c: ContractSummary) => {
    setActiveContract(c);
    setDetailTab(0);
    setDetailOpen(true);
    try {
      const [membersData, metersData] = await Promise.all([
        contractsApi.listContractMembers(c.id),
        contractsApi.getRoomMeters(c.roomId),
      ]);
      setMembers(membersData);
      setRoomMeters(metersData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể tải thông tin chi tiết hợp đồng');
    }
  };

  const handleCreateContract = async () => {
    try {
      setError(null);
      let tenantIdToUse = selectedTenantId;

      if (isNewTenantMode) {
        if (!newTenantName || !newTenantPhone || !newTenantCitizenId) {
          setError('Vui lòng điền đủ họ tên, SĐT và CCCD người thuê');
          return;
        }
        const createdTenant = await contractsApi.createTenant({
          fullName: newTenantName,
          phone: newTenantPhone,
          citizenId: newTenantCitizenId,
          email: newTenantEmail || undefined,
        });
        tenantIdToUse = createdTenant.id;
      }

      if (!selectedRoomId || !tenantIdToUse || !startDate || !endDate || !rentPrice) {
        setError('Vui lòng nhập đầy đủ các thông tin bắt buộc');
        return;
      }

      await contractsApi.createContractDraft({
        roomId: selectedRoomId,
        representativeTenantId: tenantIdToUse,
        actualStartDate: startDate,
        plannedEndExclusive: endDate,
        rent: rentPrice,
        depositRequired: depositAmount || '0',
      });

      setSuccess('Đã lập bản nháp hợp đồng thành công!');
      setCreateOpen(false);
      setIsNewTenantMode(false);
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Lỗi khi tạo hợp đồng');
    }
  };

  const handleActivateContract = async () => {
    if (!activeContract) return;
    try {
      setError(null);
      const readings = [
        {
          meterType: 'ELECTRICITY' as const,
          readingDate: activeContract.actualStartDate,
          value: elecReading || '0.000',
        },
        {
          meterType: 'WATER' as const,
          readingDate: activeContract.actualStartDate,
          value: waterReading || '0.000',
        },
      ];

      const updated = await contractsApi.activateContract(activeContract.id, readings);
      setActiveContract(updated);
      setSuccess(`Kích hoạt nhận phòng ${updated.roomNumber} thành công! Phòng đã chuyển sang trạng thái ĐANG THUÊ.`);
      setActivateOpen(false);
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Lỗi khi kích hoạt nhận phòng');
    }
  };

  const handleExtendContract = async () => {
    if (!activeContract) return;
    try {
      setError(null);
      if (!newEndDate || !extendReason) {
        setError('Vui lòng chọn ngày gia hạn mới và lý do gia hạn');
        return;
      }
      const updated = await contractsApi.extendContract(activeContract.id, {
        newPlannedEndExclusive: newEndDate,
        reason: extendReason,
      });
      setActiveContract(updated);
      setSuccess('Gia hạn hợp đồng thành công! Thời hạn đã được cập nhật.');
      setExtendOpen(false);
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Lỗi khi gia hạn hợp đồng');
    }
  };

  const handleAddMember = async () => {
    if (!activeContract) return;
    try {
      setError(null);
      if (!memberTenantId) {
        setError('Vui lòng chọn người thuê');
        return;
      }
      const newMember = await contractsApi.addContractMember(activeContract.id, {
        tenantId: memberTenantId,
        joinedOn: memberJoinedDate,
      });
      setMembers([...members, newMember]);
      setSuccess('Đã thêm thành viên vào phòng thành công!');
      setAddMemberOpen(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Lỗi khi thêm thành viên');
    }
  };

  const handleIssueInvite = async () => {
    if (!activeContract) return;
    try {
      setError(null);
      const invite = await contractsApi.issueTenantInvite(activeContract.representativeTenantId);
      setInviteCodeInfo({ code: invite.inviteCode, expiresAt: invite.expiresAt });
      setSuccess(`Mã mời đã được cấp: ${invite.inviteCode} (Hạn dùng 24h)`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể tạo mã mời');
    }
  };

  const formatMoney = (val?: string) => {
    if (!val) return '0 ₫';
    return Number(val).toLocaleString('vi-VN') + ' ₫';
  };

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return <Chip label="Bản nháp" color="warning" size="small" sx={{ fontWeight: 600 }} />;
      case 'ACTIVE':
        return <Chip label="Đang thuê" color="success" size="small" sx={{ fontWeight: 600 }} />;
      case 'ENDED':
        return <Chip label="Đã kết thúc" color="default" size="small" />;
      default:
        return <Chip label={status} size="small" />;
    }
  };

  const isManager = user?.role === 'OWNER' || user?.role === 'STAFF';

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1400, mx: 'auto' }}>
      {/* Header */}
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={2} mb={3}>
        <Box>
          <Typography variant="h4" fontWeight={800} sx={{ background: 'linear-gradient(45deg, #1976d2, #00b0ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Quản lý Hợp đồng & Cư dân
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Theo dõi vòng đời hợp đồng DRAFT → ACTIVE → ENDED, bàn giao điện nước và quản lý thành viên cư trú
          </Typography>
        </Box>
        {isManager && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              if (buildings.length > 0) setSelectedBuildingId(buildings[0].id);
              if (tenants.length > 0) setSelectedTenantId(tenants[0].id);
              setCreateOpen(true);
            }}
            sx={{ borderRadius: 2, px: 3, py: 1, boxShadow: 3, fontWeight: 700 }}
          >
            Lập hợp đồng mới
          </Button>
        )}
      </Stack>

      {/* Notifications */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Filters */}
      <Card sx={{ mb: 3, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
        <Tabs
          value={statusFilter}
          onChange={(_, val) => setStatusFilter(val)}
          indicatorColor="primary"
          textColor="primary"
          variant="scrollable"
          scrollButtons="auto"
          sx={{ px: 2, pt: 1 }}
        >
          <Tab value="ALL" label="Tất cả hợp đồng" sx={{ fontWeight: 700 }} />
          <Tab value="DRAFT" label="Bản nháp (Chờ nhận phòng)" sx={{ fontWeight: 700 }} />
          <Tab value="ACTIVE" label="Đang thuê (Đang ở)" sx={{ fontWeight: 700 }} />
          <Tab value="ENDED" label="Đã kết thúc" sx={{ fontWeight: 700 }} />
        </Tabs>
      </Card>

      {/* Contract List */}
      <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
            <CircularProgress />
          </Box>
        ) : contracts.length === 0 ? (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary">
              Không tìm thấy hợp đồng nào
            </Typography>
            <Typography variant="body2" color="text.disabled" mt={1}>
              {statusFilter !== 'ALL' ? 'Thử chọn bộ lọc khác hoặc lập hợp đồng mới' : 'Hãy bắt đầu lập hợp đồng thuê đầu tiên'}
            </Typography>
          </Box>
        ) : (
          <TableContainer component={Paper} elevation={0}>
            <Table>
              <TableHead sx={{ backgroundColor: 'rgba(25, 118, 210, 0.05)' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Phòng / Tòa nhà</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Người đại diện</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Thời hạn thuê</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Giá thuê / tháng</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Tiền cọc</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Trạng thái</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Thao tác</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {contracts.map((c) => (
                  <TableRow key={c.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                    <TableCell>
                      <Typography variant="subtitle2" fontWeight={700} color="primary">
                        Phòng {c.roomNumber}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {c.buildingName}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {c.representativeName}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {c.actualStartDate} → {c.plannedEndExclusive}
                      </Typography>
                      {c.status === 'ENDED' && c.actualCheckoutDate && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          (Trả: {c.actualCheckoutDate})
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {formatMoney(c.rent)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatMoney(c.depositRequired)}
                      </Typography>
                    </TableCell>
                    <TableCell>{getStatusChip(c.status)}</TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<VisibilityIcon />}
                        onClick={() => handleOpenDetail(c)}
                        sx={{ borderRadius: 2 }}
                      >
                        Chi tiết
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

      {/* Modal Lập Hợp Đồng Mới */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>Lập Bản Nháp Hợp Đồng Thuê Mới</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                label="Chọn Tòa nhà"
                value={selectedBuildingId}
                onChange={(e) => setSelectedBuildingId(e.target.value)}
              >
                {buildings.map((b) => (
                  <MenuItem key={b.id} value={b.id}>
                    {b.name} ({b.address})
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                label="Chọn Phòng trống"
                value={selectedRoomId}
                onChange={(e) => handleRoomChange(e.target.value)}
                disabled={availableRooms.length === 0}
                helperText={availableRooms.length === 0 ? 'Không có phòng trống sẵn sàng' : ''}
              >
                {availableRooms.map((r) => (
                  <MenuItem key={r.id} value={r.id}>
                    Phòng {r.roomNumber} (Sức chứa: {r.maxTenants} người - Giá: {formatMoney(String(r.basePrice))})
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="subtitle2" fontWeight={700}>
                  Người Đại Diện Thuê Phòng
                </Typography>
                <Button size="small" onClick={() => setIsNewTenantMode(!isNewTenantMode)}>
                  {isNewTenantMode ? 'Chọn người thuê đã có' : '+ Tạo người thuê mới'}
                </Button>
              </Stack>
            </Grid>

            {!isNewTenantMode ? (
              <Grid item xs={12}>
                <TextField
                  select
                  fullWidth
                  label="Hồ sơ người đại diện"
                  value={selectedTenantId}
                  onChange={(e) => setSelectedTenantId(e.target.value)}
                >
                  {tenants.map((t) => (
                    <MenuItem key={t.id} value={t.id}>
                      {t.fullName} - {t.phone} ({t.citizenIdMasked})
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            ) : (
              <>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Họ và tên"
                    required
                    value={newTenantName}
                    onChange={(e) => setNewTenantName(e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Số điện thoại"
                    required
                    value={newTenantPhone}
                    onChange={(e) => setNewTenantPhone(e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Số CCCD"
                    required
                    value={newTenantCitizenId}
                    onChange={(e) => setNewTenantCitizenId(e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Email (tùy chọn)"
                    value={newTenantEmail}
                    onChange={(e) => setNewTenantEmail(e.target.value)}
                  />
                </Grid>
              </>
            )}

            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" fontWeight={700} mb={1}>
                Thời Hạn & Chi Phí (Quy tắc nửa mở [Start, End))
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="date"
                label="Ngày bắt đầu (Nhận phòng)"
                InputLabelProps={{ shrink: true }}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="date"
                label="Ngày kết thúc dự kiến (Không tính ngày này)"
                InputLabelProps={{ shrink: true }}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                helperText="Cận cuối không bao gồm (BR-038)"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Giá thuê cố định (VND/tháng)"
                required
                value={rentPrice}
                onChange={(e) => setRentPrice(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Tiền cọc thỏa thuận (VND)"
                required
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setCreateOpen(false)}>Hủy</Button>
          <Button variant="contained" onClick={handleCreateContract} sx={{ fontWeight: 700 }}>
            Lập Hợp Đồng Nháp
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal Chi Tiết Hợp Đồng & Bàn Giao */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
          Chi Tiết Hợp Đồng - Phòng {activeContract?.roomNumber} ({activeContract?.buildingName})
        </DialogTitle>
        <DialogContent dividers>
          {activeContract && (
            <Box>
              {/* Header Badge */}
              <Stack direction="row" spacing={2} alignItems="center" mb={2}>
                {getStatusChip(activeContract.status)}
                <Typography variant="body2" color="text.secondary">
                  Thời hạn: <strong>{activeContract.actualStartDate}</strong> đến <strong>{activeContract.plannedEndExclusive}</strong>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Tiền thuê: <strong>{formatMoney(activeContract.rent)}/tháng</strong>
                </Typography>
              </Stack>

              {/* Action Buttons for Managers */}
              {isManager && (
                <Stack direction="row" spacing={1} flexWrap="wrap" mb={3}>
                  {activeContract.status === 'DRAFT' && (
                    <Button
                      variant="contained"
                      color="success"
                      startIcon={<CheckCircleIcon />}
                      onClick={() => setActivateOpen(true)}
                    >
                      Bàn Giao & Kích Hoạt Nhận Phòng
                    </Button>
                  )}
                  {activeContract.status === 'ACTIVE' && (
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<UpdateIcon />}
                      onClick={() => {
                        setNewEndDate(activeContract.plannedEndExclusive);
                        setExtendOpen(true);
                      }}
                    >
                      Gia Hạn Hợp Đồng
                    </Button>
                  )}
                  <Button
                    variant="outlined"
                    startIcon={<KeyIcon />}
                    onClick={handleIssueInvite}
                  >
                    Cấp Mã Mời Tài Khoản
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<PeopleIcon />}
                    onClick={() => setAddMemberOpen(true)}
                    disabled={activeContract.status === 'ENDED'}
                  >
                    + Thêm Người Ở
                  </Button>
                </Stack>
              )}

              {inviteCodeInfo && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  Mã mời tài khoản cho người đại diện: <strong>{inviteCodeInfo.code}</strong> (Hết hạn: {new Date(inviteCodeInfo.expiresAt).toLocaleString('vi-VN')})
                </Alert>
              )}

              {/* Tabs */}
              <Tabs value={detailTab} onChange={(_, v) => setDetailTab(v)} sx={{ mb: 2 }}>
                <Tab label={`Thành viên cùng phòng (${members.length})`} sx={{ fontWeight: 700 }} />
                <Tab label="Đồng hồ & Chỉ số" sx={{ fontWeight: 700 }} />
              </Tabs>

              {detailTab === 0 && (
                <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: 2 }}>
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
                              <Chip label="Thành viên" size="small" variant="outlined" />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}

              {detailTab === 1 && (
                <Box>
                  <Typography variant="subtitle2" fontWeight={700} mb={1}>
                    Đồng hồ đo phòng {activeContract.roomNumber}
                  </Typography>
                  {roomMeters.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      Chưa có cấu hình đồng hồ riêng. Hệ thống sẽ tự động gán đồng hồ khi kích hoạt bàn giao.
                    </Typography>
                  ) : (
                    <Stack spacing={1}>
                      {roomMeters.map((mtr) => (
                        <Paper key={mtr.id} sx={{ p: 1.5, border: '1px solid #e0e0e0', borderRadius: 2 }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Box>
                              <Typography variant="body2" fontWeight={700}>
                                {mtr.type === 'ELECTRICITY' ? '⚡ Công tơ Điện' : '💧 Đồng hồ Nước'} - Seri: {mtr.serial}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Ngày lắp: {mtr.installedOn} | Chỉ số gốc: {mtr.initialReading}
                              </Typography>
                            </Box>
                            <Chip label={mtr.active ? 'Đang hoạt động' : 'Tạm khóa'} size="small" color={mtr.active ? 'success' : 'default'} />
                          </Stack>
                        </Paper>
                      ))}
                    </Stack>
                  )}
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailOpen(false)}>Đóng</Button>
        </DialogActions>
      </Dialog>

      {/* Modal Kích Hoạt Nhận Phòng (Handover) */}
      <Dialog open={activateOpen} onClose={() => setActivateOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Bàn Giao & Kích Hoạt Nhận Phòng</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Ghi nhận chỉ số điện và nước thực tế tại thời điểm bàn giao chìa khóa cho khách:
          </Typography>
          <TextField
            fullWidth
            type="number"
            label="Chỉ số Điện bàn giao (kWh)"
            required
            value={elecReading}
            onChange={(e) => setElecReading(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            type="number"
            label="Chỉ số Nước bàn giao (m³)"
            required
            value={waterReading}
            onChange={(e) => setWaterReading(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setActivateOpen(false)}>Hủy</Button>
          <Button variant="contained" color="success" onClick={handleActivateContract} sx={{ fontWeight: 700 }}>
            Xác Nhận Kích Hoạt
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal Gia Hạn Hợp Đồng */}
      <Dialog open={extendOpen} onClose={() => setExtendOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Gia Hạn Hợp Đồng</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Gia hạn sẽ tăng thời hạn kết thúc dự kiến và giữ nguyên giá thuê thỏa thuận ban đầu (BR-040).
          </Typography>
          <TextField
            fullWidth
            type="date"
            label="Ngày kết thúc mới"
            InputLabelProps={{ shrink: true }}
            required
            value={newEndDate}
            onChange={(e) => setNewEndDate(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            multiline
            rows={2}
            label="Lý do gia hạn"
            required
            value={extendReason}
            onChange={(e) => setExtendReason(e.target.value)}
            placeholder="Khách ký tiếp thêm 6 tháng..."
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setExtendOpen(false)}>Hủy</Button>
          <Button variant="contained" onClick={handleExtendContract} sx={{ fontWeight: 700 }}>
            Lưu Gia Hạn
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal Thêm Thành Viên */}
      <Dialog open={addMemberOpen} onClose={() => setAddMemberOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Thêm Người Ở Cùng Phòng</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Chọn hồ sơ người ở để đăng ký cư trú vào hợp đồng:
          </Typography>
          <TextField
            select
            fullWidth
            label="Chọn người thuê"
            required
            value={memberTenantId}
            onChange={(e) => setMemberTenantId(e.target.value)}
            sx={{ mb: 2 }}
          >
            {tenants.map((t) => (
              <MenuItem key={t.id} value={t.id}>
                {t.fullName} - {t.phone}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            fullWidth
            type="date"
            label="Ngày bắt đầu ở"
            InputLabelProps={{ shrink: true }}
            required
            value={memberJoinedDate}
            onChange={(e) => setMemberJoinedDate(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setAddMemberOpen(false)}>Hủy</Button>
          <Button variant="contained" onClick={handleAddMember} sx={{ fontWeight: 700 }}>
            Thêm Thành Viên
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
