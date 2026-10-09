import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  CircularProgress,
  Alert,
  IconButton,
  Tabs,
  Tab,
  Stack,
  Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import RefreshIcon from '@mui/icons-material/Refresh';
import UploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ReplayIcon from '@mui/icons-material/Replay';
import SendIcon from '@mui/icons-material/Send';
import { useAuth } from '../auth/AuthContext';
import { operationsApi } from './operationsApi';
import { IssueDto, FeedbackDto, IssueStatus, FeedbackStatus } from './types';
import { contractsApi } from '../contracts/contractsApi';
import { ContractSummary } from '../contracts/types';

export const IncidentsPage: React.FC = () => {
  const { user } = useAuth();
  const [tabIndex, setTabIndex] = useState(0);

  // Issues State
  const [issues, setIssues] = useState<IssueDto[]>([]);
  const [contracts, setContracts] = useState<ContractSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Dialogs
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<IssueDto | null>(null);
  const [openDetailDialog, setOpenDetailDialog] = useState(false);
  const [openReopenDialog, setOpenReopenDialog] = useState(false);
  const [reopenReason, setReopenReason] = useState('');

  // Create Form State
  const [formContractId, setFormContractId] = useState('');
  const [formRoomId, setFormRoomId] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [creating, setCreating] = useState(false);

  // Feedback State
  const [feedbacks, setFeedbacks] = useState<FeedbackDto[]>([]);
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackDto | null>(null);
  const [openFeedbackDialog, setOpenFeedbackDialog] = useState(false);
  const [replyMessage, setReplyMessage] = useState('');
  const [replying, setReplying] = useState(false);

  const isTenant = user?.role === 'TENANT';

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [issuesRes, contractsRes] = await Promise.all([
        operationsApi.listIssues(),
        contractsApi.listContracts(),
      ]);
      setIssues(issuesRes);
      setContracts(contractsRes || []);

      if (!isTenant) {
        const fbRes = await operationsApi.getAllFeedbacks();
        setFeedbacks(fbRes);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Không thể tải danh sách dữ liệu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateIssue = async () => {
    if (!formContractId || !formRoomId || !formTitle.trim() || !formDesc.trim()) {
      setError('Vui lòng điền đầy đủ các thông tin bắt buộc.');
      return;
    }
    if (selectedFiles.length > 5) {
      setError('Chỉ được chọn tối đa 5 ảnh đính kèm (BR-131).');
      return;
    }

    setCreating(true);
    setError(null);
    try {
      const uploadedFileIds: string[] = [];
      for (const file of selectedFiles) {
        const uploaded = await operationsApi.uploadFile(file, 'MAINTENANCE_ISSUE', formContractId);
        uploadedFileIds.push(uploaded.id);
      }

      await operationsApi.createIssue({
        contractId: formContractId,
        roomId: formRoomId,
        title: formTitle.trim(),
        description: formDesc.trim(),
        fileIds: uploadedFileIds,
      });

      setSuccessMsg('Đã gửi báo cáo sự cố thành công!');
      setOpenCreateDialog(false);
      setFormTitle('');
      setFormDesc('');
      setSelectedFiles([]);
      loadData();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Gửi báo cáo sự cố thất bại.');
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateStatus = async (issueId: string, status: IssueStatus, comment?: string) => {
    setError(null);
    try {
      const updated = await operationsApi.updateIssueStatus(issueId, { status, comment });
      setSelectedIssue(updated);
      setSuccessMsg(`Đã cập nhật trạng thái sự cố sang ${status}`);
      loadData();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Cập nhật trạng thái sự cố thất bại.');
    }
  };

  const handleReopen = async () => {
    if (!selectedIssue) return;
    if (!reopenReason.trim()) {
      setError('Vui lòng nêu rõ lý do yêu cầu mở lại sự cố (BR-127).');
      return;
    }

    try {
      await handleUpdateStatus(selectedIssue.id, 'IN_PROGRESS', reopenReason.trim());
      setOpenReopenDialog(false);
      setReopenReason('');
    } catch (err) {
      // Đã bắt ở handleUpdateStatus
    }
  };

  const handleSendReply = async () => {
    if (!selectedFeedback || !replyMessage.trim()) return;
    setReplying(true);
    try {
      const updated = await operationsApi.replyFeedback(selectedFeedback.id, { message: replyMessage.trim() });
      setSelectedFeedback(updated);
      setReplyMessage('');
      setSuccessMsg('Đã gửi câu trả lời trao đổi.');
      loadData();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Gửi câu trả lời thất bại.');
    } finally {
      setReplying(false);
    }
  };

  const handleResolveFeedback = async (feedbackId: string) => {
    try {
      const updated = await operationsApi.updateFeedbackStatus(feedbackId, 'RESOLVED');
      setSelectedFeedback(updated);
      setSuccessMsg('Đã hoàn tất giải quyết phản hồi hóa đơn.');
      loadData();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Cập nhật phản hồi thất bại.');
    }
  };

  const getStatusChip = (status: IssueStatus) => {
    switch (status) {
      case 'OPEN':
        return <Chip label="Chờ tiếp nhận" color="warning" size="small" />;
      case 'ACCEPTED':
        return <Chip label="Đã tiếp nhận" color="info" size="small" />;
      case 'IN_PROGRESS':
        return <Chip label="Đang sửa chữa" color="primary" size="small" />;
      case 'RESOLVED':
        return <Chip label="Đã sửa xong" color="success" size="small" />;
      case 'CLOSED':
        return <Chip label="Đã đóng" size="small" variant="outlined" />;
    }
  };

  const getFeedbackChip = (status: FeedbackStatus) => {
    switch (status) {
      case 'OPEN':
        return <Chip label="Chờ phản hồi" color="warning" size="small" />;
      case 'IN_REVIEW':
        return <Chip label="Đang trao đổi" color="info" size="small" />;
      case 'RESOLVED':
        return <Chip label="Đã giải quyết" color="success" size="small" />;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight="bold">
            Quản Lý Sự Cố & Phản Hồi
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Tiếp nhận bảo trì kỹ thuật, trao đổi thắc mắc hóa đơn và nhật ký lịch sử
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={loadData}>
            Làm mới
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              if (isTenant && contracts.length > 0) {
                const activeC = contracts.find((c) => c.status === 'ACTIVE') || contracts[0];
                setFormContractId(activeC.id);
                setFormRoomId(activeC.roomId);
              }
              setOpenCreateDialog(true);
            }}
          >
            Báo Sự Cố Mới
          </Button>
        </Stack>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {successMsg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMsg(null)}>{successMsg}</Alert>}

      {/* Tabs */}
      <Tabs value={tabIndex} onChange={(_, val) => setTabIndex(val)} sx={{ mb: 3 }}>
        <Tab label={`Sự Cố Bảo Trì (${issues.length})`} />
        {!isTenant && <Tab label={`Phản Hồi Hóa Đơn (${feedbacks.length})`} />}
      </Tabs>

      {/* TAB 0: ISSUES */}
      {tabIndex === 0 && (
        <Card>
          <CardContent sx={{ p: 0 }}>
            {loading ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <CircularProgress />
              </Box>
            ) : issues.length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography color="text.secondary">Chưa có sự cố bảo trì nào được ghi nhận.</Typography>
              </Box>
            ) : (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Tiêu đề sự cố</TableCell>
                    <TableCell>Phòng / Tòa</TableCell>
                    <TableCell>Người báo</TableCell>
                    <TableCell>Phụ trách</TableCell>
                    <TableCell>Trạng thái</TableCell>
                    <TableCell>Thời gian</TableCell>
                    <TableCell align="right">Thao tác</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {issues.map((issue) => (
                    <TableRow key={issue.id} hover>
                      <TableCell sx={{ fontWeight: 'medium' }}>{issue.title}</TableCell>
                      <TableCell>
                        Phòng {issue.roomCode} {issue.buildingName ? `(${issue.buildingName})` : ''}
                      </TableCell>
                      <TableCell>{issue.createdByName}</TableCell>
                      <TableCell>{issue.assigneeName || <em>Chưa phân công</em>}</TableCell>
                      <TableCell>{getStatusChip(issue.status)}</TableCell>
                      <TableCell>{new Date(issue.createdAt).toLocaleString('vi-VN')}</TableCell>
                      <TableCell align="right">
                        <IconButton
                          color="primary"
                          onClick={() => {
                            setSelectedIssue(issue);
                            setOpenDetailDialog(true);
                          }}
                        >
                          <VisibilityIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 1: INVOICE FEEDBACKS (OWNER / STAFF) */}
      {tabIndex === 1 && !isTenant && (
        <Card>
          <CardContent sx={{ p: 0 }}>
            {loading ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <CircularProgress />
              </Box>
            ) : feedbacks.length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography color="text.secondary">Không có thắc mắc phản hồi hóa đơn nào.</Typography>
              </Box>
            ) : (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Mã Hóa đơn</TableCell>
                    <TableCell>Người gửi</TableCell>
                    <TableCell>Nội dung thắc mắc</TableCell>
                    <TableCell>Trạng thái</TableCell>
                    <TableCell>Ngày gửi</TableCell>
                    <TableCell align="right">Thao tác</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {feedbacks.map((fb) => (
                    <TableRow key={fb.id} hover>
                      <TableCell sx={{ fontWeight: 'bold' }}>{fb.invoiceCode}</TableCell>
                      <TableCell>{fb.createdByName}</TableCell>
                      <TableCell sx={{ maxWidth: 300, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {fb.message}
                      </TableCell>
                      <TableCell>{getFeedbackChip(fb.status)}</TableCell>
                      <TableCell>{new Date(fb.createdAt).toLocaleString('vi-VN')}</TableCell>
                      <TableCell align="right">
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => {
                            setSelectedFeedback(fb);
                            setOpenFeedbackDialog(true);
                          }}
                        >
                          Xem & Trả lời ({fb.replies?.length || 0})
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* DIALOG CREATE ISSUE */}
      <Dialog open={openCreateDialog} onClose={() => setOpenCreateDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Báo Cáo Sự Cố Bảo Trì</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              select
              label="Hợp đồng & Phòng"
              value={formContractId}
              onChange={(e) => {
                const cid = e.target.value;
                setFormContractId(cid);
                const matched = contracts.find((c) => c.id === cid);
                if (matched) setFormRoomId(matched.roomId);
              }}
              fullWidth
              required
            >
              {contracts
                .filter((c) => !isTenant || c.status === 'ACTIVE')
                .map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    Hợp đồng {c.id.substring(0, 8)}... — Phòng {c.roomNumber} ({c.status})
                  </MenuItem>
                ))}
            </TextField>

            <TextField
              label="Tiêu đề sự cố"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="Ví dụ: Rò rỉ nước bồn rửa mặt, hỏng bóng đèn..."
              fullWidth
              required
            />

            <TextField
              label="Mô tả chi tiết sự cố"
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              placeholder="Mô tả cụ thể biểu hiện hư hại, thời điểm phát hiện..."
              multiline
              rows={3}
              fullWidth
              required
            />

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Ảnh chụp hiện trường (Tối đa 5 ảnh, định dạng JPEG/PNG/WebP, &le; 5MB/ảnh)
              </Typography>
              <Button variant="outlined" component="label" startIcon={<UploadIcon />}>
                Chọn ảnh tải lên
                <input
                  type="file"
                  hidden
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => {
                    if (e.target.files) {
                      setSelectedFiles(Array.from(e.target.files));
                    }
                  }}
                />
              </Button>
              {selectedFiles.length > 0 && (
                <Stack spacing={0.5} sx={{ mt: 1 }}>
                  {selectedFiles.map((f, idx) => (
                    <Typography key={idx} variant="caption" color="text.secondary">
                      &bull; {f.name} ({(f.size / (1024 * 1024)).toFixed(2)} MB)
                    </Typography>
                  ))}
                </Stack>
              )}
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreateDialog(false)}>Hủy</Button>
          <Button variant="contained" onClick={handleCreateIssue} disabled={creating}>
            {creating ? <CircularProgress size={24} /> : 'Gửi Báo Cáo'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG DETAIL ISSUE */}
      <Dialog open={openDetailDialog} onClose={() => setOpenDetailDialog(false)} maxWidth="md" fullWidth>
        {selectedIssue && (
          <>
            <DialogTitle>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="h6">{selectedIssue.title}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Phòng {selectedIssue.roomCode} &bull; Người báo: {selectedIssue.createdByName} &bull;{' '}
                    {new Date(selectedIssue.createdAt).toLocaleString('vi-VN')}
                  </Typography>
                </Box>
                {getStatusChip(selectedIssue.status)}
              </Stack>
            </DialogTitle>
            <DialogContent dividers>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Mô tả sự cố:
              </Typography>
              <Typography variant="body1" sx={{ mb: 2, p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
                {selectedIssue.description}
              </Typography>

              {/* Ảnh đính kèm */}
              {selectedIssue.fileIds && selectedIssue.fileIds.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Ảnh hiện trường ({selectedIssue.fileIds.length}):
                  </Typography>
                  <Grid container spacing={1}>
                    {selectedIssue.fileIds.map((fid) => (
                      <Grid item xs={4} sm={3} key={fid}>
                        <Box
                          component="img"
                          src={operationsApi.getFileUrl(fid)}
                          alt="Ảnh sự cố"
                          sx={{
                            width: '100%',
                            height: 120,
                            objectFit: 'cover',
                            borderRadius: 1,
                            border: '1px solid #ddd',
                            cursor: 'pointer',
                          }}
                          onClick={() => window.open(operationsApi.getFileUrl(fid), '_blank')}
                        />
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              )}

              <Divider sx={{ my: 2 }} />

              {/* Lịch sử xử lý */}
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Tiến trình & Nhật ký xử lý:
              </Typography>
              {selectedIssue.history && selectedIssue.history.length > 0 ? (
                <Stack spacing={1.5} sx={{ pl: 1 }}>
                  {selectedIssue.history.map((h) => (
                    <Box key={h.id} sx={{ borderLeft: '2px solid #1976d2', pl: 2, py: 0.5 }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="caption" fontWeight="bold">
                          {h.actorName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(h.createdAt).toLocaleString('vi-VN')}
                        </Typography>
                      </Stack>
                      <Typography variant="body2" sx={{ my: 0.5 }}>
                        Chuyển trạng thái: <strong>{h.oldStatus}</strong> &rarr; <strong>{h.newStatus}</strong>
                      </Typography>
                      {h.comment && (
                        <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                          Ghi chú: {h.comment}
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Chưa có lịch sử chuyển trạng thái.
                </Typography>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenDetailDialog(false)}>Đóng</Button>

              {/* Các thao tác theo vai trò */}
              {!isTenant && selectedIssue.status === 'OPEN' && (
                <Button
                  variant="contained"
                  color="info"
                  onClick={() => handleUpdateStatus(selectedIssue.id, 'ACCEPTED', 'Nhân viên đã tiếp nhận yêu cầu')}
                >
                  Tiếp Nhận Sự Cố
                </Button>
              )}

              {!isTenant && selectedIssue.status === 'ACCEPTED' && (
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => handleUpdateStatus(selectedIssue.id, 'IN_PROGRESS', 'Bắt đầu cử thợ đến sửa chữa')}
                >
                  Bắt Đầu Sửa Chữa
                </Button>
              )}

              {!isTenant && selectedIssue.status === 'IN_PROGRESS' && (
                <Button
                  variant="contained"
                  color="success"
                  onClick={() => handleUpdateStatus(selectedIssue.id, 'RESOLVED', 'Thợ kỹ thuật đã hoàn thành sửa chữa')}
                >
                  Báo Đã Sửa Xong
                </Button>
              )}

              {/* Tenant xác nhận đóng hoặc mở lại khi RESOLVED */}
              {selectedIssue.status === 'RESOLVED' && (
                <>
                  <Button
                    variant="outlined"
                    color="warning"
                    startIcon={<ReplayIcon />}
                    onClick={() => setOpenReopenDialog(true)}
                  >
                    Yêu Cầu Mở Lại
                  </Button>
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<CheckCircleIcon />}
                    onClick={() => handleUpdateStatus(selectedIssue.id, 'CLOSED', 'Xác nhận kiểm tra hoạt động tốt')}
                  >
                    Xác Nhận Hoàn Tất & Đóng
                  </Button>
                </>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* DIALOG REOPEN ISSUE */}
      <Dialog open={openReopenDialog} onClose={() => setOpenReopenDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Yêu Cầu Mở Lại Sự Cố</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Theo quy định BR-127, bạn cần nêu rõ lý do tại sao sự cố chưa khắc phục triệt để.
          </Typography>
          <TextField
            label="Lý do mở lại sự cố"
            value={reopenReason}
            onChange={(e) => setReopenReason(e.target.value)}
            multiline
            rows={3}
            fullWidth
            required
            placeholder="Ví dụ: Vòi nước vẫn còn rò rỉ sau khi sửa..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenReopenDialog(false)}>Hủy</Button>
          <Button variant="contained" color="warning" onClick={handleReopen}>
            Gửi Mở Lại
          </Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG FEEDBACK & REPLIES */}
      <Dialog open={openFeedbackDialog} onClose={() => setOpenFeedbackDialog(false)} maxWidth="sm" fullWidth>
        {selectedFeedback && (
          <>
            <DialogTitle>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="h6">Hóa Đơn {selectedFeedback.invoiceCode}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Người gửi: {selectedFeedback.createdByName} &bull;{' '}
                    {new Date(selectedFeedback.createdAt).toLocaleString('vi-VN')}
                  </Typography>
                </Box>
                {getFeedbackChip(selectedFeedback.status)}
              </Stack>
            </DialogTitle>
            <DialogContent dividers>
              {/* Nội dung ban đầu */}
              <Box sx={{ p: 1.5, bgcolor: 'grey.100', borderRadius: 1, mb: 2 }}>
                <Typography variant="caption" fontWeight="bold" color="text.secondary">
                  Thắc mắc của khách thuê:
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  {selectedFeedback.message}
                </Typography>
              </Box>

              {/* Các câu trả lời */}
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Lịch sử trao đổi:
              </Typography>
              <Stack spacing={1} sx={{ mb: 2, maxHeight: 250, overflowY: 'auto' }}>
                {selectedFeedback.replies && selectedFeedback.replies.length > 0 ? (
                  selectedFeedback.replies.map((rep) => (
                    <Box
                      key={rep.id}
                      sx={{
                        p: 1.5,
                        borderRadius: 1,
                        bgcolor: rep.actorName === user?.login ? 'primary.light' : 'grey.50',
                        color: rep.actorName === user?.login ? 'white' : 'text.primary',
                      }}
                    >
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="caption" fontWeight="bold">
                          {rep.actorName}
                        </Typography>
                        <Typography variant="caption">
                          {new Date(rep.createdAt).toLocaleTimeString('vi-VN')}
                        </Typography>
                      </Stack>
                      <Typography variant="body2" sx={{ mt: 0.5 }}>
                        {rep.message}
                      </Typography>
                    </Box>
                  ))
                ) : (
                  <Typography variant="caption" color="text.secondary">
                    Chưa có phản hồi nào.
                  </Typography>
                )}
              </Stack>

              {/* Ô nhập câu trả lời */}
              <Stack direction="row" spacing={1}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Nhập nội dung trả lời..."
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                />
                <Button
                  variant="contained"
                  endIcon={<SendIcon />}
                  onClick={handleSendReply}
                  disabled={replying || !replyMessage.trim()}
                >
                  Gửi
                </Button>
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenFeedbackDialog(false)}>Đóng</Button>
              {selectedFeedback.status !== 'RESOLVED' && (
                <Button
                  variant="contained"
                  color="success"
                  onClick={() => handleResolveFeedback(selectedFeedback.id)}
                >
                  Đánh Dấu Đã Giải Quyết
                </Button>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};
