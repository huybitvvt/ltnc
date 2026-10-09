package vn.trohub.billing.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
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
import vn.trohub.user.infrastructure.BuildingStaffAssignmentRepository;
import vn.trohub.tenancy.domain.Contract;
import vn.trohub.tenancy.domain.ContractStatus;
import vn.trohub.tenancy.domain.TenantProfile;
import vn.trohub.tenancy.infrastructure.ContractMemberRepository;
import vn.trohub.user.domain.User;
import vn.trohub.user.domain.UserRole;
import vn.trohub.user.infrastructure.UserRepository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PaymentServiceTest {

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
    private Building building;
    private Room room;
    private TenantProfile tenant;
    private Contract contract;
    private Invoice invoiceA;
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

        ownerUser = new User("owner1", "encodedPassword", UserRole.OWNER);
        ownerPrincipal = new UserPrincipal(ownerUser.getId(), ownerUser.getLogin(), ownerUser.getRole(), true);

        building = new Building("Tòa nhà A", "123 Xa Lộ");
        building.setId(UUID.randomUUID());
        Floor floor = new Floor(building, "Tầng 1", 1);
        room = new Room(building, floor, "101", BigDecimal.valueOf(3000000), BigDecimal.valueOf(3000000));

        tenant = new TenantProfile("Nguyễn Văn A", "0901234567", "079090001111", "a@gmail.com");
        tenant.setId(UUID.randomUUID());

        contract = new Contract(room, tenant, LocalDate.of(2026, 9, 1), LocalDate.of(2027, 9, 1), BigDecimal.valueOf(3000000), BigDecimal.valueOf(3000000));
        contract.setId(UUID.randomUUID());
        contract.setStatus(ContractStatus.ACTIVE);

        invoiceA = new Invoice(
                contract,
                "2026-09",
                InvoiceStatus.ISSUED,
                LocalDate.of(2026, 9, 1),
                LocalDate.of(2026, 10, 1),
                LocalDate.of(2026, 9, 10)
        );
        invoiceA.setId(UUID.randomUUID());
        invoiceA.setOriginalTotal(BigDecimal.valueOf(3000000));

        invoiceB = new Invoice(
                contract,
                "2026-10",
                InvoiceStatus.ISSUED,
                LocalDate.of(2026, 10, 1),
                LocalDate.of(2026, 11, 1),
                LocalDate.of(2026, 10, 10)
        );
        invoiceB.setId(UUID.randomUUID());
        invoiceB.setOriginalTotal(BigDecimal.valueOf(500000));
    }

    @Test
    @DisplayName("EX-08: Hóa đơn 3.000.000; thu 1.000.000 -> PARTIAL, nợ 2.000.000, dư 0")
    void testRecordPayment_PartialPayment_EX08() {
        when(invoiceRepository.findById(invoiceA.getId())).thenReturn(Optional.of(invoiceA));
        when(userRepository.findById(ownerPrincipal.getId())).thenReturn(Optional.of(ownerUser));
        when(adjustmentRepository.sumDeltaAmountByInvoiceId(invoiceA.getId())).thenReturn(BigDecimal.ZERO);
        // Sau khi lưu entry 1.000.000, sumAmountByInvoiceId trả về 1.000.000
        when(ledgerEntryRepository.sumAmountByInvoiceId(invoiceA.getId())).thenReturn(new BigDecimal("1000000"));

        RecordPaymentRequest request = new RecordPaymentRequest(
                invoiceA.getId(),
                new BigDecimal("1000000"),
                PaymentMethod.BANK_TRANSFER,
                "TXN-123456",
                "Khách nộp trước đợt 1"
        );

        InvoiceFinancialStatusResponse response = paymentService.recordPayment(request, ownerPrincipal, "IDEM-PAY-01");

        assertNotNull(response);
        assertEquals("3000000", response.effectiveDue());
        assertEquals("1000000", response.netApplied());
        assertEquals("2000000", response.debt());
        assertEquals("0", response.credit());
        assertEquals(PaymentStatus.PARTIAL, response.paymentStatus());

        ArgumentCaptor<InvoiceLedgerEntry> captor = ArgumentCaptor.forClass(InvoiceLedgerEntry.class);
        verify(ledgerEntryRepository, times(1)).save(captor.capture());
        assertEquals(LedgerEntryType.PAYMENT, captor.getValue().getEntryType());
        assertEquals(new BigDecimal("1000000"), captor.getValue().getAmount());
    }

    @Test
    @DisplayName("EX-09 & EX-10: Thu 3.000.000, điều chỉnh -200.000 -> CREDIT dư 200.000; thực hoàn 200.000 -> PAID, netApplied 2.800.000, dư 0")
    void testInvoiceAdjust_ThenRefund_EX09_EX10() {
        when(invoiceRepository.findById(invoiceA.getId())).thenReturn(Optional.of(invoiceA));
        when(userRepository.findById(ownerPrincipal.getId())).thenReturn(Optional.of(ownerUser));
        // effectiveDue = 3.000.000 + (-200.000) = 2.800.000
        when(adjustmentRepository.sumDeltaAmountByInvoiceId(invoiceA.getId())).thenReturn(new BigDecimal("-200000"));
        // netApplied ban đầu = 3.000.000
        when(ledgerEntryRepository.sumAmountByInvoiceId(invoiceA.getId()))
                .thenReturn(new BigDecimal("3000000")) // lúc kiểm tra credit trước hoàn
                .thenReturn(new BigDecimal("2800000")); // lúc getFinancialStatus sau khi trừ 200.000

        RefundRequest request = new RefundRequest(
                invoiceA.getId(),
                new BigDecimal("200000"),
                PaymentMethod.BANK_TRANSFER,
                "REFUND-TXN-01",
                "Hoàn trả tiền thừa do điều chỉnh giảm giá"
        );

        InvoiceFinancialStatusResponse response = paymentService.refundInvoiceCredit(request, ownerPrincipal, "IDEM-REF-01");

        assertNotNull(response);
        assertEquals("2800000", response.effectiveDue());
        assertEquals("2800000", response.netApplied());
        assertEquals("0", response.debt());
        assertEquals("0", response.credit());
        assertEquals(PaymentStatus.PAID, response.paymentStatus());

        ArgumentCaptor<InvoiceLedgerEntry> captor = ArgumentCaptor.forClass(InvoiceLedgerEntry.class);
        verify(ledgerEntryRepository, times(1)).save(captor.capture());
        assertEquals(LedgerEntryType.REFUND, captor.getValue().getEntryType());
        // Bút toán REFUND mang dấu âm
        assertEquals(new BigDecimal("-200000"), captor.getValue().getAmount());
    }

    @Test
    @DisplayName("EX-11: Hóa đơn 3.000.000; nhập thu 2.000.000; sửa thu -500.000 -> netApplied 1.500.000, nợ 1.500.000; tiền hoàn thực tế 0")
    void testPaymentCorrection_EX11() {
        InvoiceLedgerEntry originalEntry = new InvoiceLedgerEntry(
                invoiceA,
                contract,
                LedgerEntryType.PAYMENT,
                new BigDecimal("2000000"),
                PaymentMethod.CASH,
                null,
                "Thu tiền mặt",
                null,
                null,
                ownerUser
        );
        originalEntry.setId(UUID.randomUUID());

        when(ledgerEntryRepository.findById(originalEntry.getId())).thenReturn(Optional.of(originalEntry));
        when(invoiceRepository.findById(invoiceA.getId())).thenReturn(Optional.of(invoiceA));
        when(userRepository.findById(ownerPrincipal.getId())).thenReturn(Optional.of(ownerUser));
        when(adjustmentRepository.sumDeltaAmountByInvoiceId(invoiceA.getId())).thenReturn(BigDecimal.ZERO);
        when(ledgerEntryRepository.findByInvoiceIdOrderByRecordedAtAsc(invoiceA.getId())).thenReturn(List.of(originalEntry));
        // Sau sửa -500k, netApplied = 1.500.000
        when(ledgerEntryRepository.sumAmountByInvoiceId(invoiceA.getId())).thenReturn(new BigDecimal("1500000"));

        PaymentCorrectionRequest request = new PaymentCorrectionRequest(
                originalEntry.getId(),
                new BigDecimal("-500000"),
                "Nhập nhầm tiền mặt của khách khác"
        );

        InvoiceFinancialStatusResponse response = paymentService.correctPayment(request, ownerPrincipal, "IDEM-CORR-01");

        assertNotNull(response);
        assertEquals("3000000", response.effectiveDue());
        assertEquals("1500000", response.netApplied());
        assertEquals("1500000", response.debt());
        assertEquals("0", response.credit());
        assertEquals(PaymentStatus.PARTIAL, response.paymentStatus());

        ArgumentCaptor<InvoiceLedgerEntry> captor = ArgumentCaptor.forClass(InvoiceLedgerEntry.class);
        verify(ledgerEntryRepository, times(1)).save(captor.capture());
        assertEquals(LedgerEntryType.PAYMENT_CORRECTION, captor.getValue().getEntryType());
        assertEquals(new BigDecimal("-500000"), captor.getValue().getAmount());
        assertEquals(originalEntry, captor.getValue().getRefEntry());
    }

    @Test
    @DisplayName("EX-13: Hóa đơn A dư 200.000, B nợ 500.000, cùng hợp đồng; chuyển 150.000 -> A dư 50.000, B nợ 350.000; thu tiền mới 0")
    void testTransferCredit_EX13() {
        when(invoiceRepository.findById(invoiceA.getId())).thenReturn(Optional.of(invoiceA));
        when(invoiceRepository.findById(invoiceB.getId())).thenReturn(Optional.of(invoiceB));
        when(userRepository.findById(ownerPrincipal.getId())).thenReturn(Optional.of(ownerUser));

        // Invoice A: effectiveDue = 3.000.000, netApplied = 3.200.000 -> credit = 200.000
        when(adjustmentRepository.sumDeltaAmountByInvoiceId(invoiceA.getId())).thenReturn(BigDecimal.ZERO);
        when(ledgerEntryRepository.sumAmountByInvoiceId(invoiceA.getId()))
                .thenReturn(new BigDecimal("3200000")) // trước chuyển
                .thenReturn(new BigDecimal("3050000")); // sau chuyển (3.200.000 - 150.000)

        // Invoice B: effectiveDue = 500.000, netApplied = 0 -> debt = 500.000
        when(adjustmentRepository.sumDeltaAmountByInvoiceId(invoiceB.getId())).thenReturn(BigDecimal.ZERO);
        when(ledgerEntryRepository.sumAmountByInvoiceId(invoiceB.getId())).thenReturn(BigDecimal.ZERO);

        TransferCreditRequest request = new TransferCreditRequest(
                invoiceA.getId(),
                invoiceB.getId(),
                new BigDecimal("150000"),
                "Chuyển bù trừ tiền thừa tháng trước"
        );

        InvoiceFinancialStatusResponse responseA = paymentService.transferCredit(request, ownerPrincipal, "IDEM-TRF-01");

        assertNotNull(responseA);
        assertEquals("3000000", responseA.effectiveDue());
        assertEquals("3050000", responseA.netApplied());
        assertEquals("0", responseA.debt());
        assertEquals("50000", responseA.credit()); // A dư 50.000
        assertEquals(PaymentStatus.CREDIT, responseA.paymentStatus());

        // Kiểm tra đã lưu 2 bút toán CREDIT_APPLIED (1 âm ở A, 1 dương ở B)
        ArgumentCaptor<InvoiceLedgerEntry> captor = ArgumentCaptor.forClass(InvoiceLedgerEntry.class);
        verify(ledgerEntryRepository, times(2)).save(captor.capture());
        List<InvoiceLedgerEntry> saved = captor.getAllValues();
        assertEquals(new BigDecimal("-150000"), saved.get(0).getAmount());
        assertEquals(new BigDecimal("150000"), saved.get(1).getAmount());
    }

    @Test
    @DisplayName("EX-14: Hóa đơn dư 200.000; yêu cầu hoàn 250.000 vượt quá credit -> ném ngoại lệ")
    void testRefund_ExceedingCredit_ThrowsException_EX14() {
        when(invoiceRepository.findById(invoiceA.getId())).thenReturn(Optional.of(invoiceA));
        when(adjustmentRepository.sumDeltaAmountByInvoiceId(invoiceA.getId())).thenReturn(BigDecimal.ZERO);
        // netApplied = 3.200.000 -> credit = 200.000
        when(ledgerEntryRepository.sumAmountByInvoiceId(invoiceA.getId())).thenReturn(new BigDecimal("3200000"));

        RefundRequest request = new RefundRequest(
                invoiceA.getId(),
                new BigDecimal("250000"),
                PaymentMethod.BANK_TRANSFER,
                "REFUND-OVER",
                "Thử hoàn vượt credit"
        );

        assertThrows(IllegalArgumentException.class, () ->
                paymentService.refundInvoiceCredit(request, ownerPrincipal, "IDEM-OVER-REF")
        );

        verify(ledgerEntryRepository, never()).save(any());
    }

    @Test
    @DisplayName("EX-25: Cùng idempotency key gửi lại khoản thu -> trả lại cùng kết quả, không tạo thêm entry")
    void testRecordPayment_Idempotency_EX25() {
        when(invoiceRepository.findById(invoiceA.getId())).thenReturn(Optional.of(invoiceA));
        when(userRepository.findById(ownerPrincipal.getId())).thenReturn(Optional.of(ownerUser));
        when(adjustmentRepository.sumDeltaAmountByInvoiceId(invoiceA.getId())).thenReturn(BigDecimal.ZERO);
        when(ledgerEntryRepository.sumAmountByInvoiceId(invoiceA.getId())).thenReturn(new BigDecimal("1000000"));

        String raw = "PAYMENT:" + invoiceA.getId() + ":1000000:TXN-DUPLICATE";
        String sha256;
        try {
            var md = java.security.MessageDigest.getInstance("SHA-256");
            byte[] b = md.digest(raw.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            var sb = new StringBuilder();
            for (byte x : b) {
                sb.append(String.format("%02x", x));
            }
            sha256 = sb.toString();
        } catch (Exception e) {
            sha256 = "hash";
        }

        FinancialOperation existingOp = new FinancialOperation(
                "IDEM-DUPLICATE",
                ownerUser,
                FinancialAction.PAYMENT,
                sha256,
                "SUCCESS",
                "Already processed"
        );
        when(operationRepository.findByIdempotencyKey("IDEM-DUPLICATE")).thenReturn(Optional.of(existingOp));

        RecordPaymentRequest request = new RecordPaymentRequest(
                invoiceA.getId(),
                new BigDecimal("1000000"),
                PaymentMethod.BANK_TRANSFER,
                "TXN-DUPLICATE",
                "Thu tiền gửi lại"
        );

        InvoiceFinancialStatusResponse response = paymentService.recordPayment(request, ownerPrincipal, "IDEM-DUPLICATE");

        assertNotNull(response);
        verify(ledgerEntryRepository, never()).save(any());
    }

    @Test
    @DisplayName("Chặn thu tiền hóa đơn DRAFT")
    void testRecordPayment_DraftInvoice_ThrowsException() {
        invoiceA.setStatus(InvoiceStatus.DRAFT);
        when(invoiceRepository.findById(invoiceA.getId())).thenReturn(Optional.of(invoiceA));

        RecordPaymentRequest request = new RecordPaymentRequest(
                invoiceA.getId(),
                new BigDecimal("1000000"),
                PaymentMethod.CASH,
                null,
                "Thu tiền"
        );

        assertThrows(IllegalStateException.class, () ->
                paymentService.recordPayment(request, ownerPrincipal, "IDEM-DRAFT")
        );
    }
}
