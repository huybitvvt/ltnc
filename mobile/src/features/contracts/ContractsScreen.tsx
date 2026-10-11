import { todayInVietnam } from '../../shared/date';
import { isMoney, formatMoney, minMoney } from '../../shared/money';
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import {
  Text,
  Surface,
  Button,
  Chip,
  Dialog,
  TextInput,
  HelperText,
  Portal,
  IconButton,
  useTheme,
  Divider,
} from 'react-native-paper';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mobileApiClient } from '../auth/mobileClient';
import { ApiResponse } from '../auth/types';
import { ContractMemberResponse, ContractSummary, TenantSummary } from './types';
import {
  ContractDepositFinancialStatusResponse,
  DepositLedgerEntryResponse,
} from '../deposits/types';
import { mobileDepositsApi } from '../deposits/depositsApi';
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
  const [, setLoadingMembers] = useState(false);

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
  const [joinedDate, setJoinedDate] = useState(todayInVietnam());
  const [memberError, setMemberError] = useState<string | null>(null);

  // Modal Mã mời
  const [inviteResult, setInviteResult] = useState<{ code: string; expiresAt: string } | null>(null);

  // Modal Sổ cọc & Quyết toán
  const [depositContract, setDepositContract] = useState<ContractSummary | null>(null);
  const [depositData, setDepositData] = useState<ContractDepositFinancialStatusResponse | null>(null);
  const [loadingDeposit, setLoadingDeposit] = useState(false);
  const [depositOpError, setDepositOpError] = useState<string | null>(null);

  // Thao tác cọc: Thu cọc
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptAmount, setReceiptAmount] = useState('');
  const [receiptNote, setReceiptNote] = useState('');
  const [receiptLoading, setReceiptLoading] = useState(false);

  // Thao tác cọc: Hoàn cọc
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [refundLoading, setRefundLoading] = useState(false);

  // Thao tác cọc: Khấu trừ
  const [deductOpen, setDeductOpen] = useState(false);
  const [deductAmount, setDeductAmount] = useState('');
  const [deductReason, setDeductReason] = useState('');
  const [deductLoading, setDeductLoading] = useState(false);

  // Thao tác cọc: Bù nợ hóa đơn
  const [offsetOpen, setOffsetOpen] = useState(false);
  const [offsetInvoiceId, setOffsetInvoiceId] = useState('');
  const [offsetAmount, setOffsetAmount] = useState('');
  const [offsetLoading, setOffsetLoading] = useState(false);
  const [unpaidInvoices, setUnpaidInvoices] = useState<any[]>([]);

  // Quyết toán
  const [settlingDeposit, setSettlingDeposit] = useState(false);

  // Trả phòng (Checkout Wizard)
  const [checkoutContract, setCheckoutContract] = useState<ContractSummary | null>(null);
  const [checkoutDate, setCheckoutDate] = useState(todayInVietnam());
  const [checkoutElec, setCheckoutElec] = useState('0.000');
  const [checkoutWater, setCheckoutWater] = useState('0.000');
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

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

  // Mở sổ cọc
  const handleOpenDeposit = async (c: ContractSummary) => {
    setDepositContract(c);
    setDepositOpError(null);
    setLoadingDeposit(true);
    try {
      const data = await mobileDepositsApi.getContractDepositStatus(c.id);
      setDepositData(data);
    } catch (err: any) {
      console.error(err);
      setDepositOpError(err.response?.data?.message || 'Không thể tải sổ cọc');
    } finally {
      setLoadingDeposit(false);
    }
  };

  const reloadDeposit = async (contractId: string) => {
    try {
      const data = await mobileDepositsApi.getContractDepositStatus(contractId);
      setDepositData(data);
      queryClient.invalidateQueries({ queryKey: ['mobileContracts'] });
    } catch (err) {
      console.error(err);
    }
  };

  const handleRecordReceipt = async () => {
    if (!depositContract) return;
    const num = receiptAmount;
    if (!isMoney(num, false) || BigInt(num) <= 0n) {
      setDepositOpError('Số tiền thu cọc phải > 0');
      return;
    }
    setReceiptLoading(true);
    setDepositOpError(null);
    try {
      await mobileDepositsApi.recordReceipt(
        {
          contractId: depositContract.id,
          amount: String(num),
          paymentMethod: 'BANK_TRANSFER',
          note: receiptNote.trim() || undefined,
        },
        `DEP-REC-${depositContract.id}-${Date.now()}`
      );
      setReceiptOpen(false);
      setReceiptAmount('');
      setReceiptNote('');
      await reloadDeposit(depositContract.id);
    } catch (err: any) {
      setDepositOpError(err.response?.data?.message || 'Lỗi khi thu cọc');
    } finally {
      setReceiptLoading(false);
    }
  };

  const handleRefund = async () => {
    if (!depositContract) return;
    const num = refundAmount;
    if (!isMoney(num, false) || BigInt(num) <= 0n) {
      setDepositOpError('Số tiền hoàn cọc phải > 0');
      return;
    }
    if (!refundReason.trim()) {
      setDepositOpError('Vui lòng nhập lý do hoàn cọc');
      return;
    }
    setRefundLoading(true);
    setDepositOpError(null);
    try {
      await mobileDepositsApi.refundDeposit(
        {
          contractId: depositContract.id,
          amount: String(num),
          reason: refundReason.trim(),
          paymentMethod: 'BANK_TRANSFER',
        },
        `DEP-REF-${depositContract.id}-${Date.now()}`
      );
      setRefundOpen(false);
      setRefundAmount('');
      setRefundReason('');
      await reloadDeposit(depositContract.id);
    } catch (err: any) {
      setDepositOpError(err.response?.data?.message || 'Lỗi khi hoàn cọc');
    } finally {
      setRefundLoading(false);
    }
  };

  const handleDeduct = async () => {
    if (!depositContract) return;
    const num = deductAmount;
    if (!isMoney(num, false) || BigInt(num) <= 0n) {
      setDepositOpError('Số tiền khấu trừ phải > 0');
      return;
    }
    if (!deductReason.trim()) {
      setDepositOpError('Vui lòng nhập lý do khấu trừ (hư hại/phạt)');
      return;
    }
    setDeductLoading(true);
    setDepositOpError(null);
    try {
      await mobileDepositsApi.deductDeposit(
        {
          contractId: depositContract.id,
          amount: String(num),
          reason: deductReason.trim(),
        },
        `DEP-DED-${depositContract.id}-${Date.now()}`
      );
      setDeductOpen(false);
      setDeductAmount('');
      setDeductReason('');
      await reloadDeposit(depositContract.id);
    } catch (err: any) {
      setDepositOpError(err.response?.data?.message || 'Lỗi khi khấu trừ cọc');
    } finally {
      setDeductLoading(false);
    }
  };

  const handleOpenOffset = async () => {
    if (!depositContract) return;
    setDepositOpError(null);
    try {
      const res = await mobileApiClient.get<ApiResponse<any[]>>(`/invoices?contractId=${depositContract.id}`);
      const unpaid = (res.data.data || []).filter(
        (inv: any) => (inv.status === 'ISSUED' || inv.status === 'OVERDUE') && Number(inv.debt || 0) > 0
      );
      setUnpaidInvoices(unpaid);
      if (unpaid.length > 0) {
        setOffsetInvoiceId(unpaid[0].id);
        setOffsetAmount(minMoney(depositData?.depositHeld || '0', unpaid[0].debt || '0'));
      }
      setOffsetOpen(true);
    } catch (err: any) {
      setDepositOpError('Không thể tải danh sách hóa đơn còn nợ');
    }
  };

  const handleOffset = async () => {
    if (!depositContract || !offsetInvoiceId) return;
    const num = offsetAmount;
    if (!isMoney(num, false) || BigInt(num) <= 0n) {
      setDepositOpError('Số tiền bù nợ phải > 0');
      return;
    }
    setOffsetLoading(true);
    setDepositOpError(null);
    try {
      await mobileDepositsApi.offsetToInvoice(
        {
          contractId: depositContract.id,
          invoiceId: offsetInvoiceId,
          amount: String(num),
          note: 'Bù nợ từ sổ cọc trên mobile',
        },
        `DEP-OFF-${depositContract.id}-${offsetInvoiceId}-${Date.now()}`
      );
      setOffsetOpen(false);
      setOffsetInvoiceId('');
      setOffsetAmount('');
      await reloadDeposit(depositContract.id);
    } catch (err: any) {
      setDepositOpError(err.response?.data?.message || 'Lỗi khi bù cọc vào hóa đơn');
    } finally {
      setOffsetLoading(false);
    }
  };

  const handleSettle = async () => {
    if (!depositContract) return;
    setSettlingDeposit(true);
    setDepositOpError(null);
    try {
      await mobileDepositsApi.settleDeposit(
        { contractId: depositContract.id, note: 'Xác nhận quyết toán cọc' },
        `DEP-SETTLE-${depositContract.id}-${Date.now()}`
      );
      await reloadDeposit(depositContract.id);
    } catch (err: any) {
      setDepositOpError(err.response?.data?.message || 'Lỗi khi quyết toán cọc');
    } finally {
      setSettlingDeposit(false);
    }
  };

  const handleConfirmCheckout = async () => {
    if (!checkoutContract) return;
    if (checkoutDate <= checkoutContract.actualStartDate) {
      setCheckoutError('Ngày trả phòng phải sau ngày nhận phòng (BR-037)');
      return;
    }
    setCheckoutLoading(true);
    setCheckoutError(null);
    try {
      const readings = [
        {
          meterType: 'ELECTRICITY' as const,
          readingDate: checkoutDate,
          value: checkoutElec || '0.000',
        },
        {
          meterType: 'WATER' as const,
          readingDate: checkoutDate,
          value: checkoutWater || '0.000',
        },
      ];
      await mobileApiClient.post(`/contracts/${checkoutContract.id}/checkout`, {
        actualCheckoutDate: checkoutDate,
        finalReadings: readings,
      });
      queryClient.invalidateQueries({ queryKey: ['mobileContracts'] });
      const target = checkoutContract;
      setCheckoutContract(null);
      handleOpenDeposit(target);
    } catch (err: any) {
      setCheckoutError(err.response?.data?.message || err.message || 'Lỗi khi trả phòng');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const getDepositStatusChip = (status?: string) => {
    switch (status) {
      case 'NOT_RECEIVED':
        return <Chip compact style={{ backgroundColor: '#f1f5f9' }} textStyle={{ fontSize: 10, color: '#64748b' }}>Chưa cọc</Chip>;
      case 'HOLDING':
        return <Chip compact style={{ backgroundColor: '#e0f2fe' }} textStyle={{ fontSize: 10, color: '#0369a1', fontWeight: '700' }}>Đang giữ cọc</Chip>;
      case 'SETTLING':
        return <Chip compact style={{ backgroundColor: '#fef3c7' }} textStyle={{ fontSize: 10, color: '#b45309', fontWeight: '700' }}>Chờ quyết toán</Chip>;
      case 'SETTLED':
        return <Chip compact style={{ backgroundColor: '#dcfce7' }} textStyle={{ fontSize: 10, color: '#15803d', fontWeight: '700' }}>Đã quyết toán</Chip>;
      default:
        return null;
    }
  };

  const renderDepositEntryType = (type: string) => {
    switch (type) {
      case 'RECEIPT':
        return <Chip compact style={{ backgroundColor: '#dcfce7' }} textStyle={{ fontSize: 10, color: '#15803d', fontWeight: '700' }}>THU CỌC (+)</Chip>;
      case 'RECEIPT_CORRECTION':
        return <Chip compact style={{ backgroundColor: '#fef3c7' }} textStyle={{ fontSize: 10, color: '#b45309', fontWeight: '700' }}>SỬA THU</Chip>;
      case 'REFUND':
        return <Chip compact style={{ backgroundColor: '#fee2e2' }} textStyle={{ fontSize: 10, color: '#b91c1c', fontWeight: '700' }}>HOÀN CỌC (-)</Chip>;
      case 'DEDUCTION':
        return <Chip compact style={{ backgroundColor: '#ffedd5' }} textStyle={{ fontSize: 10, color: '#c2410c', fontWeight: '700' }}>KHẤU TRỪ (-)</Chip>;
      case 'OFFSET_OUT':
        return <Chip compact style={{ backgroundColor: '#ede9fe' }} textStyle={{ fontSize: 10, color: '#6d28d9', fontWeight: '700' }}>BÙ NỢ HĐ (-)</Chip>;
      default:
        return <Chip compact>{type}</Chip>;
    }
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
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text variant="bodySmall" style={{ fontWeight: '700', color: '#0f172a' }}>
                      {formatMoney(c.depositHeld)} / {formatMoney(c.depositRequired)}
                    </Text>
                    {getDepositStatusChip(c.depositStatus)}
                  </View>
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

                  <Button
                    mode="outlined"
                    compact
                    icon="wallet"
                    onPress={() => handleOpenDeposit(c)}
                    style={{ borderRadius: 8 }}
                  >
                    Sổ cọc
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
                      Kích hoạt
                    </Button>
                  )}

                  {isManager && isActive && (
                    <>
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
                      <Button
                        mode="contained"
                        compact
                        buttonColor="#dc2626"
                        onPress={() => {
                          setCheckoutError(null);
                          setCheckoutDate(todayInVietnam());
                          setCheckoutElec('0.000');
                          setCheckoutWater('0.000');
                          setCheckoutContract(c);
                        }}
                        style={{ borderRadius: 8 }}
                      >
                        Trả phòng
                      </Button>
                    </>
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

        {/* Modal Sổ Cọc & Quyết Toán */}
        <Dialog visible={!!depositContract} onDismiss={() => setDepositContract(null)} style={[styles.dialog, { maxHeight: '90%' }]}>
          <Dialog.Title>
            Sổ Cọc: Phòng {depositContract?.roomNumber}
          </Dialog.Title>
          <Dialog.Content>
            <ScrollView style={{ maxHeight: 420 }}>
              {depositOpError && <HelperText type="error">{depositOpError}</HelperText>}

              {loadingDeposit ? (
                <Text variant="bodyMedium" style={{ textAlign: 'center', marginVertical: 20 }}>Đang tải sổ cọc...</Text>
              ) : depositData ? (
                <View>
                  {/* Summary Card */}
                  <Surface style={styles.depositSummaryBox} elevation={2}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <Text variant="titleSmall" style={{ fontWeight: '700', color: '#0369a1' }}>
                        Đang Giữ: {formatMoney(depositData.depositHeld)}
                      </Text>
                      {getDepositStatusChip(depositData.depositStatus)}
                    </View>
                    <Divider style={{ marginVertical: 6 }} />
                    <View style={styles.infoRow}>
                      <Text variant="bodySmall" style={styles.label}>Yêu cầu:</Text>
                      <Text variant="bodySmall" style={{ fontWeight: '600' }}>{formatMoney(depositData.depositRequired)}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text variant="bodySmall" style={styles.label}>Tổng đã thu:</Text>
                      <Text variant="bodySmall" style={{ color: '#16a34a', fontWeight: '600' }}>{formatMoney(depositData.totalReceipt)}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text variant="bodySmall" style={styles.label}>Đã hoàn lại:</Text>
                      <Text variant="bodySmall" style={{ color: '#dc2626', fontWeight: '600' }}>{formatMoney(depositData.totalRefund)}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text variant="bodySmall" style={styles.label}>Đã khấu trừ:</Text>
                      <Text variant="bodySmall" style={{ color: '#d97706', fontWeight: '600' }}>{formatMoney(depositData.totalDeduction)}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text variant="bodySmall" style={styles.label}>Đã bù nợ HĐ:</Text>
                      <Text variant="bodySmall" style={{ color: '#7c3aed', fontWeight: '600' }}>{formatMoney(depositData.totalOffset)}</Text>
                    </View>
                  </Surface>

                  {/* Actions for Manager */}
                  {isManager && depositData.depositStatus !== 'SETTLED' && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 10 }}>
                      <Button
                        mode="contained"
                        compact
                        buttonColor="#0284c7"
                        onPress={() => {
                          setReceiptAmount(depositData.depositRequired);
                          setReceiptNote('');
                          setReceiptOpen(true);
                        }}
                      >
                        + Thu cọc
                      </Button>

                      {Number(depositData.depositHeld) > 0 && (
                        <>
                          <Button
                            mode="outlined"
                            compact
                            textColor="#dc2626"
                            onPress={() => {
                              setRefundAmount(depositData.depositHeld);
                              setRefundReason('');
                              setRefundOpen(true);
                            }}
                          >
                            Hoàn cọc
                          </Button>
                          <Button
                            mode="outlined"
                            compact
                            textColor="#d97706"
                            onPress={() => {
                              setDeductAmount('');
                              setDeductReason('');
                              setDeductOpen(true);
                            }}
                          >
                            Khấu trừ
                          </Button>
                          <Button
                            mode="outlined"
                            compact
                            textColor="#7c3aed"
                            onPress={handleOpenOffset}
                          >
                            Bù nợ HĐ
                          </Button>
                        </>
                      )}

                      {depositContract?.status === 'ENDED' && Number(depositData.depositHeld) === 0 && (
                        <Button
                          mode="contained"
                          compact
                          buttonColor="#16a34a"
                          loading={settlingDeposit}
                          onPress={handleSettle}
                        >
                          Xác nhận quyết toán (SETTLED)
                        </Button>
                      )}
                    </View>
                  )}

                  {/* Ledger entries list */}
                  <Text variant="titleSmall" style={{ fontWeight: '700', marginTop: 10, marginBottom: 6 }}>
                    Lịch sử bút toán sổ cọc ({depositData.entries.length}):
                  </Text>
                  {depositData.entries.length === 0 ? (
                    <Text variant="bodySmall" style={{ color: '#94a3b8' }}>Chưa có bút toán nào.</Text>
                  ) : (
                    depositData.entries.map((entry: DepositLedgerEntryResponse) => (
                      <Surface key={entry.id} style={styles.entryItem} elevation={1}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          {renderDepositEntryType(entry.entryType)}
                          <Text variant="bodyMedium" style={{ fontWeight: '800', color: Number(entry.amount) >= 0 ? '#16a34a' : '#dc2626' }}>
                            {Number(entry.amount) > 0 ? `+${formatMoney(entry.amount)}` : formatMoney(entry.amount)}
                          </Text>
                        </View>
                        {entry.reason ? (
                          <Text variant="bodySmall" style={{ color: '#64748b', marginTop: 4 }}>
                            Lý do: {entry.reason}
                          </Text>
                        ) : null}
                        {entry.note ? (
                          <Text variant="bodySmall" style={{ color: '#64748b', marginTop: 2 }}>
                            Ghi chú: {entry.note}
                          </Text>
                        ) : null}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                          <Text variant="bodySmall" style={{ color: '#94a3b8', fontSize: 10 }}>
                            {entry.paymentMethod || 'HỆ THỐNG'}
                          </Text>
                          <Text variant="bodySmall" style={{ color: '#94a3b8', fontSize: 10 }}>
                            {entry.recordedAt ? new Date(entry.recordedAt).toLocaleString('vi-VN') : ''}
                          </Text>
                        </View>
                      </Surface>
                    ))
                  )}
                </View>
              ) : null}
            </ScrollView>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDepositContract(null)}>Đóng</Button>
          </Dialog.Actions>
        </Dialog>

        {/* Modal Ghi nhận thu cọc */}
        <Dialog visible={receiptOpen} onDismiss={() => setReceiptOpen(false)} style={styles.dialog}>
          <Dialog.Title>Ghi nhận thu tiền cọc</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Số tiền thu cọc (VND)"
              value={receiptAmount}
              onChangeText={setReceiptAmount}
              keyboardType="numeric"
              mode="outlined"
              style={{ marginBottom: 10 }}
            />
            <TextInput
              label="Ghi chú"
              value={receiptNote}
              onChangeText={setReceiptNote}
              mode="outlined"
              placeholder="Chuyển khoản cọc giữ chân..."
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setReceiptOpen(false)}>Hủy</Button>
            <Button mode="contained" loading={receiptLoading} onPress={handleRecordReceipt}>
              Xác nhận thu
            </Button>
          </Dialog.Actions>
        </Dialog>

        {/* Modal Hoàn cọc */}
        <Dialog visible={refundOpen} onDismiss={() => setRefundOpen(false)} style={styles.dialog}>
          <Dialog.Title>Hoàn trả tiền cọc cho khách</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Số tiền hoàn (VND)"
              value={refundAmount}
              onChangeText={setRefundAmount}
              keyboardType="numeric"
              mode="outlined"
              style={{ marginBottom: 10 }}
            />
            <TextInput
              label="Lý do hoàn cọc"
              value={refundReason}
              onChangeText={setRefundReason}
              mode="outlined"
              placeholder="Hoàn cọc khi kết thúc hợp đồng..."
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setRefundOpen(false)}>Hủy</Button>
            <Button mode="contained" buttonColor="#dc2626" loading={refundLoading} onPress={handleRefund}>
              Hoàn tiền
            </Button>
          </Dialog.Actions>
        </Dialog>

        {/* Modal Khấu trừ cọc */}
        <Dialog visible={deductOpen} onDismiss={() => setDeductOpen(false)} style={styles.dialog}>
          <Dialog.Title>Khấu trừ tiền cọc</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Số tiền khấu trừ (VND)"
              value={deductAmount}
              onChangeText={setDeductAmount}
              keyboardType="numeric"
              mode="outlined"
              style={{ marginBottom: 10 }}
            />
            <TextInput
              label="Lý do khấu trừ (Hư hại / Phạt vi phạm)"
              value={deductReason}
              onChangeText={setDeductReason}
              mode="outlined"
              placeholder="Đền bù vỡ kính, hỏng điều hòa..."
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeductOpen(false)}>Hủy</Button>
            <Button mode="contained" buttonColor="#d97706" loading={deductLoading} onPress={handleDeduct}>
              Khấu trừ
            </Button>
          </Dialog.Actions>
        </Dialog>

        {/* Modal Bù trừ nợ hóa đơn */}
        <Dialog visible={offsetOpen} onDismiss={() => setOffsetOpen(false)} style={styles.dialog}>
          <Dialog.Title>Bù trừ cọc vào hóa đơn</Dialog.Title>
          <Dialog.Content>
            {unpaidInvoices.length === 0 ? (
              <Text variant="bodySmall" style={{ color: '#dc2626' }}>
                Hợp đồng này hiện không có hóa đơn nào còn nợ.
              </Text>
            ) : (
              <View>
                <Text variant="bodySmall" style={{ color: '#64748b', marginBottom: 8 }}>
                  Chọn hóa đơn cần bù trừ nợ:
                </Text>
                <ScrollView style={{ maxHeight: 120, marginBottom: 10 }}>
                  {unpaidInvoices.map((inv) => (
                    <Button
                      key={inv.id}
                      mode={offsetInvoiceId === inv.id ? 'contained' : 'outlined'}
                      compact
                      onPress={() => {
                        setOffsetInvoiceId(inv.id);
                        setOffsetAmount(minMoney(depositData?.depositHeld || '0', inv.debt || '0'));
                      }}
                      style={{ marginBottom: 6 }}
                    >
                      Kỳ {inv.billingMonth} - Nợ {formatMoney(inv.debt)}
                    </Button>
                  ))}
                </ScrollView>
                <TextInput
                  label="Số tiền bù trừ (VND)"
                  value={offsetAmount}
                  onChangeText={setOffsetAmount}
                  keyboardType="numeric"
                  mode="outlined"
                />
              </View>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setOffsetOpen(false)}>Hủy</Button>
            <Button
              mode="contained"
              buttonColor="#7c3aed"
              disabled={unpaidInvoices.length === 0}
              loading={offsetLoading}
              onPress={handleOffset}
            >
              Bù trừ
            </Button>
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

        {/* Modal Trả Phòng & Kiểm Kê (Checkout - Task E3) */}
        <Dialog visible={!!checkoutContract} onDismiss={() => setCheckoutContract(null)} style={styles.dialog}>
          <Dialog.Title>Trả phòng: P.{checkoutContract?.roomNumber}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodySmall" style={{ color: '#64748b', marginBottom: 10 }}>
              Giải phóng phòng, chốt chỉ số cuối và kết thúc hợp đồng (BR-043):
            </Text>
            {checkoutError && <HelperText type="error">{checkoutError}</HelperText>}
            <TextInput
              label="Ngày trả phòng (YYYY-MM-DD)"
              value={checkoutDate}
              onChangeText={setCheckoutDate}
              mode="outlined"
              style={{ marginBottom: 10 }}
            />
            <TextInput
              label="Chỉ số Điện chốt trả phòng (kWh)"
              value={checkoutElec}
              onChangeText={setCheckoutElec}
              keyboardType="decimal-pad"
              mode="outlined"
              style={{ marginBottom: 10 }}
            />
            <TextInput
              label="Chỉ số Nước chốt trả phòng (m³)"
              value={checkoutWater}
              onChangeText={setCheckoutWater}
              keyboardType="decimal-pad"
              mode="outlined"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setCheckoutContract(null)}>Hủy</Button>
            <Button
              mode="contained"
              buttonColor="#dc2626"
              loading={checkoutLoading}
              onPress={handleConfirmCheckout}
            >
              Xác nhận trả phòng
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
  depositSummaryBox: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f0f9ff',
    marginBottom: 10,
  },
  entryItem: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    marginBottom: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#0284c7',
  },
});
