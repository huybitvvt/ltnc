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
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Visibility as ViewIcon,
  CheckCircle as IssueIcon,
  Edit as AdjustIcon,
  NoteAdd as NoteIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useAuth } from '../auth/AuthContext';
import { invoicesApi } from './invoicesApi';
import { contractsApi } from '../contracts/contractsApi';
import {
  InvoiceSummary,
  InvoiceDetail,
  InvoiceStatus,
  PaymentStatus,
} from './types';
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
  const [error, setError] = useState<string | null>(null);

  // Detail Dialog
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);

  // Preview / Create Draft Dialog
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedContractId, setSelectedContractId] = useState<string>('');
  const [previewMonth, setPreviewMonth] = useState<string>(currentMonthStr);
  const [previewData, setPreviewData] = useState<InvoiceDetail | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Adjust Dialog
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustDelta, setAdjustDelta] = useState<string>('');
  const [adjustReason, setAdjustReason] = useState<string>('');
  const [adjustDate, setAdjustDate] = useState<string>(new Date().toISOString().slice(0, 10));

  // Note Dialog
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteContent, setNoteContent] = useState<string>('');
  const [noteReason, setNoteReason] = useState<string>('');

  const loadInvoices = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await invoicesApi.listInvoices({
        billingMonth: billingMonth || undefined,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
      });
      setInvoices(res.content || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không thể tải danh sách hóa đơn');
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

  const handleOpenDetail = async (id: string) => {
    setDetailLoading(true);
    setDetailOpen(true);
    try {
      const data = await invoicesApi.getInvoice(id);
      setSelectedInvoice(data);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi tải chi tiết hóa đơn');
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCalculatePreview = async () => {
    if (!selectedContractId) return;
    setPreviewLoading(true);
    try {
      const data = await invoicesApi.previewInvoice({
        contractId: selectedContractId,
        billingMonth: previewMonth,
      });
      setPreviewData(data);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi tính toán xem trước hóa đơn');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!selectedContractId) return;
    setActionLoading(true);
    try {
      await invoicesApi.createOrRecalculateDraft({
        contractId: selectedContractId,
        billingMonth: previewMonth,
      });
      alert('Đã lưu hóa đơn nháp thành công!');
      setPreviewOpen(false);
      loadInvoices();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi lưu hóa đơn nháp');
    } finally {
      setActionLoading(false);
    }
  };

  const handleIssueInvoice = async (invoiceId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn phát hành chính thức hóa đơn này? Hóa đơn đã phát hành là bất biến!')) {
      return;
    }
    setActionLoading(true);
    try {
      const idempotencyKey = crypto.randomUUID();
      const res = await invoicesApi.issueInvoice(invoiceId, idempotencyKey);
      alert('Phát hành hóa đơn thành công!');
      setSelectedInvoice(res);
      loadInvoices();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi phát hành hóa đơn');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApplyAdjustment = async () => {
    if (!selectedInvoice || !adjustDelta || !adjustReason) return;
    setActionLoading(true);
    try {
      const idempotencyKey = crypto.randomUUID();
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
      // Tải lại detail
      const res = await invoicesApi.getInvoice(selectedInvoice.id);
      setSelectedInvoice(res);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi thêm ghi chú');
    } finally {
      setActionLoading(false);
    }
  };

  const formatVND = (val: string | number) => {
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
        return <Chip label="Đã thanh toán" color="success" size="small" variant="outlined" />;
      case 'PARTIAL':
        return <Chip label="Thanh toán một phần" color="warning" size="small" variant="outlined" />;
      case 'CREDIT':
        return <Chip label="Có tiền dư (Credit)" color="info" size="small" variant="outlined" />;
      case 'UNPAID':
      default:
        return <Chip label="Chưa thanh toán" color="error" size="small" variant="outlined" />;
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2} mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            🧾 Quản Lý Hóa Đơn & Tính Tiền
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Tính tiền phòng, điện nước, dịch vụ định kỳ và điều chỉnh hóa đơn theo đúng quy tắc kế toán bất biến
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
            sx={{ width: { xs: '100%', sm: 200 } }}
          />
          <TextField
            select
            label="Trạng thái hóa đơn"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            size="small"
            sx={{ width: { xs: '100%', sm: 220 } }}
          >
            <MenuItem value="ALL">Tất cả trạng thái</MenuItem>
            <MenuItem value="DRAFT">Bản nháp (DRAFT)</MenuItem>
            <MenuItem value="ISSUED">Đã phát hành (ISSUED)</MenuItem>
          </TextField>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadInvoices}
            disabled={loading}
          >
            Làm mới
          </Button>
        </Stack>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* Table */}
      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        <Table>
          <TableHead sx={{ backgroundColor: 'action.hover' }}>
            <TableRow>
              <TableCell><strong>Phòng</strong></TableCell>
              <TableCell><strong>Tòa nhà</strong></TableCell>
              <TableCell><strong>Khách thuê</strong></TableCell>
              <TableCell><strong>Kỳ tháng</strong></TableCell>
              <TableCell><strong>Vòng đời</strong></TableCell>
              <TableCell align="right"><strong>Tổng tiền hiệu lực</strong></TableCell>
              <TableCell align="right"><strong>Còn nợ</strong></TableCell>
              <TableCell><strong>Thanh toán</strong></TableCell>
              <TableCell><strong>Hạn nợ</strong></TableCell>
              <TableCell align="center"><strong>Thao tác</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={10} align="center" sx={{ py: 3 }}>
                  <CircularProgress size={32} />
                </TableCell>
              </TableRow>
            ) : invoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} align="center" sx={{ py: 3 }}>
                  Chưa có hóa đơn nào phù hợp với bộ lọc
                </TableCell>
              </TableRow>
            ) : (
              invoices.map((inv) => (
                <TableRow key={inv.id} hover>
                  <TableCell><strong>{inv.roomName}</strong></TableCell>
                  <TableCell>{inv.buildingName}</TableCell>
                  <TableCell>{inv.tenantName}</TableCell>
                  <TableCell><Chip label={inv.billingMonth} size="small" variant="outlined" /></TableCell>
                  <TableCell>{renderStatusChip(inv.status)}</TableCell>
                  <TableCell align="right"><strong>{formatVND(inv.effectiveDue)}</strong></TableCell>
                  <TableCell align="right" sx={{ color: Number(inv.debt) > 0 ? 'error.main' : 'text.primary' }}>
                    {formatVND(inv.debt)}
                  </TableCell>
                  <TableCell>{renderPaymentChip(inv.paymentStatus)}</TableCell>
                  <TableCell>{inv.dueDate}</TableCell>
                  <TableCell align="center">
                    <IconButton color="primary" size="small" onClick={() => handleOpenDetail(inv.id)} title="Xem chi tiết">
                      <ViewIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Invoice Detail Dialog */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" fontWeight="bold">
              Chi Tiết Hóa Đơn — Phòng {selectedInvoice?.roomName} ({selectedInvoice?.billingMonth})
            </Typography>
            {selectedInvoice && renderStatusChip(selectedInvoice.status)}
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          {detailLoading || !selectedInvoice ? (
            <Box textAlign="center" py={4}><CircularProgress /></Box>
          ) : (
            <Stack spacing={3}>
              {/* Info grid */}
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">Tòa nhà:</Typography>
                  <Typography variant="body1" fontWeight="500">{selectedInvoice.buildingName}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">Người đại diện:</Typography>
                  <Typography variant="body1" fontWeight="500">{selectedInvoice.tenantName}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">Khoảng tính tiền:</Typography>
                  <Typography variant="body1">{selectedInvoice.periodStart} ➔ {selectedInvoice.periodEndExclusive} (end-exclusive)</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">Hạn thanh toán (Due date):</Typography>
                  <Typography variant="body1" fontWeight="500">{selectedInvoice.dueDate}</Typography>
                </Grid>
              </Grid>

              <Divider />

              {/* Items Table */}
              <Typography variant="subtitle1" fontWeight="bold">📋 Chi Tiết Từng Khoản Phí</Typography>
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
                    {selectedInvoice.items.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <Typography variant="body2" fontWeight="500">{item.label}</Typography>
                          <Typography variant="caption" color="text.secondary">Loại: {item.type}</Typography>
                        </TableCell>
                        <TableCell align="right">{item.quantity}</TableCell>
                        <TableCell align="right">{formatVND(item.unitPrice)}</TableCell>
                        <TableCell align="right"><strong>{formatVND(item.amount)}</strong></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Financial summary */}
              <Card variant="outlined" sx={{ backgroundColor: 'background.default' }}>
                <CardContent>
                  <Grid container spacing={2}>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" color="text.secondary">Tiền gốc ban đầu</Typography>
                      <Typography variant="h6">{formatVND(selectedInvoice.originalTotal)}</Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" color="text.secondary">Tổng điều chỉnh</Typography>
                      <Typography variant="h6" sx={{ color: Number(selectedInvoice.adjustmentsTotal) < 0 ? 'success.main' : 'text.primary' }}>
                        {formatVND(selectedInvoice.adjustmentsTotal)}
                      </Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" color="text.secondary">Tổng phải nộp (effectiveDue)</Typography>
                      <Typography variant="h6" fontWeight="bold" color="primary.main">
                        {formatVND(selectedInvoice.effectiveDue)}
                      </Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" color="text.secondary">Còn nợ (debt)</Typography>
                      <Typography variant="h6" fontWeight="bold" color={Number(selectedInvoice.debt) > 0 ? 'error.main' : 'success.main'}>
                        {formatVND(selectedInvoice.debt)}
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* Adjustments History */}
              {selectedInvoice.adjustments.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" fontWeight="bold" color="warning.main" gutterBottom>
                    ⚖️ Lịch Sử Điều Chỉnh Giá Trị (Bất biến)
                  </Typography>
                  <Stack spacing={1}>
                    {selectedInvoice.adjustments.map((adj) => (
                      <Paper key={adj.id} variant="outlined" sx={{ p: 1.5, backgroundColor: 'action.hover' }}>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="body2" fontWeight="bold" color={Number(adj.deltaAmount) > 0 ? 'error.main' : 'success.main'}>
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
        <DialogActions sx={{ p: 2 }}>
          {isManager && selectedInvoice?.status === 'DRAFT' && (
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
          {isManager && selectedInvoice?.status === 'ISSUED' && (
            <>
              <Button
                variant="outlined"
                color="warning"
                startIcon={<AdjustIcon />}
                onClick={() => setAdjustOpen(true)}
              >
                Điều Chỉnh Hóa Đơn
              </Button>
              <Button
                variant="outlined"
                startIcon={<NoteIcon />}
                onClick={() => setNoteOpen(true)}
              >
                Thêm Ghi Chú
              </Button>
            </>
          )}
          <Button onClick={() => setDetailOpen(false)}>Đóng</Button>
        </DialogActions>
      </Dialog>

      {/* Preview / Create Draft Dialog */}
      <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Lập & Xem Trước Hóa Đơn Kỳ</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
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
                onClick={handleCalculatePreview}
                disabled={previewLoading || !selectedContractId}
              >
                Tính Toán
              </Button>
            </Stack>

            {previewLoading && <Box textAlign="center" py={3}><CircularProgress /></Box>}

            {previewData && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Kết quả tính toán dự kiến ({previewData.periodStart} ➔ {previewData.periodEndExclusive}):
                </Typography>
                <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
                  <Table size="small">
                    <TableHead sx={{ backgroundColor: 'action.hover' }}>
                      <TableRow>
                        <TableCell><strong>Khoản phí</strong></TableCell>
                        <TableCell align="right"><strong>Số lượng</strong></TableCell>
                        <TableCell align="right"><strong>Đơn giá</strong></TableCell>
                        <TableCell align="right"><strong>Thành tiền</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {previewData.items.map((it, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{it.label}</TableCell>
                          <TableCell align="right">{it.quantity}</TableCell>
                          <TableCell align="right">{formatVND(it.unitPrice)}</TableCell>
                          <TableCell align="right"><strong>{formatVND(it.amount)}</strong></TableCell>
                        </TableRow>
                      ))}
                      <TableRow sx={{ backgroundColor: 'action.hover' }}>
                        <TableCell colSpan={3}><strong>TỔNG TIỀN DỰ KIẾN:</strong></TableCell>
                        <TableCell align="right"><Typography variant="h6" color="primary.main">{formatVND(previewData.originalTotal)}</Typography></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          {previewData && (
            <Button
              variant="contained"
              color="warning"
              onClick={handleSaveDraft}
              disabled={actionLoading}
            >
              Lưu Vào Bản Nháp (Draft)
            </Button>
          )}
          <Button onClick={() => setPreviewOpen(false)}>Hủy</Button>
        </DialogActions>
      </Dialog>

      {/* Adjust Invoice Dialog */}
      <Dialog open={adjustOpen} onClose={() => setAdjustOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Điều Chỉnh Giá Trị Hóa Đơn (BR-080..084)</DialogTitle>
        <DialogContent dividers>
          <Alert severity="info" sx={{ mb: 2 }}>
            Hóa đơn đã phát hành không thể sửa trực tiếp. Bút toán điều chỉnh sẽ ghi lại chênh lệch có dấu (+ hoặc -) và giữ nguyên bản gốc.
          </Alert>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Số tiền điều chỉnh (VND, có dấu)"
              placeholder="Ví dụ: -200000 hoặc 150000"
              value={adjustDelta}
              onChange={(e) => setAdjustDelta(e.target.value)}
              fullWidth
              helperText="Nhập số âm để giảm trừ, số dương để thu bổ sung"
            />
            <TextField
              label="Lý do điều chỉnh (bắt buộc)"
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
              fullWidth
              multiline
              rows={2}
            />
            <TextField
              label="Ngày hiệu lực"
              type="date"
              value={adjustDate}
              onChange={(e) => setAdjustDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            variant="contained"
            color="warning"
            onClick={handleApplyAdjustment}
            disabled={actionLoading || !adjustDelta || !adjustReason}
          >
            Xác Nhận Điều Chỉnh
          </Button>
          <Button onClick={() => setAdjustOpen(false)}>Hủy</Button>
        </DialogActions>
      </Dialog>

      {/* Note Dialog */}
      <Dialog open={noteOpen} onClose={() => setNoteOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Thêm Ghi Chú Đính Chính (Phi tài chính)</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Nội dung đính chính"
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              fullWidth
              multiline
              rows={2}
            />
            <TextField
              label="Lý do"
              value={noteReason}
              onChange={(e) => setNoteReason(e.target.value)}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            variant="contained"
            onClick={handleAddNote}
            disabled={actionLoading || !noteContent || !noteReason}
          >
            Lưu Ghi Chú
          </Button>
          <Button onClick={() => setNoteOpen(false)}>Hủy</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
