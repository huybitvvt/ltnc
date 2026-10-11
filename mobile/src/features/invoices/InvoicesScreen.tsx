import { todayInVietnam } from '../../shared/date';
import { InvoiceExtras } from './InvoiceExtras';
import { isMoney, formatMoney } from '../../shared/money';
import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {
  Text,
  Card,
  Button,
  Chip,
  TextInput,
  Portal,
  Dialog,
  useTheme,
  ActivityIndicator,
  Divider,
  List,
  IconButton,
  SegmentedButtons,
} from 'react-native-paper';
import { useMobileAuth } from '../auth/AuthContext';
import { mobileApiClient } from '../auth/mobileClient';
import {
  InvoiceSummary,
  InvoiceDetail,
  InvoiceItem,
  InvoiceAdjustment,
  InvoiceNote,
  InvoiceStatus,
} from './types';
import {
  LedgerEntryResponse,
  PaymentMethod,
  InvoiceFinancialStatusResponse,
} from '../payments/types';

interface InvoicesScreenProps {
  onBack?: () => void;
}

export const InvoicesScreen: React.FC<InvoicesScreenProps> = ({ onBack }) => {
  const theme = useTheme();
  const { user } = useMobileAuth();
  const isManager = user?.role === 'OWNER' || user?.role === 'STAFF';

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DRAFT' | 'ISSUED'>('ALL');

  // List & Detail data
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceDetail | null>(null);
  const [financialStatus, setFinancialStatus] = useState<InvoiceFinancialStatusResponse | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  // Dialog: Adjust Invoice
  const [adjustDialogVisible, setAdjustDialogVisible] = useState(false);
  const [adjustDelta, setAdjustDelta] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjusting, setAdjusting] = useState(false);

  // Dialog: Note Invoice
  const [noteDialogVisible, setNoteDialogVisible] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [noteReason, setNoteReason] = useState('');
  const [noting, setNoting] = useState(false);

  // Dialog: Record Payment
  const [paymentDialogVisible, setPaymentDialogVisible] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<PaymentMethod>('BANK_TRANSFER');
  const [payRefCode, setPayRefCode] = useState('');
  const [payNote, setPayNote] = useState('');
  const [paying, setPaying] = useState(false);

  // Dialog: Correct Payment
  const [correctDialogVisible, setCorrectDialogVisible] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<LedgerEntryResponse | null>(null);
  const [correctDelta, setCorrectDelta] = useState('');
  const [correctReason, setCorrectReason] = useState('');
  const [correcting, setCorrecting] = useState(false);

  // Dialog: Refund Credit
  const [refundDialogVisible, setRefundDialogVisible] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [refundMethod, setRefundMethod] = useState<PaymentMethod>('BANK_TRANSFER');
  const [refunding, setRefunding] = useState(false);

  // Action states
  const [issuing, setIssuing] = useState(false);

  const formatVnd = formatMoney;

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams();
      if (selectedMonth) query.append('billingMonth', selectedMonth);
      if (statusFilter !== 'ALL') query.append('status', statusFilter);

      const res = await mobileApiClient.get<{ data: InvoiceSummary[] }>(
        `/invoices?${query.toString()}`
      );
      setInvoices(res.data.data || []);
    } catch (e: any) {
      console.warn('Lỗi tải danh sách hóa đơn:', e?.response?.data || e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, [selectedMonth, statusFilter]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadInvoices();
  };

  const openDetail = async (invoiceId: string) => {
    try {
      setDetailLoading(true);
      setDetailVisible(true);
      const [invRes, finRes] = await Promise.all([
        mobileApiClient.get<{ data: InvoiceDetail }>(`/invoices/${invoiceId}`),
        mobileApiClient.get<{ data: InvoiceFinancialStatusResponse }>(`/invoices/${invoiceId}/financial-status`),
      ]);
      setSelectedInvoice(invRes.data.data);
      setFinancialStatus(finRes.data.data);
    } catch (e: any) {
      Alert.alert('Lỗi', e?.response?.data?.message || 'Không thể xem chi tiết hóa đơn');
      setDetailVisible(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleIssueInvoice = async (invoiceId: string) => {
    Alert.alert(
      'Xác nhận phát hành',
      'Hóa đơn sau khi phát hành sẽ chốt số liệu bất biến và gửi thông báo công nợ đến người thuê. Bạn có chắc chắn muốn phát hành?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Phát hành ngay',
          onPress: async () => {
            try {
              setIssuing(true);
              await mobileApiClient.post(
                `/invoices/${invoiceId}/issue`,
                {},
                {
                  headers: {
                    'X-Idempotency-Key': `ISSUE-${invoiceId}-${Date.now()}`,
                  },
                }
              );
              Alert.alert('Thành công', 'Đã phát hành hóa đơn thành công!');
              await openDetail(invoiceId);
              loadInvoices();
            } catch (e: any) {
              Alert.alert(
                'Thao tác thất bại',
                e?.response?.data?.message || 'Không thể phát hành hóa đơn'
              );
            } finally {
              setIssuing(false);
            }
          },
        },
      ]
    );
  };

  const handleConfirmAdjust = async () => {
    if (!selectedInvoice) return;
    const delta = adjustDelta;
    if (!isMoney(delta, true) || BigInt(delta) === 0n) {
      Alert.alert('Lỗi', 'Số tiền điều chỉnh phải khác 0 (dùng dấu âm (-) nếu giảm trừ).');
      return;
    }
    if (!adjustReason.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập lý do điều chỉnh theo quy tắc kiểm toán.');
      return;
    }

    try {
      setAdjusting(true);
      const effectiveDate = todayInVietnam();
      await mobileApiClient.post(
        `/invoices/${selectedInvoice.id}/adjust`,
        {
          deltaAmount: String(delta),
          reason: adjustReason.trim(),
          effectiveDate,
        },
        {
          headers: {
            'X-Idempotency-Key': `ADJUST-${selectedInvoice.id}-${Date.now()}`,
          },
        }
      );
      Alert.alert('Thành công', 'Đã ghi nhận điều chỉnh hóa đơn.');
      setAdjustDialogVisible(false);
      setAdjustDelta('');
      setAdjustReason('');
      await openDetail(selectedInvoice.id);
      loadInvoices();
    } catch (e: any) {
      Alert.alert(
        'Lỗi điều chỉnh',
        e?.response?.data?.message || 'Không thể điều chỉnh hóa đơn'
      );
    } finally {
      setAdjusting(false);
    }
  };

  const handleConfirmNote = async () => {
    if (!selectedInvoice) return;
    if (!noteContent.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập nội dung ghi chú.');
      return;
    }

    try {
      setNoting(true);
      await mobileApiClient.post(`/invoices/${selectedInvoice.id}/notes`, {
        content: noteContent.trim(),
        reason: noteReason.trim() || 'Ghi chú đính chính',
      });
      Alert.alert('Thành công', 'Đã thêm ghi chú đính chính.');
      setNoteDialogVisible(false);
      setNoteContent('');
      setNoteReason('');
      await openDetail(selectedInvoice.id);
    } catch (e: any) {
      Alert.alert('Lỗi', e?.response?.data?.message || 'Không thể thêm ghi chú');
    } finally {
      setNoting(false);
    }
  };

  const handleConfirmPayment = async (overpaymentConfirmed = false) => {
    if (!selectedInvoice) return;
    const amount = payAmount.trim();
    if (!/^[1-9]\d{0,18}$/.test(amount)) {
      Alert.alert('Lỗi', 'Số tiền thu phải lớn hơn 0');
      return;
    }
    if (BigInt(amount) > BigInt(selectedInvoice.debt || '0') && !overpaymentConfirmed) {
      Alert.alert('Xác nhận tiền dư', 'Khoản thu vượt công nợ và tạo tiền dư.', [
        {text: 'Hủy', style: 'cancel'},
        {text: 'Ghi nhận', onPress: () => { void handleConfirmPayment(true); }},
      ]);
      return;
    }
    try {
      setPaying(true);
      await mobileApiClient.post(
        '/payments/record',
        {
          invoiceId: selectedInvoice.id,
          amount,
          overpaymentConfirmed,
          paymentMethod: payMethod,
          referenceCode: payRefCode.trim() || undefined,
          note: payNote.trim() || undefined,
        },
        {
          headers: {
            'X-Idempotency-Key': `PAY-${selectedInvoice.id}-${Date.now()}`,
          },
        }
      );
      Alert.alert('Thành công', 'Đã ghi nhận thu tiền thành công!');
      setPaymentDialogVisible(false);
      setPayAmount('');
      setPayRefCode('');
      setPayNote('');
      await openDetail(selectedInvoice.id);
      loadInvoices();
    } catch (e: any) {
      Alert.alert('Lỗi thu tiền', e?.response?.data?.message || 'Không thể ghi nhận thu tiền');
    } finally {
      setPaying(false);
    }
  };

  const handleConfirmCorrection = async () => {
    if (!selectedEntry || !selectedInvoice) return;
    const delta = correctDelta;
    if (!isMoney(delta, true) || BigInt(delta) === 0n) {
      Alert.alert('Lỗi', 'Số tiền sửa delta phải khác 0 (dùng dấu âm nếu giảm thu)');
      return;
    }
    if (!correctReason.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập lý do sửa ghi nhận');
      return;
    }
    try {
      setCorrecting(true);
      await mobileApiClient.post(
        '/payments/correct',
        {
          refEntryId: selectedEntry.id,
          deltaAmount: String(delta),
          reason: correctReason.trim(),
        },
        {
          headers: {
            'X-Idempotency-Key': `CORR-${selectedEntry.id}-${Date.now()}`,
          },
        }
      );
      Alert.alert('Thành công', 'Đã ghi nhận điều chỉnh thanh toán!');
      setCorrectDialogVisible(false);
      setSelectedEntry(null);
      setCorrectDelta('');
      setCorrectReason('');
      await openDetail(selectedInvoice.id);
      loadInvoices();
    } catch (e: any) {
      Alert.alert('Lỗi sửa thu', e?.response?.data?.message || 'Không thể điều chỉnh bút toán');
    } finally {
      setCorrecting(false);
    }
  };

  const handleConfirmRefund = async () => {
    if (!selectedInvoice) return;
    const amount = refundAmount;
    if (!isMoney(amount, false) || BigInt(amount) <= 0n) {
      Alert.alert('Lỗi', 'Số tiền hoàn phải lớn hơn 0');
      return;
    }
    if (!refundReason.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập lý do hoàn tiền dư');
      return;
    }
    try {
      setRefunding(true);
      await mobileApiClient.post(
        '/payments/refund',
        {
          invoiceId: selectedInvoice.id,
          amount: String(amount),
          reason: refundReason.trim(),
          paymentMethod: refundMethod,
        },
        {
          headers: {
            'X-Idempotency-Key': `REF-${selectedInvoice.id}-${Date.now()}`,
          },
        }
      );
      Alert.alert('Thành công', 'Đã hoàn tiền dư thành công!');
      setRefundDialogVisible(false);
      setRefundAmount('');
      setRefundReason('');
      await openDetail(selectedInvoice.id);
      loadInvoices();
    } catch (e: any) {
      Alert.alert('Lỗi hoàn tiền', e?.response?.data?.message || 'Không thể hoàn tiền');
    } finally {
      setRefunding(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header bar */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {onBack && (
            <IconButton icon="arrow-left" size={24} onPress={onBack} />
          )}
          <View>
            <Text variant="titleLarge" style={styles.headerTitle}>
              Hóa đơn & Tiền phòng
            </Text>
            <Text variant="bodySmall" style={styles.headerSubtitle}>
              Kỳ tháng {selectedMonth} • {invoices.length} hóa đơn
            </Text>
          </View>
        </View>
      </View>

      {/* Filter Bar */}
      <View style={styles.filterSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChips}>
          <Chip
            selected={statusFilter === 'ALL'}
            onPress={() => setStatusFilter('ALL')}
            style={styles.chip}
          >
            Tất cả
          </Chip>
          <Chip
            selected={statusFilter === 'DRAFT'}
            onPress={() => setStatusFilter('DRAFT')}
            style={styles.chip}
          >
            Bản nháp
          </Chip>
          <Chip
            selected={statusFilter === 'ISSUED'}
            onPress={() => setStatusFilter('ISSUED')}
            style={styles.chip}
          >
            Đã phát hành
          </Chip>
        </ScrollView>
      </View>

      {/* Main List */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {loading && !refreshing ? (
          <ActivityIndicator style={{ marginTop: 40 }} />
        ) : invoices.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text variant="bodyLarge" style={{ color: '#64748b' }}>
              Không có hóa đơn nào trong kỳ {selectedMonth}
            </Text>
          </View>
        ) : (
          invoices.map((inv) => (
            <Card
              key={inv.id}
              style={styles.invoiceCard}
              onPress={() => openDetail(inv.id)}
            >
              <Card.Content>
                <View style={styles.cardHeader}>
                  <View>
                    <Text variant="titleMedium" style={styles.roomText}>
                      Phòng {inv.roomName}
                    </Text>
                    <Text variant="bodySmall" style={styles.buildingText}>
                      {inv.buildingName} • Khách: {inv.tenantName}
                    </Text>
                  </View>
                  <Chip
                    compact
                    style={{
                      backgroundColor:
                        inv.status === 'DRAFT' ? '#ffedd5' : '#dcfce7',
                    }}
                  >
                    {inv.status === 'DRAFT' ? 'Nháp' : 'Đã phát hành'}
                  </Chip>
                </View>

                <View style={styles.cardBody}>
                  <View>
                    <Text variant="bodySmall" style={{ color: '#64748b' }}>
                      Phải thu:
                    </Text>
                    <Text variant="titleMedium" style={styles.amountText}>
                      {formatVnd(inv.effectiveDue)}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text variant="bodySmall" style={{ color: '#64748b' }}>
                      Còn nợ:
                    </Text>
                    <Text
                      variant="titleMedium"
                      style={{
                        fontWeight: '800',
                        color: BigInt(inv.debt) > 0 ? '#dc2626' : '#16a34a',
                      }}
                    >
                      {formatVnd(inv.debt)}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardFooter}>
                  <Text variant="labelSmall" style={{ color: '#94a3b8' }}>
                    Hạn nộp: {inv.dueDate}
                  </Text>
                  <Chip
                    compact
                    style={{
                      backgroundColor:
                        inv.paymentStatus === 'PAID'
                          ? '#dcfce7'
                          : inv.paymentStatus === 'PARTIAL'
                          ? '#fef3c7'
                          : '#fee2e2',
                    }}
                  >
                    {inv.paymentStatus === 'PAID'
                      ? 'Đã trả đủ'
                      : inv.paymentStatus === 'PARTIAL'
                      ? 'Trả 1 phần'
                      : 'Chưa thanh toán'}
                  </Chip>
                </View>
              </Card.Content>
            </Card>
          ))
        )}
      </ScrollView>

      {/* Dialog: Invoice Detail */}
      <Portal>
        <Dialog
          visible={detailVisible}
          onDismiss={() => setDetailVisible(false)}
          style={styles.detailDialog}
        >
          <Dialog.Title style={styles.dialogTitle}>
            Chi tiết hóa đơn {selectedInvoice?.billingMonth}
          </Dialog.Title>
          <Dialog.ScrollArea style={{ maxHeight: 520, paddingHorizontal: 0 }}>
            {detailLoading || !selectedInvoice ? (
              <ActivityIndicator style={{ marginVertical: 40 }} />
            ) : (
              <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 12 }}>
                {/* Meta info */}
                <View style={styles.metaBlock}>
                  <Text variant="titleSmall" style={{ fontWeight: '700' }}>
                    Phòng {selectedInvoice.roomName} — {selectedInvoice.buildingName}
                  </Text>
                  <Text variant="bodySmall" style={{ color: '#475569' }}>
                    Người thuê: {selectedInvoice.tenantName}
                  </Text>
                  <Text variant="bodySmall" style={{ color: '#475569' }}>
                    Kỳ: {selectedInvoice.periodStart} đến {selectedInvoice.periodEndExclusive}
                  </Text>
                  <Text variant="bodySmall" style={{ color: '#475569' }}>
                    Hạn nộp tiền: {selectedInvoice.dueDate}
                  </Text>
                  {selectedInvoice.issuedAt && (
                    <Text variant="bodySmall" style={{ color: '#15803d', fontWeight: '600' }}>
                      Phát hành lúc: {new Date(selectedInvoice.issuedAt).toLocaleString('vi-VN')}
                    </Text>
                  )}
                </View>

                {/* Status Chips */}
                <View style={{ flexDirection: 'row', gap: 8, marginVertical: 10 }}>
                  <Chip
                    compact
                    style={{
                      backgroundColor:
                        selectedInvoice.status === 'DRAFT' ? '#ffedd5' : '#dcfce7',
                    }}
                  >
                    {selectedInvoice.status === 'DRAFT' ? 'Bản nháp' : 'Đã phát hành'}
                  </Chip>
                  <Chip
                    compact
                    style={{
                      backgroundColor:
                        selectedInvoice.paymentStatus === 'PAID'
                          ? '#dcfce7'
                          : selectedInvoice.paymentStatus === 'PARTIAL'
                          ? '#fef3c7'
                          : '#fee2e2',
                    }}
                  >
                    {selectedInvoice.paymentStatus === 'PAID'
                      ? 'Đã trả đủ'
                      : selectedInvoice.paymentStatus === 'PARTIAL'
                      ? 'Thanh toán 1 phần'
                      : 'Chưa thanh toán'}
                  </Chip>
                </View>

                <Divider style={{ marginVertical: 8 }} />

                {/* Items breakdown */}
                <Text variant="labelMedium" style={{ fontWeight: '700', marginBottom: 8 }}>
                  CÁC KHOẢN PHÍ CHI TIẾT
                </Text>
                {selectedInvoice.items.map((item, idx) => (
                  <View key={item.id || idx} style={styles.itemRow}>
                    <View style={{ flex: 1 }}>
                      <Text variant="bodyMedium" style={{ fontWeight: '600' }}>
                        {item.label}
                      </Text>
                      {item.calculationSnapshot ? (
                        <Text variant="bodySmall" style={{ color: '#64748b', fontSize: 11 }}>
                          {item.calculationSnapshot}
                        </Text>
                      ) : (
                        <Text variant="bodySmall" style={{ color: '#64748b', fontSize: 11 }}>
                          {item.quantity} x {formatVnd(item.unitPrice)}
                        </Text>
                      )}
                    </View>
                    <Text variant="titleSmall" style={{ fontWeight: '700' }}>
                      {formatVnd(item.amount)}
                    </Text>
                  </View>
                ))}

                <Divider style={{ marginVertical: 8 }} />

                {/* Totals & Financial Math */}
                <View style={styles.summaryRow}>
                  <Text variant="bodyMedium">Tổng gốc hóa đơn:</Text>
                  <Text variant="bodyMedium" style={{ fontWeight: '700' }}>
                    {formatVnd(selectedInvoice.originalTotal)}
                  </Text>
                </View>
                {selectedInvoice.adjustments.length > 0 && (
                  <View style={styles.summaryRow}>
                    <Text variant="bodyMedium" style={{ color: '#d97706' }}>
                      Điều chỉnh tích lũy:
                    </Text>
                    <Text variant="bodyMedium" style={{ fontWeight: '700', color: '#d97706' }}>
                      {formatVnd(selectedInvoice.adjustmentsTotal)}
                    </Text>
                  </View>
                )}
                <View style={[styles.summaryRow, { marginTop: 4 }]}>
                  <Text variant="titleSmall" style={{ fontWeight: '800' }}>
                    TỔNG PHẢI NỘP:
                  </Text>
                  <Text variant="titleMedium" style={{ fontWeight: '800', color: theme.colors.primary }}>
                    {formatVnd(selectedInvoice.effectiveDue)}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text variant="bodyMedium" style={{ color: '#16a34a' }}>
                    Đã thanh toán (Net):
                  </Text>
                  <Text variant="titleMedium" style={{ fontWeight: '800', color: '#16a34a' }}>
                    {formatVnd(selectedInvoice.netApplied)}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text variant="bodyMedium" style={{ color: '#dc2626' }}>
                    CÒN NỢ HIỆN TẠI:
                  </Text>
                  <Text variant="titleMedium" style={{ fontWeight: '800', color: '#dc2626' }}>
                    {formatVnd(selectedInvoice.debt)}
                  </Text>
                </View>
                {BigInt(selectedInvoice.credit || '0') > 0 && (
                  <View style={[styles.summaryRow, { backgroundColor: '#f0fdf4', padding: 6, borderRadius: 6 }]}>
                    <Text variant="bodyMedium" style={{ color: '#059669', fontWeight: '700' }}>
                      SỐ DƯ THỪA (CREDIT):
                    </Text>
                    <Text variant="titleMedium" style={{ fontWeight: '800', color: '#059669' }}>
                      {formatVnd(selectedInvoice.credit)}
                    </Text>
                  </View>
                )}

                {/* Ledger Entries */}
                <View style={{ marginTop: 14 }}>
                  <Text variant="labelMedium" style={{ fontWeight: '700', color: '#0284c7', marginBottom: 6 }}>
                    SỔ CÁI THANH TOÁN (LỊCH SỬ THU / HOÀN)
                  </Text>
                  {financialStatus && financialStatus.entries.length > 0 ? (
                    financialStatus.entries.map((entry) => {
                      const isNegative = BigInt(entry.amount) < 0;
                      return (
                        <View key={entry.id} style={styles.ledgerItem}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Chip
                                compact
                                style={{
                                  backgroundColor:
                                    entry.entryType === 'PAYMENT'
                                      ? '#dcfce7'
                                      : entry.entryType === 'REFUND'
                                      ? '#fee2e2'
                                      : '#fef3c7',
                                }}
                              >
                                {entry.entryType}
                              </Chip>
                              {entry.paymentMethod && (
                                <Text variant="bodySmall" style={{ color: '#64748b' }}>
                                  ({entry.paymentMethod})
                                </Text>
                              )}
                            </View>
                            <Text
                              variant="titleSmall"
                              style={{
                                fontWeight: '800',
                                color: isNegative ? '#dc2626' : '#16a34a',
                              }}
                            >
                              {!isNegative ? '+' : ''}
                              {formatVnd(entry.amount)}
                            </Text>
                          </View>
                          {entry.referenceCode && (
                            <Text variant="bodySmall" style={{ color: '#475569', marginTop: 2 }}>
                              Mã GD: {entry.referenceCode}
                            </Text>
                          )}
                          {entry.note && (
                            <Text variant="bodySmall" style={{ color: '#475569', marginTop: 2 }}>
                              Ghi chú: {entry.note}
                            </Text>
                          )}
                          <View
                            style={{
                              flexDirection: 'row',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              marginTop: 4,
                            }}
                          >
                            <Text variant="labelSmall" style={{ color: '#94a3b8' }}>
                              {entry.actorName || 'Hệ thống'} •{' '}
                              {new Date(entry.recordedAt).toLocaleString('vi-VN')}
                            </Text>
                            {isManager && entry.entryType === 'PAYMENT' && (
                              <Button
                                compact
                                mode="text"
                                onPress={() => {
                                  setSelectedEntry(entry);
                                  setCorrectDelta('');
                                  setCorrectReason('');
                                  setCorrectDialogVisible(true);
                                }}
                              >
                                Sửa thu
                              </Button>
                            )}
                          </View>
                        </View>
                      );
                    })
                  ) : (
                    <Text variant="bodySmall" style={{ color: '#94a3b8', fontStyle: 'italic' }}>
                      Chưa có bút toán thanh toán nào.
                    </Text>
                  )}
                </View>

                {/* Adjustments history if any */}
                {selectedInvoice.adjustments.length > 0 && (
                  <View style={{ marginTop: 14 }}>
                    <Text variant="labelMedium" style={{ fontWeight: '700', color: '#b45309' }}>
                      LỊCH SỬ ĐIỀU CHỈNH HÓA ĐƠN
                    </Text>
                    {selectedInvoice.adjustments.map((adj) => (
                      <View key={adj.id} style={styles.historyItem}>
                        <Text variant="bodySmall" style={{ fontWeight: '700' }}>
                          {BigInt(adj.deltaAmount) > 0 ? '+' : ''}
                          {formatVnd(adj.deltaAmount)} — {adj.reason}
                        </Text>
                        <Text variant="labelSmall" style={{ color: '#94a3b8' }}>
                          Người lập: {adj.createdByName} • {new Date(adj.recordedAt).toLocaleString('vi-VN')}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                <InvoiceExtras key={selectedInvoice.id} invoice={selectedInvoice} onChanged={async () => {
                  await openDetail(selectedInvoice.id); await loadInvoices();
                }} />
                {/* Notes history if any */}
                {selectedInvoice.notes.length > 0 && (
                  <View style={{ marginTop: 14 }}>
                    <Text variant="labelMedium" style={{ fontWeight: '700', color: '#475569' }}>
                      GHI CHÚ ĐÍNH CHÍNH
                    </Text>
                    {selectedInvoice.notes.map((n) => (
                      <View key={n.id} style={styles.historyItem}>
                        <Text variant="bodySmall">{n.content}</Text>
                        <Text variant="labelSmall" style={{ color: '#94a3b8' }}>
                          {n.createdByName} • {new Date(n.recordedAt).toLocaleString('vi-VN')}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </ScrollView>
            )}
          </Dialog.ScrollArea>

          <Dialog.Actions style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <Button onPress={() => setDetailVisible(false)}>Đóng</Button>

            {isManager && selectedInvoice && (
              <>
                {selectedInvoice.status === 'DRAFT' && (
                  <Button
                    mode="contained"
                    loading={issuing}
                    onPress={() => handleIssueInvoice(selectedInvoice.id)}
                    style={{ marginLeft: 8 }}
                  >
                    Phát hành
                  </Button>
                )}

                {selectedInvoice.status === 'ISSUED' && (
                  <>
                    <Button
                      mode="contained"
                      onPress={() => {
                        setPayAmount(selectedInvoice.debt !== '0' ? selectedInvoice.debt : '');
                        setPaymentDialogVisible(true);
                      }}
                      style={{ marginLeft: 8 }}
                    >
                      Thu tiền
                    </Button>

                    {BigInt(selectedInvoice.credit || '0') > 0 && (
                      <Button
                        mode="contained-tonal"
                        onPress={() => {
                          setRefundAmount(selectedInvoice.credit);
                          setRefundDialogVisible(true);
                        }}
                        style={{ marginLeft: 8 }}
                      >
                        Hoàn dư
                      </Button>
                    )}

                    <Button
                      mode="outlined"
                      onPress={() => setAdjustDialogVisible(true)}
                      style={{ marginLeft: 8 }}
                    >
                      Điều chỉnh
                    </Button>
                  </>
                )}

                <Button
                  onPress={() => setNoteDialogVisible(true)}
                  style={{ marginLeft: 8 }}
                >
                  Ghi chú
                </Button>
              </>
            )}
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Dialog: Record Payment */}
      <Portal>
        <Dialog
          visible={paymentDialogVisible}
          onDismiss={() => setPaymentDialogVisible(false)}
        >
          <Dialog.Title>Ghi nhận thu tiền</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodySmall" style={{ color: '#64748b', marginBottom: 12 }}>
              Nhập số tiền đã nhận từ khách. Ghi nhận vào sổ cái theo quy tắc BR-087..BR-092.
            </Text>
            <TextInput
              label="Số tiền thu (VND) *"
              value={payAmount}
              onChangeText={setPayAmount}
              placeholder="VD: 3000000"
              keyboardType="numeric"
              mode="outlined"
              style={{ marginBottom: 12 }}
            />
            <Text variant="bodySmall" style={{ marginBottom: 4, fontWeight: '600' }}>
              Phương thức thanh toán:
            </Text>
            <SegmentedButtons
              value={payMethod}
              onValueChange={(val) => setPayMethod(val as PaymentMethod)}
              buttons={[
                { value: 'BANK_TRANSFER', label: 'CK' },
                { value: 'CASH', label: 'Tiền mặt' },
              ]}
              style={{ marginBottom: 12 }}
            />
            <TextInput
              label="Mã giao dịch / UNC (nếu có)"
              value={payRefCode}
              onChangeText={setPayRefCode}
              placeholder="VD: FT242600123"
              mode="outlined"
              style={{ marginBottom: 12 }}
            />
            <TextInput
              label="Ghi chú thêm"
              value={payNote}
              onChangeText={setPayNote}
              placeholder="VD: Khách nộp tiền đợt 1"
              mode="outlined"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setPaymentDialogVisible(false)}>Hủy</Button>
            <Button mode="contained" loading={paying} onPress={() => { void handleConfirmPayment(); }}>
              Xác nhận thu
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Dialog: Correct Payment */}
      <Portal>
        <Dialog
          visible={correctDialogVisible}
          onDismiss={() => setCorrectDialogVisible(false)}
        >
          <Dialog.Title>Sửa ghi nhận thu tiền</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodySmall" style={{ color: '#64748b', marginBottom: 12 }}>
              Sửa sai sót bằng bút toán bù trừ (delta) theo quy tắc BR-093..BR-096.
            </Text>
            <Text variant="bodyMedium" style={{ fontWeight: '700', marginBottom: 8 }}>
              Bút toán gốc: {selectedEntry ? formatVnd(selectedEntry.amount) : ''}
            </Text>
            <TextInput
              label="Số tiền chênh lệch delta (VND) *"
              value={correctDelta}
              onChangeText={setCorrectDelta}
              placeholder="VD: -200000 (nếu ghi thừa) hoặc 500000"
              keyboardType="numbers-and-punctuation"
              mode="outlined"
              style={{ marginBottom: 12 }}
            />
            <TextInput
              label="Lý do sửa (Bắt buộc) *"
              value={correctReason}
              onChangeText={setCorrectReason}
              placeholder="VD: Gõ thừa 1 số 0 khi thu tiền"
              mode="outlined"
              multiline
              numberOfLines={2}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setCorrectDialogVisible(false)}>Hủy</Button>
            <Button mode="contained" loading={correcting} onPress={handleConfirmCorrection}>
              Lưu sửa thu
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Dialog: Refund Credit */}
      <Portal>
        <Dialog
          visible={refundDialogVisible}
          onDismiss={() => setRefundDialogVisible(false)}
        >
          <Dialog.Title>Hoàn trả số tiền nộp thừa</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodySmall" style={{ color: '#64748b', marginBottom: 12 }}>
              Theo quy tắc BR-097..BR-100: Chỉ được hoàn tiền khi có số dư credit dương.
            </Text>
            <Text variant="bodyMedium" style={{ fontWeight: '700', marginBottom: 8, color: '#059669' }}>
              Số dư thừa tối đa có thể hoàn: {selectedInvoice ? formatVnd(selectedInvoice.credit) : '0 đ'}
            </Text>
            <TextInput
              label="Số tiền hoàn (VND) *"
              value={refundAmount}
              onChangeText={setRefundAmount}
              placeholder="VD: 500000"
              keyboardType="numeric"
              mode="outlined"
              style={{ marginBottom: 12 }}
            />
            <Text variant="bodySmall" style={{ marginBottom: 4, fontWeight: '600' }}>
              Hình thức hoàn trả:
            </Text>
            <SegmentedButtons
              value={refundMethod}
              onValueChange={(val) => setRefundMethod(val as PaymentMethod)}
              buttons={[
                { value: 'BANK_TRANSFER', label: 'CK' },
                { value: 'CASH', label: 'Tiền mặt' },
              ]}
              style={{ marginBottom: 12 }}
            />
            <TextInput
              label="Lý do hoàn trả (Bắt buộc) *"
              value={refundReason}
              onChangeText={setRefundReason}
              placeholder="VD: Khách chuyển nhầm tiền đợt trước"
              mode="outlined"
              multiline
              numberOfLines={2}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setRefundDialogVisible(false)}>Hủy</Button>
            <Button mode="contained" loading={refunding} onPress={handleConfirmRefund}>
              Xác nhận hoàn
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Dialog: Adjust Invoice */}
      <Portal>
        <Dialog
          visible={adjustDialogVisible}
          onDismiss={() => setAdjustDialogVisible(false)}
        >
          <Dialog.Title>Điều chỉnh hóa đơn</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodySmall" style={{ color: '#64748b', marginBottom: 12 }}>
              Theo quy tắc BR-081 & EX-12: Số tiền delta có dấu (+ nếu truy thu, - nếu giảm trừ).
              Hóa đơn sau điều chỉnh không được có số tiền phải thu âm.
            </Text>
            <TextInput
              label="Số tiền điều chỉnh (VND)"
              value={adjustDelta}
              onChangeText={setAdjustDelta}
              placeholder="VD: -200000 hoặc 150000"
              keyboardType="numbers-and-punctuation"
              mode="outlined"
              style={{ marginBottom: 12 }}
            />
            <TextInput
              label="Lý do điều chỉnh (Bắt buộc)"
              value={adjustReason}
              onChangeText={setAdjustReason}
              placeholder="VD: Giảm trừ tiền mạng do mất kết nối 3 ngày"
              mode="outlined"
              multiline
              numberOfLines={3}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setAdjustDialogVisible(false)}>Hủy</Button>
            <Button
              mode="contained"
              loading={adjusting}
              onPress={handleConfirmAdjust}
            >
              Lưu điều chỉnh
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Dialog: Add Note */}
      <Portal>
        <Dialog
          visible={noteDialogVisible}
          onDismiss={() => setNoteDialogVisible(false)}
        >
          <Dialog.Title>Thêm ghi chú đính chính</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodySmall" style={{ color: '#64748b', marginBottom: 12 }}>
              Ghi chú phi tài chính (không làm thay đổi số tiền phải thu) lưu vết kiểm toán.
            </Text>
            <TextInput
              label="Nội dung ghi chú"
              value={noteContent}
              onChangeText={setNoteContent}
              placeholder="VD: Đính chính tên khách thuê nộp thay"
              mode="outlined"
              multiline
              numberOfLines={3}
              style={{ marginBottom: 12 }}
            />
            <TextInput
              label="Lý do ghi chú"
              value={noteReason}
              onChangeText={setNoteReason}
              placeholder="VD: Khách yêu cầu sửa thông tin"
              mode="outlined"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setNoteDialogVisible(false)}>Hủy</Button>
            <Button mode="contained" loading={noting} onPress={handleConfirmNote}>
              Lưu ghi chú
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
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: {
    fontWeight: '800',
    color: '#0f172a',
  },
  headerSubtitle: {
    color: '#64748b',
  },
  filterSection: {
    backgroundColor: '#ffffff',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  filterChips: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    marginRight: 6,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  invoiceCard: {
    backgroundColor: '#ffffff',
    marginBottom: 12,
    borderRadius: 12,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  roomText: {
    fontWeight: '700',
    color: '#0f172a',
  },
  buildingText: {
    color: '#64748b',
    marginTop: 2,
  },
  cardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  amountText: {
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  detailDialog: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  metaBlock: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    gap: 4,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  ledgerItem: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 10,
    borderRadius: 8,
    marginTop: 6,
  },
  historyItem: {
    backgroundColor: '#fefce8',
    padding: 8,
    borderRadius: 6,
    marginTop: 6,
    gap: 2,
  },
});
