import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Tabs,
  Tab,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  CircularProgress,
  Alert,
  Tooltip,
  Snackbar,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import RoomIcon from '@mui/icons-material/MeetingRoom';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import ApartmentIcon from '@mui/icons-material/Apartment';
import FloorIcon from '@mui/icons-material/Layers';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../shared/api/client';
import { ApiResponse } from '../auth/types';
import { BuildingItem, FloorItem, RoomItem, RoomStatus } from './types';
import { useAuth } from '../auth/AuthContext';
import { formatMoney, isMoney } from '../../shared/money';

export const BuildingsPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Dialog Tòa nhà
  const [createBuildingOpen, setCreateBuildingOpen] = useState(false);
  const [buildingName, setBuildingName] = useState('');
  const [buildingAddress, setBuildingAddress] = useState('');
  const [buildingError, setBuildingError] = useState<string | null>(null);
  const [editingBuilding, setEditingBuilding] = useState<BuildingItem | null>(null);

  // Dialog Tầng
  const [createFloorOpen, setCreateFloorOpen] = useState(false);
  const [floorName, setFloorName] = useState('');
  const [floorOrder, setFloorOrder] = useState('1');

  // Dialog Phòng
  const [createRoomOpen, setCreateRoomOpen] = useState(false);
  const [roomNumber, setRoomNumber] = useState('');
  const [roomFloorId, setRoomFloorId] = useState<string>('');
  const [roomPrice, setRoomPrice] = useState('3000000');
  const [roomDeposit, setRoomDeposit] = useState('3000000');
  const [roomArea, setRoomArea] = useState('20');
  const [roomMaxTenants, setRoomMaxTenants] = useState('2');
  const [roomError, setRoomError] = useState<string | null>(null);
  const [editingRoom, setEditingRoom] = useState<RoomItem | null>(null);
  const openRoom = (room: RoomItem | null) => {
    setEditingRoom(room); setRoomNumber(room?.roomNumber ?? ''); setRoomFloorId(room?.floorId ?? '');
    setRoomPrice(String(room?.basePrice ?? '3000000')); setRoomDeposit(String(room?.depositAmount ?? '3000000'));
    setRoomArea(String(room?.area ?? '20')); setRoomMaxTenants(String(room?.maxTenants ?? '2'));
    setRoomError(null); setCreateRoomOpen(true);
  };

  const [snackbarMsg, setSnackbarMsg] = useState<string | null>(null);

  // 1. Fetch Buildings
  const { data: buildings = [], isLoading: loadingBuildings, refetch: refetchBuildings } = useQuery({
    queryKey: ['buildings'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<BuildingItem[]>>('/buildings');
      const list = res.data.data || [];
      if (list.length > 0 && !selectedBuildingId) {
        setSelectedBuildingId(list[0].id);
      }
      return list;
    },
  });

  const activeBuildingId = selectedBuildingId || (buildings.length > 0 ? buildings[0].id : null);

  // 2. Fetch Floors của tòa nhà đang chọn
  const { data: floors = [] } = useQuery({
    queryKey: ['floors', activeBuildingId],
    queryFn: async () => {
      if (!activeBuildingId) return [];
      const res = await apiClient.get<ApiResponse<FloorItem[]>>(`/buildings/${activeBuildingId}/floors`);
      return res.data.data || [];
    },
    enabled: !!activeBuildingId,
  });

  // 3. Fetch Rooms của tòa nhà đang chọn
  const { data: rooms = [], isLoading: loadingRooms } = useQuery({
    queryKey: ['rooms', activeBuildingId, filterStatus],
    queryFn: async () => {
      if (!activeBuildingId) return [];
      const url =
        filterStatus === 'ALL'
          ? `/buildings/${activeBuildingId}/rooms`
          : `/buildings/${activeBuildingId}/rooms?status=${filterStatus}`;
      const res = await apiClient.get<ApiResponse<RoomItem[]>>(url);
      return res.data.data || [];
    },
    enabled: !!activeBuildingId,
  });

  // Mutation: Tạo tòa nhà mới
  const createBuildingMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: buildingName.trim(),
        address: buildingAddress.trim(),
      };
      const res = editingBuilding ? await apiClient.put<ApiResponse<BuildingItem>>(`/buildings/${editingBuilding.id}`,payload)
        : await apiClient.post<ApiResponse<BuildingItem>>('/buildings',payload);
      return res.data.data;
    },
    onSuccess: (newB) => {
      queryClient.invalidateQueries({ queryKey: ['buildings'] });
      setCreateBuildingOpen(false);
      setBuildingName('');
      setBuildingAddress('');
      setSelectedBuildingId(newB.id);
      setSnackbarMsg('Đã lưu tòa nhà');
    },
    onError: (err: any) => {
      setBuildingError(err.response?.data?.error?.message || err.message || 'Lỗi tạo tòa nhà');
    },
  });

  // Mutation: Tạo tầng mới
  const createFloorMutation = useMutation({
    mutationFn: async () => {
      if (!activeBuildingId) return;
      await apiClient.post<ApiResponse<FloorItem>>(`/buildings/${activeBuildingId}/floors`, {
        name: floorName.trim(),
        floorOrder: parseInt(floorOrder, 10),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['floors', activeBuildingId] });
      setCreateFloorOpen(false);
      setFloorName('');
      setSnackbarMsg('Thêm tầng mới thành công!');
    },
    onError: (err: any) => {
      setSnackbarMsg(err.response?.data?.error?.message || 'Lỗi tạo tầng');
    },
  });

  // Mutation: Tạo phòng mới
  const createRoomMutation = useMutation({
    mutationFn: async () => {
      if (!activeBuildingId) throw new Error('Chọn tòa nhà trước khi thêm phòng');
      if (!isMoney(roomPrice) || !isMoney(roomDeposit)) throw new Error('Giá thuê và cọc phải là số nguyên VNĐ, tối đa 19 chữ số');
      const payload = {
        floorId: roomFloorId || null,
        roomNumber: roomNumber.trim(),
        basePrice: roomPrice,
        depositAmount: roomDeposit,
        area: parseFloat(roomArea) || 20,
        maxTenants: parseInt(roomMaxTenants, 10) || 2,
        bookable: editingRoom?.bookable ?? true,
      };
      if (editingRoom) await apiClient.put(`/rooms/${editingRoom.id}`,payload);
      else await apiClient.post(`/buildings/${activeBuildingId}/rooms`,payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms', activeBuildingId] });
      queryClient.invalidateQueries({ queryKey: ['buildings'] });
      setCreateRoomOpen(false);
      setRoomNumber('');
      setRoomError(null);
      setSnackbarMsg('Đã lưu phòng');
    },
    onError: (err: any) => {
      setRoomError(err.response?.data?.error?.message || err.message || 'Lỗi tạo phòng');
    },
  });

  // Mutation: Toggle bookable
  const toggleBookableMutation = useMutation({
    mutationFn: async ({ roomId, bookable }: { roomId: string; bookable: boolean }) => {
      await apiClient.patch(`/rooms/${roomId}/bookable`, { bookable });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms', activeBuildingId] });
      setSnackbarMsg('Cập nhật trạng thái cho thuê thành công!');
    },
    onError: (err: any) => {
      setSnackbarMsg(err.response?.data?.error?.message || 'Không thể đổi trạng thái phòng');
    },
  });

  const formatVND = (amount: string | number) => {
    return formatMoney(amount);
  };

  const statusConfig: Record<RoomStatus, { label: string; color: 'success' | 'primary' | 'warning' | 'default' }> = {
    VACANT: { label: 'Trống', color: 'success' },
    RENTED: { label: 'Đang thuê', color: 'primary' },
    DEPOSIT_RESERVED: { label: 'Đã cọc', color: 'warning' },
    MAINTENANCE: { label: 'Bảo trì', color: 'default' },
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <div>
          <Typography variant="h5" fontWeight={700} gutterBottom>
            Khu nhà & Phòng trọ
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Quản lý danh sách tòa nhà, sơ đồ tầng và tình trạng phòng trọ
          </Typography>
        </div>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => refetchBuildings()}>
            Làm mới
          </Button>
          {user?.role === 'OWNER' && (
            <Button
              variant="contained"
              startIcon={<ApartmentIcon />}
              onClick={() => {
                setBuildingError(null);
                setEditingBuilding(null); setBuildingName(''); setBuildingAddress('');
                setCreateBuildingOpen(true);
              }}
            >
              Thêm tòa nhà
            </Button>
          )}
        </Box>
      </Box>

      {/* Tòa nhà Tabs */}
      {loadingBuildings ? (
        <CircularProgress size={30} />
      ) : buildings.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
          <Typography variant="body1" color="text.secondary">
            Chưa có tòa nhà nào trong hệ thống.
          </Typography>
        </Paper>
      ) : (
        <Paper sx={{ mb: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <Tabs
            value={activeBuildingId}
            onChange={(_, val) => setSelectedBuildingId(val)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ px: 2, pt: 1 }}
          >
            {buildings.map((b) => (
              <Tab
                key={b.id}
                value={b.id}
                label={
                  <Box sx={{ textAlign: 'left', py: 0.5 }}>
                    <Typography variant="subtitle2" fontWeight={700}>
                      {b.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {b.vacantRooms} trống / {b.totalRooms} phòng
                    </Typography>
                  </Box>
                }
                sx={{ textTransform: 'none', minWidth: 160 }}
              />
            ))}
          </Tabs>
        </Paper>
      )}

      {/* Toolbar lọc phòng & Thêm phòng/tầng */}
      {activeBuildingId && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {['ALL', 'VACANT', 'RENTED', 'DEPOSIT_RESERVED', 'MAINTENANCE'].map((st) => (
              <Chip
                key={st}
                label={st === 'ALL' ? 'Tất cả' : statusConfig[st as RoomStatus]?.label}
                color={filterStatus === st ? 'primary' : 'default'}
                variant={filterStatus === st ? 'filled' : 'outlined'}
                onClick={() => setFilterStatus(st)}
                clickable
              />
            ))}
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {user?.role === 'OWNER' && <>
            <Button onClick={() => {const b=buildings.find(item=>item.id===activeBuildingId);if(!b)return;setEditingBuilding(b);setBuildingName(b.name);setBuildingAddress(b.address);setBuildingError(null);setCreateBuildingOpen(true);}}>Sửa tòa nhà</Button>
            <Button onClick={async()=>{const b=buildings.find(item=>item.id===activeBuildingId);if(!b)return;try{await apiClient.patch(`/buildings/${b.id}/active`,null,{params:{active:!b.active}});await refetchBuildings();}catch(e:any){setSnackbarMsg(e.response?.data?.error?.message??'Không thể cập nhật tòa nhà');}}}>{buildings.find(b=>b.id===activeBuildingId)?.active?'Lưu trữ tòa nhà':'Mở lại tòa nhà'}</Button>
            <Button variant="outlined" size="small" startIcon={<FloorIcon />} onClick={() => setCreateFloorOpen(true)}>
              Thêm tầng
            </Button>
            </>}
            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              onClick={() => {
                openRoom(null);
              }}
            >
              Thêm phòng
            </Button>
          </Box>
        </Box>
      )}

      {/* Grid danh sách phòng */}
      {loadingRooms ? (
        <Box sx={{ py: 6, textAlign: 'center' }}>
          <CircularProgress />
        </Box>
      ) : rooms.length === 0 ? (
        <Paper sx={{ p: 5, textAlign: 'center', borderRadius: 3, border: '1px dashed', borderColor: 'divider' }}>
          <RoomIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
          <Typography variant="body1" color="text.secondary">
            Tòa nhà chưa có phòng trọ nào. Nhấn "Thêm phòng" để bắt đầu thiết lập.
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={2.5}>
          {rooms.map((room) => {
            const st = statusConfig[room.status];
            return (
              <Grid item xs={12} sm={6} md={4} lg={3} key={room.id}>
                <Card
                  sx={{
                    borderRadius: 3,
                    border: '1px solid',
                    borderColor: 'divider',
                    transition: 'all 0.2s',
                    '&:hover': {
                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
                      borderColor: 'primary.main',
                    },
                  }}
                >
                  <CardContent sx={{ p: 2.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Box>
                        <Typography variant="h6" fontWeight={800} color="text.primary">
                          {room.roomNumber}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {room.floorName || 'Tầng chưa gán'}
                        </Typography>
                      </Box>
                      <Chip label={st.label} color={st.color} size="small" sx={{ fontWeight: 700 }} />
                    </Box>

                    <Typography variant="h6" color="primary.main" fontWeight={700} sx={{ mt: 1 }}>
                      {formatVND(room.basePrice)}
                    </Typography>

                    <Box sx={{ mt: 1.5, display: 'flex', gap: 2, color: 'text.secondary', fontSize: '0.85rem' }}>
                      <span>Cọc: {formatVND(room.depositAmount)}</span>
                      <span>•</span>
                      <span>{room.area || 20} m²</span>
                      <span>•</span>
                      <span>Tối đa {room.maxTenants} người</span>
                    </Box>
                  </CardContent>

                  <CardActions sx={{ px: 2.5, pb: 2, pt: 0, justifyContent: 'space-between' }}>
                    <Button size="small" onClick={()=>openRoom(room)}>Sửa phòng</Button>
                    <Chip
                      label={room.bookable ? 'Cho phép thuê' : 'Đang khóa thuê'}
                      size="small"
                      color={room.bookable ? 'success' : 'default'}
                      variant="outlined"
                    />
                    <Tooltip title={room.bookable ? 'Khóa thuê tạm thời' : 'Mở cho phép thuê'}>
                      <IconButton
                        size="small"
                        color={room.bookable ? 'warning' : 'success'}
                        onClick={() => toggleBookableMutation.mutate({ roomId: room.id, bookable: !room.bookable })}
                      >
                        {room.bookable ? <LockIcon fontSize="small" /> : <LockOpenIcon fontSize="small" />}
                      </IconButton>
                    </Tooltip>
                  </CardActions>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Dialog Thêm Tòa Nhà */}
      <Dialog open={createBuildingOpen} onClose={() => setCreateBuildingOpen(false)} maxWidth="xs" fullWidth>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createBuildingMutation.mutate();
          }}
        >
          <DialogTitle fontWeight={700}>{editingBuilding?'Sửa tòa nhà':'Thêm tòa nhà mới'}</DialogTitle>
          <DialogContent>
            {buildingError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {buildingError}
              </Alert>
            )}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <TextField
                label="Tên tòa nhà"
                placeholder="vd: TroHub Cầu Giấy"
                required
                fullWidth
                value={buildingName}
                onChange={(e) => setBuildingName(e.target.value)}
              />
              <TextField
                label="Địa chỉ chi tiết"
                placeholder="vd: Số 12, Ngõ 45 Cầu Giấy, Hà Nội"
                required
                fullWidth
                value={buildingAddress}
                onChange={(e) => setBuildingAddress(e.target.value)}
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button onClick={() => setCreateBuildingOpen(false)}>Hủy</Button>
            <Button type="submit" variant="contained" disabled={createBuildingMutation.isPending}>
              {createBuildingMutation.isPending ? 'Đang lưu...' : 'Lưu tòa nhà'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Dialog Thêm Tầng */}
      <Dialog open={createFloorOpen} onClose={() => setCreateFloorOpen(false)} maxWidth="xs" fullWidth>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createFloorMutation.mutate();
          }}
        >
          <DialogTitle fontWeight={700}>Thêm tầng mới</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <TextField
                label="Tên tầng"
                placeholder="vd: Tầng 1, Tầng 2, Tầng G"
                required
                fullWidth
                value={floorName}
                onChange={(e) => setFloorName(e.target.value)}
              />
              <TextField
                label="Số thứ tự tầng (để sắp xếp)"
                type="number"
                required
                fullWidth
                value={floorOrder}
                onChange={(e) => setFloorOrder(e.target.value)}
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button onClick={() => setCreateFloorOpen(false)}>Hủy</Button>
            <Button type="submit" variant="contained" disabled={createFloorMutation.isPending}>
              Tạo tầng
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Dialog Thêm Phòng */}
      <Dialog open={createRoomOpen} onClose={() => setCreateRoomOpen(false)} maxWidth="sm" fullWidth>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createRoomMutation.mutate();
          }}
        >
          <DialogTitle fontWeight={700}>{editingRoom?'Sửa phòng':'Thêm phòng trọ mới'}</DialogTitle>
          <DialogContent>
            {roomError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {roomError}
              </Alert>
            )}
            <Grid container spacing={2} sx={{ pt: 1 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Số / Mã phòng"
                  placeholder="vd: P.101, P.202"
                  required
                  fullWidth
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  label="Thuộc tầng"
                  fullWidth
                  value={roomFloorId}
                  onChange={(e) => setRoomFloorId(e.target.value)}
                >
                  <MenuItem value="">
                    <em>Không gán tầng</em>
                  </MenuItem>
                  {floors.map((f) => (
                    <MenuItem key={f.id} value={f.id}>
                      {f.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Giá thuê cơ bản (VNĐ / tháng)"
                  type="number"
                  required
                  fullWidth
                  value={roomPrice}
                  onChange={(e) => setRoomPrice(e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Tiền cọc quy định (VNĐ)"
                  type="number"
                  required
                  fullWidth
                  value={roomDeposit}
                  onChange={(e) => setRoomDeposit(e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Diện tích (m²)"
                  type="number"
                  fullWidth
                  value={roomArea}
                  onChange={(e) => setRoomArea(e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Sức chứa tối đa (người)"
                  type="number"
                  fullWidth
                  value={roomMaxTenants}
                  onChange={(e) => setRoomMaxTenants(e.target.value)}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button onClick={() => setCreateRoomOpen(false)}>Hủy</Button>
            <Button type="submit" variant="contained" disabled={createRoomMutation.isPending}>
              {createRoomMutation.isPending ? 'Đang lưu...' : 'Lưu phòng'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Snackbar
        open={!!snackbarMsg}
        autoHideDuration={4000}
        onClose={() => setSnackbarMsg(null)}
        message={snackbarMsg}
      />
    </Box>
  );
};
