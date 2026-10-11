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
import vn.trohub.common.api.ConflictException;
import vn.trohub.user.infrastructure.BuildingStaffAssignmentRepository;
import vn.trohub.tenancy.domain.Contract;
import vn.trohub.tenancy.infrastructure.ContractMemberRepository;
import vn.trohub.user.domain.User;
import vn.trohub.user.infrastructure.UserRepository;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Collections;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Objects;
import java.util.UUID;

@Service
public class PaymentService {
    private java.time.Clock clock = java.time.Clock.system(java.time.ZoneId.of("Asia/Ho_Chi_Minh"));
    @org.springframework.beans.factory.annotation.Autowired
    public void setClock(java.time.Clock clock) { this.clock = clock; }

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
        this.objectMapper = objectMapper.findAndRegisterModules();
    }

    /**
     * Ghi nhận thu tiền hóa đơn (BR-087..BR-095, EX-08, EX-25)
     */
    @Transactional
    public InvoiceFinancialStatusResponse recordPayment(RecordPaymentRequest request, UserPrincipal user, String idempotencyKey) {
        begin(user, idempotencyKey);
        Invoice invoice = invoiceRepository.findForUpdate(request.invoiceId())
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy hóa đơn: " + request.invoiceId()));

        if (invoice.getStatus() != InvoiceStatus.ISSUED) {
            throw new IllegalStateException("Chỉ được thu tiền đối với hóa đơn đã phát hành (ISSUED)");
        }

        validateManagerOnly(invoice.getContract().getRoom().getBuilding().getId(), user);
        String reqHash = computeHash("PAYMENT:" + request);
        var replay = replay(user, idempotencyKey, reqHash);
        if (replay != null) return replay;

        vn.trohub.common.money.Money.requireWhole(request.amount());
        if (request.amount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Số tiền thanh toán phải lớn hơn 0");
        }

        if (request.paymentMethod() != PaymentMethod.CASH && request.paymentMethod() != PaymentMethod.BANK_TRANSFER)
            throw new IllegalArgumentException("Chỉ tiền mặt hoặc chuyển khoản thủ công");
        BigDecimal beforeNet = ledgerEntryRepository.sumAmountByInvoiceId(invoice.getId());
        if (beforeNet == null) beforeNet = BigDecimal.ZERO;
        vn.trohub.common.money.Money.requireWhole(request.amount());
        if (request.amount().compareTo(calculateEffectiveDue(invoice).subtract(beforeNet).max(BigDecimal.ZERO)) > 0
                && !request.overpaymentConfirmed())
            throw new ConflictException("Khoản thu tạo dư, cần xác nhận overpaymentConfirmed");
        var effectiveDate = request.effectiveDate() == null
                ? java.time.LocalDate.now(clock) : request.effectiveDate();
        if (effectiveDate.isAfter(java.time.LocalDate.now(clock)))
            throw new IllegalArgumentException("Ngày hiệu lực không được ở tương lai");
        User actor = userRepository.findById(user.getId())
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy người dùng"));

        // Idempotency check (EX-25, I-04)


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
        entry.setEffectiveDate(effectiveDate);
        ledgerEntryRepository.save(entry);
        ledgerEntryRepository.flush();

        return finish(operation, getInvoiceFinancialStatus(invoice.getId(), user));
    }

    /**
     * Sửa khoản thu nhập nhầm (BR-096, EX-11)
     */
    @Transactional
    public InvoiceFinancialStatusResponse correctPayment(PaymentCorrectionRequest request, UserPrincipal user, String idempotencyKey) {
        begin(user, idempotencyKey);
        InvoiceLedgerEntry refEntry = ledgerEntryRepository.findById(request.refEntryId())
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy bút toán thu tiền gốc: " + request.refEntryId()));

        if (refEntry.getEntryType() != LedgerEntryType.PAYMENT) {
            throw new IllegalArgumentException("Chỉ được sửa đính chính bút toán thu tiền (PAYMENT)");
        }

        Invoice invoice = invoiceRepository.findForUpdate(refEntry.getInvoice().getId()).orElseThrow();
        validateManagerOnly(invoice.getContract().getRoom().getBuilding().getId(), user);
        if (invoice.getStatus() != InvoiceStatus.ISSUED)
            throw new ConflictException("Hóa đơn chưa phát hành");
        String reqHash = computeHash("PAYMENT_CORRECTION:" + request);
        var replay = replay(user, idempotencyKey, reqHash);
        if (replay != null) return replay;

        vn.trohub.common.money.Money.requireWhole(request.deltaAmount());
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

        BigDecimal net = ledgerEntryRepository.sumAmountByInvoiceId(invoice.getId());
        if (net == null) net = BigDecimal.ZERO;
        if (net.add(request.deltaAmount()).signum() < 0)
            throw new ConflictException("Đính chính làm netApplied âm");
        User actor = userRepository.findById(user.getId())
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy người dùng"));

        // Idempotency check


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
        entry.setEffectiveDate(refEntry.getEffectiveDate());
        ledgerEntryRepository.save(entry);
        ledgerEntryRepository.flush();

        return finish(operation, getInvoiceFinancialStatus(invoice.getId(), user));
    }

    /**
     * Hoàn tiền thừa/khoản dư hóa đơn (BR-097, EX-10, EX-14)
     */
    @Transactional
    public InvoiceFinancialStatusResponse refundInvoiceCredit(RefundRequest request, UserPrincipal user, String idempotencyKey) {
        begin(user, idempotencyKey);
        if (request.paymentMethod() != PaymentMethod.CASH && request.paymentMethod() != PaymentMethod.BANK_TRANSFER)
            throw new IllegalArgumentException("Chỉ tiền mặt hoặc chuyển khoản thủ công");
        Invoice invoice = invoiceRepository.findForUpdate(request.invoiceId())
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy hóa đơn: " + request.invoiceId()));

        validateManagerOnly(invoice.getContract().getRoom().getBuilding().getId(), user);
        if (invoice.getStatus() != InvoiceStatus.ISSUED)
            throw new ConflictException("Hóa đơn chưa phát hành");
        String reqHash = computeHash("REFUND:" + request);
        var replay = replay(user, idempotencyKey, reqHash);
        if (replay != null) return replay;

        vn.trohub.common.money.Money.requireWhole(request.amount());
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

        vn.trohub.common.money.Money.requireWhole(request.amount());
        if (request.amount().compareTo(credit) > 0) {
            throw new IllegalArgumentException("Số tiền hoàn (" + request.amount() + ") vượt quá số dư credit hiện có (" + credit + ")");
        }

        User actor = userRepository.findById(user.getId())
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy người dùng"));

        // Idempotency check (EX-14, EX-25)


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
        ledgerEntryRepository.flush();

        return finish(operation, getInvoiceFinancialStatus(invoice.getId(), user));
    }

    /**
     * Chuyển dư giữa các hóa đơn (BR-098, EX-13)
     */
    @Transactional
    public InvoiceFinancialStatusResponse transferCredit(TransferCreditRequest request, UserPrincipal user, String idempotencyKey) {
        begin(user, idempotencyKey);
        if (request.sourceInvoiceId().equals(request.targetInvoiceId())) {
            throw new IllegalArgumentException("Hóa đơn nguồn và đích phải khác nhau");
        }

        var ids = new java.util.ArrayList<>(java.util.List.of(request.sourceInvoiceId(), request.targetInvoiceId()));
        ids.sort(java.util.Comparator.naturalOrder());
        var locked = new java.util.HashMap<UUID, Invoice>();
        for (var id : ids) locked.put(id, invoiceRepository.findForUpdate(id).orElseThrow());
        Invoice sourceInvoice = locked.get(request.sourceInvoiceId());
        Invoice targetInvoice = locked.get(request.targetInvoiceId());

        validateManagerOnly(sourceInvoice.getContract().getRoom().getBuilding().getId(), user);
        validateManagerOnly(targetInvoice.getContract().getRoom().getBuilding().getId(), user);
        if (sourceInvoice.getStatus() != InvoiceStatus.ISSUED)
            throw new ConflictException("Hóa đơn chưa phát hành");
        if (targetInvoice.getStatus() != InvoiceStatus.ISSUED) throw new ConflictException("Hóa đơn đích chưa phát hành");
        String reqHash = computeHash("CREDIT_TRANSFER:" + request);
        var replay = replay(user, idempotencyKey, reqHash);
        if (replay != null) return replay;

        // Kiểm tra cùng hợp đồng hoặc cùng khách thuê
        UUID sourceContractId = sourceInvoice.getContract() != null ? sourceInvoice.getContract().getId() : null;
        UUID targetContractId = targetInvoice.getContract() != null ? targetInvoice.getContract().getId() : null;
        UUID sourceTenantId = (sourceInvoice.getContract() != null && sourceInvoice.getContract().getRepresentativeTenant() != null)
                ? sourceInvoice.getContract().getRepresentativeTenant().getId() : null;
        UUID targetTenantId = (targetInvoice.getContract() != null && targetInvoice.getContract().getRepresentativeTenant() != null)
                ? targetInvoice.getContract().getRepresentativeTenant().getId() : null;

        boolean sameContract = sourceContractId != null && Objects.equals(sourceContractId, targetContractId);
        boolean sameTenant = sourceTenantId != null && Objects.equals(sourceTenantId, targetTenantId);
        if (!sameContract) {
            throw new IllegalArgumentException("Chỉ được chuyển dư giữa các hóa đơn trong cùng hợp đồng");
        }

        BigDecimal sourceEffectiveDue = calculateEffectiveDue(sourceInvoice);
        BigDecimal sourceNetApplied = ledgerEntryRepository.sumAmountByInvoiceId(sourceInvoice.getId());
        BigDecimal sourceCredit = sourceNetApplied.subtract(sourceEffectiveDue);
        if (sourceCredit.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Hóa đơn nguồn không có số dư thừa (credit = 0)");
        }

        vn.trohub.common.money.Money.requireWhole(request.amount());
        if (request.amount().compareTo(sourceCredit) > 0) {
            throw new IllegalArgumentException("Số tiền chuyển (" + request.amount() + ") vượt quá số dư thừa của hóa đơn nguồn (" + sourceCredit + ")");
        }

        BigDecimal targetEffectiveDue = calculateEffectiveDue(targetInvoice);
        BigDecimal targetNetApplied = ledgerEntryRepository.sumAmountByInvoiceId(targetInvoice.getId());
        BigDecimal targetDebt = targetEffectiveDue.subtract(targetNetApplied);
        if (targetDebt.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Hóa đơn đích hiện không có công nợ để bù trừ");
        }

        if (request.amount().signum() <= 0 || request.amount().compareTo(targetDebt) > 0)
            throw new ConflictException("Số tiền chuyển phải dương và không vượt nợ đích");
        BigDecimal transferAmount = request.amount();

        User actor = userRepository.findById(user.getId())
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy người dùng"));



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
                LedgerEntryType.CREDIT_OUT,
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
                LedgerEntryType.CREDIT_IN,
                transferAmount,
                PaymentMethod.INTERNAL_TRANSFER,
                "TRF-IN-" + sourceInvoice.getBillingMonth(),
                "Nhận chuyển dư từ hóa đơn kỳ " + sourceInvoice.getBillingMonth() + ": " + request.reason(),
                null,
                operation,
                actor
        );
        ledgerEntryRepository.save(targetEntry);
        ledgerEntryRepository.flush();

        return finish(operation, getInvoiceFinancialStatus(sourceInvoice.getId(), user));
    }

    /**
     * Tra cứu trạng thái tài chính & sổ cái của hóa đơn
     */
    @Transactional(readOnly = true)
    public InvoiceFinancialStatusResponse getInvoiceFinancialStatus(UUID invoiceId, UserPrincipal user) {
        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy hóa đơn: " + invoiceId));

        validateAccess(invoice.getContract(), user);
        if (user.isTenant() && invoice.getStatus() != InvoiceStatus.ISSUED)
            throw new jakarta.persistence.EntityNotFoundException("Không tìm thấy hóa đơn");

        BigDecimal originalTotal = invoice.getOriginalTotal() != null ? invoice.getOriginalTotal() : BigDecimal.ZERO;
        BigDecimal adjustmentsTotal = adjustmentRepository.sumDeltaAmountByInvoiceId(invoice.getId());
        if (adjustmentsTotal == null) adjustmentsTotal = BigDecimal.ZERO;
        BigDecimal effectiveDue = originalTotal.add(adjustmentsTotal);
        if (effectiveDue.compareTo(BigDecimal.ZERO) < 0) effectiveDue = BigDecimal.ZERO;

        BigDecimal netApplied = ledgerEntryRepository.sumAmountByInvoiceId(invoice.getId());
        if (netApplied == null) netApplied = BigDecimal.ZERO;

        BigDecimal debt = effectiveDue.subtract(netApplied);
        if (debt.compareTo(BigDecimal.ZERO) < 0) debt = BigDecimal.ZERO;

        BigDecimal credit = netApplied.subtract(effectiveDue);
        if (credit.compareTo(BigDecimal.ZERO) < 0) credit = BigDecimal.ZERO;

        PaymentStatus status;
        if (credit.compareTo(BigDecimal.ZERO) > 0) {
            status = PaymentStatus.CREDIT;
        } else if (debt.compareTo(BigDecimal.ZERO) == 0) {
            status = PaymentStatus.PAID;
        } else if (netApplied.compareTo(BigDecimal.ZERO) > 0) {
            status = PaymentStatus.PARTIAL;
        } else {
            status = PaymentStatus.UNPAID;
        }

        List<InvoiceLedgerEntry> entries = ledgerEntryRepository.findByInvoiceIdOrderByRecordedAtAsc(invoice.getId());
        if (entries == null) entries = Collections.emptyList();
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
                        e.getRecordedAt(), e.getEffectiveDate()
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
        if (adjustmentsTotal == null) adjustmentsTotal = BigDecimal.ZERO;
        BigDecimal effectiveDue = originalTotal.add(adjustmentsTotal);
        return effectiveDue.compareTo(BigDecimal.ZERO) < 0 ? BigDecimal.ZERO : effectiveDue;
    }

    private void validateAccess(Contract contract, UserPrincipal user) {
        if (user.isOwner()) return;
        if (user.isStaff()) {
            boolean assigned = staffAssignmentRepository.existsByUserIdAndBuildingId(
                    user.getId(),
                    contract.getRoom().getBuilding().getId()
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
            throw new AccessDeniedException("Bạn không có quyền xem hóa đơn này; chỉ người đại diện hợp đồng được xem");
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

    private void begin(UserPrincipal user, String key) {
        if (user == null || user.isTenant()) throw new AccessDeniedException("Chỉ quản lý được ghi giao dịch");
        if (key == null || key.isBlank() || key.length() > 100)
            throw new IllegalArgumentException("X-Idempotency-Key bắt buộc, tối đa 100 ký tự");
        operationRepository.lockKey(user.getId() + ":" + key);
    }
    private InvoiceFinancialStatusResponse replay(UserPrincipal user, String key, String hash) {
        var existing = operationRepository.findByActorIdAndIdempotencyKey(user.getId(), key);
        if (existing.isEmpty()) return null;
        if (!hash.equals(existing.get().getRequestHash()))
            throw new ConflictException("Idempotency key đã được dùng với nội dung khác");
        try { return objectMapper.readValue(existing.get().getResponseSnapshot(), InvoiceFinancialStatusResponse.class); }
        catch (Exception ex) { throw new IllegalStateException("Không đọc được kết quả đã lưu", ex); }
    }
    private InvoiceFinancialStatusResponse finish(FinancialOperation op, InvoiceFinancialStatusResponse result) {
        try { op.setResponseSnapshot(objectMapper.writeValueAsString(result)); }
        catch (Exception ex) { throw new IllegalStateException("Không lưu được kết quả giao dịch", ex); }
        operationRepository.save(op);
        return result;
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
