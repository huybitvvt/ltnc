package vn.trohub.auth.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import vn.trohub.billing.api.dto.PaymentDtos.RecordPaymentRequest;
import vn.trohub.billing.application.PaymentService;
import vn.trohub.billing.domain.*;
import vn.trohub.billing.infrastructure.FinancialOperationRepository;
import vn.trohub.billing.infrastructure.InvoiceAdjustmentRepository;
import vn.trohub.billing.infrastructure.InvoiceLedgerEntryRepository;
import vn.trohub.billing.infrastructure.InvoiceRepository;
import vn.trohub.common.security.UserPrincipal;
import vn.trohub.property.application.PropertyService;
import vn.trohub.property.domain.Building;
import vn.trohub.property.domain.Floor;
import vn.trohub.property.domain.Room;
import vn.trohub.property.infrastructure.BuildingRepository;
import vn.trohub.property.infrastructure.FloorRepository;
import vn.trohub.property.infrastructure.RoomRepository;
import vn.trohub.tenancy.domain.Contract;
import vn.trohub.tenancy.domain.ContractStatus;
import vn.trohub.tenancy.domain.TenantProfile;
import vn.trohub.tenancy.infrastructure.ContractMemberRepository;
import vn.trohub.user.domain.User;
import vn.trohub.user.domain.UserRole;
import vn.trohub.user.infrastructure.BuildingStaffAssignmentRepository;
import vn.trohub.user.infrastructure.UserRepository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collections;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SecurityScopeAuthorizationTest {

    @Mock
    private InvoiceRepository invoiceRepository;
    @Mock
    private InvoiceAdjustmentRepository adjustmentRepository;
    @Mock
    private InvoiceLedgerEntryRepository ledgerEntryRepository;
    @Mock
    private FinancialOperationRepository operationRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private BuildingStaffAssignmentRepository staffAssignmentRepository;
    @Mock
    private ContractMemberRepository contractMemberRepository;
    @Mock
    private BuildingRepository buildingRepository;
    @Mock
    private FloorRepository floorRepository;
    @Mock
    private RoomRepository roomRepository;

    private PaymentService paymentService;
    private PropertyService propertyService;

    private User staffAUser;
    private UserPrincipal staffAPrincipal;
    private User tenantAUser;
    private UserPrincipal tenantAPrincipal;

    private Building buildingA;
    private Building buildingB;
    private Contract contractB;
    private Invoice invoiceB;

    @BeforeEach
    void setUp() {
        paymentService = new PaymentService(
                invoiceRepository,
                adjustmentRepository,
                ledgerEntryRepository,
                operationRepository,
                userRepository,
                staffAssignmentRepository,
                contractMemberRepository,
                new ObjectMapper()
        );

        propertyService = new PropertyService(
                buildingRepository,
                floorRepository,
                roomRepository,
                staffAssignmentRepository
        );

        staffAUser = new User("staff_a", "hashed", UserRole.STAFF);
        staffAUser.setId(UUID.randomUUID());
        staffAPrincipal = new UserPrincipal(staffAUser.getId(), staffAUser.getLogin(), staffAUser.getRole(), true);

        tenantAUser = new User("tenant_a", "hashed", UserRole.TENANT);
        tenantAUser.setId(UUID.randomUUID());
        tenantAPrincipal = new UserPrincipal(tenantAUser.getId(), tenantAUser.getLogin(), tenantAUser.getRole(), true);

        buildingA = new Building("Tòa nhà A", "Quận 1");
        buildingA.setId(UUID.randomUUID());

        buildingB = new Building("Tòa nhà B", "Quận 7");
        buildingB.setId(UUID.randomUUID());

        Floor floorB = new Floor(buildingB, "Tầng 1", 1);
        Room roomB = new Room(buildingB, floorB, "B101", BigDecimal.valueOf(4000000), BigDecimal.valueOf(4000000));

        User tenantBUser = new User("tenant_b", "hashed", UserRole.TENANT);
        tenantBUser.setId(UUID.randomUUID());
        TenantProfile tenantB = new TenantProfile("Khách B", "0909999888", "079090009999", "b@gmail.com");
        tenantB.setUser(tenantBUser);

        contractB = new Contract(roomB, tenantB, LocalDate.of(2026, 9, 1), LocalDate.of(2027, 9, 1), BigDecimal.valueOf(4000000), BigDecimal.valueOf(4000000));
        contractB.setId(UUID.randomUUID());
        contractB.setStatus(ContractStatus.ACTIVE);

        invoiceB = new Invoice(
                contractB,
                "2026-09",
                InvoiceStatus.ISSUED,
                LocalDate.of(2026, 9, 1),
                LocalDate.of(2026, 10, 1),
                LocalDate.of(2026, 9, 10)
        );
        invoiceB.setId(UUID.randomUUID());
        invoiceB.setOriginalTotal(BigDecimal.valueOf(4000000));
    }

    @Test
    @DisplayName("STAFF_A không được phân công Tòa B: cố thu tiền hóa đơn Tòa B -> Bị chặn với AccessDeniedException")
    void testStaffA_CannotCollectPayment_OnBuildingB() {
        when(invoiceRepository.findById(invoiceB.getId())).thenReturn(Optional.of(invoiceB));
        when(staffAssignmentRepository.existsByUserIdAndBuildingId(staffAPrincipal.getId(), buildingB.getId()))
                .thenReturn(false);

        RecordPaymentRequest request = new RecordPaymentRequest(
                invoiceB.getId(),
                BigDecimal.valueOf(1000000),
                PaymentMethod.CASH,
                null,
                "Thu tiền trái phép"
        );

        AccessDeniedException ex = assertThrows(AccessDeniedException.class, () ->
                paymentService.recordPayment(request, staffAPrincipal, "IDEM-ILLEGAL-STAFF")
        );
        assertTrue(ex.getMessage().contains("không có quyền"));
    }

    @Test
    @DisplayName("TENANT_A không thuộc Hợp đồng B: cố xem thông tin thanh toán Hóa đơn B -> Bị chặn với AccessDeniedException")
    void testTenantA_CannotAccessInvoice_OfContractB() {
        when(invoiceRepository.findById(invoiceB.getId())).thenReturn(Optional.of(invoiceB));
        when(contractMemberRepository.findByContractIdOrderByJoinedOnAsc(contractB.getId()))
                .thenReturn(Collections.emptyList());

        AccessDeniedException ex = assertThrows(AccessDeniedException.class, () ->
                paymentService.getInvoiceFinancialStatus(invoiceB.getId(), tenantAPrincipal)
        );
        assertTrue(ex.getMessage().contains("không có quyền"));
    }

    @Test
    @DisplayName("STAFF_A không được phân công Tòa B: kiểm tra truy cập Tòa B -> Bị ném AccessDeniedException")
    void testStaffA_CannotAccessBuildingB() {
        when(staffAssignmentRepository.existsByUserIdAndBuildingId(staffAPrincipal.getId(), buildingB.getId()))
                .thenReturn(false);

        AccessDeniedException ex = assertThrows(AccessDeniedException.class, () ->
                propertyService.checkBuildingAccess(buildingB.getId(), staffAPrincipal)
        );
        assertTrue(ex.getMessage().contains("không được phân công"));
    }
}
