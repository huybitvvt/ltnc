import { todayInVietnam } from '../../shared/date';
import { isMoney, formatMoney } from '../../shared/money';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import UpdateIcon from '@mui/icons-material/Update';
import KeyIcon from '@mui/icons-material/Key';
import PeopleIcon from '@mui/icons-material/People';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PaymentsIcon from '@mui/icons-material/Payments';
import AssignmentReturnIcon from '@mui/icons-material/AssignmentReturn';
import BuildCircleIcon from '@mui/icons-material/BuildCircle';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import EditIcon from '@mui/icons-material/Edit';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import { contractsApi } from './contractsApi';
import { BuildingItem, RoomItem } from '../property/types';
import { ContractMemberResponse, ContractSummary, RoomMeterResponse, TenantSummary } from './types';
import { useAuth } from '../auth/AuthContext';
import { depositsApi } from '../deposits/depositsApi';
import {
  ContractDepositFinancialStatusResponse,
  DepositLedgerEntryResponse,
  PaymentMethod,
} from '../deposits/types';
import { invoicesApi } from '../invoices/invoicesApi';

export const ContractsPage: React.FC = () => {
  const { user } = useAuth();
  const [contracts, setContracts] = useState<ContractSummary[]>([]);
  const [buildings, setBuildings] = useState<BuildingItem[]>([]);
  const [tenants, setTenants] = useState<TenantSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modal tạo hợp đồng mới
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('');
  const [availableRooms, setAvailableRooms] = useState<RoomItem[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>(todayInVietnam());
  const [endDate, setEndDate] = useState<string>(
    new Date(Date.now() + 180 * 24 * 3600 * 1000).toISOString().split('T')[0]
  );
  const [rentPrice, setRentPrice] = useState<string>('');
  const [depositAmount, setDepositAmount] = useState<string>('');
  const [isNewTenantMode, setIsNewTenantMode] = useState(false);
  const [newTenantName, setNewTenantName] = useState('');
  const [newTenantPhone, setNewTenantPhone] = useState('');
  const [newTenantCitizenId, setNewTenantCitizenId] = useState('');
  const [newTenantEmail, setNewTenantEmail] = useState('');

  // Modal chi tiết & thao tác
  const [detailOpen, setDetailOpen] = useState(false);
  const [activeContract, setActiveContract] = useState<ContractSummary | null>(null);
  const [members, setMembers] = useState<ContractMemberResponse[]>([]);
  const [roomMeters, setRoomMeters] = useState<RoomMeterResponse[]>([]);
  const [detailTab, setDetailTab] = useState(0);

  // Dữ liệu tiền cọc
  const [depositData, setDepositData] = useState<ContractDepositFinancialStatusResponse | null>(null);
  const [depositLoading, setDepositLoading] = useState(false);

  // Dialog Thu cọc
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptAmount, setReceiptAmount] = useState('');
  const [receiptMethod, setReceiptMethod] = useState<PaymentMethod>('BANK_TRANSFER');
  const [receiptRefCode, setReceiptRefCode] = useState('');
  const [receiptNote, setReceiptNote] = useState('');
  const [receiptLoading, setReceiptLoading] = useState(false);

  // Dialog Sửa thu cọc
  const [correctOpen, setCorrectOpen] = useState(false);
  const [selectedDepositEntry, setSelectedDepositEntry] = useState<DepositLedgerEntryResponse | null>(null);
  const [correctDelta, setCorrectDelta] = useState('');
  const [correctReason, setCorrectReason] = useState('');
  const [correctLoading, setCorrectLoading] = useState(false);

  // Dialog Hoàn cọc
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [refundMethod, setRefundMethod] = useState<PaymentMethod>('BANK_TRANSFER');
  const [refundRefCode, setRefundRefCode] = useState('');
  const [refundLoading, setRefundLoading] = useState(false);

  // Dialog Khấu trừ cọc
  const [deductOpen, setDeductOpen] = useState(false);
  const [deductAmount, setDeductAmount] = useState('');
  const [deductReason, setDeductReason] = useState('');
  const [deductExpenseRef, setDeductExpenseRef] = useState('');
  const [deductLoading, setDeductLoading] = useState(false);

  // Dialog Bù cọc vào hóa đơn
  const [offsetOpen, setOffsetOpen] = useState(false);
  const [offsetInvoiceId, setOffsetInvoiceId] = useState('');
  const [offsetAmount, setOffsetAmount] = useState('');
  const [offsetNote, setOffsetNote] = useState('');
  const [offsetLoading, setOffsetLoading] = useState(false);
  const [contractInvoices, setContractInvoices] = useState<any[]>([]);

  // Quyết toán cọc
  const [settling, setSettling] = useState(false);

  // Kích hoạt nhận phòng (Handover)
  const [activateOpen, setActivateOpen] = useState(false);
  const [elecReading, setElecReading] = useState<string>('0.000');
  const [waterReading, setWaterReading] = useState<string>('0.000');

  // Gia hạn hợp đồng (Extend)
  const [extendOpen, setExtendOpen] = useState(false);
  const [newEndDate, setNewEndDate] = useState<string>('');
  const [extendReason, setExtendReason] = useState<string>('');

  // Trả phòng & Bàn giao (Checkout Wizard)
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutDate, setCheckoutDate] = useState<string>(todayInVietnam());
  const [checkoutElec, setCheckoutElec] = useState<string>('0.000');
  const [checkoutWater, setCheckoutWater] = useState<string>('0.000');
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // Thêm thành viên (Add member)
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [memberTenantId, setMemberTenantId] = useState<string>('');
  const [memberJoinedDate, setMemberJoinedDate] = useState<string>(todayInVietnam());

  // Cấp mã mời
  const [inviteCodeInfo, setInviteCodeInfo] = useState<{ code: string; expiresAt: string } | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [contractsData, buildingsData, tenantsData] = await Promise.all([
        contractsApi.listContracts(statusFilter === 'ALL' ? undefined : { status: statusFilter }),
        contractsApi.listBuildings(),
        contractsApi.listTenants(),
      ]);
      setContracts(contractsData);
      setBuildings(buildingsData);
      setTenants(tenantsData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể tải danh sách hợp đồng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  useEffect(() => {
    if (!selectedBuildingId) {
      setAvailableRooms([]);
      return;
    }
    contractsApi.listRooms(selectedBuildingId).then((rooms: RoomItem[]) => {
      const bookable = rooms.filter((r: RoomItem) => r.bookable && r.status === 'VACANT');
      setAvailableRooms(bookable);
      if (bookable.length > 0) {
        setSelectedRoomId(bookable[0].id);
        setRentPrice(String(bookable[0].basePrice));
        setDepositAmount(String(bookable[0].depositAmount));
      } else {
        setSelectedRoomId('');
      }
    });
  }, [selectedBuildingId]);

  const loadDepositData = async (contractId: string) => {
    try {
      setDepositLoading(true);
      const data = await depositsApi.getContractDepositStatus(contractId);
      setDepositData(data);
    } catch (err: unknown) {
      console.warn('Không tải được sổ cọc:', err);
    } finally {
      setDepositLoading(false);
    }
  };

  const handleOpenDetail = async (c: ContractSummary) => {
    setActiveContract(c);
    setDetailTab(0);
    setDetailOpen(true);
    try {
      const [membersData, metersData] = await Promise.all([
        contractsApi.listContractMembers(c.id),
        contractsApi.getRoomMeters(c.roomId),
      ]);
      setMembers(membersData);
      setRoomMeters(metersData);
      loadDepositData(c.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể tải thông tin chi tiết hợp đồng');
    }
  };

  const handleRoomChange = (roomId: string) => {
    setSelectedRoomId(roomId);
    const room = availableRooms.find((r) => r.id === roomId);
    if (room) {
      setRentPrice(String(room.basePrice));
      setDepositAmount(String(room.depositAmount));
    }
  };

  const handleCreateContract = async () => {
    try {
      setError(null);
      let tenantIdToUse = selectedTenantId;

      if (isNewTenantMode) {
        if (!newTenantName || !newTenantPhone || !newTenantCitizenId) {
          setError('Vui lòng điền đủ họ tên, SĐT và CCCD người thuê');
          return;
        }
        const createdTenant = await contractsApi.createTenant({
          fullName: newTenantName,
          phone: newTenantPhone,
          citizenId: newTenantCitizenId,
          email: newTenantEmail || undefined,
        });
        tenantIdToUse = createdTenant.id;
      }

      if (!selectedRoomId || !tenantIdToUse || !startDate || !endDate || !rentPrice) {
        setError('Vui lòng nhập đầy đủ các thông tin bắt buộc');
        return;
      }

      await contractsApi.createContractDraft({
        roomId: selectedRoomId,
        representativeTenantId: tenantIdToUse,
        actualStartDate: startDate,
        plannedEndExclusive: endDate,
        rent: rentPrice,
        depositRequired: depositAmount || '0',
      });

      setSuccess('Đã lập bản nháp hợp đồng thành công!');
      setCreateOpen(false);
      setIsNewTenantMode(false);
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Lỗi khi tạo hợp đồng');
    }
  };

  const handleActivateContract = async () => {
    if (!activeContract) return;
    try {
      setError(null);
      const readings = [
        {
          meterType: 'ELECTRICITY' as const,
          readingDate: activeContract.actualStartDate,
          value: elecReading || '0.000',
        },
        {
          meterType: 'WATER' as const,
          readingDate: activeContract.actualStartDate,
          value: waterReading || '0.000',
        },
      ];

      const updated = await contractsApi.activateContract(activeContract.id, readings);
      setActiveContract(updated);
      setSuccess(`Kích hoạt nhận phòng ${updated.roomNumber} thành công! Phòng đã chuyển sang trạng thái ĐANG THUÊ.`);
      setActivateOpen(false);
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Lỗi khi kích hoạt nhận phòng');
    }
  };

  const handleExtendContract = async () => {
    if (!activeContract) return;
    try {
      setError(null);
      if (!newEndDate || !extendReason) {
        setError('Vui lòng chọn ngày gia hạn mới và lý do gia hạn');
        return;
      }
      const updated = await contractsApi.extendContract(activeContract.id, {
        newPlannedEndExclusive: newEndDate,
        reason: extendReason,
      });
      setActiveContract(updated);
      setSuccess('Gia hạn hợp đồng thành công! Thời hạn đã được cập nhật.');
      setExtendOpen(false);
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Lỗi khi gia hạn hợp đồng');
    }
  };

  const handleAddMember = async () => {
    if (!activeContract) return;
    try {
      setError(null);
      if (!memberTenantId) {
        setError('Vui lòng chọn người thuê');
        return;
      }
      const newMember = await contractsApi.addContractMember(activeContract.id, {
        tenantId: memberTenantId,
        joinedOn: memberJoinedDate,
      });
      setMembers([...members, newMember]);
      setSuccess('Đã thêm thành viên vào phòng thành công!');
      setAddMemberOpen(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Lỗi khi thêm thành viên');
    }
  };

  const handleIssueInvite = async () => {
    if (!activeContract) return;
    try {
      setError(null);
      const invite = await contractsApi.issueTenantInvite(activeContract.representativeTenantId);
      setInviteCodeInfo({ code: invite.inviteCode, expiresAt: invite.expiresAt });
      setSuccess(`Mã mời đã được cấp: ${invite.inviteCode} (Hạn dùng 24h)`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể tạo mã mời');
    }
  };

  // --- Thao tác Cọc ---
  const handleRecordReceipt = async () => {
    if (!activeContract) return;
    const amountNum = receiptAmount;
    if (!isMoney(amountNum, false) || BigInt(amountNum) <= 0n) {
      alert('Số tiền thu cọc phải lớn hơn 0');
      return;
    }
    setReceiptLoading(true);
    try {
      await depositsApi.recordReceipt(
        {
          contractId: activeContract.id,
          amount: String(amountNum),
          paymentMethod: receiptMethod,
          referenceCode: receiptRefCode.trim() || undefined,
          note: receiptNote.trim() || undefined,
        },
        `DEP-REC-${activeContract.id}-${Date.now()}`
      );
      setSuccess('Đã ghi nhận thu cọc thành công!');
      setReceiptOpen(false);
      setReceiptAmount('');
      setReceiptRefCode('');
      setReceiptNote('');
      await loadDepositData(activeContract.id);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi khi ghi nhận thu cọc');
    } finally {
      setReceiptLoading(false);
    }
  };

  const handleCorrectReceipt = async () => {
    if (!selectedDepositEntry || !activeContract) return;
    const deltaNum = correctDelta;
    if (!isMoney(deltaNum, true) || BigInt(deltaNum) === 0n) {
      alert('Số tiền delta điều chỉnh phải khác 0');
      return;
    }
    if (!correctReason.trim()) {
      alert('Vui lòng nhập lý do sửa thu cọc');
      return;
    }
    setCorrectLoading(true);
    try {
      await depositsApi.correctReceipt(
        {
          refEntryId: selectedDepositEntry.id,
          deltaAmount: String(deltaNum),
          reason: correctReason.trim(),
        },
        `DEP-CORR-${selectedDepositEntry.id}-${Date.now()}`
      );
      setSuccess('Đã điều chỉnh phiếu thu cọc thành công!');
      setCorrectOpen(false);
      setSelectedDepositEntry(null);
      setCorrectDelta('');
      setCorrectReason('');
      await loadDepositData(activeContract.id);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi khi sửa thu cọc');
    } finally {
      setCorrectLoading(false);
    }
  };

  const handleRefundDeposit = async () => {
    if (!activeContract) return;
    const amountNum = refundAmount;
    if (!isMoney(amountNum, false) || BigInt(amountNum) <= 0n) {
      alert('Số tiền hoàn phải lớn hơn 0');
      return;
    }
    if (!refundReason.trim()) {
      alert('Vui lòng nhập lý do hoàn tiền cọc');
      return;
    }
    setRefundLoading(true);
    try {
      await depositsApi.refundDeposit(
        {
          contractId: activeContract.id,
          amount: String(amountNum),
          reason: refundReason.trim(),
          paymentMethod: refundMethod,
          referenceCode: refundRefCode.trim() || undefined,
        },
        `DEP-REF-${activeContract.id}-${Date.now()}`
      );
      setSuccess('Đã hoàn tiền cọc thành công!');
      setRefundOpen(false);
      setRefundAmount('');
      setRefundReason('');
      setRefundRefCode('');
      await loadDepositData(activeContract.id);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi khi hoàn tiền cọc');
    } finally {
      setRefundLoading(false);
    }
  };

  const handleDeductDeposit = async () => {
    if (!activeContract) return;
    const amountNum = deductAmount;
    if (!isMoney(amountNum, false) || BigInt(amountNum) <= 0n) {
      alert('Số tiền khấu trừ phải lớn hơn 0');
      return;
    }
    if (!deductReason.trim()) {
      alert('Vui lòng nhập lý do khấu trừ tiền cọc');
      return;
    }
    setDeductLoading(true);
    try {
      await depositsApi.deductDeposit(
        {
          contractId: activeContract.id,
          amount: String(amountNum),
          reason: deductReason.trim(),
          expenseRef: deductExpenseRef.trim() || undefined,
        },
        `DEP-DED-${activeContract.id}-${Date.now()}`
      );
      setSuccess('Đã khấu trừ tiền cọc thành công!');
      setDeductOpen(false);
      setDeductAmount('');
      setDeductReason('');
      setDeductExpenseRef('');
      await loadDepositData(activeContract.id);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi khi khấu trừ tiền cọc');
    } finally {
      setDeductLoading(false);
    }
  };

  const handleOpenOffsetDialog = async () => {
    if (!activeContract) return;
    try {
      const invData = await invoicesApi.listInvoices({ contractId: activeContract.id, status: 'ISSUED' });
      const unpaidInvs = (invData.content || []).filter((i: any) => BigInt(i.debt) > 0);
      setContractInvoices(unpaidInvs);
      if (unpaidInvs.length > 0) {
        setOffsetInvoiceId(unpaidInvs[0].id);
        const held = BigInt(depositData?.depositHeld || '0');
        const debt = BigInt(unpaidInvs[0].debt);
        const maxOffset = held < debt ? held : debt;
        setOffsetAmount(String(maxOffset));
      } else {
        setOffsetInvoiceId('');
        setOffsetAmount('');
      }
      setOffsetOpen(true);
    } catch (err: any) {
      alert('Không tải được danh sách hóa đơn còn nợ');
    }
  };

  const handleOffsetToInvoice = async () => {
    if (!activeContract || !offsetInvoiceId) return;
    const amountNum = offsetAmount;
    if (!isMoney(amountNum, false) || BigInt(amountNum) <= 0n) {
      alert('Số tiền bù cọc phải lớn hơn 0');
      return;
    }
    setOffsetLoading(true);
    try {
      await depositsApi.offsetToInvoice(
        {
          contractId: activeContract.id,
          invoiceId: offsetInvoiceId,
          amount: String(amountNum),
          note: offsetNote.trim() || undefined,
        },
        `DEP-OFF-${activeContract.id}-${offsetInvoiceId}-${Date.now()}`
      );
      setSuccess('Đã bù trừ tiền cọc vào hóa đơn thành công!');
      setOffsetOpen(false);
      setOffsetInvoiceId('');
      setOffsetAmount('');
      setOffsetNote('');
      await loadDepositData(activeContract.id);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi khi bù cọc vào hóa đơn');
    } finally {
      setOffsetLoading(false);
    }
  };

  const handleSettleDeposit = async () => {
    if (!activeContract) return;
    if (!window.confirm('Bạn có chắc chắn muốn xác nhận quyết toán cọc (SETTLED)? Thao tác này sẽ chốt dứt điểm tiền cọc của hợp đồng.')) {
      return;
    }
    setSettling(true);
    try {
      await depositsApi.settleDeposit(
        { contractId: activeContract.id, note: 'Quyết toán hoàn tất' },
        `DEP-SETTLE-${activeContract.id}-${Date.now()}`
      );
      setSuccess('Đã xác nhận quyết toán cọc thành công (SETTLED)!');
      await loadDepositData(activeContract.id);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi khi xác nhận quyết toán cọc');
    } finally {
      setSettling(false);
    }
  };

  const handleOpenCheckout = () => {
    if (!activeContract) return;
    setCheckoutDate(todayInVietnam());
    const elecMeter = roomMeters.find((m) => m.type === 'ELECTRICITY');
    const waterMeter = roomMeters.find((m) => m.type === 'WATER');
    setCheckoutElec(elecMeter?.initialReading || '0.000');
    setCheckoutWater(waterMeter?.initialReading || '0.000');
    setCheckoutOpen(true);
  };

  const handleConfirmCheckout = async () => {
    if (!activeContract) return;
    if (checkoutDate <= activeContract.actualStartDate) {
      alert('Ngày trả phòng thực tế phải sau ngày nhận phòng (BR-037)');
      return;
    }
    setCheckoutLoading(true);
    try {
      const elecMeter = roomMeters.find((m) => m.type === 'ELECTRICITY');
      const waterMeter = roomMeters.find((m) => m.type === 'WATER');
      const readings = [
        {
          meterId: elecMeter?.id,
          meterType: 'ELECTRICITY' as const,
          readingDate: checkoutDate,
          value: checkoutElec || '0.000',
        },
        {
          meterId: waterMeter?.id,
          meterType: 'WATER' as const,
          readingDate: checkoutDate,
          value: checkoutWater || '0.000',
        },
      ];
      const updated = await contractsApi.checkoutContract(activeContract.id, {
        actualCheckoutDate: checkoutDate,
        finalReadings: readings,
      });
      setActiveContract(updated);
      setSuccess('Trả phòng thành công! Phòng đã được giải phóng (VACANT), hợp đồng chuyển sang ĐÃ KẾT THÚC (ENDED), cọc chuyển sang chờ quyết toán (SETTLING).');
      setCheckoutOpen(false);
      await loadData();
      await loadDepositData(activeContract.id);
      setDetailTab(1); // Chuyển sang tab Sổ cọc để quyết toán
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Lỗi khi thực hiện trả phòng');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return <Chip label="Bản nháp" color="warning" size="small" sx={{ fontWeight: 600 }} />;
      case 'ACTIVE':
        return <Chip label="Đang thuê" color="success" size="small" sx={{ fontWeight: 600 }} />;
      case 'ENDED':
        return <Chip label="Đã kết thúc" color="default" size="small" />;
      default:
        return <Chip label={status} size="small" />;
    }
  };

  const getDepositStatusChip = (status?: string) => {
    switch (status) {
      case 'NOT_RECEIVED':
        return <Chip label="Chưa nhận cọc" color="default" size="small" />;
      case 'HOLDING':
        return <Chip label="Đang giữ cọc" color="primary" size="small" sx={{ fontWeight: 700 }} />;
      case 'SETTLING':
        return <Chip label="Chờ quyết toán" color="warning" size="small" sx={{ fontWeight: 700 }} />;
      case 'SETTLED':
        return <Chip label="Đã quyết toán (SETTLED)" color="success" size="small" sx={{ fontWeight: 700 }} />;
      default:
        return <Chip label={status || 'N/A'} size="small" />;
    }
  };

  const isManager = user?.role === 'OWNER' || user?.role === 'STAFF';

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1400, mx: 'auto' }}>
      {/* Header */}
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={2} mb={3}>
        <Box>
          <Typography variant="h4" fontWeight={800} sx={{ background: 'linear-gradient(45deg, #1976d2, #00b0ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Quản lý Hợp đồng & Cư dân
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Theo dõi vòng đời hợp đồng, sổ cọc bất biến, quyết toán hoàn cọc/khấu trừ và thành viên cư trú
          </Typography>
        </Box>
        {isManager && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              if (buildings.length > 0) setSelectedBuildingId(buildings[0].id);
              if (tenants.length > 0) setSelectedTenantId(tenants[0].id);
              setCreateOpen(true);
            }}
            sx={{ borderRadius: 2, px: 3, py: 1, boxShadow: 3, fontWeight: 700 }}
          >
            Lập hợp đồng mới
          </Button>
        )}
      </Stack>

      {/* Notifications */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Filters */}
      <Card sx={{ mb: 3, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
        <Tabs
          value={statusFilter}
          onChange={(_, val) => setStatusFilter(val)}
          indicatorColor="primary"
          textColor="primary"
          variant="scrollable"
          scrollButtons="auto"
          sx={{ px: 2, pt: 1 }}
        >
          <Tab value="ALL" label="Tất cả hợp đồng" sx={{ fontWeight: 700 }} />
          <Tab value="DRAFT" label="Bản nháp (Chờ nhận phòng)" sx={{ fontWeight: 700 }} />
          <Tab value="ACTIVE" label="Đang thuê (Đang ở)" sx={{ fontWeight: 700 }} />
          <Tab value="ENDED" label="Đã kết thúc" sx={{ fontWeight: 700 }} />
        </Tabs>
      </Card>

      {/* Contract List */}
      <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
            <CircularProgress />
          </Box>
        ) : contracts.length === 0 ? (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary">
              Không tìm thấy hợp đồng nào
            </Typography>
            <Typography variant="body2" color="text.disabled" mt={1}>
              {statusFilter !== 'ALL' ? 'Thử chọn bộ lọc khác hoặc lập hợp đồng mới' : 'Hãy bắt đầu lập hợp đồng thuê đầu tiên'}
            </Typography>
          </Box>
        ) : (
          <TableContainer component={Paper} elevation={0}>
            <Table>
              <TableHead sx={{ backgroundColor: 'rgba(25, 118, 210, 0.05)' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Phòng / Tòa nhà</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Người đại diện</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Thời hạn thuê</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Giá thuê / tháng</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Cọc quy định</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Trạng thái</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Thao tác</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {contracts.map((c) => (
                  <TableRow key={c.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                    <TableCell>
                      <Typography variant="subtitle2" fontWeight={700} color="primary">
                        Phòng {c.roomNumber}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {c.buildingName}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {c.representativeName}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {c.actualStartDate} → {c.plannedEndExclusive}
                      </Typography>
                      {c.status === 'ENDED' && c.actualCheckoutDate && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          (Trả: {c.actualCheckoutDate})
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {formatMoney(c.rent)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatMoney(c.depositRequired)}
                      </Typography>
                    </TableCell>
                    <TableCell>{getStatusChip(c.status)}</TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<VisibilityIcon />}
                        onClick={() => handleOpenDetail(c)}
                        sx={{ borderRadius: 2 }}
                      >
                        Chi tiết & Sổ cọc
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

      {/* Modal Lập Hợp Đồng Mới */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>Lập Bản Nháp Hợp Đồng Thuê Mới</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                label="Chọn Tòa Nhà"
                required
                value={selectedBuildingId}
                onChange={(e) => setSelectedBuildingId(e.target.value)}
              >
                {buildings.map((b) => (
                  <MenuItem key={b.id} value={b.id}>
                    {b.name} - {b.address}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                label="Chọn Phòng Trống"
                required
                disabled={!selectedBuildingId || availableRooms.length === 0}
                value={selectedRoomId}
                onChange={(e) => handleRoomChange(e.target.value)}
                helperText={availableRooms.length === 0 && selectedBuildingId ? 'Tòa nhà này không còn phòng trống' : ''}
              >
                {availableRooms.map((r) => (
                  <MenuItem key={r.id} value={r.id}>
                    Phòng {r.roomNumber} ({formatMoney(String(r.basePrice))}/tháng)
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="subtitle2" fontWeight={700}>
                  Người Đại Diện Ký Hợp Đồng
                </Typography>
                <Button size="small" onClick={() => setIsNewTenantMode(!isNewTenantMode)}>
                  {isNewTenantMode ? 'Chọn hồ sơ có sẵn' : '+ Tạo hồ sơ khách mới'}
                </Button>
              </Stack>
            </Grid>

            {!isNewTenantMode ? (
              <Grid item xs={12}>
                <TextField
                  select
                  fullWidth
                  label="Chọn Người Thuê Có Sẵn"
                  required
                  value={selectedTenantId}
                  onChange={(e) => setSelectedTenantId(e.target.value)}
                >
                  {tenants.map((t) => (
                    <MenuItem key={t.id} value={t.id}>
                      {t.fullName} - {t.phone} ({t.citizenIdMasked})
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            ) : (
              <>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Họ và tên"
                    required
                    value={newTenantName}
                    onChange={(e) => setNewTenantName(e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Số điện thoại"
                    required
                    value={newTenantPhone}
                    onChange={(e) => setNewTenantPhone(e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Số CCCD"
                    required
                    value={newTenantCitizenId}
                    onChange={(e) => setNewTenantCitizenId(e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Email (tùy chọn)"
                    value={newTenantEmail}
                    onChange={(e) => setNewTenantEmail(e.target.value)}
                  />
                </Grid>
              </>
            )}

            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" fontWeight={700} mb={1}>
                Thời Hạn & Chi Phí (Quy tắc nửa mở [Start, End))
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="date"
                label="Ngày bắt đầu (Nhận phòng)"
                InputLabelProps={{ shrink: true }}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="date"
                label="Ngày kết thúc dự kiến (Không tính ngày này)"
                InputLabelProps={{ shrink: true }}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                helperText="Cận cuối không bao gồm (BR-038)"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Giá thuê cố định (VND/tháng)"
                required
                value={rentPrice}
                onChange={(e) => setRentPrice(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Tiền cọc thỏa thuận (VND)"
                required
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setCreateOpen(false)}>Hủy</Button>
          <Button variant="contained" onClick={handleCreateContract} sx={{ fontWeight: 700 }}>
            Lập Hợp Đồng Nháp
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal Chi Tiết Hợp Đồng, Bàn Giao & Sổ Cọc */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="lg" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
          Chi Tiết Hợp Đồng - Phòng {activeContract?.roomNumber} ({activeContract?.buildingName})
        </DialogTitle>
        <DialogContent dividers>
          {activeContract && (
            <Box>
              {/* Header Badge */}
              <Stack direction="row" spacing={2} alignItems="center" mb={2} flexWrap="wrap">
                {getStatusChip(activeContract.status)}
                <Typography variant="body2" color="text.secondary">
                  Thời hạn: <strong>{activeContract.actualStartDate}</strong> đến <strong>{activeContract.plannedEndExclusive}</strong>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Tiền thuê: <strong>{formatMoney(activeContract.rent)}/tháng</strong>
                </Typography>
              </Stack>

              {/* Action Buttons for Managers */}
              {isManager && (
                <Stack direction="row" spacing={1} flexWrap="wrap" mb={3}>
                  {activeContract.status === 'DRAFT' && (
                    <Button
                      variant="contained"
                      color="success"
                      startIcon={<CheckCircleIcon />}
                      onClick={() => setActivateOpen(true)}
                    >
                      Bàn Giao & Kích Hoạt Nhận Phòng
                    </Button>
                  )}
                  {activeContract.status === 'ACTIVE' && (
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<UpdateIcon />}
                      onClick={() => {
                        setNewEndDate(activeContract.plannedEndExclusive);
                        setExtendOpen(true);
                      }}
                    >
                      Gia Hạn Hợp Đồng
                    </Button>
                  )}
                  {activeContract.status === 'ACTIVE' && (
                    <Button
                      variant="contained"
                      color="error"
                      startIcon={<MeetingRoomIcon />}
                      onClick={handleOpenCheckout}
                      sx={{ fontWeight: 700 }}
                    >
                      Trả Phòng & Kiểm Kê (Checkout)
                    </Button>
                  )}
                  <Button
                    variant="outlined"
                    startIcon={<KeyIcon />}
                    onClick={handleIssueInvite}
                  >
                    Cấp Mã Mời Tài Khoản
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<PeopleIcon />}
                    onClick={() => setAddMemberOpen(true)}
                    disabled={activeContract.status === 'ENDED'}
                  >
                    + Thêm Người Ở
                  </Button>
                </Stack>
              )}

              {inviteCodeInfo && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  Mã mời tài khoản cho người đại diện: <strong>{inviteCodeInfo.code}</strong> (Hết hạn: {new Date(inviteCodeInfo.expiresAt).toLocaleString('vi-VN')})
                </Alert>
              )}

              {/* Tabs */}
              <Tabs value={detailTab} onChange={(_, v) => setDetailTab(v)} sx={{ mb: 2 }}>
                <Tab label={`Thành viên cùng phòng (${members.length})`} sx={{ fontWeight: 700 }} />
                <Tab label="Đồng hồ & Chỉ số" sx={{ fontWeight: 700 }} />
                <Tab label="Quản lý Cọc & Quyết Toán (Sổ cọc)" sx={{ fontWeight: 700 }} />
              </Tabs>

              {/* TAB 0: Thành viên */}
              {detailTab === 0 && (
                <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: 2 }}>
                  <Table size="small">
                    <TableHead sx={{ backgroundColor: 'rgba(0,0,0,0.02)' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Họ và tên</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Số điện thoại</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>CCCD</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Ngày vào ở</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Vai trò</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {members.map((m) => (
                        <TableRow key={m.id}>
                          <TableCell sx={{ fontWeight: 600 }}>{m.fullName}</TableCell>
                          <TableCell>{m.phone}</TableCell>
                          <TableCell>{m.citizenIdMasked}</TableCell>
                          <TableCell>{m.joinedOn}</TableCell>
                          <TableCell>
                            {m.isRepresentative ? (
                              <Chip label="Đại diện hợp đồng" color="primary" size="small" />
                            ) : (
                              <Chip label="Thành viên" size="small" variant="outlined" />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}

              {/* TAB 1: Đồng hồ */}
              {detailTab === 1 && (
                <Box>
                  <Typography variant="subtitle2" fontWeight={700} mb={1}>
                    Đồng hồ đo phòng {activeContract.roomNumber}
                  </Typography>
                  {roomMeters.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      Chưa có cấu hình đồng hồ riêng. Hệ thống sẽ tự động gán đồng hồ khi kích hoạt bàn giao.
                    </Typography>
                  ) : (
                    <Stack spacing={1}>
                      {roomMeters.map((mtr) => (
                        <Paper key={mtr.id} sx={{ p: 1.5, border: '1px solid #e0e0e0', borderRadius: 2 }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Box>
                              <Typography variant="body2" fontWeight={700}>
                                {mtr.type === 'ELECTRICITY' ? '⚡ Công tơ Điện' : '💧 Đồng hồ Nước'} - Seri: {mtr.serial}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Ngày lắp: {mtr.installedOn} | Chỉ số gốc: {mtr.initialReading}
                              </Typography>
                            </Box>
                            <Chip label={mtr.active ? 'Đang hoạt động' : 'Tạm khóa'} size="small" color={mtr.active ? 'success' : 'default'} />
                          </Stack>
                        </Paper>
                      ))}
                    </Stack>
                  )}
                </Box>
              )}

              {/* TAB 2: Quản lý Cọc & Quyết Toán (BR-105..BR-122) */}
              {detailTab === 2 && (
                <Box>
                  {depositLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                      <CircularProgress />
                    </Box>
                  ) : (
                    <>
                      {/* Thẻ thống kê số dư cọc */}
                      <Grid container spacing={2} mb={3}>
                        <Grid item xs={12} sm={3}>
                          <Paper sx={{ p: 2, bgcolor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 2 }}>
                            <Typography variant="caption" color="text.secondary">
                              Cọc thỏa thuận:
                            </Typography>
                            <Typography variant="h6" fontWeight={800} color="#0f172a">
                              {formatMoney(depositData?.depositRequired)}
                            </Typography>
                            <Box mt={0.5}>{getDepositStatusChip(depositData?.depositStatus)}</Box>
                          </Paper>
                        </Grid>
                        <Grid item xs={12} sm={3}>
                          <Paper sx={{ p: 2, bgcolor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 2 }}>
                            <Typography variant="caption" color="text.secondary">
                              Cọc đang giữ (Held):
                            </Typography>
                            <Typography variant="h6" fontWeight={800} color="#16a34a">
                              {formatMoney(depositData?.depositHeld)}
                            </Typography>
                            <Typography variant="caption" color="#16a34a">
                              Đã thu thực: {formatMoney(depositData?.totalReceipt)}
                            </Typography>
                          </Paper>
                        </Grid>
                        <Grid item xs={12} sm={3}>
                          <Paper sx={{ p: 2, bgcolor: '#fefce8', border: '1px solid #fef08a', borderRadius: 2 }}>
                            <Typography variant="caption" color="text.secondary">
                              Đã hoàn lại khách:
                            </Typography>
                            <Typography variant="h6" fontWeight={800} color="#ca8a04">
                              {formatMoney(depositData?.totalRefund)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Bù nợ HĐ: {formatMoney(depositData?.totalOffset)}
                            </Typography>
                          </Paper>
                        </Grid>
                        <Grid item xs={12} sm={3}>
                          <Paper sx={{ p: 2, bgcolor: '#fef2f2', border: '1px solid #fecaca', borderRadius: 2 }}>
                            <Typography variant="caption" color="text.secondary">
                              Đã khấu trừ hư hại/phạt:
                            </Typography>
                            <Typography variant="h6" fontWeight={800} color="#dc2626">
                              {formatMoney(depositData?.totalDeduction)}
                            </Typography>
                            {depositData?.settledAt && (
                              <Typography variant="caption" color="#059669" display="block">
                                Quyết toán: {new Date(depositData.settledAt).toLocaleDateString('vi-VN')}
                              </Typography>
                            )}
                          </Paper>
                        </Grid>
                      </Grid>

                      {/* Action buttons cho quản lý */}
                      {isManager && depositData?.depositStatus !== 'SETTLED' && (
                        <Stack direction="row" spacing={1} flexWrap="wrap" mb={2}>
                          <Button
                            variant="contained"
                            color="primary"
                            startIcon={<PaymentsIcon />}
                            onClick={() => {
                              setReceiptAmount(depositData ? depositData.depositRequired : '');
                              setReceiptOpen(true);
                            }}
                          >
                            Thu Tiền Cọc
                          </Button>

                          {BigInt(depositData?.depositHeld || '0') > 0 && (
                            <>
                              <Button
                                variant="outlined"
                                color="warning"
                                startIcon={<AssignmentReturnIcon />}
                                onClick={() => {
                                  setRefundAmount(depositData?.depositHeld || '');
                                  setRefundOpen(true);
                                }}
                              >
                                Hoàn Tiền Cọc
                              </Button>

                              <Button
                                variant="outlined"
                                color="error"
                                startIcon={<BuildCircleIcon />}
                                onClick={() => setDeductOpen(true)}
                              >
                                Khấu Trừ Hư Hại / Phạt
                              </Button>

                              <Button
                                variant="outlined"
                                color="info"
                                startIcon={<SwapHorizIcon />}
                                onClick={handleOpenOffsetDialog}
                              >
                                Bù Nợ Hóa Đơn
                              </Button>
                            </>
                          )}

                          {activeContract.status === 'ENDED' &&
                            BigInt(depositData?.depositHeld || '0') === 0n && (
                              <Button
                                variant="contained"
                                color="success"
                                startIcon={<FactCheckIcon />}
                                loading={settling}
                                onClick={handleSettleDeposit}
                              >
                                Xác Nhận Quyết Toán Cọc (SETTLED)
                              </Button>
                            )}
                        </Stack>
                      )}

                      {/* Bảng sổ cọc (deposit ledger entries) */}
                      <Typography variant="subtitle2" fontWeight={700} mb={1}>
                        Sổ Cái Bút Toán Cọc (Audit Ledger - Append-Only)
                      </Typography>
                      {!depositData || depositData.entries.length === 0 ? (
                        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', p: 2 }}>
                          Chưa có bút toán cọc nào được ghi nhận.
                        </Typography>
                      ) : (
                        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: 2 }}>
                          <Table size="small">
                            <TableHead sx={{ backgroundColor: 'rgba(0,0,0,0.02)' }}>
                              <TableRow>
                                <TableCell sx={{ fontWeight: 700 }}>Loại bút toán</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Số tiền</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Hình thức / Mã GD</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Lý do & Ghi chú</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Người lập & Ngày ghi</TableCell>
                                {isManager && depositData.depositStatus !== 'SETTLED' && (
                                  <TableCell align="right" sx={{ fontWeight: 700 }}>Thao tác</TableCell>
                                )}
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {depositData.entries.map((entry) => {
                                const isNeg = BigInt(entry.amount) < 0;
                                return (
                                  <TableRow key={entry.id} hover>
                                    <TableCell>
                                      <Chip
                                        label={entry.entryType}
                                        size="small"
                                        color={
                                          entry.entryType === 'RECEIPT'
                                            ? 'success'
                                            : entry.entryType === 'RECEIPT_CORRECTION'
                                            ? 'primary'
                                            : entry.entryType === 'REFUND'
                                            ? 'warning'
                                            : entry.entryType === 'DEDUCTION'
                                            ? 'error'
                                            : 'info'
                                        }
                                      />
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: isNeg ? '#dc2626' : '#16a34a' }}>
                                      {!isNeg ? '+' : ''}{formatMoney(entry.amount)}
                                    </TableCell>
                                    <TableCell>
                                      {entry.paymentMethod && <span>{entry.paymentMethod} </span>}
                                      {entry.referenceCode && (
                                        <Typography variant="caption" color="text.secondary" display="block">
                                          Mã: {entry.referenceCode}
                                        </Typography>
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      {entry.reason && <span>{entry.reason} </span>}
                                      {entry.note && (
                                        <Typography variant="caption" color="text.secondary" display="block">
                                          Ghi chú: {entry.note}
                                        </Typography>
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      <Typography variant="caption" display="block">
                                        {entry.actorName || 'Hệ thống'}
                                      </Typography>
                                      <Typography variant="caption" color="text.secondary">
                                        {new Date(entry.recordedAt).toLocaleString('vi-VN')}
                                      </Typography>
                                    </TableCell>
                                    {isManager && depositData.depositStatus !== 'SETTLED' && (
                                      <TableCell align="right">
                                        {entry.entryType === 'RECEIPT' && (
                                          <Button
                                            size="small"
                                            startIcon={<EditIcon />}
                                            onClick={() => {
                                              setSelectedDepositEntry(entry);
                                              setCorrectDelta('');
                                              setCorrectReason('');
                                              setCorrectOpen(true);
                                            }}
                                          >
                                            Sửa thu
                                          </Button>
                                        )}
                                      </TableCell>
                                    )}
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      )}
                    </>
                  )}
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailOpen(false)}>Đóng</Button>
        </DialogActions>
      </Dialog>

      {/* Modal Kích Hoạt Nhận Phòng (Handover) */}
      <Dialog open={activateOpen} onClose={() => setActivateOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Bàn Giao & Kích Hoạt Nhận Phòng</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Ghi nhận chỉ số điện và nước thực tế tại thời điểm bàn giao chìa khóa cho khách:
          </Typography>
          <TextField
            fullWidth
            type="number"
            label="Chỉ số Điện bàn giao (kWh)"
            required
            value={elecReading}
            onChange={(e) => setElecReading(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            type="number"
            label="Chỉ số Nước bàn giao (m³)"
            required
            value={waterReading}
            onChange={(e) => setWaterReading(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setActivateOpen(false)}>Hủy</Button>
          <Button variant="contained" color="success" onClick={handleActivateContract} sx={{ fontWeight: 700 }}>
            Xác Nhận Kích Hoạt
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal Gia Hạn Hợp Đồng */}
      <Dialog open={extendOpen} onClose={() => setExtendOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Gia Hạn Hợp Đồng</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Gia hạn sẽ tăng thời hạn kết thúc dự kiến và giữ nguyên giá thuê thỏa thuận ban đầu (BR-040).
          </Typography>
          <TextField
            fullWidth
            type="date"
            label="Ngày kết thúc mới"
            InputLabelProps={{ shrink: true }}
            required
            value={newEndDate}
            onChange={(e) => setNewEndDate(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            multiline
            rows={2}
            label="Lý do gia hạn"
            required
            value={extendReason}
            onChange={(e) => setExtendReason(e.target.value)}
            placeholder="Khách ký tiếp thêm 6 tháng..."
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setExtendOpen(false)}>Hủy</Button>
          <Button variant="contained" onClick={handleExtendContract} sx={{ fontWeight: 700 }}>
            Lưu Gia Hạn
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal Thêm Thành Viên */}
      <Dialog open={addMemberOpen} onClose={() => setAddMemberOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Thêm Người Ở Cùng Phòng</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Chọn hồ sơ người ở để đăng ký cư trú vào hợp đồng:
          </Typography>
          <TextField
            select
            fullWidth
            label="Chọn người thuê"
            required
            value={memberTenantId}
            onChange={(e) => setMemberTenantId(e.target.value)}
            sx={{ mb: 2 }}
          >
            {tenants.map((t) => (
              <MenuItem key={t.id} value={t.id}>
                {t.fullName} - {t.phone}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            fullWidth
            type="date"
            label="Ngày bắt đầu ở"
            InputLabelProps={{ shrink: true }}
            required
            value={memberJoinedDate}
            onChange={(e) => setMemberJoinedDate(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setAddMemberOpen(false)}>Hủy</Button>
          <Button variant="contained" onClick={handleAddMember} sx={{ fontWeight: 700 }}>
            Thêm Thành Viên
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Thu Tiền Cọc */}
      <Dialog open={receiptOpen} onClose={() => setReceiptOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Ghi Nhận Thu Tiền Cọc</DialogTitle>
        <DialogContent dividers>
          <TextField
            fullWidth
            type="number"
            label="Số tiền thu cọc (VND) *"
            required
            value={receiptAmount}
            onChange={(e) => setReceiptAmount(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            select
            fullWidth
            label="Hình thức thanh toán"
            value={receiptMethod}
            onChange={(e) => setReceiptMethod(e.target.value as PaymentMethod)}
            sx={{ mb: 2 }}
          >
            <MenuItem value="BANK_TRANSFER">Chuyển khoản ngân hàng</MenuItem>
            <MenuItem value="CASH">Tiền mặt</MenuItem>
          </TextField>
          <TextField
            fullWidth
            label="Mã giao dịch / UNC (nếu có)"
            value={receiptRefCode}
            onChange={(e) => setReceiptRefCode(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Ghi chú thêm"
            value={receiptNote}
            onChange={(e) => setReceiptNote(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setReceiptOpen(false)}>Hủy</Button>
          <Button variant="contained" loading={receiptLoading} onClick={handleRecordReceipt} sx={{ fontWeight: 700 }}>
            Xác Nhận Thu Cọc
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Sửa Thu Cọc (Delta Correction) */}
      <Dialog open={correctOpen} onClose={() => setCorrectOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Sửa Phiếu Thu Cọc (Delta)</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Bút toán gốc: <strong>{formatMoney(selectedDepositEntry?.amount)}</strong>
          </Typography>
          <TextField
            fullWidth
            type="number"
            label="Số tiền chênh lệch delta (VND) *"
            required
            placeholder="VD: -500000 hoặc 500000"
            value={correctDelta}
            onChange={(e) => setCorrectDelta(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            multiline
            rows={2}
            label="Lý do sửa thu cọc *"
            required
            value={correctReason}
            onChange={(e) => setCorrectReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setCorrectOpen(false)}>Hủy</Button>
          <Button variant="contained" loading={correctLoading} onClick={handleCorrectReceipt} sx={{ fontWeight: 700 }}>
            Lưu Điều Chỉnh
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Hoàn Cọc */}
      <Dialog open={refundOpen} onClose={() => setRefundOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Hoàn Trả Tiền Cọc</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="#16a34a" fontWeight={700} mb={2}>
            Cọc tối đa có thể hoàn: {formatMoney(depositData?.depositHeld)}
          </Typography>
          <TextField
            fullWidth
            type="number"
            label="Số tiền hoàn (VND) *"
            required
            value={refundAmount}
            onChange={(e) => setRefundAmount(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            select
            fullWidth
            label="Hình thức hoàn trả"
            value={refundMethod}
            onChange={(e) => setRefundMethod(e.target.value as PaymentMethod)}
            sx={{ mb: 2 }}
          >
            <MenuItem value="BANK_TRANSFER">Chuyển khoản</MenuItem>
            <MenuItem value="CASH">Tiền mặt</MenuItem>
          </TextField>
          <TextField
            fullWidth
            label="Mã giao dịch chuyển hoàn"
            value={refundRefCode}
            onChange={(e) => setRefundRefCode(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            multiline
            rows={2}
            label="Lý do hoàn trả (Bắt buộc) *"
            required
            value={refundReason}
            onChange={(e) => setRefundReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setRefundOpen(false)}>Hủy</Button>
          <Button variant="contained" color="warning" loading={refundLoading} onClick={handleRefundDeposit} sx={{ fontWeight: 700 }}>
            Xác Nhận Hoàn Cọc
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Khấu Trừ Cọc */}
      <Dialog open={deductOpen} onClose={() => setDeductOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Khấu Trừ Tiền Cọc</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="#dc2626" fontWeight={700} mb={2}>
            Cọc khả dụng: {formatMoney(depositData?.depositHeld)}
          </Typography>
          <TextField
            fullWidth
            type="number"
            label="Số tiền khấu trừ (VND) *"
            required
            value={deductAmount}
            onChange={(e) => setDeductAmount(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Mã chi phí / sự cố sửa chữa (nếu có)"
            value={deductExpenseRef}
            onChange={(e) => setDeductExpenseRef(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            multiline
            rows={2}
            label="Lý do khấu trừ (Hư hại tài sản / phạt) *"
            required
            value={deductReason}
            onChange={(e) => setDeductReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeductOpen(false)}>Hủy</Button>
          <Button variant="contained" color="error" loading={deductLoading} onClick={handleDeductDeposit} sx={{ fontWeight: 700 }}>
            Xác Nhận Khấu Trừ
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Bù Cọc Vào Hóa Đơn */}
      <Dialog open={offsetOpen} onClose={() => setOffsetOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Bù Trừ Cọc Vào Hóa Đơn Nợ</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="#0284c7" fontWeight={700} mb={2}>
            Cọc khả dụng: {formatMoney(depositData?.depositHeld)}
          </Typography>
          {contractInvoices.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Hợp đồng này hiện không có hóa đơn nào còn nợ tiền.
            </Typography>
          ) : (
            <>
              <TextField
                select
                fullWidth
                label="Chọn hóa đơn còn nợ"
                required
                value={offsetInvoiceId}
                onChange={(e) => {
                  setOffsetInvoiceId(e.target.value);
                  const selectedInv = contractInvoices.find((inv) => inv.id === e.target.value);
                  if (selectedInv) {
                    const held = BigInt(depositData?.depositHeld || '0');
        const debt = BigInt(selectedInv.debt);
        const maxOffset = held < debt ? held : debt;
                    setOffsetAmount(String(maxOffset));
                  }
                }}
                sx={{ mb: 2 }}
              >
                {contractInvoices.map((inv) => (
                  <MenuItem key={inv.id} value={inv.id}>
                    Kỳ {inv.billingMonth} - Còn nợ: {formatMoney(inv.debt)}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                fullWidth
                type="number"
                label="Số tiền bù cọc (VND) *"
                required
                value={offsetAmount}
                onChange={(e) => setOffsetAmount(e.target.value)}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Ghi chú thêm"
                value={offsetNote}
                onChange={(e) => setOffsetNote(e.target.value)}
              />
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOffsetOpen(false)}>Hủy</Button>
          {contractInvoices.length > 0 && (
            <Button variant="contained" color="info" loading={offsetLoading} onClick={handleOffsetToInvoice} sx={{ fontWeight: 700 }}>
              Xác Nhận Bù Cọc
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Dialog Trả Phòng & Bàn Giao (Checkout Wizard - Task E3) */}
      <Dialog open={checkoutOpen} onClose={() => setCheckoutOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>
          Trả Phòng & Kiểm Kê Bàn Giao (Checkout) - Phòng {activeContract?.roomNumber}
        </DialogTitle>
        <DialogContent dividers>
          <Alert severity="info" sx={{ mb: 2 }}>
            Quy trình trả phòng nguyên tử (BR-043): Cập nhật ngày trả thực tế, lưu chỉ số điện nước cuối, kết thúc cư trú của thành viên, giải phóng phòng về trạng thái <strong>VACANT</strong> và chuyển cọc sang chờ quyết toán (<strong>SETTLING</strong>).
          </Alert>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                type="date"
                label="Ngày trả phòng thực tế (Không tính tiền ngày này - BR-036) *"
                InputLabelProps={{ shrink: true }}
                required
                value={checkoutDate}
                onChange={(e) => setCheckoutDate(e.target.value)}
                helperText={`Phải sau ngày nhận phòng (${activeContract?.actualStartDate}) theo quy định BR-037`}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Chỉ số Điện chốt trả phòng (kWh) *"
                required
                value={checkoutElec}
                onChange={(e) => setCheckoutElec(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Chỉ số Nước chốt trả phòng (m³) *"
                required
                value={checkoutWater}
                onChange={(e) => setCheckoutWater(e.target.value)}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setCheckoutOpen(false)}>Hủy</Button>
          <Button
            variant="contained"
            color="error"
            loading={checkoutLoading}
            onClick={handleConfirmCheckout}
            sx={{ fontWeight: 700 }}
          >
            Xác Nhận Trả Phòng
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
