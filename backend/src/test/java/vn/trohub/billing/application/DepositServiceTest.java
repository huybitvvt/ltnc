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
import vn.trohub.billing.domain.*;
import vn.trohub.billing.infrastructure.DepositLedgerEntryRepository;
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
class DepositServiceTest {

    @Mock
    private ContractRepository contractRepository;
    @Mock
    private DepositLedgerEntryRepository depositLedgerEntryRepository;
    @Mock
    private InvoiceRepository invoiceRepository;
    @Mock
    private InvoiceAdjustmentRepository adjustmentRepository;
    @Mock
    private InvoiceLedgerEntryRepository invoiceLedgerEntryRepository;
    @Mock
    private FinancialOperationRepository operationRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private BuildingStaffAssignmentRepository staffAssignmentRepository;
    @Mock
    private ContractMemberRepository contractMemberRepository;

    private DepositService depositService;

    private User ownerUser;
    private UserPrincipal ownerPrincipal;
    private Building building;
    private Room room;
    private TenantProfile tenant;
    private Contract contract;
    private Invoice invoice;

    @BeforeEach
    void setUp() {
        depositService = new DepositService(
                contractRepository,
                depositLedgerEntryRepository,
                invoiceRepository,
                adjustmentRepository,
                invoiceLedgerEntryRepository,
                operationRepository,
                userRepository,
                staffAssignmentRepository,
                contractMemberRepository,
                new ObjectMapper()
        );

        ownerUser = new User("owner1", "encodedPassword", UserRole.OWNER);
        ownerPrincipal = new UserPrincipal(ownerUser.getId(), ownerUser.getLogin(), ownerUser.getRole(), true);

        building = new Building("Tòa nhà Cọc", "456 Nam Kỳ Khởi Nghĩa");
        building.setId(UUID.randomUUID());
        Floor floor = new Floor(building, "Tầng 2", 2);
        room = new Room(building, floor, "201", BigDecimal.valueOf(3000000), BigDecimal.valueOf(3000000));

        tenant = new TenantProfile("Trần Văn B", "0912345678", "079090002222", "b@gmail.com");
        tenant.setId(UUID.randomUUID());

        contract = new Contract(room, tenant, LocalDate.of(2026, 9, 1), LocalDate.of(2027, 9, 1), BigDecimal.valueOf(3000000), BigDecimal.valueOf(3000000));
        contract.setId(UUID.randomUUID());
        contract.setStatus(ContractStatus.ACTIVE);
        contract.setDepositStatus(DepositStatus.NOT_RECEIVED);

        invoice = new Invoice(
                contract,
                "2026-09",
                InvoiceStatus.ISSUED,
                LocalDate.of(2026, 9, 1),
                LocalDate.of(2026, 10, 1),
                LocalDate.of(2026, 9, 10)
        );
        invoice.setId(UUID.randomUUID());
        invoice.setOriginalTotal(BigDecimal.valueOf(1000000));
    }

    @Test
    @DisplayName("Thu tiền cọc thành công: lưu entry RECEIPT, đổi status sang HOLDING")
    void testRecordDepositReceipt_Success() {
        when(contractRepository.findById(contract.getId())).thenReturn(Optional.of(contract));
        when(userRepository.findById(ownerPrincipal.getId())).thenReturn(Optional.of(ownerUser));
        when(depositLedgerEntryRepository.sumAmountByContractId(contract.getId())).thenReturn(new BigDecimal("3000000"));
        when(depositLedgerEntryRepository.sumTotalReceiptByContractId(contract.getId())).thenReturn(new BigDecimal("3000000"));

        RecordDepositReceiptRequest request = new RecordDepositReceiptRequest(
                contract.getId(),
                new BigDecimal("3000000"),
                PaymentMethod.BANK_TRANSFER,
                "TXN-DEP-01",
                "Thu đủ cọc khi nhận phòng"
        );

        ContractDepositFinancialStatusResponse response = depositService.recordDepositReceipt(request, ownerPrincipal, "IDEM-DEP-01");

        assertNotNull(response);
        assertEquals("3000000", response.depositHeld());
        assertEquals("3000000", response.totalReceipt());
        assertEquals(DepositStatus.HOLDING, contract.getDepositStatus());

        ArgumentCaptor<DepositLedgerEntry> captor = ArgumentCaptor.forClass(DepositLedgerEntry.class);
        verify(depositLedgerEntryRepository, times(1)).save(captor.capture());
        assertEquals(DepositEntryType.RECEIPT, captor.getValue().getEntryType());
        assertEquals(new BigDecimal("3000000"), captor.getValue().getAmount());
    }

    @Test
    @DisplayName("Sửa phiếu thu cọc: deltaAmount < 0 hợp lệ")
    void testCorrectDepositReceipt_DeltaNegative_Success() {
        DepositLedgerEntry origEntry = new DepositLedgerEntry(
                contract,
                DepositEntryType.RECEIPT,
                new BigDecimal("3000000"),
                PaymentMethod.BANK_TRANSFER,
                "TXN-DEP-01",
                null, null, null, null, null, ownerUser
        );
        origEntry.setId(UUID.randomUUID());

        when(depositLedgerEntryRepository.findById(origEntry.getId())).thenReturn(Optional.of(origEntry));
        when(userRepository.findById(ownerPrincipal.getId())).thenReturn(Optional.of(ownerUser));
        when(depositLedgerEntryRepository.sumAmountByContractId(contract.getId())).thenReturn(new BigDecimal("3000000"), new BigDecimal("2500000"));

        CorrectDepositReceiptRequest request = new CorrectDepositReceiptRequest(
                origEntry.getId(),
                new BigDecimal("-500000"),
                "Nhập thừa 500k khi thu cọc"
        );

        ContractDepositFinancialStatusResponse response = depositService.correctDepositReceipt(request, ownerPrincipal, "IDEM-DEP-CORR-01");

        assertNotNull(response);
        assertEquals("2500000", response.depositHeld());

        ArgumentCaptor<DepositLedgerEntry> captor = ArgumentCaptor.forClass(DepositLedgerEntry.class);
        verify(depositLedgerEntryRepository, times(1)).save(captor.capture());
        assertEquals(DepositEntryType.RECEIPT_CORRECTION, captor.getValue().getEntryType());
        assertEquals(new BigDecimal("-500000"), captor.getValue().getAmount());
        assertEquals(origEntry, captor.getValue().getRefEntry());
    }

    @Test
    @DisplayName("Sửa phiếu thu cọc làm số dư cọc bị âm -> ném IllegalArgumentException")
    void testCorrectDepositReceipt_NegativeHeld_ThrowsException() {
        DepositLedgerEntry origEntry = new DepositLedgerEntry(
                contract,
                DepositEntryType.RECEIPT,
                new BigDecimal("1000000"),
                PaymentMethod.BANK_TRANSFER,
                "TXN-DEP-01",
                null, null, null, null, null, ownerUser
        );
        origEntry.setId(UUID.randomUUID());

        when(depositLedgerEntryRepository.findById(origEntry.getId())).thenReturn(Optional.of(origEntry));
        when(userRepository.findById(ownerPrincipal.getId())).thenReturn(Optional.of(ownerUser));
        // Hiện tại chỉ còn 1.000.000 mà sửa giảm 1.500.000
        when(depositLedgerEntryRepository.sumAmountByContractId(contract.getId())).thenReturn(new BigDecimal("1000000"));

        CorrectDepositReceiptRequest request = new CorrectDepositReceiptRequest(
                origEntry.getId(),
                new BigDecimal("-1500000"),
                "Giảm quá mức"
        );

        assertThrows(IllegalArgumentException.class, () ->
                depositService.correctDepositReceipt(request, ownerPrincipal, "IDEM-DEP-CORR-02"));
    }

    @Test
    @DisplayName("EX-15: Cọc đã nhận 3.000.000; khấu trừ 500.000; hoàn 2.500.000 -> Giữ 0, khấu trừ 500000, hoàn 2500000")
    void testDeductDeposit_And_Refund_EX15() {
        when(contractRepository.findById(contract.getId())).thenReturn(Optional.of(contract));
        when(userRepository.findById(ownerPrincipal.getId())).thenReturn(Optional.of(ownerUser));

        // 1. Khấu trừ 500.000 do hỏng vòi nước
        when(depositLedgerEntryRepository.sumAmountByContractId(contract.getId())).thenReturn(
                new BigDecimal("3000000"), // trước deduct
                new BigDecimal("2500000")  // sau deduct
        );
        when(depositLedgerEntryRepository.sumTotalDeductionByContractId(contract.getId())).thenReturn(new BigDecimal("500000"));

        DeductDepositRequest deductReq = new DeductDepositRequest(
                contract.getId(),
                new BigDecimal("500000"),
                "Hỏng thiết bị vệ sinh",
                "EXP-REPAIR-01"
        );

        ContractDepositFinancialStatusResponse deductRes = depositService.deductDeposit(deductReq, ownerPrincipal, "IDEM-DEDUCT-01");
        assertNotNull(deductRes);
        assertEquals("2500000", deductRes.depositHeld());
        assertEquals("500000", deductRes.totalDeduction());

        // 2. Hoàn nốt 2.500.000 cho khách
        when(depositLedgerEntryRepository.sumAmountByContractId(contract.getId())).thenReturn(
                new BigDecimal("2500000"), // trước refund
                BigDecimal.ZERO            // sau refund
        );
        when(depositLedgerEntryRepository.sumTotalRefundByContractId(contract.getId())).thenReturn(new BigDecimal("2500000"));

        RefundDepositRequest refundReq = new RefundDepositRequest(
                contract.getId(),
                new BigDecimal("2500000"),
                "Hoàn cọc khi trả phòng",
                PaymentMethod.BANK_TRANSFER,
                "TXN-REFUND-DEP"
        );

        ContractDepositFinancialStatusResponse refundRes = depositService.refundDeposit(refundReq, ownerPrincipal, "IDEM-REFUND-01");
        assertNotNull(refundRes);
        assertEquals("0", refundRes.depositHeld());
        assertEquals("2500000", refundRes.totalRefund());
        assertEquals("500000", refundRes.totalDeduction());
    }

    @Test
    @DisplayName("EX-16: Cọc giữ 3.000.000; hóa đơn nợ 500.000; bù cọc 500.000 -> cọc giữ 2.500.000, hóa đơn hết nợ")
    void testOffsetDepositToInvoice_EX16() {
        when(contractRepository.findById(contract.getId())).thenReturn(Optional.of(contract));
        when(invoiceRepository.findById(invoice.getId())).thenReturn(Optional.of(invoice));
        when(userRepository.findById(ownerPrincipal.getId())).thenReturn(Optional.of(ownerUser));

        when(depositLedgerEntryRepository.sumAmountByContractId(contract.getId())).thenReturn(
                new BigDecimal("3000000"), // trước bù
                new BigDecimal("2500000")  // sau bù
        );
        when(adjustmentRepository.sumDeltaAmountByInvoiceId(invoice.getId())).thenReturn(BigDecimal.ZERO);
        when(invoiceLedgerEntryRepository.sumAmountByInvoiceId(invoice.getId())).thenReturn(new BigDecimal("500000")); // đã trả 500k, còn nợ 500k

        OffsetDepositToInvoiceRequest request = new OffsetDepositToInvoiceRequest(
                contract.getId(),
                invoice.getId(),
                new BigDecimal("500000"),
                "Khách đồng ý trừ cọc vào tiền điện nước tháng 9"
        );

        ContractDepositFinancialStatusResponse response = depositService.offsetDepositToInvoice(request, ownerPrincipal, "IDEM-OFFSET-01");

        assertNotNull(response);
        assertEquals("2500000", response.depositHeld());

        // Kiểm tra lưu 1 entry âm vào sổ cọc
        ArgumentCaptor<DepositLedgerEntry> depositCaptor = ArgumentCaptor.forClass(DepositLedgerEntry.class);
        verify(depositLedgerEntryRepository, times(1)).save(depositCaptor.capture());
        assertEquals(DepositEntryType.OFFSET_OUT, depositCaptor.getValue().getEntryType());
        assertEquals(new BigDecimal("-500000"), depositCaptor.getValue().getAmount());

        // Kiểm tra lưu 1 entry dương vào sổ hóa đơn
        ArgumentCaptor<InvoiceLedgerEntry> invoiceCaptor = ArgumentCaptor.forClass(InvoiceLedgerEntry.class);
        verify(invoiceLedgerEntryRepository, times(1)).save(invoiceCaptor.capture());
        assertEquals(LedgerEntryType.DEPOSIT_OFFSET, invoiceCaptor.getValue().getEntryType());
        assertEquals(new BigDecimal("500000"), invoiceCaptor.getValue().getAmount());
    }

    @Test
    @DisplayName("BR-120: Xác nhận quyết toán cọc thành công khi hợp đồng ENDED và depositHeld == 0")
    void testSettleDeposit_Success_WhenEndedAndZeroHeld() {
        contract.setStatus(ContractStatus.ENDED);
        when(contractRepository.findById(contract.getId())).thenReturn(Optional.of(contract));
        when(userRepository.findById(ownerPrincipal.getId())).thenReturn(Optional.of(ownerUser));
        when(depositLedgerEntryRepository.sumAmountByContractId(contract.getId())).thenReturn(BigDecimal.ZERO);

        SettleDepositRequest request = new SettleDepositRequest(contract.getId(), "Quyết toán hoàn tất");

        ContractDepositFinancialStatusResponse response = depositService.settleDeposit(request, ownerPrincipal, "IDEM-SETTLE-01");

        assertNotNull(response);
        assertEquals(DepositStatus.SETTLED, contract.getDepositStatus());
        assertNotNull(contract.getDepositSettledAt());
    }

    @Test
    @DisplayName("BR-120: Từ chối quyết toán khi hợp đồng chưa ENDED")
    void testSettleDeposit_NotEnded_ThrowsException() {
        contract.setStatus(ContractStatus.ACTIVE);
        when(contractRepository.findById(contract.getId())).thenReturn(Optional.of(contract));
        when(userRepository.findById(ownerPrincipal.getId())).thenReturn(Optional.of(ownerUser));

        SettleDepositRequest request = new SettleDepositRequest(contract.getId(), "Quyết toán sớm");

        assertThrows(IllegalStateException.class, () ->
                depositService.settleDeposit(request, ownerPrincipal, "IDEM-SETTLE-ERR"));
    }

    @Test
    @DisplayName("BR-120: Từ chối quyết toán khi hợp đồng ENDED nhưng số dư cọc chưa bằng 0")
    void testSettleDeposit_NonZeroHeld_ThrowsException() {
        contract.setStatus(ContractStatus.ENDED);
        when(contractRepository.findById(contract.getId())).thenReturn(Optional.of(contract));
        when(userRepository.findById(ownerPrincipal.getId())).thenReturn(Optional.of(ownerUser));
        when(depositLedgerEntryRepository.sumAmountByContractId(contract.getId())).thenReturn(new BigDecimal("1000000"));

        SettleDepositRequest request = new SettleDepositRequest(contract.getId(), "Quyết toán khi còn tiền");

        assertThrows(IllegalStateException.class, () ->
                depositService.settleDeposit(request, ownerPrincipal, "IDEM-SETTLE-ERR-2"));
    }
}
