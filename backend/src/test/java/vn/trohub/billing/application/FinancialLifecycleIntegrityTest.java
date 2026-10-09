package vn.trohub.billing.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import vn.trohub.billing.api.dto.DepositDtos.*;
import vn.trohub.billing.api.dto.PaymentDtos.*;
import vn.trohub.billing.domain.*;
import vn.trohub.billing.infrastructure.*;
import vn.trohub.common.security.UserPrincipal;
import vn.trohub.property.domain.Building;
import vn.trohub.property.domain.Floor;
import vn.trohub.property.domain.Room;
import vn.trohub.tenancy.domain.Contract;
import vn.trohub.tenancy.domain.ContractStatus;
import vn.trohub.tenancy.domain.DepositStatus;
import vn.trohub.tenancy.domain.TenantProfile;
import vn.trohub.tenancy.infrastructure.ContractMemberRepository;
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
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FinancialLifecycleIntegrityTest {

    @Mock
    private InvoiceRepository invoiceRepository;
    @Mock
    private InvoiceAdjustmentRepository adjustmentRepository;
    @Mock
    private InvoiceLedgerEntryRepository ledgerEntryRepository;
    @Mock
    private DepositLedgerEntryRepository depositLedgerEntryRepository;
    @Mock
    private FinancialOperationRepository operationRepository;
    @Mock
    private ContractRepository contractRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private BuildingStaffAssignmentRepository staffAssignmentRepository;
    @Mock
    private ContractMemberRepository contractMemberRepository;

    private PaymentService paymentService;
    private DepositService depositService;

    private User ownerUser;
    private UserPrincipal ownerPrincipal;
    private Building building;
    private Room room;
    private TenantProfile tenant;
    private Contract contract;
    private Invoice invoice1;
    private Invoice invoice2;

    @BeforeEach
    void setUp() {
        ObjectMapper objectMapper = new ObjectMapper();

        paymentService = new PaymentService(
                invoiceRepository,
                adjustmentRepository,
                ledgerEntryRepository,
                operationRepository,
                userRepository,
                staffAssignmentRepository,
                contractMemberRepository,
                objectMapper
        );

        depositService = new DepositService(
                contractRepository,
                depositLedgerEntryRepository,
                invoiceRepository,
                adjustmentRepository,
                ledgerEntryRepository,
                operationRepository,
                userRepository,
                staffAssignmentRepository,
                contractMemberRepository,
                objectMapper
        );

        ownerUser = new User("owner_test", "hashed_pwd", UserRole.OWNER);
        ownerPrincipal = new UserPrincipal(ownerUser.getId(), ownerUser.getLogin(), ownerUser.getRole(), true);

        building = new Building("Tòa nhà Thử Nghiệm", "123 Chu Văn An, Bình Thạnh");
        building.setId(UUID.randomUUID());
        Floor floor = new Floor(building, "Tầng 1", 1);
        room = new Room(building, floor, "101", BigDecimal.valueOf(3000000), BigDecimal.valueOf(3000000));

        tenant = new TenantProfile("Lê Hoàng Cường", "0987654321", "079090003333", "cuong@trohub.vn");
        tenant.setId(UUID.randomUUID());

        contract = new Contract(room, tenant, LocalDate.of(2026, 9, 1), LocalDate.of(2027, 9, 1), BigDecimal.valueOf(3000000), BigDecimal.valueOf(3000000));
        contract.setId(UUID.randomUUID());
        contract.setStatus(ContractStatus.ACTIVE);
        contract.setDepositStatus(DepositStatus.HOLDING);

        // Hóa đơn kỳ 1: tháng 09/2026 (tiền phòng 3.000.000 + tiền điện 30.250 kWh * 3.500đ = 105.875đ => tổng 3.105.875đ)
        invoice1 = new Invoice(
                contract,
                "2026-09",
                InvoiceStatus.ISSUED,
                LocalDate.of(2026, 9, 1),
                LocalDate.of(2026, 10, 1),
                LocalDate.of(2026, 9, 10)
        );
        invoice1.setId(UUID.randomUUID());
        invoice1.setOriginalTotal(new BigDecimal("3105875"));

        // Hóa đơn kỳ 2: tháng 10/2026 (tiền phòng 3.000.000đ)
        invoice2 = new Invoice(
                contract,
                "2026-10",
                InvoiceStatus.ISSUED,
                LocalDate.of(2026, 10, 1),
                LocalDate.of(2026, 11, 1),
                LocalDate.of(2026, 10, 10)
        );
        invoice2.setId(UUID.randomUUID());
        invoice2.setOriginalTotal(new BigDecimal("3000000"));
    }

    @Test
    @DisplayName("T-06: Xác thực tính tiền điện số lẻ thập phân 30.250 kWh * 3.500đ = 105.875đ")
    void testDecimalMeterCalculation_T06() {
        BigDecimal startVal = new BigDecimal("120.500");
        BigDecimal endVal = new BigDecimal("150.750");
        BigDecimal consumption = endVal.subtract(startVal);
        assertEquals(new BigDecimal("30.250"), consumption);

        BigDecimal unitPrice = new BigDecimal("3500");
        BigDecimal amount = consumption.multiply(unitPrice);
        assertEquals(new BigDecimal("105875.000"), amount);
        assertEquals(105875, amount.longValue());
    }

    @Test
    @DisplayName("T-07..T-11: Vòng đời hóa đơn: Thu từng phần -> Thu đủ -> Điều chỉnh giảm -> Hoàn một phần -> Chuyển số dư")
    void testEndToEndInvoiceLifecycle_Partial_Paid_Adjustment_Refund_Transfer() {
        when(userRepository.findById(ownerPrincipal.getId())).thenReturn(Optional.of(ownerUser));

        // 1. Thu đợt 1: 1.000.000đ
        when(invoiceRepository.findById(invoice1.getId())).thenReturn(Optional.of(invoice1));
        when(adjustmentRepository.sumDeltaAmountByInvoiceId(invoice1.getId())).thenReturn(BigDecimal.ZERO);
        when(ledgerEntryRepository.sumAmountByInvoiceId(invoice1.getId())).thenReturn(new BigDecimal("1000000"));

        RecordPaymentRequest pay1Req = new RecordPaymentRequest(
                invoice1.getId(),
                new BigDecimal("1000000"),
                PaymentMethod.BANK_TRANSFER,
                "TXN-CYCLE-01",
                "Đóng tiền đợt 1"
        );
        InvoiceFinancialStatusResponse pay1Res = paymentService.recordPayment(pay1Req, ownerPrincipal, "IDEM-LC-01");
        assertEquals("3105875", pay1Res.effectiveDue());
        assertEquals("1000000", pay1Res.netApplied());
        assertEquals("2105875", pay1Res.debt());
        assertEquals("0", pay1Res.credit());
        assertEquals(PaymentStatus.PARTIAL, pay1Res.paymentStatus());

        // 2. Thu đợt 2: 2.105.875đ -> Thu đủ
        when(ledgerEntryRepository.sumAmountByInvoiceId(invoice1.getId())).thenReturn(new BigDecimal("3105875"));
        RecordPaymentRequest pay2Req = new RecordPaymentRequest(
                invoice1.getId(),
                new BigDecimal("2105875"),
                PaymentMethod.BANK_TRANSFER,
                "TXN-CYCLE-02",
                "Đóng nốt tiền đợt 2"
        );
        InvoiceFinancialStatusResponse pay2Res = paymentService.recordPayment(pay2Req, ownerPrincipal, "IDEM-LC-02");
        assertEquals("3105875", pay2Res.effectiveDue());
        assertEquals("3105875", pay2Res.netApplied());
        assertEquals("0", pay2Res.debt());
        assertEquals("0", pay2Res.credit());
        assertEquals(PaymentStatus.PAID, pay2Res.paymentStatus());

        // 3. Điều chỉnh giảm 200.000đ -> Dư 200.000đ (CREDIT)
        when(adjustmentRepository.sumDeltaAmountByInvoiceId(invoice1.getId())).thenReturn(new BigDecimal("-200000"));

        // 4. Hoàn tiền 150.000đ từ khoản dư
        when(ledgerEntryRepository.sumAmountByInvoiceId(invoice1.getId()))
                .thenReturn(new BigDecimal("3105875"))  // kiểm tra credit trước khi hoàn
                .thenReturn(new BigDecimal("2955875")); // sau khi trừ 150.000
        RefundRequest refundReq = new RefundRequest(
                invoice1.getId(),
                new BigDecimal("150000"),
                PaymentMethod.CASH,
                "REFUND-CYCLE-01",
                "Hoàn tiền thừa trực tiếp"
        );
        InvoiceFinancialStatusResponse refRes = paymentService.refundInvoiceCredit(refundReq, ownerPrincipal, "IDEM-LC-03");
        assertEquals("2905875", refRes.effectiveDue());
        assertEquals("2955875", refRes.netApplied());
        assertEquals("0", refRes.debt());
        assertEquals("50000", refRes.credit()); // Vẫn còn dư 50.000đ
        assertEquals(PaymentStatus.CREDIT, refRes.paymentStatus());

        // 5. Chuyển khoản dư 50.000đ còn lại sang Hóa đơn 2
        when(invoiceRepository.findById(invoice2.getId())).thenReturn(Optional.of(invoice2));
        when(adjustmentRepository.sumDeltaAmountByInvoiceId(invoice2.getId())).thenReturn(BigDecimal.ZERO);
        when(ledgerEntryRepository.sumAmountByInvoiceId(invoice1.getId()))
                .thenReturn(new BigDecimal("2955875"))  // source credit check
                .thenReturn(new BigDecimal("2905875")); // source netApplied sau khi chuyển 50k
        when(ledgerEntryRepository.sumAmountByInvoiceId(invoice2.getId()))
                .thenReturn(BigDecimal.ZERO);           // target debt check

        TransferCreditRequest transferReq = new TransferCreditRequest(
                invoice1.getId(),
                invoice2.getId(),
                new BigDecimal("50000"),
                "Chuyển số dư kỳ 1 sang bù kỳ 2"
        );
        InvoiceFinancialStatusResponse sourceRes = paymentService.transferCredit(transferReq, ownerPrincipal, "IDEM-LC-04");

        // transferCredit trả về status của source invoice:
        // effectiveDue = 2905875, netApplied = 2905875, debt = 0, credit = 0 -> PAID
        assertEquals("2905875", sourceRes.effectiveDue());
        assertEquals("2905875", sourceRes.netApplied());
        assertEquals("0", sourceRes.debt());
        assertEquals("0", sourceRes.credit());
        assertEquals(PaymentStatus.PAID, sourceRes.paymentStatus());

        // Xác nhận đã lưu đủ các bút toán sổ cái với đúng loại nghiệp vụ
        verify(ledgerEntryRepository, atLeast(4)).save(any(InvoiceLedgerEntry.class));
    }

    @Test
    @DisplayName("T-12..T-14: Bù trừ cọc vào hóa đơn nợ (OFFSET_OUT) và Quyết toán cọc (SETTLED)")
    void testDepositLifecycle_Offset_And_Settlement() {
        when(contractRepository.findById(contract.getId())).thenReturn(Optional.of(contract));
        when(userRepository.findById(ownerPrincipal.getId())).thenReturn(Optional.of(ownerUser));
        when(invoiceRepository.findById(invoice2.getId())).thenReturn(Optional.of(invoice2));
        when(adjustmentRepository.sumDeltaAmountByInvoiceId(invoice2.getId())).thenReturn(BigDecimal.ZERO);

        // 1. Bù trừ cọc 1.000.000đ vào hóa đơn 2
        when(depositLedgerEntryRepository.sumAmountByContractId(contract.getId()))
                .thenReturn(new BigDecimal("3000000"))
                .thenReturn(new BigDecimal("2000000"));
        when(ledgerEntryRepository.sumAmountByInvoiceId(invoice2.getId()))
                .thenReturn(BigDecimal.ZERO)
                .thenReturn(new BigDecimal("1000000"));

        OffsetDepositToInvoiceRequest offsetReq = new OffsetDepositToInvoiceRequest(
                contract.getId(),
                invoice2.getId(),
                new BigDecimal("1000000"),
                "Trừ 1tr từ cọc để bù vào hóa đơn"
        );

        ContractDepositFinancialStatusResponse offsetRes = depositService.offsetDepositToInvoice(offsetReq, ownerPrincipal, "IDEM-DEP-OFF-01");
        assertNotNull(offsetRes);
        assertEquals("2000000", offsetRes.depositHeld());

        // Xác nhận đã lưu cả DepositLedgerEntry (âm 1tr) và InvoiceLedgerEntry (dương 1tr)
        ArgumentCaptor<DepositLedgerEntry> depCaptor = ArgumentCaptor.forClass(DepositLedgerEntry.class);
        verify(depositLedgerEntryRepository).save(depCaptor.capture());
        assertEquals(DepositEntryType.OFFSET_OUT, depCaptor.getValue().getEntryType());
        assertEquals(new BigDecimal("-1000000"), depCaptor.getValue().getAmount());

        ArgumentCaptor<InvoiceLedgerEntry> invCaptor = ArgumentCaptor.forClass(InvoiceLedgerEntry.class);
        verify(ledgerEntryRepository).save(invCaptor.capture());
        assertEquals(LedgerEntryType.DEPOSIT_OFFSET, invCaptor.getValue().getEntryType());
        assertEquals(new BigDecimal("1000000"), invCaptor.getValue().getAmount());

        // 2. Quyết toán cọc khi kết thúc hợp đồng
        when(depositLedgerEntryRepository.sumAmountByContractId(contract.getId()))
                .thenReturn(BigDecimal.ZERO);
        contract.setStatus(ContractStatus.ENDED);

        SettleDepositRequest settleReq = new SettleDepositRequest(
                contract.getId(),
                "Quyết toán hoàn tất"
        );

        ContractDepositFinancialStatusResponse settleRes = depositService.settleDeposit(settleReq, ownerPrincipal, "IDEM-SETTLE-01");
        assertNotNull(settleRes);
        assertEquals(DepositStatus.SETTLED, contract.getDepositStatus());
    }

    @Test
    @DisplayName("T-20: Ngăn chặn hoàn tiền vượt quá số dư (Overdraft protection)")
    void testRefundOverdraft_ThrowsException_T20() {
        when(invoiceRepository.findById(invoice1.getId())).thenReturn(Optional.of(invoice1));
        // effectiveDue = 3.000.000, netApplied = 3.100.000 -> credit chỉ có 100.000
        invoice1.setOriginalTotal(new BigDecimal("3000000"));
        when(adjustmentRepository.sumDeltaAmountByInvoiceId(invoice1.getId())).thenReturn(BigDecimal.ZERO);
        when(ledgerEntryRepository.sumAmountByInvoiceId(invoice1.getId())).thenReturn(new BigDecimal("3100000"));

        RefundRequest request = new RefundRequest(
                invoice1.getId(),
                new BigDecimal("150000"), // Yêu cầu hoàn 150.000 trong khi chỉ dư 100.000
                PaymentMethod.CASH,
                "REFUND-FAIL",
                "Cố hoàn quá số dư"
        );

        assertThrows(IllegalArgumentException.class, () ->
                paymentService.refundInvoiceCredit(request, ownerPrincipal, "IDEM-REF-FAIL")
        );
    }
}
