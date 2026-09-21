import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Text, Surface, Button, Chip, Dialog, TextInput, HelperText, Portal, IconButton, useTheme } from 'react-native-paper';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mobileApiClient } from '../auth/mobileClient';
import { ApiResponse } from '../auth/types';

export type RoomStatus = 'VACANT' | 'RENTED' | 'DEPOSIT_RESERVED' | 'MAINTENANCE';

export interface BuildingItem {
  id: string;
  name: string;
  address: string;
  totalRooms: number;
  vacantRooms: number;
}

export interface RoomItem {
  id: string;
  buildingId: string;
  roomNumber: string;
  floorName?: string;
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
  const queryClient = useQueryClient();

  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Dialog thêm phòng
  const [createRoomOpen, setCreateRoomOpen] = useState(false);
  const [roomNumber, setRoomNumber] = useState('');
  const [basePrice, setBasePrice] = useState('3000000');
  const [depositAmount, setDepositAmount] = useState('3000000');
  const [dialogError, setDialogError] = useState<string | null>(null);

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
      if (!activeBuildingId) return;
      await mobileApiClient.post(`/buildings/${activeBuildingId}/rooms`, {
        roomNumber: roomNumber.trim(),
        basePrice,
        depositAmount,
        area: 20,
        maxTenants: 2,
        bookable: true,
      });
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
  });

  const formatVND = (val: string | number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(val));
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
        <Button mode="contained" compact icon="plus" onPress={() => setCreateRoomOpen(true)}>
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
                  />
                </View>
              </Surface>
            );
          })
        )}
      </ScrollView>

      {/* Dialog Thêm Phòng */}
      <Portal>
        <Dialog visible={createRoomOpen} onDismiss={() => setCreateRoomOpen(false)}>
          <Dialog.Title>Thêm phòng mới</Dialog.Title>
          <Dialog.Content>
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
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setCreateRoomOpen(false)}>Hủy</Button>
            <Button
              onPress={() => createRoomMutation.mutate()}
              loading={createRoomMutation.isPending}
              disabled={createRoomMutation.isPending}
            >
              Tạo phòng
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
