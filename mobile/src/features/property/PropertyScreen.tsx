import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Text, Surface, Button, Chip, Dialog, TextInput, HelperText, Portal, IconButton, useTheme } from 'react-native-paper';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mobileApiClient } from '../auth/mobileClient';
import { ApiResponse } from '../auth/types';
import { formatMoney, isMoney } from '../../shared/money';
import { useMobileAuth } from '../auth/AuthContext';

export type RoomStatus = 'VACANT' | 'RENTED' | 'DEPOSIT_RESERVED' | 'MAINTENANCE';

export interface BuildingItem {
  id: string;
  name: string;
  address: string;
  totalRooms: number;
  vacantRooms: number;
  active: boolean;
}

export interface RoomItem {
  id: string;
  buildingId: string;
  roomNumber: string;
  floorName?: string;
  floorId?: string;
  basePrice: string | number;
  depositAmount: string | number;
  area?: number;
  maxTenants: number;
  bookable: boolean;
  status: RoomStatus;
}

interface PropertyScreenProps {
  onBack: () => void;
}

export const PropertyScreen: React.FC<PropertyScreenProps> = ({ onBack }) => {
  const theme = useTheme();
  const { user } = useMobileAuth();
  const queryClient = useQueryClient();

  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Dialog thêm phòng
  const [createRoomOpen, setCreateRoomOpen] = useState(false);
  const [roomNumber, setRoomNumber] = useState('');
  const [basePrice, setBasePrice] = useState('3000000');
  const [depositAmount, setDepositAmount] = useState('3000000');
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [editingRoom, setEditingRoom] = useState<RoomItem | null>(null);
  const [floorId, setFloorId] = useState('');
  const [area, setArea] = useState('20');
  const [capacity, setCapacity] = useState('2');
  const [buildingOpen, setBuildingOpen] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState<BuildingItem | null>(null);
  const [buildingName, setBuildingName] = useState('');
  const [buildingAddress, setBuildingAddress] = useState('');
  const [floorOpen, setFloorOpen] = useState(false);
  const [floorName, setFloorName] = useState('');
  const [floorOrder, setFloorOrder] = useState('1');
  const [commandBusy, setCommandBusy] = useState(false);
  const [commandError, setCommandError] = useState('');
  async function command(action: () => Promise<void>) {
    setCommandBusy(true); setCommandError('');
    try { await action(); await queryClient.invalidateQueries({queryKey:['mobileBuildings']}); }
    catch (e: any) { setCommandError(e.response?.data?.error?.message ?? 'Không thực hiện được yêu cầu'); }
    finally { setCommandBusy(false); }
  }
  function openRoom(room: RoomItem | null) {
    setEditingRoom(room); setRoomNumber(room?.roomNumber ?? '');
    setBasePrice(String(room?.basePrice ?? '3000000')); setDepositAmount(String(room?.depositAmount ?? '3000000'));
    setFloorId(room?.floorId ?? ''); setArea(String(room?.area ?? '20')); setCapacity(String(room?.maxTenants ?? 2));
    setDialogError(null); setCreateRoomOpen(true);
  }

  // 1. Fetch buildings
  const { data: buildings = [], isLoading: loadingBuildings, refetch: refetchBuildings } = useQuery({
    queryKey: ['mobileBuildings'],
    queryFn: async () => {
      const res = await mobileApiClient.get<ApiResponse<BuildingItem[]>>('/buildings');
      const list = res.data.data || [];
      if (list.length > 0 && !selectedBuildingId) {
        setSelectedBuildingId(list[0].id);
      }
      return list;
    },
  });

  const activeBuildingId = selectedBuildingId || (buildings.length > 0 ? buildings[0].id : null);
  const currentBuilding = buildings.find(b => b.id === activeBuildingId);
  const floors = useQuery({queryKey:['mobileFloors', activeBuildingId],enabled:!!activeBuildingId,
    queryFn:async()=> (await mobileApiClient.get<ApiResponse<Array<{id:string;name:string}>>>(`/buildings/${activeBuildingId}/floors`)).data.data});

  // 2. Fetch rooms
  const { data: rooms = [], isLoading: loadingRooms, refetch: refetchRooms, isFetching } = useQuery({
    queryKey: ['mobileRooms', activeBuildingId, filterStatus],
    queryFn: async () => {
      if (!activeBuildingId) return [];
      const url =
        filterStatus === 'ALL'
          ? `/buildings/${activeBuildingId}/rooms`
          : `/buildings/${activeBuildingId}/rooms?status=${filterStatus}`;
      const res = await mobileApiClient.get<ApiResponse<RoomItem[]>>(url);
      return res.data.data || [];
    },
    enabled: !!activeBuildingId,
  });

  // Mutation: Tạo phòng mới
  const createRoomMutation = useMutation({
    mutationFn: async () => {
      if (!activeBuildingId) throw new Error('Chọn tòa nhà trước khi thêm phòng');
      if (!isMoney(basePrice) || !isMoney(depositAmount)) throw new Error('Giá thuê và cọc phải là số nguyên VNĐ, tối đa 19 chữ số');
      if (!/^\d+$/.test(capacity) || Number(capacity) < 1) throw new Error('Sức chứa phải là số nguyên dương');
      const payload = {
        roomNumber: roomNumber.trim(),
        basePrice,
        depositAmount,
        floorId: floorId || null,
        area: Number(area),
        maxTenants: Number(capacity),
        bookable: editingRoom?.bookable ?? true,
      };
      if (editingRoom) await mobileApiClient.put(`/rooms/${editingRoom.id}`, payload);
      else await mobileApiClient.post(`/buildings/${activeBuildingId}/rooms`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mobileRooms', activeBuildingId] });
      queryClient.invalidateQueries({ queryKey: ['mobileBuildings'] });
      setCreateRoomOpen(false);
      setRoomNumber('');
      setDialogError(null);
    },
    onError: (err: any) => {
      setDialogError(err.response?.data?.error?.message || err.message || 'Lỗi thêm phòng');
    },
  });

  // Mutation: Toggle bookable
  const toggleBookableMutation = useMutation({
    mutationFn: async ({ roomId, bookable }: { roomId: string; bookable: boolean }) => {
      await mobileApiClient.patch(`/rooms/${roomId}/bookable`, { bookable });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mobileRooms', activeBuildingId] });
    },
    onError: (e: any) => setCommandError(e.response?.data?.error?.message ?? 'Không thể đổi trạng thái cho thuê'),
  });

  const formatVND = (val: string | number) => {
    return formatMoney(val);
  };

  const statusConfig: Record<RoomStatus, { label: string; color: string }> = {
    VACANT: { label: 'Trống', color: '#10b981' },
    RENTED: { label: 'Đang thuê', color: '#2563eb' },
    DEPOSIT_RESERVED: { label: 'Đã cọc', color: '#f59e0b' },
    MAINTENANCE: { label: 'Bảo trì', color: '#64748b' },
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <IconButton icon="arrow-left" onPress={onBack} size={24} />
        <Text variant="titleMedium" style={styles.headerTitle}>
          Khu nhà & Phòng trọ
        </Text>
        <Button mode="contained" compact icon="plus" disabled={!activeBuildingId} onPress={() => openRoom(null)}>
          Thêm phòng
        </Button>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={() => {
          refetchBuildings();
          refetchRooms();
        }} />}
      >
        {!!commandError && <HelperText type="error">{commandError}</HelperText>}
        {user?.role === 'OWNER' && <View style={{gap:8, marginBottom:12}}>
          <Button disabled={commandBusy} onPress={() => {setEditingBuilding(null);setBuildingName('');setBuildingAddress('');setBuildingOpen(true);}}>Thêm tòa nhà</Button>
          {!!currentBuilding && <>
            <Button disabled={commandBusy} onPress={() => {setEditingBuilding(currentBuilding);setBuildingName(currentBuilding.name);setBuildingAddress(currentBuilding.address);setBuildingOpen(true);}}>Sửa tòa nhà</Button>
            <Button disabled={commandBusy} onPress={() => command(async()=>{await mobileApiClient.patch(`/buildings/${currentBuilding.id}/active`, null, {params:{active:!currentBuilding.active}});})}>{currentBuilding.active?'Lưu trữ tòa nhà':'Mở lại tòa nhà'}</Button>
            <Button disabled={commandBusy} onPress={() => {setFloorName('');setFloorOrder('1');setFloorOpen(true);}}>Thêm tầng</Button>
          </>}
        </View>}
        {/* Buildings Selector */}
        {buildings.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.buildingTabs}>
            {buildings.map((b) => {
              const selected = b.id === activeBuildingId;
              return (
                <Chip
                  key={b.id}
                  selected={selected}
                  onPress={() => setSelectedBuildingId(b.id)}
                  style={[styles.buildingChip, selected && { backgroundColor: theme.colors.primary }]}
                  textStyle={{ color: selected ? '#ffffff' : '#1e293b', fontWeight: '700' }}
                >
                  {b.name} ({b.vacantRooms}/{b.totalRooms})
                </Chip>
              );
            })}
          </ScrollView>
        )}

        {/* Status Filter Chips */}
        <View style={styles.filterRow}>
          {['ALL', 'VACANT', 'RENTED', 'DEPOSIT_RESERVED'].map((st) => (
            <Chip
              key={st}
              compact
              selected={filterStatus === st}
              onPress={() => setFilterStatus(st)}
              style={styles.filterChip}
            >
              {st === 'ALL' ? 'Tất cả' : statusConfig[st as RoomStatus]?.label}
            </Chip>
          ))}
        </View>

        {/* Room List */}
        {loadingRooms ? (
          <Text style={styles.emptyText}>Đang tải danh sách phòng...</Text>
        ) : rooms.length === 0 ? (
          <Surface style={styles.emptyCard} elevation={1}>
            <Text style={styles.emptyText}>Chưa có phòng nào trong danh mục này</Text>
          </Surface>
        ) : (
          rooms.map((room) => {
            const st = statusConfig[room.status];
            return (
              <Surface key={room.id} style={styles.roomCard} elevation={1}>
                <View style={styles.roomHeader}>
                  <View>
                    <Text variant="titleLarge" style={styles.roomNumber}>
                      {room.roomNumber}
                    </Text>
                    <Text variant="bodySmall" style={styles.floorText}>
                      {room.floorName || 'Chưa gán tầng'}
                    </Text>
                  </View>
                  <Chip
                    style={{ backgroundColor: st.color }}
                    textStyle={{ color: '#ffffff', fontWeight: '700', fontSize: 11 }}
                  >
                    {st.label}
                  </Chip>
                </View>

                <View style={styles.priceRow}>
                  <Text variant="titleMedium" style={[styles.priceText, { color: theme.colors.primary }]}>
                    {formatVND(room.basePrice)}
                  </Text>
                  <Text variant="bodySmall" style={styles.depositText}>
                    Cọc: {formatVND(room.depositAmount)}
                  </Text>
                </View>

                <View style={styles.roomFooter}>
                  <Chip
                    compact
                    mode="outlined"
                    style={room.bookable ? styles.chipBookable : styles.chipLocked}
                  >
                    {room.bookable ? 'Cho phép thuê' : 'Đang khóa thuê'}
                  </Chip>
                  <IconButton
                    icon={room.bookable ? 'lock' : 'lock-open'}
                    size={20}
                    iconColor={room.bookable ? '#f59e0b' : '#10b981'}
                    onPress={() => toggleBookableMutation.mutate({ roomId: room.id, bookable: !room.bookable })}
                    disabled={toggleBookableMutation.isPending}
                  />
                  <Button onPress={() => openRoom(room)}>Sửa phòng</Button>
                </View>
              </Surface>
            );
          })
        )}
      </ScrollView>

      {/* Dialog Thêm Phòng */}
      <Portal>
        <Dialog visible={buildingOpen} onDismiss={() => !commandBusy && setBuildingOpen(false)}>
          <Dialog.Title>{editingBuilding?'Sửa tòa nhà':'Thêm tòa nhà'}</Dialog.Title>
          <Dialog.Content>
            {!!commandError && <HelperText type="error">{commandError}</HelperText>}
            <TextInput label="Tên tòa nhà" value={buildingName} onChangeText={setBuildingName} />
            <TextInput label="Địa chỉ" value={buildingAddress} onChangeText={setBuildingAddress} />
          </Dialog.Content>
          <Dialog.Actions><Button disabled={commandBusy} onPress={()=>setBuildingOpen(false)}>Hủy</Button>
            <Button loading={commandBusy} disabled={commandBusy || !buildingName.trim() || !buildingAddress.trim()} onPress={()=>command(async()=>{
              const payload={name:buildingName.trim(),address:buildingAddress.trim()};
              if(editingBuilding) await mobileApiClient.put(`/buildings/${editingBuilding.id}`,payload);
              else {const res=await mobileApiClient.post('/buildings',payload);setSelectedBuildingId(res.data.data.id);}
              setBuildingOpen(false);
            })}>Lưu</Button></Dialog.Actions>
        </Dialog>
        <Dialog visible={floorOpen} onDismiss={()=>!commandBusy && setFloorOpen(false)}>
          <Dialog.Title>Thêm tầng</Dialog.Title><Dialog.Content>
            {!!commandError && <HelperText type="error">{commandError}</HelperText>}
            <TextInput label="Tên tầng" value={floorName} onChangeText={setFloorName} />
            <TextInput label="Thứ tự tầng" value={floorOrder} onChangeText={setFloorOrder} keyboardType="numeric" />
          </Dialog.Content><Dialog.Actions><Button disabled={commandBusy} onPress={()=>setFloorOpen(false)}>Hủy</Button>
            <Button disabled={commandBusy || !floorName.trim() || !/^-?\d+$/.test(floorOrder)} onPress={()=>command(async()=>{
              await mobileApiClient.post(`/buildings/${activeBuildingId}/floors`,{name:floorName.trim(),floorOrder:Number(floorOrder)});
              await floors.refetch();setFloorOpen(false);
            })}>Lưu</Button></Dialog.Actions>
        </Dialog>
        <Dialog visible={createRoomOpen} onDismiss={() => setCreateRoomOpen(false)}>
          <Dialog.Title>{editingRoom?'Sửa phòng':'Thêm phòng mới'}</Dialog.Title>
          <Dialog.ScrollArea><ScrollView keyboardShouldPersistTaps="handled" style={{maxHeight:400,padding:16}}>
            {dialogError && (
              <HelperText type="error" visible={!!dialogError}>
                {dialogError}
              </HelperText>
            )}
            <TextInput
              label="Số / Mã phòng"
              placeholder="vd: P.101"
              value={roomNumber}
              onChangeText={setRoomNumber}
              mode="outlined"
              style={styles.dialogInput}
            />
            <TextInput
              label="Giá thuê (VNĐ)"
              value={basePrice}
              onChangeText={setBasePrice}
              keyboardType="numeric"
              mode="outlined"
              style={styles.dialogInput}
            />
            <TextInput
              label="Tiền cọc (VNĐ)"
              value={depositAmount}
              onChangeText={setDepositAmount}
              keyboardType="numeric"
              mode="outlined"
              style={styles.dialogInput}
            />
            <TextInput label="Diện tích (m²)" value={area} onChangeText={setArea} keyboardType="decimal-pad" style={styles.dialogInput} />
            <TextInput label="Sức chứa" value={capacity} onChangeText={setCapacity} keyboardType="numeric" style={styles.dialogInput} />
            <Text>Chọn tầng</Text><Button onPress={()=>setFloorId('')} mode={!floorId?'contained':'text'}>Chưa gán tầng</Button>
            {floors.data?.map(floor=><Button key={floor.id} mode={floorId===floor.id?'contained':'text'} onPress={()=>setFloorId(floor.id)}>{floor.name}</Button>)}
          </ScrollView></Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setCreateRoomOpen(false)}>Hủy</Button>
            <Button
              onPress={() => createRoomMutation.mutate()}
              loading={createRoomMutation.isPending}
              disabled={createRoomMutation.isPending}
            >
              Lưu phòng
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: {
    fontWeight: '700',
    color: '#0f172a',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  buildingTabs: {
    marginBottom: 12,
  },
  buildingChip: {
    marginRight: 8,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    height: 32,
  },
  emptyCard: {
    padding: 32,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  emptyText: {
    color: '#64748b',
    textAlign: 'center',
    marginTop: 16,
  },
  roomCard: {
    padding: 16,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    marginBottom: 12,
  },
  roomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  roomNumber: {
    fontWeight: '800',
    color: '#1e293b',
  },
  floorText: {
    color: '#64748b',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  priceText: {
    fontWeight: '800',
  },
  depositText: {
    color: '#64748b',
  },
  roomFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 8,
  },
  chipBookable: {
    backgroundColor: '#ecfdf5',
  },
  chipLocked: {
    backgroundColor: '#f1f5f9',
  },
  dialogInput: {
    marginBottom: 10,
  },
});
