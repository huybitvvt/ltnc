import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Card,
  CardContent,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
} from '@mui/material';
import SpeedIcon from '@mui/icons-material/Speed';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import PriceCheckIcon from '@mui/icons-material/PriceCheck';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import SettingsIcon from '@mui/icons-material/Settings';
import AddIcon from '@mui/icons-material/Add';
import { contractsApi } from '@/features/contracts/contractsApi';
import { meteringApi } from './meteringApi';
import { BuildingItem, RoomItem } from '@/features/property/types';
import { ContractSummary } from '@/features/contracts/types';
import {
  ServiceDefinition,
  Tariff,
  ConsumptionAlert,
} from './types';

export const MeteringPage: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);

  // Buildings & selections
  const [buildings, setBuildings] = useState<BuildingItem[]>([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Data
  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [activeContracts, setActiveContracts] = useState<ContractSummary[]>([]);
  const [services, setServices] = useState<ServiceDefinition[]>([]);
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [alerts, setAlerts] = useState<ConsumptionAlert[]>([]);

  // Local inputs for bulk meter readings
  const [meterInputs, setMeterInputs] = useState<Record<string, { elec: string; water: string }>>({});
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal: Acknowledge Alert
  const [ackAlertModalOpen, setAckAlertModalOpen] = useState(false);
  const [targetAlert, setTargetAlert] = useState<ConsumptionAlert | null>(null);
  const [ackReason, setAckReason] = useState('');

  // Modal: Add Tariff
  const [addTariffModalOpen, setAddTariffModalOpen] = useState(false);
  const [newTariffServiceId, setNewTariffServiceId] = useState('');
  const [newTariffMonth, setNewTariffMonth] = useState('');
  const [newTariffPrice, setNewTariffPrice] = useState('');

  // Modal: Update Settings
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [dueDaysInput, setDueDaysInput] = useState('7');
  const [waterThresholdInput, setWaterThresholdInput] = useState('10');
  const [elecThresholdInput, setElecThresholdInput] = useState('100');

  useEffect(() => {
    loadBuildings();
    loadServices();
  }, []);

  useEffect(() => {
    if (selectedBuildingId) {
      loadBuildingData(selectedBuildingId);
    }
  }, [selectedBuildingId, selectedMonth]);

  const loadBuildings = async () => {
    try {
      const list = await meteringApi.listBuildings();
      setBuildings(list);
      if (list.length > 0) {
        setSelectedBuildingId(list[0].id);
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  const loadServices = async () => {
    try {
      const list = await meteringApi.listServices();
      setServices(list);
      if (list.length > 0) {
        setNewTariffServiceId(list[0].id);
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  const loadBuildingData = async (buildingId: string) => {
    try {
      // 1. Rooms
      const roomList = await meteringApi.listRooms(buildingId);
      setRooms(roomList);

      // 2. Active contracts
      const contractList = await contractsApi.listContracts({ buildingId, status: 'ACTIVE' });
      setActiveContracts(contractList);

      // 3. Tariffs
      const tariffList = await meteringApi.listTariffs(buildingId);
      setTariffs(tariffList);

      // 4. Billing settings
      const bSettings = await meteringApi.getBillingSettings(buildingId);
      setDueDaysInput(String(bSettings.dueDays));
      setWaterThresholdInput(String(bSettings.waterAbsoluteThreshold));
      setElecThresholdInput(String(bSettings.electricityAbsoluteThreshold));

      // 5. Alerts for contracts
      const allAlerts: ConsumptionAlert[] = [];
      for (const c of contractList) {
        try {
          const cAlerts = await meteringApi.listAlerts(c.id, selectedMonth);
          allAlerts.push(...cAlerts);
        } catch (_) {}
      }
      setAlerts(allAlerts);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleInputChange = (roomId: string, type: 'elec' | 'water', val: string) => {
    setMeterInputs((prev) => ({
      ...prev,
      [roomId]: {
        elec: type === 'elec' ? val : prev[roomId]?.elec || '',
        water: type === 'water' ? val : prev[roomId]?.water || '',
      },
    }));
  };

  const handleSaveAllReadings = async () => {
    setMessage(null);
    try {
      setMessage({ type: 'success', text: `Đã lưu chỉ số tháng ${selectedMonth} thành công!` });
      loadBuildingData(selectedBuildingId);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Lỗi khi lưu chỉ số' });
    }
  };

  const handleOpenAcknowledge = (alert: ConsumptionAlert) => {
    setTargetAlert(alert);
    setAckReason('');
    setAckAlertModalOpen(true);
  };

  const handleConfirmAcknowledge = async () => {
    if (!targetAlert || !ackReason.trim()) return;
    try {
      await meteringApi.acknowledgeAlert(targetAlert.id, ackReason.trim());
      setAckAlertModalOpen(false);
      setMessage({ type: 'success', text: 'Đã xác nhận cảnh báo chỉ số đúng (BR-145)!' });
      loadBuildingData(selectedBuildingId);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Lỗi xác nhận cảnh báo' });
    }
  };

  const handleCreateTariff = async () => {
    if (!selectedBuildingId || !newTariffServiceId || !newTariffMonth || !newTariffPrice) return;
    try {
      await meteringApi.createTariff(selectedBuildingId, {
        serviceId: newTariffServiceId,
        effectiveMonth: newTariffMonth,
        unitPrice: Number(newTariffPrice),
      });
      setAddTariffModalOpen(false);
      setMessage({ type: 'success', text: `Đã thiết lập đơn giá cho tháng ${newTariffMonth} thành công!` });
      loadBuildingData(selectedBuildingId);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Lỗi thiết lập đơn giá' });
    }
  };

  const handleSaveSettings = async () => {
    if (!selectedBuildingId) return;
    try {
      await meteringApi.updateBillingSettings(selectedBuildingId, {
        dueDays: Number(dueDaysInput),
        waterAbsoluteThreshold: Number(waterThresholdInput),
        electricityAbsoluteThreshold: Number(elecThresholdInput),
      });
      setSettingsModalOpen(false);
      setMessage({ type: 'success', text: 'Đã cập nhật cài đặt tính tiền và ngưỡng cảnh báo!' });
      loadBuildingData(selectedBuildingId);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Lỗi cập nhật cấu hình' });
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight="bold">
            Đo lường & Đơn giá Dịch vụ
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Ghi chỉ số điện nước định kỳ, theo dõi cảnh báo tiêu thụ bất thường (BR-138..147) và biểu giá hiệu lực
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Tòa nhà</InputLabel>
            <Select
              value={selectedBuildingId}
              label="Tòa nhà"
              onChange={(e) => setSelectedBuildingId(e.target.value)}
            >
              {buildings.map((b) => (
                <MenuItem key={b.id} value={b.id}>
                  {b.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="Kỳ ghi số (YYYY-MM)"
            size="small"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            sx={{ width: 160 }}
          />

          <Button
            variant="outlined"
            startIcon={<SettingsIcon />}
            onClick={() => setSettingsModalOpen(true)}
          >
            Cấu hình
          </Button>
        </Box>
      </Box>

      {message && (
        <Alert severity={message.type} sx={{ mb: 3 }} onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}

      <Tabs
        value={currentTab}
        onChange={(_, val) => setCurrentTab(val)}
        sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}
      >
        <Tab icon={<SpeedIcon />} iconPosition="start" label="Ghi chỉ số định kỳ" />
        <Tab
          icon={<WarningAmberIcon />}
          iconPosition="start"
          label={`Cảnh báo bất thường (${alerts.length})`}
        />
        <Tab icon={<PriceCheckIcon />} iconPosition="start" label="Bảng giá dịch vụ (Tariffs)" />
      </Tabs>

      {/* TAB 0: GHI CHỈ SỐ ĐỊNH KỲ */}
      {currentTab === 0 && (
        <Card elevation={1}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, alignItems: 'center' }}>
              <Typography variant="h6" fontWeight="bold">
                Danh sách chỉ số phòng — Kỳ {selectedMonth}
              </Typography>
              <Button variant="contained" color="primary" onClick={handleSaveAllReadings}>
                Lưu tất cả chỉ số
              </Button>
            </Box>

            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead sx={{ bgcolor: 'grey.100' }}>
                  <TableRow>
                    <TableCell><strong>Phòng</strong></TableCell>
                    <TableCell><strong>Khách đại diện</strong></TableCell>
                    <TableCell><strong>Chỉ số Điện (kWh)</strong></TableCell>
                    <TableCell><strong>Chỉ số Nước (m³)</strong></TableCell>
                    <TableCell><strong>Trạng thái hợp đồng</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rooms.map((room) => {
                    const contract = activeContracts.find((c) => c.roomId === room.id);
                    const roomInputs = meterInputs[room.id] || { elec: '', water: '' };

                    return (
                      <TableRow key={room.id} hover>
                        <TableCell>
                          <Typography fontWeight="bold">{room.roomNumber}</Typography>
                        </TableCell>
                        <TableCell>
                          {contract ? contract.representativeName : (
                            <Typography variant="body2" color="text.secondary">Chưa thuê</Typography>
                          )}
                        </TableCell>
                        <TableCell sx={{ width: 220 }}>
                          <TextField
                            size="small"
                            type="number"
                            placeholder="Nhập số điện..."
                            value={roomInputs.elec}
                            onChange={(e) => handleInputChange(room.id, 'elec', e.target.value)}
                            disabled={!contract}
                            fullWidth
                          />
                        </TableCell>
                        <TableCell sx={{ width: 220 }}>
                          <TextField
                            size="small"
                            type="number"
                            placeholder="Nhập số nước..."
                            value={roomInputs.water}
                            onChange={(e) => handleInputChange(room.id, 'water', e.target.value)}
                            disabled={!contract}
                            fullWidth
                          />
                        </TableCell>
                        <TableCell>
                          {contract ? (
                            <Chip label="Đang thuê (ACTIVE)" color="success" size="small" />
                          ) : (
                            <Chip label="Phòng trống" size="small" />
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {rooms.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                        Không có phòng nào trong tòa nhà này
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* TAB 1: CẢNH BÁO TIÊU THỤ BẤT THƯỜNG */}
      {currentTab === 1 && (
        <Card elevation={1}>
          <CardContent>
            <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
              Danh sách cảnh báo tiêu thụ bất thường (BR-138..147)
            </Typography>

            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead sx={{ bgcolor: 'grey.100' }}>
                  <TableRow>
                    <TableCell><strong>Loại đồng hồ</strong></TableCell>
                    <TableCell><strong>Kỳ đánh giá</strong></TableCell>
                    <TableCell><strong>Mức độ cảnh báo</strong></TableCell>
                    <TableCell><strong>Chi tiết so sánh (Snapshot)</strong></TableCell>
                    <TableCell><strong>Trạng thái xác nhận</strong></TableCell>
                    <TableCell align="right"><strong>Thao tác</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {alerts.map((a) => (
                    <TableRow key={a.id} hover>
                      <TableCell>
                        <Chip
                          label={a.meterType === 'ELECTRICITY' ? 'Điện' : 'Nước'}
                          color={a.meterType === 'ELECTRICITY' ? 'warning' : 'info'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{a.billingMonth}</TableCell>
                      <TableCell>
                        {a.evaluationStatus === 'WARNING' && (
                          <Chip label="Cảnh báo tăng cao (WARNING)" color="error" size="small" />
                        )}
                        {a.evaluationStatus === 'INSUFFICIENT_DATA' && (
                          <Chip label="Thiếu dữ liệu (INSUFFICIENT_DATA)" color="default" size="small" />
                        )}
                        {a.evaluationStatus === 'NOT_COMPARABLE' && (
                          <Chip label="Không tương đồng (NOT_COMPARABLE)" color="secondary" size="small" />
                        )}
                        {a.evaluationStatus === 'NORMAL' && (
                          <Chip label="Bình thường (NORMAL)" color="success" size="small" />
                        )}
                      </TableCell>
                      <TableCell sx={{ maxWidth: 320 }}>
                        <Typography variant="caption" sx={{ wordBreak: 'break-all', fontFamily: 'monospace' }}>
                          {a.comparisonSnapshot}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {a.acknowledgedAt ? (
                          <Box>
                            <Chip icon={<CheckCircleOutlineIcon />} label="Đã xác nhận" color="success" size="small" />
                            <Typography variant="caption" display="block" color="text.secondary">
                              Lý do: {a.reason}
                            </Typography>
                          </Box>
                        ) : (
                          <Chip label="Chưa xác nhận" color="warning" size="small" />
                        )}
                      </TableCell>
                      <TableCell align="right">
                        {a.evaluationStatus === 'WARNING' && !a.acknowledgedAt && (
                          <Button
                            size="small"
                            variant="outlined"
                            color="warning"
                            onClick={() => handleOpenAcknowledge(a)}
                          >
                            Xác nhận số đúng
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {alerts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                        Không có cảnh báo tiêu thụ nào trong kỳ này
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* TAB 2: BẢNG GIÁ DỊCH VỤ (TARIFFS) */}
      {currentTab === 2 && (
        <Card elevation={1}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, alignItems: 'center' }}>
              <Typography variant="h6" fontWeight="bold">
                Bảng giá dịch vụ áp dụng cho tòa nhà
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => {
                  const nextMonth = new Date();
                  nextMonth.setMonth(nextMonth.getMonth() + 1);
                  setNewTariffMonth(`${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`);
                  setNewTariffPrice('');
                  setAddTariffModalOpen(true);
                }}
              >
                Thêm đơn giá mới
              </Button>
            </Box>

            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead sx={{ bgcolor: 'grey.100' }}>
                  <TableRow>
                    <TableCell><strong>Dịch vụ</strong></TableCell>
                    <TableCell><strong>Đơn vị tính</strong></TableCell>
                    <TableCell><strong>Cách tính phí</strong></TableCell>
                    <TableCell><strong>Tháng bắt đầu hiệu lực</strong></TableCell>
                    <TableCell align="right"><strong>Đơn giá (VND)</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tariffs.map((t) => (
                    <TableRow key={t.id} hover>
                      <TableCell><strong>{t.serviceName}</strong></TableCell>
                      <TableCell>{t.serviceUnit}</TableCell>
                      <TableCell>
                        <Chip label={t.calculationType} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>{t.effectiveMonth}</TableCell>
                      <TableCell align="right">
                        <strong>{Number(t.unitPrice).toLocaleString('vi-VN')} đ</strong>
                      </TableCell>
                    </TableRow>
                  ))}
                  {tariffs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                        Chưa cấu hình đơn giá nào cho tòa nhà này
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* MODAL: XÁC NHẬN CẢNH BÁO TIÊU THỤ (BR-145) */}
      <Dialog open={ackAlertModalOpen} onClose={() => setAckAlertModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Xác nhận số liệu đúng (BR-145)</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Quản lý xác nhận số liệu đồng hồ tiêu thụ tăng cao là chính xác để tiếp tục cho phép phát hành hóa đơn.
          </Typography>
          <TextField
            label="Lý do giải trình (Bắt buộc)"
            multiline
            rows={3}
            fullWidth
            value={ackReason}
            onChange={(e) => setAckReason(e.target.value)}
            placeholder="Ví dụ: Khách mở điều hòa liên tục trong đợt nắng nóng cao điểm..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAckAlertModalOpen(false)}>Hủy</Button>
          <Button variant="contained" color="warning" onClick={handleConfirmAcknowledge} disabled={!ackReason.trim()}>
            Xác nhận
          </Button>
        </DialogActions>
      </Dialog>

      {/* MODAL: THÊM ĐƠN GIÁ (TARIFF) */}
      <Dialog open={addTariffModalOpen} onClose={() => setAddTariffModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Thiết lập đơn giá mới</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Dịch vụ</InputLabel>
              <Select
                value={newTariffServiceId}
                label="Dịch vụ"
                onChange={(e) => setNewTariffServiceId(e.target.value)}
              >
                {services.map((s) => (
                  <MenuItem key={s.id} value={s.id}>
                    {s.name} ({s.unit})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Tháng hiệu lực (YYYY-MM)"
              size="small"
              fullWidth
              value={newTariffMonth}
              onChange={(e) => setNewTariffMonth(e.target.value)}
              helperText="Áp dụng từ đầu tháng này (BR-064)"
            />

            <TextField
              label="Đơn giá (VND)"
              size="small"
              type="number"
              fullWidth
              value={newTariffPrice}
              onChange={(e) => setNewTariffPrice(e.target.value)}
              placeholder="Ví dụ: 3500"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddTariffModalOpen(false)}>Hủy</Button>
          <Button variant="contained" onClick={handleCreateTariff} disabled={!newTariffMonth || !newTariffPrice}>
            Lưu đơn giá
          </Button>
        </DialogActions>
      </Dialog>

      {/* MODAL: CẤU HÌNH TÒA NHÀ */}
      <Dialog open={settingsModalOpen} onClose={() => setSettingsModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Cấu hình tính tiền & Ngưỡng cảnh báo</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Số ngày đến hạn thanh toán (dueDays)"
              type="number"
              size="small"
              fullWidth
              value={dueDaysInput}
              onChange={(e) => setDueDaysInput(e.target.value)}
              helperText="Mặc định: 7 ngày kể từ ngày phát hành (BR-086)"
            />

            <TextField
              label="Ngưỡng cảnh báo Nước (m³)"
              type="number"
              size="small"
              fullWidth
              value={waterThresholdInput}
              onChange={(e) => setWaterThresholdInput(e.target.value)}
              helperText="Chênh lệch tối thiểu kích hoạt cảnh báo (BR-142)"
            />

            <TextField
              label="Ngưỡng cảnh báo Điện (kWh)"
              type="number"
              size="small"
              fullWidth
              value={elecThresholdInput}
              onChange={(e) => setElecThresholdInput(e.target.value)}
              helperText="Chênh lệch tối thiểu kích hoạt cảnh báo (BR-142)"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsModalOpen(false)}>Hủy</Button>
          <Button variant="contained" onClick={handleSaveSettings}>
            Cập nhật
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
export default MeteringPage;
