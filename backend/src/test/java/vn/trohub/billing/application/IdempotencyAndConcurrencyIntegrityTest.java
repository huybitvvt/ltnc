package vn.trohub.billing.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import vn.trohub.billing.api.dto.PaymentDtos.*;
import vn.trohub.billing.domain.*;
import vn.trohub.billing.infrastructure.FinancialOperationRepository;
import vn.trohub.billing.infrastructure.InvoiceAdjustmentRepository;
import vn.trohub.billing.infrastructure.InvoiceLedgerEntryRepository;
import vn.trohub.billing.infrastructure.InvoiceRepository;
import vn.trohub.common.security.UserPrincipal;
import vn.trohub.property.domain.Building;
import vn.trohub.property.domain.Floor;
import vn.trohub.property.domain.Room;
import vn.trohub.tenancy.domain.Contract;
import vn.trohub.tenancy.domain.ContractStatus;
import vn.trohub.tenancy.domain.TenantProfile;
import vn.trohub.tenancy.infrastructure.ContractMemberRepository;
import vn.trohub.user.domain.User;
import vn.trohub.user.domain.UserRole;
import vn.trohub.user.infrastructure.BuildingStaffAssignmentRepository;
import vn.trohub.user.infrastructure.UserRepository;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class IdempotencyAndConcurrencyIntegrityTest {

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

    private PaymentService paymentService;

    private User ownerUser;
    private UserPrincipal ownerPrincipal;
    private Contract contract;
    private Invoice invoice;

    @BeforeEach
    void setUp() {
        lenient().when(invoiceRepository.findForUpdate(any())).thenAnswer(call -> invoiceRepository.findById(call.getArgument(0)));

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

        ownerUser = new User("owner1", "encodedPassword", UserRole.OWNER);
        ownerPrincipal = new UserPrincipal(ownerUser.getId(), ownerUser.getLogin(), ownerUser.getRole(), true);

        Building building = new Building("Tòa Idempotency", "123 Đường Số 1");
        Floor floor = new Floor(building, "Tầng 1", 1);
        Room room = new Room(building, floor, "101", BigDecimal.valueOf(3000000), BigDecimal.valueOf(3000000));
        TenantProfile tenant = new TenantProfile("Nguyễn Idem", "0901234567", "079090001111", "idem@gmail.com");

        contract = new Contract(room, tenant, LocalDate.of(2026, 9, 1), LocalDate.of(2027, 9, 1), BigDecimal.valueOf(3000000), BigDecimal.valueOf(3000000));
        contract.setId(UUID.randomUUID());
        contract.setStatus(ContractStatus.ACTIVE);

        invoice = new Invoice(
                contract,
                "2026-09",
                InvoiceStatus.ISSUED,
                LocalDate.of(2026, 9, 1),
                LocalDate.of(2026, 10, 1),
                LocalDate.of(2026, 9, 10)
        );
        invoice.setId(UUID.randomUUID());
        invoice.setOriginalTotal(BigDecimal.valueOf(3000000));
    }

    private String sha256(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException(e);
        }
    }

    @Test
    @DisplayName("I-03 & I-05: Gửi lại cùng Idempotency Key -> trả về kết quả đã lưu mà không ghi nhận đúp ledger entry")
    void testSameIdempotencyKey_ReplaysCachedResult() {
        String key = "IDEM-TEST-REPLAY";
        String sampleJson = "{\"invoiceId\":\"" + invoice.getId() + "\",\"originalTotal\":\"3000000\",\"adjustmentsTotal\":\"0\",\"effectiveDue\":\"3000000\",\"netApplied\":\"1000000\",\"debt\":\"2000000\",\"credit\":\"0\",\"paymentStatus\":\"PARTIAL\",\"entries\":[]}";

        RecordPaymentRequest request = new RecordPaymentRequest(
                invoice.getId(),
                new BigDecimal("1000000"),
                PaymentMethod.BANK_TRANSFER,
                "TXN-001",
                "Nộp đợt 1"
        );

        String rawPayload = "PAYMENT:" + request;
        String expectedHash = sha256(rawPayload);

        FinancialOperation existingOp = new FinancialOperation(
                key,
                ownerUser,
                FinancialAction.PAYMENT,
                expectedHash,
                "SUCCESS",
                sampleJson
        );

        when(invoiceRepository.findById(invoice.getId())).thenReturn(Optional.of(invoice));
        when(operationRepository.findByActorIdAndIdempotencyKey(ownerPrincipal.getId(), key)).thenReturn(Optional.of(existingOp));

        InvoiceFinancialStatusResponse response = paymentService.recordPayment(request, ownerPrincipal, key);

        assertNotNull(response);
        assertEquals("1000000", response.netApplied());
        assertEquals("2000000", response.debt());
        assertEquals(PaymentStatus.PARTIAL, response.paymentStatus());

        // Tuyệt đối không lưu thêm ledger entry mới khi replay
        verify(ledgerEntryRepository, never()).save(any(InvoiceLedgerEntry.class));
    }

    @Test
    @DisplayName("I-04: Cùng Idempotency Key nhưng nội dung request khác nhau -> Ném ngoại lệ báo xung đột (Conflict)")
    void testSameIdempotencyKey_DifferentPayload_ThrowsConflict() {
        String key = "IDEM-CONFLICT-KEY";

        FinancialOperation existingOp = new FinancialOperation(
                key,
                ownerUser,
                FinancialAction.PAYMENT,
                "different_hash_from_previous_payload",
                "SUCCESS",
                "{}"
        );

        when(invoiceRepository.findById(invoice.getId())).thenReturn(Optional.of(invoice));

        when(operationRepository.findByActorIdAndIdempotencyKey(ownerPrincipal.getId(), key)).thenReturn(Optional.of(existingOp));

        RecordPaymentRequest newRequestWithDifferentPayload = new RecordPaymentRequest(
                invoice.getId(),
                new BigDecimal("2000000"), // Khác số tiền
                PaymentMethod.CASH,
                null,
                "Nộp đợt 1 khác số tiền"
        );

        assertThrows(vn.trohub.common.api.ConflictException.class, () ->
                paymentService.recordPayment(newRequestWithDifferentPayload, ownerPrincipal, key)
        );
    }

    @Test
    @DisplayName("I-07: Đính chính thanh toán với số tiền delta làm âm tổng thanh toán -> Bị từ chối")
    void testPaymentCorrection_NegativeTotal_ThrowsException_I07() {
        InvoiceLedgerEntry originalEntry = new InvoiceLedgerEntry(
                invoice,
                contract,
                LedgerEntryType.PAYMENT,
                new BigDecimal("1000000"),
                PaymentMethod.CASH,
                null,
                "Thu tiền",
                null,
                null,
                ownerUser
        );
        originalEntry.setId(UUID.randomUUID());

        when(ledgerEntryRepository.findById(originalEntry.getId())).thenReturn(Optional.of(originalEntry));
        when(invoiceRepository.findById(invoice.getId())).thenReturn(Optional.of(invoice));

        // Phiếu gốc chỉ có 1.000.000đ nhưng yêu cầu đính chính giảm -1.500.000đ (dẫn tới âm 500k)
        PaymentCorrectionRequest request = new PaymentCorrectionRequest(
                originalEntry.getId(),
                new BigDecimal("-1500000"),
                "Giảm quá mức phiếu gốc"
        );

        assertThrows(IllegalArgumentException.class, () ->
                paymentService.correctPayment(request, ownerPrincipal, "IDEM-CORR-FAIL")
        );
    }
}
