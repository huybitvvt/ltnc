import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Text, Surface, Button, Chip, Dialog, TextInput, HelperText, Portal, IconButton, useTheme, Divider } from 'react-native-paper';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mobileApiClient } from '../auth/mobileClient';
import { ApiResponse } from '../auth/types';
import { ContractMemberResponse, ContractSummary, RoomMeterResponse, TenantSummary } from './types';
import { useMobileAuth } from '../auth/AuthContext';

interface ContractsScreenProps {
  onBack: () => void;
}

export const ContractsScreen: React.FC<ContractsScreenProps> = ({ onBack }) => {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { user } = useMobileAuth();
  const isManager = user?.role === 'OWNER' || user?.role === 'STAFF';

  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modal Chi tiết & Thành viên
  const [detailContract, setDetailContract] = useState<ContractSummary | null>(null);
  const [members, setMembers] = useState<ContractMemberResponse[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Modal Kích hoạt nhận phòng (Handover)
  const [activateContract, setActivateContract] = useState<ContractSummary | null>(null);
  const [elecReading, setElecReading] = useState('0.000');
  const [waterReading, setWaterReading] = useState('0.000');
  const [activateError, setActivateError] = useState<string | null>(null);

  // Modal Gia hạn hợp đồng
  const [extendContract, setExtendContract] = useState<ContractSummary | null>(null);
  const [newEndDate, setNewEndDate] = useState('');
  const [extendReason, setExtendReason] = useState('');
  const [extendError, setExtendError] = useState<string | null>(null);

  // Modal Thêm thành viên
  const [addMemberContract, setAddMemberContract] = useState<ContractSummary | null>(null);
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [joinedDate, setJoinedDate] = useState(new Date().toISOString().split('T')[0]);
  const [memberError, setMemberError] = useState<string | null>(null);

  // Modal Mã mời
  const [inviteResult, setInviteResult] = useState<{ code: string; expiresAt: string } | null>(null);

  // 1. Fetch contracts
  const { data: contracts = [], isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['mobileContracts', statusFilter],
    queryFn: async () => {
      const q = statusFilter !== 'ALL' ? `?status=${statusFilter}` : '';
      const res = await mobileApiClient.get<ApiResponse<ContractSummary[]>>(`/contracts${q}`);
      return res.data.data || [];
    },
  });

  // 2. Fetch tenants (cho chọn thêm thành viên)
  const { data: tenants = [] } = useQuery({
    queryKey: ['mobileTenants'],
    queryFn: async () => {
      if (!isManager) return [];
      const res = await mobileApiClient.get<ApiResponse<TenantSummary[]>>('/tenants');
      return res.data.data || [];
    },
    enabled: isManager,
  });

  // Kích hoạt nhận phòng
  const activateMutation = useMutation({
    mutationFn: async (contractId: string) => {
      const readings = [
        { meterType: 'ELECTRICITY', readingDate: activateContract?.actualStartDate, value: elecReading || '0.000' },
        { meterType: 'WATER', readingDate: activateContract?.actualStartDate, value: waterReading || '0.000' },
      ];
      await mobileApiClient.post(`/contracts/${contractId}/activate`, { handoverReadings: readings });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mobileContracts'] });
      setActivateContract(null);
    },
    onError: (err: any) => {
      setActivateError(err.response?.data?.message || err.message || 'Lỗi khi kích hoạt nhận phòng');
    },
  });

  // Gia hạn hợp đồng
  const extendMutation = useMutation({
    mutationFn: async (contractId: string) => {
      await mobileApiClient.post(`/contracts/${contractId}/extend`, {
        newPlannedEndExclusive: newEndDate,
        reason: extendReason,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mobileContracts'] });
      setExtendContract(null);
    },
    onError: (err: any) => {
      setExtendError(err.response?.data?.message || err.message || 'Lỗi khi gia hạn');
    },
  });

  // Thêm thành viên
  const addMemberMutation = useMutation({
    mutationFn: async (contractId: string) => {
      await mobileApiClient.post(`/contracts/${contractId}/members`, {
        tenantId: selectedTenantId,
        joinedOn: joinedDate,
      });
    },
    onSuccess: async () => {
      if (detailContract) {
        const res = await mobileApiClient.get<ApiResponse<ContractMemberResponse[]>>(`/contracts/${detailContract.id}/members`);
        setMembers(res.data.data || []);
      }
      setAddMemberContract(null);
    },
    onError: (err: any) => {
      setMemberError(err.response?.data?.message || err.message || 'Lỗi khi thêm người ở');
    },
  });

  // Cấp mã mời
  const issueInvite = async (tenantId: string) => {
    try {
      const res = await mobileApiClient.post<ApiResponse<{ inviteCode: string; expiresAt: string }>>(`/tenants/${tenantId}/invite`);
      setInviteResult({ code: res.data.data.inviteCode, expiresAt: res.data.data.expiresAt });
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể tạo mã mời');
    }
  };

  const handleOpenDetail = async (c: ContractSummary) => {
    setDetailContract(c);
    setLoadingMembers(true);
    try {
      const res = await mobileApiClient.get<ApiResponse<ContractMemberResponse[]>>(`/contracts/${c.id}/members`);
      setMembers(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMembers(false);
    }
  };

  const formatMoney = (val?: string) => {
    if (!val) return '0 ₫';
    return Number(val).toLocaleString('vi-VN') + ' ₫';
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <Surface style={styles.header} elevation={2}>
        <IconButton icon="arrow-left" size={24} onPress={onBack} />
        <View style={styles.headerTitleContainer}>
          <Text variant="titleMedium" style={styles.headerTitle}>Hợp đồng & Cư dân</Text>
          <Text variant="bodySmall" style={styles.headerSubtitle}>
            {contracts.length} hợp đồng trong danh sách
          </Text>
        </View>
      </Surface>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
          <Chip
            selected={statusFilter === 'ALL'}
            onPress={() => setStatusFilter('ALL')}
            style={styles.filterChip}
          >
            Tất cả
          </Chip>
          <Chip
            selected={statusFilter === 'DRAFT'}
            onPress={() => setStatusFilter('DRAFT')}
            style={styles.filterChip}
          >
            Nháp (Chờ nhận phòng)
          </Chip>
          <Chip
            selected={statusFilter === 'ACTIVE'}
            onPress={() => setStatusFilter('ACTIVE')}
            style={styles.filterChip}
          >
            Đang thuê
          </Chip>
          <Chip
            selected={statusFilter === 'ENDED'}
            onPress={() => setStatusFilter('ENDED')}
            style={styles.filterChip}
          >
            Đã kết thúc
          </Chip>
        </ScrollView>
      </View>

      {/* Main List */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isLoading || isRefetching} onRefresh={refetch} />}
      >
        {contracts.length === 0 ? (
          <Surface style={styles.emptyCard} elevation={1}>
            <Text variant="bodyLarge" style={styles.emptyText}>Không tìm thấy hợp đồng nào</Text>
            <Text variant="bodySmall" style={{ color: '#64748b', marginTop: 4 }}>
              Kéo xuống để làm mới danh sách
            </Text>
          </Surface>
        ) : (
          contracts.map((c) => {
            const isDraft = c.status === 'DRAFT';
            const isActive = c.status === 'ACTIVE';

            return (
              <Surface key={c.id} style={styles.contractCard} elevation={2}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text variant="titleMedium" style={{ fontWeight: '800', color: theme.colors.primary }}>
                      Phòng {c.roomNumber}
                    </Text>
                    <Text variant="bodySmall" style={{ color: '#64748b' }}>
                      {c.buildingName}
                    </Text>
                  </View>
                  <Chip
                    mode="flat"
                    style={{
                      backgroundColor:
                        isDraft ? '#fef3c7' : isActive ? '#dcfce7' : '#f1f5f9',
                    }}
                    textStyle={{
                      color:
                        isDraft ? '#d97706' : isActive ? '#16a34a' : '#64748b',
                      fontWeight: '700',
                      fontSize: 11,
                    }}
                  >
                    {isDraft ? 'BẢN NHÁP' : isActive ? 'ĐANG THUÊ' : 'ĐÃ KẾT THÚC'}
                  </Chip>
                </View>

                <Divider style={{ marginVertical: 8 }} />

                <View style={styles.infoRow}>
                  <Text variant="bodySmall" style={styles.label}>Đại diện:</Text>
                  <Text variant="bodySmall" style={styles.value}>{c.representativeName}</Text>
                </View>

                <View style={styles.infoRow}>
                  <Text variant="bodySmall" style={styles.label}>Thời hạn:</Text>
                  <Text variant="bodySmall" style={styles.value}>
                    {c.actualStartDate} → {c.plannedEndExclusive}
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <Text variant="bodySmall" style={styles.label}>Giá thuê:</Text>
                  <Text variant="bodySmall" style={{ fontWeight: '700', color: '#0f172a' }}>
                    {formatMoney(c.rent)}/tháng
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <Text variant="bodySmall" style={styles.label}>Tiền cọc:</Text>
                  <Text variant="bodySmall" style={{ fontWeight: '700', color: '#0f172a' }}>
                    {formatMoney(c.depositRequired)}
                  </Text>
                </View>

                <View style={styles.actionsRow}>
                  <Button
                    mode="outlined"
                    compact
                    onPress={() => handleOpenDetail(c)}
                    style={{ borderRadius: 8 }}
                  >
                    Chi tiết
                  </Button>

                  {isManager && isDraft && (
                    <Button
                      mode="contained"
                      compact
                      buttonColor="#16a34a"
                      onPress={() => {
                        setActivateError(null);
                        setActivateContract(c);
                      }}
                      style={{ borderRadius: 8 }}
                    >
                      Bàn giao & Kích hoạt
                    </Button>
                  )}

                  {isManager && isActive && (
                    <Button
                      mode="contained"
                      compact
                      onPress={() => {
                        setExtendError(null);
                        setNewEndDate(c.plannedEndExclusive);
                        setExtendReason('');
                        setExtendContract(c);
                      }}
                      style={{ borderRadius: 8 }}
                    >
                      Gia hạn
                    </Button>
                  )}
                </View>
              </Surface>
            );
          })
        )}
      </ScrollView>

      {/* Modal Chi tiết & Thành viên */}
      <Portal>
        <Dialog visible={!!detailContract} onDismiss={() => setDetailContract(null)} style={styles.dialog}>
          <Dialog.Title>Chi tiết hợp đồng</Dialog.Title>
          <Dialog.Content>
            <ScrollView style={{ maxHeight: 350 }}>
              <Text variant="bodySmall" style={{ color: '#64748b', marginBottom: 8 }}>
                Tòa nhà: {detailContract?.buildingName}
              </Text>
              <Text variant="bodySmall" style={{ color: '#64748b', marginBottom: 8 }}>
                Đại diện: {detailContract?.representativeName}
              </Text>
              <Text variant="bodySmall" style={{ color: '#64748b', marginBottom: 12 }}>
                Thời hạn: {detailContract?.actualStartDate} đến {detailContract?.plannedEndExclusive}
              </Text>

              {isManager && (
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                  <Button
                    mode="outlined"
                    compact
                    icon="key"
                    onPress={() => {
                      if (detailContract) issueInvite(detailContract.representativeTenantId);
                    }}
                  >
                    Mã mời
                  </Button>
                  <Button
                    mode="outlined"
                    compact
                    icon="account-plus"
                    onPress={() => {
                      setMemberError(null);
                      setAddMemberContract(detailContract);
                    }}
                  >
                    + Người ở
                  </Button>
                </View>
              )}

              <Text variant="titleSmall" style={{ fontWeight: '700', marginTop: 8, marginBottom: 8 }}>
                Thành viên đăng ký cùng phòng ({members.length}):
              </Text>

              {members.length === 0 ? (
                <Text variant="bodySmall" style={{ color: '#94a3b8' }}>Chưa có thành viên nào.</Text>
              ) : (
                members.map((m) => (
                  <Surface key={m.id} style={styles.memberCard} elevation={1}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text variant="bodyMedium" style={{ fontWeight: '700' }}>{m.fullName}</Text>
                      {m.isRepresentative && (
                        <Chip compact style={{ backgroundColor: '#dbeafe' }} textStyle={{ fontSize: 10, color: '#1d4ed8' }}>
                          Đại diện
                        </Chip>
                      )}
                    </View>
                    <Text variant="bodySmall" style={{ color: '#64748b' }}>SĐT: {m.phone} | CCCD: {m.citizenIdMasked}</Text>
                    <Text variant="bodySmall" style={{ color: '#94a3b8' }}>Vào ở từ: {m.joinedOn}</Text>
                  </Surface>
                ))
              )}
            </ScrollView>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDetailContract(null)}>Đóng</Button>
          </Dialog.Actions>
        </Dialog>

        {/* Modal Kích hoạt nhận phòng (Handover) */}
        <Dialog visible={!!activateContract} onDismiss={() => setActivateContract(null)} style={styles.dialog}>
          <Dialog.Title>Bàn giao và nhận phòng</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodySmall" style={{ color: '#64748b', marginBottom: 12 }}>
              Ghi nhận chỉ số bàn giao điện/nước phòng {activateContract?.roomNumber}:
            </Text>
            {activateError && <HelperText type="error">{activateError}</HelperText>}
            <TextInput
              label="Chỉ số Điện ban đầu (kWh)"
              value={elecReading}
              onChangeText={setElecReading}
              keyboardType="decimal-pad"
              mode="outlined"
              style={{ marginBottom: 12 }}
            />
            <TextInput
              label="Chỉ số Nước ban đầu (m³)"
              value={waterReading}
              onChangeText={setWaterReading}
              keyboardType="decimal-pad"
              mode="outlined"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setActivateContract(null)}>Hủy</Button>
            <Button
              mode="contained"
              loading={activateMutation.isPending}
              onPress={() => activateContract && activateMutation.mutate(activateContract.id)}
            >
              Kích hoạt
            </Button>
          </Dialog.Actions>
        </Dialog>

        {/* Modal Gia Hạn Hợp Đồng */}
        <Dialog visible={!!extendContract} onDismiss={() => setExtendContract(null)} style={styles.dialog}>
          <Dialog.Title>Gia hạn hợp đồng</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodySmall" style={{ color: '#64748b', marginBottom: 12 }}>
              Gia hạn giữ nguyên giá thuê phòng theo quy định BR-040:
            </Text>
            {extendError && <HelperText type="error">{extendError}</HelperText>}
            <TextInput
              label="Ngày kết thúc mới (YYYY-MM-DD)"
              value={newEndDate}
              onChangeText={setNewEndDate}
              mode="outlined"
              style={{ marginBottom: 12 }}
            />
            <TextInput
              label="Lý do gia hạn"
              value={extendReason}
              onChangeText={setExtendReason}
              mode="outlined"
              placeholder="Khách ở thêm..."
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setExtendContract(null)}>Hủy</Button>
            <Button
              mode="contained"
              loading={extendMutation.isPending}
              onPress={() => extendContract && extendMutation.mutate(extendContract.id)}
            >
              Lưu
            </Button>
          </Dialog.Actions>
        </Dialog>

        {/* Modal Thêm Người Ở */}
        <Dialog visible={!!addMemberContract} onDismiss={() => setAddMemberContract(null)} style={styles.dialog}>
          <Dialog.Title>Thêm người ở cùng</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodySmall" style={{ color: '#64748b', marginBottom: 12 }}>
              Chọn người ở để đăng ký cư trú:
            </Text>
            {memberError && <HelperText type="error">{memberError}</HelperText>}
            <ScrollView style={{ maxHeight: 150, marginBottom: 12 }}>
              {tenants.map((t) => (
                <Button
                  key={t.id}
                  mode={selectedTenantId === t.id ? 'contained' : 'outlined'}
                  compact
                  onPress={() => setSelectedTenantId(t.id)}
                  style={{ marginBottom: 6 }}
                >
                  {t.fullName} ({t.phone})
                </Button>
              ))}
            </ScrollView>
            <TextInput
              label="Ngày bắt đầu ở (YYYY-MM-DD)"
              value={joinedDate}
              onChangeText={setJoinedDate}
              mode="outlined"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setAddMemberContract(null)}>Hủy</Button>
            <Button
              mode="contained"
              loading={addMemberMutation.isPending}
              disabled={!selectedTenantId}
              onPress={() => addMemberContract && addMemberMutation.mutate(addMemberContract.id)}
            >
              Thêm
            </Button>
          </Dialog.Actions>
        </Dialog>

        {/* Modal Mã Mời */}
        <Dialog visible={!!inviteResult} onDismiss={() => setInviteResult(null)} style={styles.dialog}>
          <Dialog.Title>Mã mời kích hoạt</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ marginBottom: 8 }}>
              Mã mời tài khoản cho người đại diện:
            </Text>
            <Surface style={styles.inviteBox} elevation={2}>
              <Text variant="headlineSmall" style={{ fontWeight: '800', color: theme.colors.primary, letterSpacing: 1 }}>
                {inviteResult?.code}
              </Text>
            </Surface>
            <Text variant="bodySmall" style={{ color: '#64748b', marginTop: 8 }}>
              Hết hạn sau 24 giờ ({inviteResult ? new Date(inviteResult.expiresAt).toLocaleTimeString('vi-VN') : ''}).
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setInviteResult(null)}>Đã xong</Button>
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
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: '#ffffff',
  },
  headerTitleContainer: {
    marginLeft: 4,
  },
  headerTitle: {
    fontWeight: '800',
    color: '#0f172a',
  },
  headerSubtitle: {
    color: '#64748b',
  },
  filterRow: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  filterContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  filterChip: {
    marginRight: 6,
  },
  scrollContent: {
    padding: 12,
    paddingBottom: 40,
  },
  emptyCard: {
    padding: 32,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginTop: 20,
  },
  emptyText: {
    fontWeight: '700',
    color: '#334155',
  },
  contractCard: {
    padding: 16,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 3,
  },
  label: {
    color: '#64748b',
  },
  value: {
    color: '#1e293b',
    fontWeight: '500',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  dialog: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
  },
  memberCard: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    marginBottom: 8,
  },
  inviteBox: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    marginVertical: 8,
  },
});
