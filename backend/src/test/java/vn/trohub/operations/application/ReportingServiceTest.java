package vn.trohub.operations.application;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import vn.trohub.billing.domain.*;
import vn.trohub.billing.infrastructure.DepositLedgerEntryRepository;
import vn.trohub.billing.infrastructure.InvoiceLedgerEntryRepository;
import vn.trohub.billing.infrastructure.InvoiceRepository;
import vn.trohub.common.security.UserPrincipal;
import vn.trohub.operations.application.OperationsDtos.DashboardMetricsDto;
import vn.trohub.operations.infrastructure.MaintenanceIssueRepository;
import vn.trohub.property.domain.Building;
import vn.trohub.property.domain.Room;
import vn.trohub.property.domain.RoomStatus;
import vn.trohub.property.infrastructure.RoomRepository;
import vn.trohub.tenancy.domain.Contract;
import vn.trohub.tenancy.domain.ContractStatus;
import vn.trohub.tenancy.domain.TenantProfile;
import vn.trohub.tenancy.infrastructure.ContractRepository;
import vn.trohub.user.domain.User;
import vn.trohub.user.domain.UserRole;
import vn.trohub.user.infrastructure.BuildingStaffAssignmentRepository;
import vn.trohub.user.infrastructure.UserRepository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReportingServiceTest {

    @Mock
    private InvoiceRepository invoiceRepository;
    @Mock
    private InvoiceLedgerEntryRepository invoiceLedgerEntryRepository;
    @Mock
    private DepositLedgerEntryRepository depositLedgerEntryRepository;
    @Mock
    private RoomRepository roomRepository;
    @Mock
    private ContractRepository contractRepository;
    @Mock
    private MaintenanceIssueRepository maintenanceIssueRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private BuildingStaffAssignmentRepository staffAssignmentRepository;

    private ReportingService reportingService;

    private User owner;
    private User tenantUser;
    private Building building;
    private Room room101;
    private Room room102;
    private Room room103;
    private Contract contract101;

    @BeforeEach
    void setUp() {
        reportingService = new ReportingService(
                invoiceRepository,
                invoiceLedgerEntryRepository,
                depositLedgerEntryRepository,
                roomRepository,
                contractRepository,
                maintenanceIssueRepository,
                userRepository,
                staffAssignmentRepository
        );

        owner = new User("owner@trohub.vn", "hash", UserRole.OWNER);
        owner.setId(UUID.randomUUID());

        tenantUser = new User("tenant@trohub.vn", "hash", UserRole.TENANT);
        tenantUser.setId(UUID.randomUUID());

        building = new Building("Tòa A", "123 Giải Phóng");
        building.setId(UUID.randomUUID());

        room101 = new Room(building, null, "101", new BigDecimal("3000000"), new BigDecimal("3000000"));
        room101.setId(UUID.randomUUID());

        room102 = new Room(building, null, "102", new BigDecimal("3200000"), new BigDecimal("3200000"));
        room102.setId(UUID.randomUUID());

        room103 = new Room(building, null, "103", new BigDecimal("3500000"), new BigDecimal("3500000"));
        room103.setId(UUID.randomUUID());
        room103.setBookable(false); // Phòng khóa không cho thuê

        TenantProfile tenantProfile = new TenantProfile("Nguyễn Văn Thuê", "0902222222", "001200000001", "Hà Nội");
        tenantProfile.setUser(tenantUser);

        contract101 = new Contract(room101, tenantProfile, LocalDate.of(2026, 9, 1), LocalDate.of(2027, 3, 1), new BigDecimal("3000000"), new BigDecimal("3000000"));
        contract101.setId(UUID.randomUUID());
        contract101.setStatus(ContractStatus.ACTIVE);
    }

    @Test
    @DisplayName("Báo cáo tài chính tính đúng billedAmount, cashCollected, netCash, debt, credit (BR-151..BR-155)")
    void testDashboardMetrics_BasicCalculations() {
        UserPrincipal principal = new UserPrincipal(owner.getId(), owner.getLogin(), owner.getRole(), true);
        when(userRepository.findById(owner.getId())).thenReturn(Optional.of(owner));

        // Invoice 1: 3.500.000, thu 2.000.000 -> nợ 1.500.000
        Invoice inv1 = new Invoice(contract101, "2026-09", InvoiceStatus.ISSUED, LocalDate.of(2026, 9, 1), LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 5));
        inv1.setId(UUID.randomUUID());
        inv1.addItem(new InvoiceItem(inv1, InvoiceItemType.RENT, "Tiền phòng", BigDecimal.ONE, new BigDecimal("3500000"), new BigDecimal("3500000"), null, null, null));

        when(invoiceRepository.findIssuedInvoicesForDashboard(building.getId(), "2026-09")).thenReturn(List.of(inv1));
        when(invoiceRepository.findIssuedInvoicesForDashboard(building.getId(), null)).thenReturn(List.of(inv1));

        // Bút toán thanh toán: thu 2.000.000, hoàn 200.000 -> thu ròng 1.800.000
        InvoiceLedgerEntry entryPay = new InvoiceLedgerEntry(inv1, contract101, LedgerEntryType.PAYMENT, new BigDecimal("2000000"), PaymentMethod.CASH, null, null, null, null, owner);
        InvoiceLedgerEntry entryRefund = new InvoiceLedgerEntry(inv1, contract101, LedgerEntryType.REFUND, new BigDecimal("-200000"), PaymentMethod.CASH, null, null, null, null, owner);

        when(invoiceLedgerEntryRepository.findEntriesForDashboard(eq(building.getId()), any(), any()))
                .thenReturn(List.of(entryPay, entryRefund));

        when(invoiceLedgerEntryRepository.sumAmountByInvoiceId(inv1.getId())).thenReturn(new BigDecimal("1800000"));
        when(depositLedgerEntryRepository.sumTotalDepositHeldByBuildingId(building.getId())).thenReturn(new BigDecimal("3000000"));

        when(roomRepository.findRoomsForBuilding(building.getId())).thenReturn(List.of(room101, room102, room103));
        when(contractRepository.findActiveContractsForBuilding(building.getId())).thenReturn(List.of(contract101));
        when(maintenanceIssueRepository.countOpenIssuesForBuilding(building.getId())).thenReturn(2L);

        DashboardMetricsDto dto = reportingService.getDashboardMetrics(building.getId(), "2026-09", principal);

        assertEquals("3500000", dto.billedAmount());
        assertEquals("2000000", dto.cashCollected());
        assertEquals("200000", dto.cashRefunded());
        assertEquals("1800000", dto.netCash());
        assertEquals("1700000", dto.totalDebt()); // 3.500.000 - 1.800.000 = 1.700.000
        assertEquals("0", dto.totalCredit());
        assertEquals("3000000", dto.totalDepositHeld());
        assertEquals(3, dto.totalRooms());
        assertEquals(1, dto.occupiedRooms());
        assertEquals(1, dto.vacantBookableRooms()); // room102 trống & bookable
        assertEquals(1, dto.vacantBlockedRooms());  // room103 trống & unbookable
        assertEquals(2, dto.openIssuesCount());
    }

    @Test
    @DisplayName("Tuyệt đối không cộng bù cọc (DEPOSIT_OFFSET) hoặc chuyển dư vào cashCollected (BR-154)")
    void testDashboardMetrics_BR154_ExcludeDepositOffsetAndCreditTransfer() {
        UserPrincipal principal = new UserPrincipal(owner.getId(), owner.getLogin(), owner.getRole(), true);
        when(userRepository.findById(owner.getId())).thenReturn(Optional.of(owner));

        Invoice inv = new Invoice(contract101, "2026-09", InvoiceStatus.ISSUED, LocalDate.of(2026, 9, 1), LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 5));
        inv.setId(UUID.randomUUID());
        inv.addItem(new InvoiceItem(inv, InvoiceItemType.RENT, "Tiền phòng", BigDecimal.ONE, new BigDecimal("1000000"), new BigDecimal("1000000"), null, null, null));

        when(invoiceRepository.findIssuedInvoicesForDashboard(building.getId(), "2026-09")).thenReturn(List.of(inv));
        when(invoiceRepository.findIssuedInvoicesForDashboard(building.getId(), null)).thenReturn(List.of(inv));

        // 1 bút toán thu tiền mặt 500k, 1 bút toán bù cọc 500k
        InvoiceLedgerEntry entryPay = new InvoiceLedgerEntry(inv, contract101, LedgerEntryType.PAYMENT, new BigDecimal("500000"), PaymentMethod.CASH, null, null, null, null, owner);
        InvoiceLedgerEntry entryOffset = new InvoiceLedgerEntry(inv, contract101, LedgerEntryType.DEPOSIT_OFFSET, new BigDecimal("500000"), PaymentMethod.INTERNAL_TRANSFER, null, null, null, null, owner);

        when(invoiceLedgerEntryRepository.findEntriesForDashboard(eq(building.getId()), any(), any()))
                .thenReturn(List.of(entryPay, entryOffset));
        when(invoiceLedgerEntryRepository.sumAmountByInvoiceId(inv.getId())).thenReturn(new BigDecimal("1000000"));
        when(depositLedgerEntryRepository.sumTotalDepositHeldByBuildingId(building.getId())).thenReturn(BigDecimal.ZERO);

        DashboardMetricsDto dto = reportingService.getDashboardMetrics(building.getId(), "2026-09", principal);

        // cashCollected CHỈ được tính 500.000, không được cộng 500.000 bù cọc
        assertEquals("500000", dto.cashCollected());
        assertEquals("500000", dto.netCash());
        assertEquals("0", dto.totalDebt());
    }

    @Test
    @DisplayName("KPI tiền cọc đang giữ lấy tổng số dư sổ cọc mọi hợp đồng, kể cả hợp đồng đã kết thúc ENDED (BR-157, EX-17)")
    void testDashboardMetrics_EX17_DepositHeldIncludesEndedContracts() {
        UserPrincipal principal = new UserPrincipal(owner.getId(), owner.getLogin(), owner.getRole(), true);
        when(userRepository.findById(owner.getId())).thenReturn(Optional.of(owner));

        when(invoiceRepository.findIssuedInvoicesForDashboard(building.getId(), "2026-09")).thenReturn(List.of());
        when(invoiceRepository.findIssuedInvoicesForDashboard(building.getId(), null)).thenReturn(List.of());
        when(invoiceLedgerEntryRepository.findEntriesForDashboard(eq(building.getId()), any(), any())).thenReturn(List.of());

        // EX-17: Hợp đồng đã kết thúc nhưng còn cọc 1.000.000 -> KPI cọc vẫn cộng 1.000.000
        when(depositLedgerEntryRepository.sumTotalDepositHeldByBuildingId(building.getId()))
                .thenReturn(new BigDecimal("1000000"));

        DashboardMetricsDto dto = reportingService.getDashboardMetrics(building.getId(), "2026-09", principal);

        assertEquals("1000000", dto.totalDepositHeld());
    }

    @Test
    @DisplayName("Khách thuê (TENANT) truy cập dashboard quản trị bị từ chối")
    void testDashboardMetrics_TenantDenied() {
        UserPrincipal principal = new UserPrincipal(tenantUser.getId(), tenantUser.getLogin(), tenantUser.getRole(), true);
        when(userRepository.findById(tenantUser.getId())).thenReturn(Optional.of(tenantUser));

        assertThrows(AccessDeniedException.class, () ->
                reportingService.getDashboardMetrics(building.getId(), "2026-09", principal));
    }
}
