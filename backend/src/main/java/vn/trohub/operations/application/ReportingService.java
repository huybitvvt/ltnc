package vn.trohub.operations.application;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.trohub.billing.domain.*;
import vn.trohub.billing.infrastructure.DepositLedgerEntryRepository;
import vn.trohub.billing.infrastructure.InvoiceLedgerEntryRepository;
import vn.trohub.billing.infrastructure.InvoiceRepository;
import vn.trohub.common.security.UserPrincipal;
import vn.trohub.operations.application.OperationsDtos.DashboardMetricsDto;
import vn.trohub.operations.infrastructure.MaintenanceIssueRepository;
import vn.trohub.property.domain.Room;
import vn.trohub.property.domain.RoomStatus;
import vn.trohub.property.infrastructure.RoomRepository;
import vn.trohub.tenancy.domain.Contract;
import vn.trohub.tenancy.infrastructure.ContractRepository;
import vn.trohub.user.domain.User;
import vn.trohub.user.domain.UserRole;
import vn.trohub.user.infrastructure.BuildingStaffAssignmentRepository;
import vn.trohub.user.infrastructure.UserRepository;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ReportingService {

    private final InvoiceRepository invoiceRepository;
    private final InvoiceLedgerEntryRepository invoiceLedgerEntryRepository;
    private final DepositLedgerEntryRepository depositLedgerEntryRepository;
    private final RoomRepository roomRepository;
    private final ContractRepository contractRepository;
    private final MaintenanceIssueRepository maintenanceIssueRepository;
    private final UserRepository userRepository;
    private final BuildingStaffAssignmentRepository staffAssignmentRepository;

    public ReportingService(InvoiceRepository invoiceRepository,
                            InvoiceLedgerEntryRepository invoiceLedgerEntryRepository,
                            DepositLedgerEntryRepository depositLedgerEntryRepository,
                            RoomRepository roomRepository,
                            ContractRepository contractRepository,
                            MaintenanceIssueRepository maintenanceIssueRepository,
                            UserRepository userRepository,
                            BuildingStaffAssignmentRepository staffAssignmentRepository) {
        this.invoiceRepository = invoiceRepository;
        this.invoiceLedgerEntryRepository = invoiceLedgerEntryRepository;
        this.depositLedgerEntryRepository = depositLedgerEntryRepository;
        this.roomRepository = roomRepository;
        this.contractRepository = contractRepository;
        this.maintenanceIssueRepository = maintenanceIssueRepository;
        this.userRepository = userRepository;
        this.staffAssignmentRepository = staffAssignmentRepository;
    }

    @Transactional(readOnly = true)
    public DashboardMetricsDto getDashboardMetrics(UUID buildingId, String billingMonth, UserPrincipal principal) {
        User user = userRepository.findById(principal.getId())
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy người dùng"));

        if (user.getRole() == UserRole.TENANT) {
            throw new AccessDeniedException("Khách thuê không có quyền xem bảng số liệu quản trị");
        }

        if (user.getRole() == UserRole.STAFF && buildingId != null) {
            boolean assigned = staffAssignmentRepository.existsByUserIdAndBuildingId(user.getId(), buildingId);
            if (!assigned) {
                throw new AccessDeniedException("Nhân viên không quản lý tòa nhà này");
            }
        }

        // Xác định khoảng thời gian nếu có billingMonth
        Instant fromInstant = null;
        Instant toInstant = null;
        if (billingMonth != null && !billingMonth.isBlank()) {
            YearMonth ym = YearMonth.parse(billingMonth.trim());
            LocalDate firstDay = ym.atDay(1);
            LocalDate nextMonthFirstDay = ym.plusMonths(1).atDay(1);
            fromInstant = firstDay.atStartOfDay(ZoneId.of("Asia/Ho_Chi_Minh")).toInstant();
            toInstant = nextMonthFirstDay.atStartOfDay(ZoneId.of("Asia/Ho_Chi_Minh")).toInstant();
        }

        // 1. Tiền hóa đơn đã phát hành (BR-151)
        List<Invoice> issuedInvoicesForMonth = invoiceRepository.findIssuedInvoicesForDashboard(buildingId, billingMonth);
        BigDecimal billedAmount = BigDecimal.ZERO;
        for (Invoice inv : issuedInvoicesForMonth) {
            BigDecimal original = inv.getOriginalTotal();
            BigDecimal adj = inv.getAdjustments().stream()
                    .map(InvoiceAdjustment::getDeltaAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal effectiveDue = original.add(adj);
            if (effectiveDue.compareTo(BigDecimal.ZERO) > 0) {
                billedAmount = billedAmount.add(effectiveDue);
            }
        }

        // 2. Tiền thực thu hóa đơn (BR-152, BR-154: PAYMENT + PAYMENT_CORRECTION, không cộng bù cọc/chuyển dư)
        List<InvoiceLedgerEntry> entries = invoiceLedgerEntryRepository.findEntriesForDashboard(buildingId, fromInstant, toInstant);
        BigDecimal cashCollected = BigDecimal.ZERO;
        BigDecimal cashRefunded = BigDecimal.ZERO;

        for (InvoiceLedgerEntry e : entries) {
            if (e.getEntryType() == LedgerEntryType.PAYMENT || e.getEntryType() == LedgerEntryType.PAYMENT_CORRECTION) {
                cashCollected = cashCollected.add(e.getAmount());
            } else if (e.getEntryType() == LedgerEntryType.REFUND) {
                cashRefunded = cashRefunded.add(e.getAmount().abs());
            }
        }

        BigDecimal netCash = cashCollected.subtract(cashRefunded);

        // 3. Công nợ & Khoản dư (BR-155: tính trên tất cả hóa đơn đã phát hành thuộc tòa nhà)
        List<Invoice> allIssuedInvoices = invoiceRepository.findIssuedInvoicesForDashboard(buildingId, null);
        BigDecimal totalDebt = BigDecimal.ZERO;
        BigDecimal totalCredit = BigDecimal.ZERO;

        for (Invoice inv : allIssuedInvoices) {
            BigDecimal original = inv.getOriginalTotal();
            BigDecimal adj = inv.getAdjustments().stream()
                    .map(InvoiceAdjustment::getDeltaAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal effectiveDue = original.add(adj);
            if (effectiveDue.compareTo(BigDecimal.ZERO) < 0) {
                effectiveDue = BigDecimal.ZERO;
            }

            BigDecimal netApplied = invoiceLedgerEntryRepository.sumAmountByInvoiceId(inv.getId());
            if (netApplied == null) netApplied = BigDecimal.ZERO;

            if (netApplied.compareTo(effectiveDue) < 0) {
                totalDebt = totalDebt.add(effectiveDue.subtract(netApplied));
            } else if (netApplied.compareTo(effectiveDue) > 0) {
                totalCredit = totalCredit.add(netApplied.subtract(effectiveDue));
            }
        }

        // 4. Tổng tiền cọc đang giữ (BR-157, EX-17: tổng số dư sổ cọc của mọi hợp đồng, kể cả ENDED)
        BigDecimal totalDepositHeld = depositLedgerEntryRepository.sumTotalDepositHeldByBuildingId(buildingId);
        if (totalDepositHeld == null) {
            totalDepositHeld = BigDecimal.ZERO;
        }

        // 5. Thống kê phòng (BR-030, BR-031)
        List<Room> rooms = roomRepository.findRoomsForBuilding(buildingId);
        List<Contract> activeContracts = contractRepository.findActiveContractsForBuilding(buildingId);
        Set<UUID> occupiedRoomIds = activeContracts.stream()
                .map(c -> c.getRoom().getId())
                .collect(Collectors.toSet());

        int totalRooms = rooms.size();
        int occupiedRooms = 0;
        int vacantBookableRooms = 0;
        int vacantBlockedRooms = 0;

        for (Room r : rooms) {
            if (occupiedRoomIds.contains(r.getId())) {
                occupiedRooms++;
            } else {
                if (r.isBookable() && r.getStatus() != RoomStatus.MAINTENANCE) {
                    vacantBookableRooms++;
                } else {
                    vacantBlockedRooms++;
                }
            }
        }

        // 6. Sự cố chưa xử lý (BR-160: trạng thái khác CLOSED)
        int openIssuesCount = (int) maintenanceIssueRepository.countOpenIssuesForBuilding(buildingId);

        return new DashboardMetricsDto(
                buildingId,
                billingMonth,
                billedAmount.toPlainString(),
                cashCollected.toPlainString(),
                cashRefunded.toPlainString(),
                netCash.toPlainString(),
                totalDebt.toPlainString(),
                totalCredit.toPlainString(),
                totalDepositHeld.toPlainString(),
                totalRooms,
                occupiedRooms,
                vacantBookableRooms,
                vacantBlockedRooms,
                openIssuesCount
        );
    }
}
