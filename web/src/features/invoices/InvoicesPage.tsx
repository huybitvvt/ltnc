import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
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
  Stack,
  Card,
  CardContent,
  Grid,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Visibility as ViewIcon,
  CheckCircle as IssueIcon,
  Edit as AdjustIcon,
  NoteAdd as NoteIcon,
  Refresh as RefreshIcon,
  Payment as PaymentIcon,
  Undo as UndoIcon,
  AssignmentReturn as RefundIcon,
  SwapHoriz as TransferIcon,
} from '@mui/icons-material';
import { useAuth } from '../auth/AuthContext';
import { invoicesApi } from './invoicesApi';
import { contractsApi } from '../contracts/contractsApi';
import { paymentsApi } from '../payments/paymentsApi';
import {
  InvoiceSummary,
  InvoiceDetail,
  InvoiceStatus,
  PaymentStatus,
} from './types';
import {
  LedgerEntryResponse,
  InvoiceFinancialStatusResponse,
  PaymentMethod,
} from '../payments/types';
import { ContractSummary } from '../contracts/types';

export const InvoicesPage: React.FC = () => {
  const { user } = useAuth();
  const isManager = user?.role === 'OWNER' || user?.role === 'STAFF';

  // Filters
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const [billingMonth, setBillingMonth] = useState<string>(currentMonthStr);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Data
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([]);
  const [contracts, setContracts] = useState<ContractSummary[]>([]);
  const [loading, setLoading] = useState(false);

  // Selected Detail
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [financialStatus, setFinancialStatus] = useState<InvoiceFinancialStatusResponse | null>(null);

  // Modal: Preview & Draft
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedContractId, setSelectedContractId] = useState<string>('');
  const [previewMonth, setPreviewMonth] = useState<string>(currentMonthStr);
  const [previewData, setPreviewData] = useState<InvoiceDetail | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Modal: Adjust Invoice
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustDelta, setAdjustDelta] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustDate, setAdjustDate] = useState(new Date().toISOString().slice(0, 10));

  // Modal: Note
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [noteReason, setNoteReason] = useState('');

  // Modal: Record Payment
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('BANK_TRANSFER');
  const [paymentRefCode, setPaymentRefCode] = useState('');
  const [paymentNote, setPaymentNote] = useState('');

  // Modal: Payment Correction
  const [correctOpen, setCorrectOpen] = useState(false);
  const [targetLedgerEntry, setTargetLedgerEntry] = useState<LedgerEntryResponse | null>(null);
  const [correctionDelta, setCorrectionDelta] = useState('');
  const [correctionReason, setCorrectionReason] = useState('');

  // Modal: Refund
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundMethod, setRefundMethod] = useState<PaymentMethod>('BANK_TRANSFER');
  const [refundReason, setRefundReason] = useState('');

  // Modal: Transfer Credit
  const [transferOpen, setTransferOpen] = useState(false);
  const [targetInvoiceId, setTargetInvoiceId] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferReason, setTransferReason] = useState('');

  // Action status
  const [actionLoading, setActionLoading] = useState(false);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const res = await invoicesApi.listInvoices({
        billingMonth: billingMonth || undefined,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
      });
      setInvoices(res.content || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadContracts = async () => {
    try {
      const res = await contractsApi.listContracts({ status: 'ACTIVE' });
      const list = Array.isArray(res) ? res : ((res as any).content || []);
      setContracts(list);
      if (list.length > 0 && !selectedContractId) {
        setSelectedContractId(list[0].id);
      }
    } catch (ignored) {}
  };

  useEffect(() => {
    loadInvoices();
  }, [billingMonth, statusFilter]);

  useEffect(() => {
    if (isManager) {
      loadContracts();
    }
  }, [isManager]);

  const loadFinancialLedger = async (invoiceId: string) => {
    try {
      const fin = await paymentsApi.getFinancialStatus(invoiceId);
      setFinancialStatus(fin);
    } catch (ignored) {}
  };

  const handleOpenDetail = async (invoiceId: string) => {
    setActionLoading(true);
    try {
      const res = await invoicesApi.getInvoice(invoiceId);
      setSelectedInvoice(res);
      await loadFinancialLedger(invoiceId);
      setDetailOpen(true);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi tải chi tiết hóa đơn');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePreview = async () => {
    if (!selectedContractId || !previewMonth) return;
    setPreviewLoading(true);
    try {
      const res = await invoicesApi.previewInvoice({
        contractId: selectedContractId,
        billingMonth: previewMonth,
      });
      setPreviewData(res);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi tính hóa đơn nháp');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleCreateDraft = async () => {
    if (!selectedContractId || !previewMonth) return;
    setActionLoading(true);
    try {
      await invoicesApi.createOrRecalculateDraft({
        contractId: selectedContractId,
        billingMonth: previewMonth,
      });
      alert('Đã lập / cập nhật hóa đơn nháp thành công!');
      setPreviewOpen(false);
      loadInvoices();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi lưu hóa đơn nháp');
    } finally {
      setActionLoading(false);
    }
  };

  const handleIssueInvoice = async (invoiceId: string) => {
    if (!window.confirm('Hóa đơn sau khi phát hành sẽ chốt số liệu bất biến và gửi công nợ tới người thuê. Bạn có chắc chắn muốn phát hành?')) {
      return;
    }
    setActionLoading(true);
    try {
      const idempotencyKey = `ISSUE-${invoiceId}-${Date.now()}`;
      const res = await invoicesApi.issueInvoice(invoiceId, idempotencyKey);
      alert('Phát hành hóa đơn thành công!');
      setSelectedInvoice(res);
      await loadFinancialLedger(invoiceId);
      loadInvoices();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi phát hành hóa đơn');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAdjustInvoice = async () => {
    if (!selectedInvoice || !adjustDelta || !adjustReason) return;
    setActionLoading(true);
    try {
      const idempotencyKey = `ADJUST-${selectedInvoice.id}-${Date.now()}`;
      const res = await invoicesApi.adjustInvoice(
        selectedInvoice.id,
        {
          deltaAmount: adjustDelta,
          reason: adjustReason,
          effectiveDate: adjustDate,
        },
        idempotencyKey
      );
      alert('Điều chỉnh hóa đơn thành công!');
      setSelectedInvoice(res);
      await loadFinancialLedger(selectedInvoice.id);
      setAdjustOpen(false);
      setAdjustDelta('');
      setAdjustReason('');
      loadInvoices();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi điều chỉnh hóa đơn');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!selectedInvoice || !noteContent || !noteReason) return;
    setActionLoading(true);
    try {
      await invoicesApi.addNote(selectedInvoice.id, {
        content: noteContent,
        reason: noteReason,
      });
      alert('Đã thêm ghi chú đính chính thành công!');
      setNoteOpen(false);
      setNoteContent('');
      setNoteReason('');
      const res = await invoicesApi.getInvoice(selectedInvoice.id);
      setSelectedInvoice(res);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi thêm ghi chú');
    } finally {
      setActionLoading(false);
    }
  };

  // Payment Handlers
  const handleOpenPayment = (inv: InvoiceSummary | InvoiceDetail) => {
    setSelectedInvoice(inv as any);
    setPaymentAmount(inv.debt && Number(inv.debt) > 0 ? inv.debt : '');
    setPaymentMethod('BANK_TRANSFER');
    setPaymentRefCode('');
    setPaymentNote('');
    setPaymentOpen(true);
  };

  const handleRecordPayment = async () => {
    if (!selectedInvoice || !paymentAmount) return;
    const num = Number(paymentAmount);
    if (isNaN(num) || num <= 0) {
      alert('Số tiền thanh toán phải lớn hơn 0');
      return;
    }
    setActionLoading(true);
    try {
      const idempotencyKey = `PAY-${selectedInvoice.id}-${Date.now()}`;
      const fin = await paymentsApi.recordPayment(
        {
          invoiceId: selectedInvoice.id,
          amount: num,
          paymentMethod,
          referenceCode: paymentRefCode || undefined,
          note: paymentNote || undefined,
        },
        idempotencyKey
      );
      alert('Ghi nhận thu tiền thành công!');
      setFinancialStatus(fin);
      setPaymentOpen(false);
      if (detailOpen) {
        const refreshed = await invoicesApi.getInvoice(selectedInvoice.id);
        setSelectedInvoice(refreshed);
      }
      loadInvoices();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi ghi nhận thanh toán');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenCorrection = (entry: LedgerEntryResponse) => {
    setTargetLedgerEntry(entry);
    setCorrectionDelta('');
    setCorrectionReason('');
    setCorrectOpen(true);
  };

  const handleConfirmCorrection = async () => {
    if (!targetLedgerEntry || !correctionDelta || !correctionReason) return;
    const num = Number(correctionDelta);
    if (isNaN(num) || num === 0) {
      alert('Số tiền điều chỉnh phải khác 0 (dùng dấu âm (-) để giảm số thu)');
      return;
    }
    setActionLoading(true);
    try {
      const idempotencyKey = `CORR-${targetLedgerEntry.id}-${Date.now()}`;
      const fin = await paymentsApi.correctPayment(
        {
          refEntryId: targetLedgerEntry.id,
          deltaAmount: num,
          reason: correctionReason,
        },
        idempotencyKey
      );
      alert('Đính chính thu tiền thành công!');
      setFinancialStatus(fin);
      setCorrectOpen(false);
      if (selectedInvoice) {
        const refreshed = await invoicesApi.getInvoice(selectedInvoice.id);
        setSelectedInvoice(refreshed);
      }
      loadInvoices();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi đính chính thu tiền');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenRefund = () => {
    if (!selectedInvoice) return;
    setRefundAmount(financialStatus?.credit || selectedInvoice.credit || '');
    setRefundMethod('BANK_TRANSFER');
    setRefundReason('');
    setRefundOpen(true);
  };

  const handleConfirmRefund = async () => {
    if (!selectedInvoice || !refundAmount || !refundReason) return;
    const num = Number(refundAmount);
    if (isNaN(num) || num <= 0) {
      alert('Số tiền hoàn phải lớn hơn 0');
      return;
    }
    setActionLoading(true);
    try {
      const idempotencyKey = `REF-${selectedInvoice.id}-${Date.now()}`;
      const fin = await paymentsApi.refundCredit(
        {
          invoiceId: selectedInvoice.id,
          amount: num,
          paymentMethod: refundMethod,
          reason: refundReason,
        },
        idempotencyKey
      );
      alert('Hoàn trả tiền thừa thành công!');
      setFinancialStatus(fin);
      setRefundOpen(false);
      const refreshed = await invoicesApi.getInvoice(selectedInvoice.id);
      setSelectedInvoice(refreshed);
      loadInvoices();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi hoàn tiền');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenTransfer = () => {
    if (!selectedInvoice) return;
    setTargetInvoiceId('');
    setTransferAmount('');
    setTransferReason('');
    setTransferOpen(true);
  };

  const handleConfirmTransfer = async () => {
    if (!selectedInvoice || !targetInvoiceId || !transferAmount || !transferReason) return;
    const num = Number(transferAmount);
    if (isNaN(num) || num <= 0) {
      alert('Số tiền chuyển phải lớn hơn 0');
      return;
    }
    setActionLoading(true);
    try {
      const idempotencyKey = `TRF-${selectedInvoice.id}-${Date.now()}`;
      const fin = await paymentsApi.transferCredit(
        {
          sourceInvoiceId: selectedInvoice.id,
          targetInvoiceId,
          amount: num,
          reason: transferReason,
        },
        idempotencyKey
      );
      alert('Chuyển bù trừ số dư sang hóa đơn khác thành công!');
      setFinancialStatus(fin);
      setTransferOpen(false);
      const refreshed = await invoicesApi.getInvoice(selectedInvoice.id);
      setSelectedInvoice(refreshed);
      loadInvoices();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi chuyển dư');
    } finally {
      setActionLoading(false);
    }
  };

  const formatVND = (val: string | number | undefined | null) => {
    const num = Number(val) || 0;
    return new Intl.NumberFormat('vi-VN').format(num) + ' đ';
  };

  const renderStatusChip = (status: InvoiceStatus) => {
    if (status === 'ISSUED') {
      return <Chip label="ĐÃ PHÁT HÀNH" color="success" size="small" />;
    }
    return <Chip label="BẢN NHÁP (DRAFT)" color="warning" size="small" />;
  };

  const renderPaymentChip = (pStatus: PaymentStatus) => {
    switch (pStatus) {
      case 'PAID':
        return <Chip label="Đã thanh toán đủ" color="success" size="small" variant="outlined" />;
      case 'PARTIAL':
        return <Chip label="Thanh toán một phần" color="warning" size="small" variant="outlined" />;
      case 'CREDIT':
        return <Chip label="Có tiền dư (Credit)" color="secondary" size="small" variant="outlined" />;
      case 'UNPAID':
      default:
        return <Chip label="Chưa thanh toán" color="error" size="small" variant="outlined" />;
    }
  };

  const renderLedgerTypeChip = (type: string) => {
    switch (type) {
      case 'PAYMENT':
        return <Chip label="THU TIỀN" color="success" size="small" />;
      case 'PAYMENT_CORRECTION':
        return <Chip label="SỬA THU" color="warning" size="small" />;
      case 'REFUND':
        return <Chip label="HOÀN TIỀN" color="error" size="small" />;
      case 'CREDIT_APPLIED':
        return <Chip label="BÙ TRỪ / CHUYỂN DƯ" color="secondary" size="small" />;
      default:
        return <Chip label={type} size="small" />;
    }
  };

  // Các hóa đơn khác của cùng hợp đồng có nợ để chuyển dư
  const otherDebtInvoices = invoices.filter(
    (inv) => selectedInvoice && inv.id !== selectedInvoice.id && Number(inv.debt) > 0
  );

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        spacing={2}
        mb={3}
      >
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            🧾 Quản Lý Hóa Đơn, Thu Phí & Sổ Cái
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Tính tiền phòng, điện nước, dịch vụ định kỳ; thu tiền, đính chính, hoàn tiền và chuyển dư bất biến
          </Typography>
        </Box>
        {isManager && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setPreviewOpen(true);
              setPreviewData(null);
            }}
            sx={{ borderRadius: 2, px: 3 }}
          >
            Lập & Xem Trước Hóa Đơn
          </Button>
        )}
      </Stack>

      {/* Filter Bar */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
          <TextField
            label="Kỳ tính tiền (YYYY-MM)"
            type="month"
            value={billingMonth}
            onChange={(e) => setBillingMonth(e.target.value)}
            InputLabelProps={{ shrink: true }}
            size="small"
            sx={{ width: { xs: '100%', sm: 220 } }}
          />
          <TextField
            label="Trạng thái hóa đơn"
            select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            size="small"
            sx={{ width: { xs: '100%', sm: 200 } }}
          >
            <MenuItem value="ALL">Tất cả trạng thái</MenuItem>
            <MenuItem value="ISSUED">Đã phát hành (ISSUED)</MenuItem>
            <MenuItem value="DRAFT">Bản nháp (DRAFT)</MenuItem>
          </TextField>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadInvoices}
            size="medium"
          >
            Làm mới
          </Button>
        </Stack>
      </Paper>

      {/* Invoice Table */}
      <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: 1 }}>
        <Table>
          <TableHead sx={{ backgroundColor: 'action.hover' }}>
            <TableRow>
              <TableCell><strong>Kỳ thu</strong></TableCell>
              <TableCell><strong>Phòng</strong></TableCell>
              <TableCell><strong>Tòa nhà</strong></TableCell>
              <TableCell><strong>Khách thuê đại diện</strong></TableCell>
              <TableCell align="right"><strong>Tổng phải thu</strong></TableCell>
              <TableCell align="right"><strong>Còn nợ</strong></TableCell>
              <TableCell align="center"><strong>Trạng thái</strong></TableCell>
              <TableCell align="center"><strong>Thanh toán</strong></TableCell>
              <TableCell align="center"><strong>Hạn nộp</strong></TableCell>
              <TableCell align="center"><strong>Thao tác</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={10} align="center" sx={{ py: 6 }}>
                  <CircularProgress size={32} />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Đang tải danh sách hóa đơn...
                  </Typography>
                </TableCell>
              </TableRow>
            ) : invoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} align="center" sx={{ py: 6 }}>
                  <Typography variant="body1" color="text.secondary">
                    Không có hóa đơn nào trong kỳ {billingMonth || 'đã chọn'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              invoices.map((inv) => (
                <TableRow key={inv.id} hover>
                  <TableCell><strong>{inv.billingMonth}</strong></TableCell>
                  <TableCell><strong>Phòng {inv.roomName}</strong></TableCell>
                  <TableCell>{inv.buildingName}</TableCell>
                  <TableCell>{inv.tenantName}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                    {formatVND(inv.effectiveDue)}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      fontWeight: 'bold',
                      color: Number(inv.debt) > 0 ? 'error.main' : 'success.main',
                    }}
                  >
                    {formatVND(inv.debt)}
                  </TableCell>
                  <TableCell align="center">{renderStatusChip(inv.status)}</TableCell>
                  <TableCell align="center">{renderPaymentChip(inv.paymentStatus)}</TableCell>
                  <TableCell align="center">{inv.dueDate || '—'}</TableCell>
                  <TableCell align="center">
                    <Stack direction="row" spacing={0.5} justifyContent="center">
                      <Tooltip title="Xem chi tiết & Sổ cái">
                        <IconButton
                          color="primary"
                          size="small"
                          onClick={() => handleOpenDetail(inv.id)}
                        >
                          <ViewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>

                      {isManager && inv.status === 'ISSUED' && Number(inv.debt) > 0 && (
                        <Tooltip title="Thu tiền nhanh">
                          <IconButton
                            color="success"
                            size="small"
                            onClick={() => handleOpenPayment(inv)}
                          >
                            <PaymentIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}

                      {isManager && inv.status === 'DRAFT' && (
                        <Tooltip title="Phát hành hóa đơn">
                          <IconButton
                            color="success"
                            size="small"
                            onClick={() => handleIssueInvoice(inv.id)}
                          >
                            <IssueIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Modal 1: Invoice Detail & Ledger */}
      <Dialog
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 'bold', pb: 1 }}>
          Chi Tiết Hóa Đơn Kỳ {selectedInvoice?.billingMonth} — Phòng {selectedInvoice?.roomName}
        </DialogTitle>
        <DialogContent dividers>
          {selectedInvoice && (
            <Stack spacing={2.5}>
              {/* Meta Info */}
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2"><strong>Tòa nhà:</strong> {selectedInvoice.buildingName}</Typography>
                  <Typography variant="body2"><strong>Đại diện thuê:</strong> {selectedInvoice.tenantName}</Typography>
                  <Typography variant="body2">
                    <strong>Kỳ tính:</strong> {selectedInvoice.periodStart} đến {selectedInvoice.periodEndExclusive}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2"><strong>Hạn nộp tiền:</strong> {selectedInvoice.dueDate}</Typography>
                  <Typography variant="body2">
                    <strong>Trạng thái hóa đơn:</strong> {renderStatusChip(selectedInvoice.status)}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    <strong>Tình trạng công nợ:</strong> {renderPaymentChip(financialStatus?.paymentStatus || selectedInvoice.paymentStatus)}
                  </Typography>
                </Grid>
              </Grid>

              {/* Financial 4-Block Summary */}
              <Card variant="outlined" sx={{ backgroundColor: 'background.default' }}>
                <CardContent>
                  <Grid container spacing={2}>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" color="text.secondary">Tổng phải nộp</Typography>
                      <Typography variant="h6" fontWeight="bold" color="primary.main">
                        {formatVND(financialStatus?.effectiveDue || selectedInvoice.effectiveDue)}
                      </Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" color="text.secondary">Đã áp dụng (netApplied)</Typography>
                      <Typography variant="h6" fontWeight="bold" sx={{ color: 'info.main' }}>
                        {formatVND(financialStatus?.netApplied || selectedInvoice.netApplied)}
                      </Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" color="text.secondary">Còn nợ (debt)</Typography>
                      <Typography
                        variant="h6"
                        fontWeight="bold"
                        sx={{
                          color: Number(financialStatus?.debt || selectedInvoice.debt) > 0 ? 'error.main' : 'success.main',
                        }}
                      >
                        {formatVND(financialStatus?.debt || selectedInvoice.debt)}
                      </Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" color="text.secondary">Tiền dư (credit)</Typography>
                      <Typography
                        variant="h6"
                        fontWeight="bold"
                        sx={{
                          color: Number(financialStatus?.credit || selectedInvoice.credit) > 0 ? 'secondary.main' : 'text.secondary',
                        }}
                      >
                        {formatVND(financialStatus?.credit || selectedInvoice.credit)}
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* Items Breakdown Table */}
              <Box>
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                  📋 Chi Tiết Từng Khoản Thu (Snapshot Bất biến)
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead sx={{ backgroundColor: 'action.hover' }}>
                      <TableRow>
                        <TableCell><strong>Loại phí</strong></TableCell>
                        <TableCell><strong>Khoản mục</strong></TableCell>
                        <TableCell align="right"><strong>Số lượng</strong></TableCell>
                        <TableCell align="right"><strong>Đơn giá</strong></TableCell>
                        <TableCell align="right"><strong>Thành tiền</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedInvoice.items.map((item, idx) => (
                        <TableRow key={item.id || idx}>
                          <TableCell>
                            <Chip label={item.type} size="small" variant="outlined" />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight="medium">{item.label}</Typography>
                            {item.calculationSnapshot && (
                              <Typography variant="caption" color="text.secondary" display="block">
                                {item.calculationSnapshot}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell align="right">{item.quantity}</TableCell>
                          <TableCell align="right">{formatVND(item.unitPrice)}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                            {formatVND(item.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>

              {/* Ledger Entries Table */}
              <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="subtitle2" fontWeight="bold">
                    💳 Sổ Cái Thu Tiền & Công Nợ (Ledger)
                  </Typography>
                  {isManager && Number(financialStatus?.credit || selectedInvoice.credit) > 0 && (
                    <Stack direction="row" spacing={1}>
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        startIcon={<RefundIcon />}
                        onClick={handleOpenRefund}
                      >
                        Hoàn tiền dư
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color="secondary"
                        startIcon={<TransferIcon />}
                        onClick={handleOpenTransfer}
                      >
                        Chuyển dư bù nợ
                      </Button>
                    </Stack>
                  )}
                </Stack>

                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead sx={{ backgroundColor: 'action.hover' }}>
                      <TableRow>
                        <TableCell><strong>Thời gian</strong></TableCell>
                        <TableCell><strong>Loại bút toán</strong></TableCell>
                        <TableCell align="right"><strong>Số tiền</strong></TableCell>
                        <TableCell><strong>Phương thức</strong></TableCell>
                        <TableCell><strong>Mã tham chiếu / Ghi chú</strong></TableCell>
                        <TableCell><strong>Người ghi nhận</strong></TableCell>
                        {isManager && <TableCell align="center"><strong>Sửa thu</strong></TableCell>}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {!financialStatus?.entries || financialStatus.entries.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={isManager ? 7 : 6} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                            Chưa có bút toán thanh toán nào cho hóa đơn này
                          </TableCell>
                        </TableRow>
                      ) : (
                        financialStatus.entries.map((entry) => {
                          const isNegative = Number(entry.amount) < 0;
                          return (
                            <TableRow key={entry.id}>
                              <TableCell sx={{ fontSize: '0.8rem' }}>
                                {new Date(entry.recordedAt).toLocaleString('vi-VN')}
                              </TableCell>
                              <TableCell>{renderLedgerTypeChip(entry.entryType)}</TableCell>
                              <TableCell
                                align="right"
                                sx={{
                                  fontWeight: 'bold',
                                  color: isNegative ? 'error.main' : 'success.main',
                                }}
                              >
                                {isNegative ? '' : '+'}{formatVND(entry.amount)}
                              </TableCell>
                              <TableCell sx={{ fontSize: '0.8rem' }}>{entry.paymentMethod}</TableCell>
                              <TableCell sx={{ fontSize: '0.8rem' }}>
                                {entry.referenceCode && (
                                  <Chip label={entry.referenceCode} size="small" sx={{ mr: 0.5, height: 20, fontSize: '0.7rem' }} />
                                )}
                                {entry.note || '—'}
                              </TableCell>
                              <TableCell sx={{ fontSize: '0.8rem' }}>{entry.actorName}</TableCell>
                              {isManager && (
                                <TableCell align="center">
                                  {entry.entryType === 'PAYMENT' && (
                                    <Tooltip title="Sửa thu nhập nhầm">
                                      <IconButton
                                        size="small"
                                        color="warning"
                                        onClick={() => handleOpenCorrection(entry)}
                                      >
                                        <UndoIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                  )}
                                </TableCell>
                              )}
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>

              {/* Adjustments History */}
              {selectedInvoice.adjustments.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" fontWeight="bold" color="warning.main" gutterBottom>
                    ⚖️ Lịch Sử Điều Chỉnh Giá Trị Hóa Đơn (BR-081)
                  </Typography>
                  <Stack spacing={1}>
                    {selectedInvoice.adjustments.map((adj) => (
                      <Paper key={adj.id} variant="outlined" sx={{ p: 1.5, backgroundColor: 'action.hover' }}>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography
                            variant="body2"
                            fontWeight="bold"
                            color={Number(adj.deltaAmount) > 0 ? 'error.main' : 'success.main'}
                          >
                            {Number(adj.deltaAmount) > 0 ? '+' : ''}{formatVND(adj.deltaAmount)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Ngày HL: {adj.effectiveDate} | Người lập: {adj.createdByName}
                          </Typography>
                        </Stack>
                        <Typography variant="body2" sx={{ mt: 0.5 }}>Lý do: {adj.reason}</Typography>
                      </Paper>
                    ))}
                  </Stack>
                </Box>
              )}

              {/* Notes */}
              {selectedInvoice.notes.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                    📝 Ghi Chú Đính Chính (Phi tài chính)
                  </Typography>
                  <Stack spacing={1}>
                    {selectedInvoice.notes.map((note) => (
                      <Paper key={note.id} variant="outlined" sx={{ p: 1.5 }}>
                        <Typography variant="body2"><strong>Nội dung:</strong> {note.content}</Typography>
                        <Typography variant="caption" color="text.secondary">Lý do: {note.reason} | Bởi: {note.createdByName}</Typography>
                      </Paper>
                    ))}
                  </Stack>
                </Box>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDetailOpen(false)}>Đóng</Button>

          {isManager && selectedInvoice && (
            <>
              {selectedInvoice.status === 'DRAFT' && (
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<IssueIcon />}
                  onClick={() => handleIssueInvoice(selectedInvoice.id)}
                  disabled={actionLoading}
                >
                  Phát Hành Hóa Đơn
                </Button>
              )}

              {selectedInvoice.status === 'ISSUED' && (
                <>
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<PaymentIcon />}
                    onClick={() => handleOpenPayment(selectedInvoice)}
                  >
                    Thu Tiền
                  </Button>
                  <Button
                    variant="outlined"
                    color="warning"
                    startIcon={<AdjustIcon />}
                    onClick={() => {
                      setAdjustDelta('');
                      setAdjustReason('');
                      setAdjustOpen(true);
                    }}
                  >
                    Điều Chỉnh
                  </Button>
                </>
              )}

              <Button
                variant="outlined"
                startIcon={<NoteIcon />}
                onClick={() => {
                  setNoteContent('');
                  setNoteReason('');
                  setNoteOpen(true);
                }}
              >
                Ghi Chú
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Modal 2: Preview & Create Draft */}
      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 'bold' }}>
          Lập & Xem Trước Hóa Đơn Tiền Phòng
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5}>
            <Alert severity="info">
              Hệ thống tự động tính: Tiền phòng (theo số ngày ở thực tế), Điện nước (lũy tiến/đồng giá từ chỉ số đồng hồ),
              Dịch vụ cố định/theo người, và các phụ thu phát sinh trong kỳ.
            </Alert>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                select
                label="Chọn hợp đồng cư trú"
                value={selectedContractId}
                onChange={(e) => setSelectedContractId(e.target.value)}
                fullWidth
                size="small"
              >
                {contracts.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    Phòng {c.roomNumber} — {c.representativeName} ({c.buildingName})
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Kỳ tính tiền (YYYY-MM)"
                type="month"
                value={previewMonth}
                onChange={(e) => setPreviewMonth(e.target.value)}
                InputLabelProps={{ shrink: true }}
                size="small"
                sx={{ width: { xs: '100%', sm: 220 } }}
              />
              <Button
                variant="contained"
                onClick={handlePreview}
                disabled={previewLoading || !selectedContractId}
                sx={{ whiteSpace: 'nowrap' }}
              >
                {previewLoading ? <CircularProgress size={24} /> : 'Tính toán'}
              </Button>
            </Stack>

            {previewData && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                  Kết quả tính toán nháp (Kỳ: {previewData.periodStart} đến {previewData.periodEndExclusive})
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead sx={{ backgroundColor: 'action.hover' }}>
                      <TableRow>
                        <TableCell><strong>Khoản mục</strong></TableCell>
                        <TableCell align="right"><strong>Số lượng</strong></TableCell>
                        <TableCell align="right"><strong>Đơn giá</strong></TableCell>
                        <TableCell align="right"><strong>Thành tiền</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {previewData.items.map((it, idx) => (
                        <TableRow key={idx}>
                          <TableCell>
                            <Typography variant="body2" fontWeight="bold">{it.label}</Typography>
                            {it.calculationSnapshot && (
                              <Typography variant="caption" color="text.secondary">
                                {it.calculationSnapshot}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell align="right">{it.quantity}</TableCell>
                          <TableCell align="right">{formatVND(it.unitPrice)}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                            {formatVND(it.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow sx={{ backgroundColor: 'action.selected' }}>
                        <TableCell colSpan={3}><strong>TỔNG CỘNG HÓA ĐƠN</strong></TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold', fontSize: '1.1rem', color: 'primary.main' }}>
                          {formatVND(previewData.effectiveDue)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setPreviewOpen(false)}>Đóng</Button>
          <Button
            variant="contained"
            onClick={handleCreateDraft}
            disabled={actionLoading || !previewData}
          >
            Lưu Hóa Đơn Nháp
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal 3: Record Payment */}
      <Dialog open={paymentOpen} onClose={() => setPaymentOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>
          Ghi Nhận Thu Tiền Hóa Đơn
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Alert severity="info">
              Ghi nhận thanh toán vào sổ cái bất biến (BR-087..BR-095). Có thể thu một phần hoặc toàn bộ.
            </Alert>
            <TextField
              label="Số tiền thu (VND) *"
              type="number"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              fullWidth
              size="small"
              helperText={`Còn nợ: ${formatVND(selectedInvoice?.debt)}`}
            />
            <TextField
              label="Phương thức thanh toán *"
              select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              fullWidth
              size="small"
            >
              <MenuItem value="BANK_TRANSFER">Chuyển khoản ngân hàng</MenuItem>
              <MenuItem value="CASH">Tiền mặt</MenuItem>
              <MenuItem value="MOMO">Ví MoMo</MenuItem>
              <MenuItem value="VNPAY">VNPAY-QR</MenuItem>
            </TextField>
            <TextField
              label="Mã tham chiếu / Mã giao dịch ngân hàng"
              value={paymentRefCode}
              onChange={(e) => setPaymentRefCode(e.target.value)}
              fullWidth
              size="small"
              placeholder="VD: FT2609210001"
            />
            <TextField
              label="Ghi chú thu tiền"
              value={paymentNote}
              onChange={(e) => setPaymentNote(e.target.value)}
              fullWidth
              size="small"
              multiline
              rows={2}
              placeholder="VD: Khách chuyển tiền phòng kỳ 09/2026"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setPaymentOpen(false)}>Hủy</Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleRecordPayment}
            disabled={actionLoading || !paymentAmount}
          >
            {actionLoading ? <CircularProgress size={24} /> : 'Xác Nhận Thu Tiền'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal 4: Payment Correction */}
      <Dialog open={correctOpen} onClose={() => setCorrectOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>
          Sửa Bút Toán Thu Nhập Nhầm (PAYMENT_CORRECTION)
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Alert severity="warning">
              Quy tắc kiểm toán BR-096: Không xóa hoặc đè record cũ. Hệ thống tạo bút toán đối trừ delta (âm) liên kết với bút toán gốc.
            </Alert>
            <Typography variant="body2">
              <strong>Bút toán gốc:</strong> {targetLedgerEntry && formatVND(targetLedgerEntry.amount)} ({targetLedgerEntry?.paymentMethod})
            </Typography>
            <TextField
              label="Số tiền điều chỉnh (VND delta có dấu) *"
              type="number"
              value={correctionDelta}
              onChange={(e) => setCorrectionDelta(e.target.value)}
              fullWidth
              size="small"
              placeholder="VD: -500000"
              helperText="Nhập số âm nếu giảm trừ số tiền đã thu thừa"
            />
            <TextField
              label="Lý do đính chính (Bắt buộc) *"
              value={correctionReason}
              onChange={(e) => setCorrectionReason(e.target.value)}
              fullWidth
              size="small"
              multiline
              rows={3}
              placeholder="VD: Nhập nhầm tiền mặt của phòng khác, đính chính giảm 500k"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setCorrectOpen(false)}>Hủy</Button>
          <Button
            variant="contained"
            color="warning"
            onClick={handleConfirmCorrection}
            disabled={actionLoading || !correctionDelta || !correctionReason}
          >
            {actionLoading ? <CircularProgress size={24} /> : 'Lưu Đính Chính'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal 5: Refund Credit */}
      <Dialog open={refundOpen} onClose={() => setRefundOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>
          Hoàn Tiền Thừa Hóa Đơn (REFUND)
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Alert severity="info">
              Hoàn trả khoản dư (credit) của hóa đơn lại cho khách thuê (BR-097, EX-10).
            </Alert>
            <TextField
              label="Số tiền hoàn (VND) *"
              type="number"
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
              fullWidth
              size="small"
              helperText={`Số dư credit hiện có: ${formatVND(financialStatus?.credit || selectedInvoice?.credit)}`}
            />
            <TextField
              label="Phương thức hoàn tiền *"
              select
              value={refundMethod}
              onChange={(e) => setRefundMethod(e.target.value as PaymentMethod)}
              fullWidth
              size="small"
            >
              <MenuItem value="BANK_TRANSFER">Chuyển khoản lại cho khách</MenuItem>
              <MenuItem value="CASH">Tiền mặt</MenuItem>
            </TextField>
            <TextField
              label="Lý do hoàn tiền *"
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              fullWidth
              size="small"
              multiline
              rows={3}
              placeholder="VD: Khách đóng thừa do điều chỉnh giảm giá hóa đơn"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setRefundOpen(false)}>Hủy</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleConfirmRefund}
            disabled={actionLoading || !refundAmount || !refundReason}
          >
            {actionLoading ? <CircularProgress size={24} /> : 'Xác Nhận Hoàn Tiền'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal 6: Transfer Credit */}
      <Dialog open={transferOpen} onClose={() => setTransferOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>
          Chuyển Dư Bù Nợ Sang Hóa Đơn Khác
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Alert severity="info">
              Chuyển khoản dư (credit) từ hóa đơn này sang bù trừ công nợ của hóa đơn khác (BR-098, EX-13). Không phát sinh tiền mặt mới.
            </Alert>
            <TextField
              label="Chọn hóa đơn đích cần bù trừ *"
              select
              value={targetInvoiceId}
              onChange={(e) => setTargetInvoiceId(e.target.value)}
              fullWidth
              size="small"
            >
              {otherDebtInvoices.length === 0 ? (
                <MenuItem value="" disabled>Không có hóa đơn nào khác đang nợ</MenuItem>
              ) : (
                otherDebtInvoices.map((inv) => (
                  <MenuItem key={inv.id} value={inv.id}>
                    Kỳ {inv.billingMonth} — Phòng {inv.roomName} (Còn nợ: {formatVND(inv.debt)})
                  </MenuItem>
                ))
              )}
            </TextField>
            <TextField
              label="Số tiền chuyển dư (VND) *"
              type="number"
              value={transferAmount}
              onChange={(e) => setTransferAmount(e.target.value)}
              fullWidth
              size="small"
              helperText={`Credit nguồn tối đa: ${formatVND(financialStatus?.credit || selectedInvoice?.credit)}`}
            />
            <TextField
              label="Lý do chuyển bù trừ *"
              value={transferReason}
              onChange={(e) => setTransferReason(e.target.value)}
              fullWidth
              size="small"
              multiline
              rows={3}
              placeholder="VD: Bù trừ tiền thừa tháng trước vào hóa đơn kỳ này"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setTransferOpen(false)}>Hủy</Button>
          <Button
            variant="contained"
            color="secondary"
            onClick={handleConfirmTransfer}
            disabled={actionLoading || !targetInvoiceId || !transferAmount || !transferReason}
          >
            {actionLoading ? <CircularProgress size={24} /> : 'Xác Nhận Chuyển Dư'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal 7: Adjust Invoice (Existing) */}
      <Dialog open={adjustOpen} onClose={() => setAdjustOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>
          Điều Chỉnh Giá Trị Hóa Đơn (BR-081)
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Alert severity="warning">
              Số tiền delta có dấu (+ nếu truy thu thêm, - nếu giảm trừ).
              Hóa đơn sau điều chỉnh không được có số tiền phải nộp âm (EX-12).
            </Alert>
            <TextField
              label="Số tiền điều chỉnh (VND) *"
              type="number"
              value={adjustDelta}
              onChange={(e) => setAdjustDelta(e.target.value)}
              fullWidth
              size="small"
              placeholder="VD: -200000 hoặc 150000"
            />
            <TextField
              label="Ngày hiệu lực *"
              type="date"
              value={adjustDate}
              onChange={(e) => setAdjustDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
              size="small"
            />
            <TextField
              label="Lý do điều chỉnh (Bắt buộc theo kiểm toán) *"
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
              fullWidth
              size="small"
              multiline
              rows={3}
              placeholder="VD: Giảm trừ tiền mạng do đứt cáp 3 ngày"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setAdjustOpen(false)}>Hủy</Button>
          <Button
            variant="contained"
            color="warning"
            onClick={handleAdjustInvoice}
            disabled={actionLoading || !adjustDelta || !adjustReason}
          >
            {actionLoading ? <CircularProgress size={24} /> : 'Lưu Điều Chỉnh'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal 8: Add Note (Existing) */}
      <Dialog open={noteOpen} onClose={() => setNoteOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>
          Thêm Ghi Chú Đính Chính (Phi tài chính)
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Alert severity="info">
              Ghi chú mô tả không làm thay đổi số tiền phải nộp của hóa đơn.
            </Alert>
            <TextField
              label="Nội dung ghi chú *"
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              fullWidth
              size="small"
              multiline
              rows={3}
              placeholder="VD: Đính chính số tài khoản chuyển khoản của khách"
            />
            <TextField
              label="Lý do ghi chú *"
              value={noteReason}
              onChange={(e) => setNoteReason(e.target.value)}
              fullWidth
              size="small"
              placeholder="VD: Khách yêu cầu sửa ghi chú"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setNoteOpen(false)}>Hủy</Button>
          <Button
            variant="contained"
            onClick={handleAddNote}
            disabled={actionLoading || !noteContent || !noteReason}
          >
            {actionLoading ? <CircularProgress size={24} /> : 'Lưu Ghi Chú'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
