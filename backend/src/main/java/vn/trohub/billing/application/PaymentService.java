package vn.trohub.billing.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.trohub.billing.api.dto.PaymentDtos.*;
import vn.trohub.billing.domain.*;
import vn.trohub.billing.infrastructure.FinancialOperationRepository;
import vn.trohub.billing.infrastructure.InvoiceAdjustmentRepository;
import vn.trohub.billing.infrastructure.InvoiceLedgerEntryRepository;
import vn.trohub.billing.infrastructure.InvoiceRepository;
import vn.trohub.common.security.UserPrincipal;
import vn.trohub.user.infrastructure.BuildingStaffAssignmentRepository;
import vn.trohub.tenancy.domain.Contract;
import vn.trohub.tenancy.infrastructure.ContractMemberRepository;
import vn.trohub.user.domain.User;
import vn.trohub.user.infrastructure.UserRepository;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Objects;
import java.util.UUID;

@Service
public class PaymentService {

    private static final Logger log = LoggerFactory.getLogger(PaymentService.class);

    private final InvoiceRepository invoiceRepository;
    private final InvoiceAdjustmentRepository adjustmentRepository;
    private final InvoiceLedgerEntryRepository ledgerEntryRepository;
    private final FinancialOperationRepository operationRepository;
    private final UserRepository userRepository;
    private final BuildingStaffAssignmentRepository staffAssignmentRepository;
    private final ContractMemberRepository contractMemberRepository;
    private final ObjectMapper objectMapper;

    public PaymentService(
            InvoiceRepository invoiceRepository,
            InvoiceAdjustmentRepository adjustmentRepository,
            InvoiceLedgerEntryRepository ledgerEntryRepository,
            FinancialOperationRepository operationRepository,
            UserRepository userRepository,
            BuildingStaffAssignmentRepository staffAssignmentRepository,
            ContractMemberRepository contractMemberRepository,
            ObjectMapper objectMapper) {
        this.invoiceRepository = invoiceRepository;
        this.adjustmentRepository = adjustmentRepository;
        this.ledgerEntryRepository = ledgerEntryRepository;
        this.operationRepository = operationRepository;
        this.userRepository = userRepository;
        this.staffAssignmentRepository = staffAssignmentRepository;
        this.contractMemberRepository = contractMemberRepository;
        this.objectMapper = objectMapper;
    }

    /**
     * Ghi nhận thu tiền hóa đơn (BR-087..BR-095, EX-08, EX-25)
     */
    @Transactional
    public InvoiceFinancialStatusResponse recordPayment(RecordPaymentRequest request, UserPrincipal user, String idempotencyKey) {
        Invoice invoice = invoiceRepository.findById(request.invoiceId())
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy hóa đơn: " + request.invoiceId()));

        if (invoice.getStatus() != InvoiceStatus.ISSUED) {
            throw new IllegalStateException("Chỉ được thu tiền đối với hóa đơn đã phát hành (ISSUED)");
        }

        validateAccess(invoice.getContract(), user);

        if (request.amount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Số tiền thanh toán phải lớn hơn 0");
        }

        User actor = userRepository.findById(user.getId())
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy người dùng"));

        // Idempotency check (EX-25)
        String reqHash = computeHash("PAYMENT:" + invoice.getId() + ":" + request.amount() + ":" + request.referenceCode());
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            var existingOp = operationRepository.findByIdempotencyKey(idempotencyKey);
            if (existingOp.isPresent()) {
                log.info("Idempotency match for key={}", idempotencyKey);
                return getInvoiceFinancialStatus(invoice.getId(), user);
            }
        }

        FinancialOperation operation = new FinancialOperation(
                idempotencyKey != null && !idempotencyKey.isBlank() ? idempotencyKey : UUID.randomUUID().toString(),
                actor,
                FinancialAction.PAYMENT,
                reqHash,
                "SUCCESS",
                "Payment recorded: " + request.amount()
        );
        operationRepository.save(operation);

        InvoiceLedgerEntry entry = new InvoiceLedgerEntry(
                invoice,
                invoice.getContract(),
                LedgerEntryType.PAYMENT,
                request.amount(),
                request.paymentMethod(),
                request.referenceCode(),
                request.note(),
                null,
                operation,
                actor
        );
        ledgerEntryRepository.save(entry);

        return getInvoiceFinancialStatus(invoice.getId(), user);
    }

    /**
     * Sửa khoản thu nhập nhầm (BR-096, EX-11)
     */
    @Transactional
    public InvoiceFinancialStatusResponse correctPayment(PaymentCorrectionRequest request, UserPrincipal user, String idempotencyKey) {
        InvoiceLedgerEntry refEntry = ledgerEntryRepository.findById(request.refEntryId())
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy bút toán thu tiền gốc: " + request.refEntryId()));

        if (refEntry.getEntryType() != LedgerEntryType.PAYMENT) {
            throw new IllegalArgumentException("Chỉ được sửa đính chính bút toán thu tiền (PAYMENT)");
        }

        Invoice invoice = refEntry.getInvoice();
        validateManagerOnly(invoice.getContract().getRoom().getFloor().getBuilding().getId(), user);

        if (request.deltaAmount().compareTo(BigDecimal.ZERO) == 0) {
            throw new IllegalArgumentException("Số tiền điều chỉnh đính chính phải khác 0");
        }

        // Kiểm tra không để giao dịch bị âm
        BigDecimal currentNetForThisRef = refEntry.getAmount();
        List<InvoiceLedgerEntry> existingCorrections = ledgerEntryRepository.findByInvoiceIdOrderByRecordedAtAsc(invoice.getId()).stream()
                .filter(e -> e.getRefEntry() != null && e.getRefEntry().getId().equals(refEntry.getId()))
                .toList();
        for (var corr : existingCorrections) {
            currentNetForThisRef = currentNetForThisRef.add(corr.getAmount());
        }

        BigDecimal afterCorrection = currentNetForThisRef.add(request.deltaAmount());
        if (afterCorrection.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Số tiền điều chỉnh làm tổng tiền thu của giao dịch bị âm (" + afterCorrection + ")");
        }

        User actor = userRepository.findById(user.getId())
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy người dùng"));

        // Idempotency check
        String reqHash = computeHash("PAYMENT_CORRECTION:" + refEntry.getId() + ":" + request.deltaAmount() + ":" + request.reason());
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            var existingOp = operationRepository.findByIdempotencyKey(idempotencyKey);
            if (existingOp.isPresent()) {
                return getInvoiceFinancialStatus(invoice.getId(), user);
            }
        }

        FinancialOperation operation = new FinancialOperation(
                idempotencyKey != null && !idempotencyKey.isBlank() ? idempotencyKey : UUID.randomUUID().toString(),
                actor,
                FinancialAction.PAYMENT_CORRECTION,
                reqHash,
                "SUCCESS",
                "Payment correction: " + request.deltaAmount() + ", reason: " + request.reason()
        );
        operationRepository.save(operation);

        InvoiceLedgerEntry entry = new InvoiceLedgerEntry(
                invoice,
                invoice.getContract(),
                LedgerEntryType.PAYMENT_CORRECTION,
                request.deltaAmount(),
                refEntry.getPaymentMethod(),
                refEntry.getReferenceCode(),
                request.reason(),
                refEntry,
                operation,
                actor
        );
        ledgerEntryRepository.save(entry);

        return getInvoiceFinancialStatus(invoice.getId(), user);
    }

    /**
     * Hoàn tiền thừa/khoản dư hóa đơn (BR-097, EX-10, EX-14)
     */
    @Transactional
    public InvoiceFinancialStatusResponse refundInvoiceCredit(RefundRequest request, UserPrincipal user, String idempotencyKey) {
        Invoice invoice = invoiceRepository.findById(request.invoiceId())
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy hóa đơn: " + request.invoiceId()));

        validateManagerOnly(invoice.getContract().getRoom().getFloor().getBuilding().getId(), user);

        if (request.amount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Số tiền hoàn phải lớn hơn 0");
        }

        // Tính credit hiện tại
        BigDecimal effectiveDue = calculateEffectiveDue(invoice);
        BigDecimal netApplied = ledgerEntryRepository.sumAmountByInvoiceId(invoice.getId());
        BigDecimal credit = netApplied.subtract(effectiveDue);
        if (credit.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Hóa đơn không có số dư thừa (credit = 0), không thể thực hiện hoàn tiền");
        }

        if (request.amount().compareTo(credit) > 0) {
            throw new IllegalArgumentException("Số tiền hoàn (" + request.amount() + ") vượt quá số dư credit hiện có (" + credit + ")");
        }

        User actor = userRepository.findById(user.getId())
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy người dùng"));

        // Idempotency check (EX-14, EX-25)
        String reqHash = computeHash("REFUND:" + invoice.getId() + ":" + request.amount() + ":" + request.reason());
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            var existingOp = operationRepository.findByIdempotencyKey(idempotencyKey);
            if (existingOp.isPresent()) {
                return getInvoiceFinancialStatus(invoice.getId(), user);
            }
        }

        FinancialOperation operation = new FinancialOperation(
                idempotencyKey != null && !idempotencyKey.isBlank() ? idempotencyKey : UUID.randomUUID().toString(),
                actor,
                FinancialAction.REFUND,
                reqHash,
                "SUCCESS",
                "Refund: " + request.amount() + ", reason: " + request.reason()
        );
        operationRepository.save(operation);

        // Bút toán REFUND mang dấu âm đối trừ với netApplied (EX-10)
        InvoiceLedgerEntry entry = new InvoiceLedgerEntry(
                invoice,
                invoice.getContract(),
                LedgerEntryType.REFUND,
                request.amount().negate(),
                request.paymentMethod(),
                request.referenceCode(),
                request.reason(),
                null,
                operation,
                actor
        );
        ledgerEntryRepository.save(entry);

        return getInvoiceFinancialStatus(invoice.getId(), user);
    }

    /**
     * Chuyển dư giữa các hóa đơn (BR-098, EX-13)
     */
    @Transactional
    public InvoiceFinancialStatusResponse transferCredit(TransferCreditRequest request, UserPrincipal user, String idempotencyKey) {
        if (request.sourceInvoiceId().equals(request.targetInvoiceId())) {
            throw new IllegalArgumentException("Hóa đơn nguồn và đích phải khác nhau");
        }

        Invoice sourceInvoice = invoiceRepository.findById(request.sourceInvoiceId())
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy hóa đơn nguồn: " + request.sourceInvoiceId()));
        Invoice targetInvoice = invoiceRepository.findById(request.targetInvoiceId())
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy hóa đơn đích: " + request.targetInvoiceId()));

        validateManagerOnly(sourceInvoice.getContract().getRoom().getFloor().getBuilding().getId(), user);
        validateManagerOnly(targetInvoice.getContract().getRoom().getFloor().getBuilding().getId(), user);

        // Kiểm tra cùng hợp đồng hoặc cùng khách thuê
        UUID sourceContractId = sourceInvoice.getContract() != null ? sourceInvoice.getContract().getId() : null;
        UUID targetContractId = targetInvoice.getContract() != null ? targetInvoice.getContract().getId() : null;
        UUID sourceTenantId = (sourceInvoice.getContract() != null && sourceInvoice.getContract().getRepresentativeTenant() != null)
                ? sourceInvoice.getContract().getRepresentativeTenant().getId() : null;
        UUID targetTenantId = (targetInvoice.getContract() != null && targetInvoice.getContract().getRepresentativeTenant() != null)
                ? targetInvoice.getContract().getRepresentativeTenant().getId() : null;

        boolean sameContract = sourceContractId != null && Objects.equals(sourceContractId, targetContractId);
        boolean sameTenant = sourceTenantId != null && Objects.equals(sourceTenantId, targetTenantId);
        if (!sameContract && !sameTenant) {
            throw new IllegalArgumentException("Chỉ được chuyển dư giữa các hóa đơn trong cùng hợp đồng hoặc của cùng khách thuê");
        }

        BigDecimal sourceEffectiveDue = calculateEffectiveDue(sourceInvoice);
        BigDecimal sourceNetApplied = ledgerEntryRepository.sumAmountByInvoiceId(sourceInvoice.getId());
        BigDecimal sourceCredit = sourceNetApplied.subtract(sourceEffectiveDue);
        if (sourceCredit.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Hóa đơn nguồn không có số dư thừa (credit = 0)");
        }

        if (request.amount().compareTo(sourceCredit) > 0) {
            throw new IllegalArgumentException("Số tiền chuyển (" + request.amount() + ") vượt quá số dư thừa của hóa đơn nguồn (" + sourceCredit + ")");
        }

        BigDecimal targetEffectiveDue = calculateEffectiveDue(targetInvoice);
        BigDecimal targetNetApplied = ledgerEntryRepository.sumAmountByInvoiceId(targetInvoice.getId());
        BigDecimal targetDebt = targetEffectiveDue.subtract(targetNetApplied);
        if (targetDebt.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Hóa đơn đích hiện không có công nợ để bù trừ");
        }

        BigDecimal transferAmount = request.amount().min(targetDebt);

        User actor = userRepository.findById(user.getId())
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy người dùng"));

        String reqHash = computeHash("CREDIT_TRANSFER:" + sourceInvoice.getId() + "->" + targetInvoice.getId() + ":" + transferAmount);
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            var existingOp = operationRepository.findByIdempotencyKey(idempotencyKey);
            if (existingOp.isPresent()) {
                return getInvoiceFinancialStatus(sourceInvoice.getId(), user);
            }
        }

        FinancialOperation operation = new FinancialOperation(
                idempotencyKey != null && !idempotencyKey.isBlank() ? idempotencyKey : UUID.randomUUID().toString(),
                actor,
                FinancialAction.CREDIT_TRANSFER,
                reqHash,
                "SUCCESS",
                "Transfer credit: " + transferAmount + " from " + sourceInvoice.getBillingMonth() + " to " + targetInvoice.getBillingMonth()
        );
        operationRepository.save(operation);

        // Entry 1: Giảm dư ở hóa đơn nguồn (dấu âm)
        InvoiceLedgerEntry sourceEntry = new InvoiceLedgerEntry(
                sourceInvoice,
                sourceInvoice.getContract(),
                LedgerEntryType.CREDIT_APPLIED,
                transferAmount.negate(),
                PaymentMethod.INTERNAL_TRANSFER,
                "TRF-OUT-" + targetInvoice.getBillingMonth(),
                "Chuyển dư sang hóa đơn kỳ " + targetInvoice.getBillingMonth() + ": " + request.reason(),
                null,
                operation,
                actor
        );
        ledgerEntryRepository.save(sourceEntry);

        // Entry 2: Tăng tiền áp dụng ở hóa đơn đích (dấu dương)
        InvoiceLedgerEntry targetEntry = new InvoiceLedgerEntry(
                targetInvoice,
                targetInvoice.getContract(),
                LedgerEntryType.CREDIT_APPLIED,
                transferAmount,
                PaymentMethod.INTERNAL_TRANSFER,
                "TRF-IN-" + sourceInvoice.getBillingMonth(),
                "Nhận chuyển dư từ hóa đơn kỳ " + sourceInvoice.getBillingMonth() + ": " + request.reason(),
                null,
                operation,
                actor
        );
        ledgerEntryRepository.save(targetEntry);

        return getInvoiceFinancialStatus(sourceInvoice.getId(), user);
    }

    /**
     * Tra cứu trạng thái tài chính & sổ cái của hóa đơn
     */
    @Transactional(readOnly = true)
    public InvoiceFinancialStatusResponse getInvoiceFinancialStatus(UUID invoiceId, UserPrincipal user) {
        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy hóa đơn: " + invoiceId));

        validateAccess(invoice.getContract(), user);

        BigDecimal originalTotal = invoice.getOriginalTotal() != null ? invoice.getOriginalTotal() : BigDecimal.ZERO;
        BigDecimal adjustmentsTotal = adjustmentRepository.sumDeltaAmountByInvoiceId(invoice.getId());
        BigDecimal effectiveDue = originalTotal.add(adjustmentsTotal);
        if (effectiveDue.compareTo(BigDecimal.ZERO) < 0) effectiveDue = BigDecimal.ZERO;

        BigDecimal netApplied = ledgerEntryRepository.sumAmountByInvoiceId(invoice.getId());

        BigDecimal debt = effectiveDue.subtract(netApplied);
        if (debt.compareTo(BigDecimal.ZERO) < 0) debt = BigDecimal.ZERO;

        BigDecimal credit = netApplied.subtract(effectiveDue);
        if (credit.compareTo(BigDecimal.ZERO) < 0) credit = BigDecimal.ZERO;

        PaymentStatus status;
        if (credit.compareTo(BigDecimal.ZERO) > 0) {
            status = PaymentStatus.CREDIT;
        } else if (debt.compareTo(BigDecimal.ZERO) == 0 && netApplied.compareTo(BigDecimal.ZERO) > 0) {
            status = PaymentStatus.PAID;
        } else if (netApplied.compareTo(BigDecimal.ZERO) > 0) {
            status = PaymentStatus.PARTIAL;
        } else {
            status = PaymentStatus.UNPAID;
        }

        List<InvoiceLedgerEntry> entries = ledgerEntryRepository.findByInvoiceIdOrderByRecordedAtAsc(invoice.getId());
        List<LedgerEntryResponse> entryResponses = entries.stream()
                .map(e -> new LedgerEntryResponse(
                        e.getId(),
                        e.getInvoice().getId(),
                        e.getContract().getId(),
                        e.getEntryType(),
                        e.getAmount().toPlainString(),
                        e.getPaymentMethod(),
                        e.getReferenceCode(),
                        e.getNote(),
                        e.getRefEntry() != null ? e.getRefEntry().getId() : null,
                        e.getActor().getLogin(),
                        e.getRecordedAt()
                ))
                .toList();

        return new InvoiceFinancialStatusResponse(
                invoice.getId(),
                originalTotal.toPlainString(),
                adjustmentsTotal.toPlainString(),
                effectiveDue.toPlainString(),
                netApplied.toPlainString(),
                debt.toPlainString(),
                credit.toPlainString(),
                status,
                entryResponses
        );
    }

    private BigDecimal calculateEffectiveDue(Invoice invoice) {
        BigDecimal originalTotal = invoice.getOriginalTotal() != null ? invoice.getOriginalTotal() : BigDecimal.ZERO;
        BigDecimal adjustmentsTotal = adjustmentRepository.sumDeltaAmountByInvoiceId(invoice.getId());
        BigDecimal effectiveDue = originalTotal.add(adjustmentsTotal);
        return effectiveDue.compareTo(BigDecimal.ZERO) < 0 ? BigDecimal.ZERO : effectiveDue;
    }

    private void validateAccess(Contract contract, UserPrincipal user) {
        if (user.isOwner()) return;
        if (user.isStaff()) {
            boolean assigned = staffAssignmentRepository.existsByUserIdAndBuildingId(
                    user.getId(),
                    contract.getRoom().getFloor().getBuilding().getId()
            );
            if (!assigned) {
                throw new AccessDeniedException("Bạn không có quyền quản lý tòa nhà này");
            }
            return;
        }
        if (user.isTenant()) {
            if (contract.getRepresentativeTenant().getUser() != null &&
                contract.getRepresentativeTenant().getUser().getId().equals(user.getId())) {
                return;
            }
            boolean isMember = contractMemberRepository.findByContractIdOrderByJoinedOnAsc(contract.getId()).stream()
                    .anyMatch(m -> m.getTenant().getUser() != null && m.getTenant().getUser().getId().equals(user.getId()));
            if (!isMember) {
                throw new AccessDeniedException("Bạn không có quyền xem thông tin hóa đơn này");
            }
            return;
        }
        throw new AccessDeniedException("Truy cập bị từ chối");
    }

    private void validateManagerOnly(UUID buildingId, UserPrincipal user) {
        if (user.isOwner()) return;
        if (user.isStaff()) {
            boolean assigned = staffAssignmentRepository.existsByUserIdAndBuildingId(user.getId(), buildingId);
            if (!assigned) {
                throw new AccessDeniedException("Bạn không có quyền quản lý tòa nhà này");
            }
            return;
        }
        throw new AccessDeniedException("Chỉ Quản lý mới có quyền thực hiện thao tác tài chính này");
    }

    private String computeHash(String input) {
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
            return UUID.nameUUIDFromBytes(input.getBytes(StandardCharsets.UTF_8)).toString();
        }
    }
}
