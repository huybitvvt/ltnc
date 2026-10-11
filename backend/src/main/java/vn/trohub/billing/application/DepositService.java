package vn.trohub.billing.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.trohub.billing.api.dto.DepositDtos.*;
import vn.trohub.billing.domain.*;
import vn.trohub.billing.infrastructure.DepositLedgerEntryRepository;
import vn.trohub.billing.infrastructure.FinancialOperationRepository;
import vn.trohub.billing.infrastructure.InvoiceAdjustmentRepository;
import vn.trohub.billing.infrastructure.InvoiceLedgerEntryRepository;
import vn.trohub.billing.infrastructure.InvoiceRepository;
import vn.trohub.common.security.UserPrincipal;
import vn.trohub.tenancy.domain.Contract;
import vn.trohub.tenancy.domain.ContractStatus;
import vn.trohub.tenancy.domain.DepositStatus;
import vn.trohub.tenancy.infrastructure.ContractMemberRepository;
import vn.trohub.tenancy.infrastructure.ContractRepository;
import vn.trohub.user.domain.User;
import vn.trohub.user.domain.UserRole;
import vn.trohub.user.infrastructure.BuildingStaffAssignmentRepository;
import vn.trohub.user.infrastructure.UserRepository;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.*;

@Service
public class DepositService {
    private java.time.Clock clock = java.time.Clock.system(java.time.ZoneId.of("Asia/Ho_Chi_Minh"));
    @org.springframework.beans.factory.annotation.Autowired
    public void setClock(java.time.Clock clock) { this.clock = clock; }

    private static final Logger log = LoggerFactory.getLogger(DepositService.class);

    private final ContractRepository contractRepository;
    private final DepositLedgerEntryRepository depositLedgerEntryRepository;
    private final InvoiceRepository invoiceRepository;
    private final InvoiceAdjustmentRepository adjustmentRepository;
    private final InvoiceLedgerEntryRepository invoiceLedgerEntryRepository;
    private final FinancialOperationRepository operationRepository;
    private final UserRepository userRepository;
    private final BuildingStaffAssignmentRepository staffAssignmentRepository;
    private final ContractMemberRepository contractMemberRepository;
    private final ObjectMapper objectMapper;

    public DepositService(ContractRepository contractRepository,
                          DepositLedgerEntryRepository depositLedgerEntryRepository,
                          InvoiceRepository invoiceRepository,
                          InvoiceAdjustmentRepository adjustmentRepository,
                          InvoiceLedgerEntryRepository invoiceLedgerEntryRepository,
                          FinancialOperationRepository operationRepository,
                          UserRepository userRepository,
                          BuildingStaffAssignmentRepository staffAssignmentRepository,
                          ContractMemberRepository contractMemberRepository,
                          ObjectMapper objectMapper) {
        this.contractRepository = contractRepository;
        this.depositLedgerEntryRepository = depositLedgerEntryRepository;
        this.invoiceRepository = invoiceRepository;
        this.adjustmentRepository = adjustmentRepository;
        this.invoiceLedgerEntryRepository = invoiceLedgerEntryRepository;
        this.operationRepository = operationRepository;
        this.userRepository = userRepository;
        this.staffAssignmentRepository = staffAssignmentRepository;
        this.contractMemberRepository = contractMemberRepository;
        this.objectMapper = objectMapper.findAndRegisterModules();
    }

    @Transactional(readOnly = true)
    public ContractDepositFinancialStatusResponse getContractDepositStatus(UUID contractId, UserPrincipal principal) {
        Contract contract = contractRepository.findById(contractId)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy hợp đồng: " + contractId));

        User user = userRepository.findById(principal.getId())
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy người dùng"));

        validateViewAccess(contract, user);

        return buildStatusResponse(contract);
    }

    @Transactional
    public ContractDepositFinancialStatusResponse recordDepositReceipt(RecordDepositReceiptRequest request,
                                                                       UserPrincipal principal,
                                                                       String idempotencyKey) {
        if (principal.isTenant()) throw new AccessDeniedException("Chỉ quản lý được ghi giao dịch cọc");
        if (idempotencyKey == null || idempotencyKey.isBlank() || idempotencyKey.length() > 100)
            throw new IllegalArgumentException("X-Idempotency-Key bắt buộc");
        operationRepository.lockKey(principal.getId() + ":" + idempotencyKey);

        Contract contract = contractRepository.findForUpdate(request.contractId())
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy hợp đồng: " + request.contractId()));

        User user = userRepository.findById(principal.getId())
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy người dùng"));

        validateManagerOnly(contract.getRoom().getBuilding().getId(), user);
        String requestHash = hashObject("DEPOSIT_RECEIPT:" + request);
        FinancialOperation op = checkOrStartOperation(idempotencyKey, requestHash, FinancialAction.DEPOSIT_RECEIPT, user);
        if ("SUCCESS".equals(op.getStatus())) return readSnapshot(op);


        if (contract.getDepositStatus() == DepositStatus.SETTLED) {
            throw new IllegalStateException("Hợp đồng đã quyết toán cọc (SETTLED), không thể ghi nhận thêm phiếu thu (BR-121)");
        }
        if (contract.getStatus() == ContractStatus.DRAFT) {
            throw new IllegalStateException("Hợp đồng còn ở trạng thái nháp (DRAFT), chưa kích hoạt");
        }
        vn.trohub.common.money.Money.requireWhole(request.amount());
        if (request.amount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Số tiền thu cọc phải lớn hơn 0");
        }



        DepositLedgerEntry entry = new DepositLedgerEntry(
                contract,
                DepositEntryType.RECEIPT,
                request.amount(),
                request.paymentMethod() != null ? request.paymentMethod() : PaymentMethod.BANK_TRANSFER,
                request.referenceCode(),
                request.note(),
                null,
                null,
                null,
                op,
                user
        );
        depositLedgerEntryRepository.save(entry);
        depositLedgerEntryRepository.flush();

        if (contract.getDepositStatus() == DepositStatus.NOT_RECEIVED) {
            contract.setDepositStatus(DepositStatus.HOLDING);
            contractRepository.save(contract);
        }

        if (op != null) {
            op.setStatus("SUCCESS");
            operationRepository.save(op);
        }

        return finish(op, buildStatusResponse(contract));
    }

    @Transactional
    public ContractDepositFinancialStatusResponse correctDepositReceipt(CorrectDepositReceiptRequest request,
                                                                        UserPrincipal principal,
                                                                        String idempotencyKey) {
        if (principal.isTenant()) throw new AccessDeniedException("Chỉ quản lý được ghi giao dịch cọc");
        if (idempotencyKey == null || idempotencyKey.isBlank() || idempotencyKey.length() > 100)
            throw new IllegalArgumentException("X-Idempotency-Key bắt buộc");
        operationRepository.lockKey(principal.getId() + ":" + idempotencyKey);

        DepositLedgerEntry refEntry = depositLedgerEntryRepository.findById(request.refEntryId())
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy bút toán cọc gốc: " + request.refEntryId()));

        Contract contract = contractRepository.findForUpdate(refEntry.getContract().getId()).orElseThrow();
        User user = userRepository.findById(principal.getId())
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy người dùng"));

        validateManagerOnly(contract.getRoom().getBuilding().getId(), user);
        String requestHash = hashObject("DEPOSIT_CORRECTION:" + request);
        FinancialOperation op = checkOrStartOperation(idempotencyKey, requestHash, FinancialAction.DEPOSIT_CORRECTION, user);
        if ("SUCCESS".equals(op.getStatus())) return readSnapshot(op);


        if (contract.getDepositStatus() == DepositStatus.SETTLED) {
            throw new IllegalStateException("Hợp đồng đã quyết toán cọc (SETTLED), không thể sửa bút toán (BR-121)");
        }
        if (refEntry.getEntryType() != DepositEntryType.RECEIPT) {
            throw new IllegalArgumentException("Chỉ được sửa sai phiếu nhận cọc gốc (RECEIPT)");
        }
        vn.trohub.common.money.Money.requireWhole(request.deltaAmount());
        if (request.deltaAmount().compareTo(BigDecimal.ZERO) == 0) {
            throw new IllegalArgumentException("Số tiền delta điều chỉnh phải khác 0");
        }

        BigDecimal corrected = depositLedgerEntryRepository.findByContractIdOrderByRecordedAtAsc(contract.getId()).stream()
                .filter(e -> e.getRefEntry() != null && e.getRefEntry().getId().equals(refEntry.getId()))
                .map(DepositLedgerEntry::getAmount).reduce(refEntry.getAmount(), BigDecimal::add);
        if (corrected.add(request.deltaAmount()).signum() < 0) throw new IllegalArgumentException("Phiếu thu sau đính chính không được âm");
        BigDecimal currentHeld = depositLedgerEntryRepository.sumAmountByContractId(contract.getId());
        BigDecimal newHeld = currentHeld.add(request.deltaAmount());
        if (newHeld.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Số tiền điều chỉnh làm số dư cọc đang giữ bị âm (sau điều chỉnh: " + newHeld + ")");
        }



        DepositLedgerEntry correctionEntry = new DepositLedgerEntry(
                contract,
                DepositEntryType.RECEIPT_CORRECTION,
                request.deltaAmount(),
                refEntry.getPaymentMethod(),
                refEntry.getReferenceCode(),
                null,
                request.reason(),
                refEntry,
                null,
                op,
                user
        );
        correctionEntry.setEffectiveDate(refEntry.getEffectiveDate());
        depositLedgerEntryRepository.save(correctionEntry);
        depositLedgerEntryRepository.flush();

        updateContractDepositStatusAfterBalanceChange(contract, newHeld);

        if (op != null) {
            op.setStatus("SUCCESS");
            operationRepository.save(op);
        }

        return finish(op, buildStatusResponse(contract));
    }

    @Transactional
    public ContractDepositFinancialStatusResponse refundDeposit(RefundDepositRequest request,
                                                                UserPrincipal principal,
                                                                String idempotencyKey) {
        if (principal.isTenant()) throw new AccessDeniedException("Chỉ quản lý được ghi giao dịch cọc");
        if (idempotencyKey == null || idempotencyKey.isBlank() || idempotencyKey.length() > 100)
            throw new IllegalArgumentException("X-Idempotency-Key bắt buộc");
        operationRepository.lockKey(principal.getId() + ":" + idempotencyKey);

        Contract contract = contractRepository.findForUpdate(request.contractId())
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy hợp đồng: " + request.contractId()));

        User user = userRepository.findById(principal.getId())
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy người dùng"));

        validateManagerOnly(contract.getRoom().getBuilding().getId(), user);
        String requestHash = hashObject("DEPOSIT_REFUND:" + request);
        FinancialOperation op = checkOrStartOperation(idempotencyKey, requestHash, FinancialAction.DEPOSIT_REFUND, user);
        if ("SUCCESS".equals(op.getStatus())) return readSnapshot(op);


        if (contract.getDepositStatus() == DepositStatus.SETTLED) {
            throw new IllegalStateException("Hợp đồng đã quyết toán cọc (SETTLED), không thể hoàn cọc (BR-121)");
        }
        vn.trohub.common.money.Money.requireWhole(request.amount());
        if (request.amount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Số tiền hoàn cọc phải lớn hơn 0");
        }

        BigDecimal currentHeld = depositLedgerEntryRepository.sumAmountByContractId(contract.getId());
        vn.trohub.common.money.Money.requireWhole(request.amount());
        if (request.amount().compareTo(currentHeld) > 0) {
            throw new IllegalArgumentException("Số tiền hoàn (" + request.amount() + ") vượt quá số dư cọc đang giữ (" + currentHeld + ")");
        }



        DepositLedgerEntry entry = new DepositLedgerEntry(
                contract,
                DepositEntryType.REFUND,
                request.amount().negate(),
                request.paymentMethod() != null ? request.paymentMethod() : PaymentMethod.BANK_TRANSFER,
                request.referenceCode(),
                null,
                request.reason(),
                null,
                null,
                op,
                user
        );
        depositLedgerEntryRepository.save(entry);
        depositLedgerEntryRepository.flush();

        BigDecimal newHeld = currentHeld.subtract(request.amount());
        updateContractDepositStatusAfterBalanceChange(contract, newHeld);

        if (op != null) {
            op.setStatus("SUCCESS");
            operationRepository.save(op);
        }

        return finish(op, buildStatusResponse(contract));
    }

    @Transactional
    public ContractDepositFinancialStatusResponse deductDeposit(DeductDepositRequest request,
                                                                UserPrincipal principal,
                                                                String idempotencyKey) {
        if (principal.isTenant()) throw new AccessDeniedException("Chỉ quản lý được ghi giao dịch cọc");
        if (idempotencyKey == null || idempotencyKey.isBlank() || idempotencyKey.length() > 100)
            throw new IllegalArgumentException("X-Idempotency-Key bắt buộc");
        operationRepository.lockKey(principal.getId() + ":" + idempotencyKey);

        Contract contract = contractRepository.findForUpdate(request.contractId())
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy hợp đồng: " + request.contractId()));

        User user = userRepository.findById(principal.getId())
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy người dùng"));

        validateManagerOnly(contract.getRoom().getBuilding().getId(), user);
        String requestHash = hashObject("DEPOSIT_DEDUCTION:" + request);
        FinancialOperation op = checkOrStartOperation(idempotencyKey, requestHash, FinancialAction.DEPOSIT_DEDUCTION, user);
        if ("SUCCESS".equals(op.getStatus())) return readSnapshot(op);


        if (contract.getDepositStatus() == DepositStatus.SETTLED) {
            throw new IllegalStateException("Hợp đồng đã quyết toán cọc (SETTLED), không thể khấu trừ (BR-121)");
        }
        vn.trohub.common.money.Money.requireWhole(request.amount());
        if (request.amount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Số tiền khấu trừ cọc phải lớn hơn 0");
        }

        BigDecimal currentHeld = depositLedgerEntryRepository.sumAmountByContractId(contract.getId());
        vn.trohub.common.money.Money.requireWhole(request.amount());
        if (request.amount().compareTo(currentHeld) > 0) {
            throw new IllegalArgumentException("Số tiền khấu trừ (" + request.amount() + ") vượt quá số dư cọc đang giữ (" + currentHeld + ")");
        }



        DepositLedgerEntry entry = new DepositLedgerEntry(
                contract,
                DepositEntryType.DEDUCTION,
                request.amount().negate(),
                null,
                null,
                request.expenseRef(),
                request.reason(),
                null,
                null,
                op,
                user
        );
        depositLedgerEntryRepository.save(entry);
        depositLedgerEntryRepository.flush();

        BigDecimal newHeld = currentHeld.subtract(request.amount());
        updateContractDepositStatusAfterBalanceChange(contract, newHeld);

        if (op != null) {
            op.setStatus("SUCCESS");
            operationRepository.save(op);
        }

        return finish(op, buildStatusResponse(contract));
    }

    @Transactional
    public ContractDepositFinancialStatusResponse offsetDepositToInvoice(OffsetDepositToInvoiceRequest request,
                                                                         UserPrincipal principal,
                                                                         String idempotencyKey) {
        if (principal.isTenant()) throw new AccessDeniedException("Chỉ quản lý được ghi giao dịch cọc");
        if (idempotencyKey == null || idempotencyKey.isBlank() || idempotencyKey.length() > 100)
            throw new IllegalArgumentException("X-Idempotency-Key bắt buộc");
        operationRepository.lockKey(principal.getId() + ":" + idempotencyKey);

        Contract contract = contractRepository.findForUpdate(request.contractId())
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy hợp đồng: " + request.contractId()));

        Invoice invoice = invoiceRepository.findForUpdate(request.invoiceId())
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy hóa đơn: " + request.invoiceId()));

        User user = userRepository.findById(principal.getId())
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy người dùng"));

        validateManagerOnly(contract.getRoom().getBuilding().getId(), user);
        String requestHash = hashObject("DEPOSIT_OFFSET:" + request);
        FinancialOperation op = checkOrStartOperation(idempotencyKey, requestHash, FinancialAction.DEPOSIT_OFFSET, user);
        if ("SUCCESS".equals(op.getStatus())) return readSnapshot(op);


        if (!invoice.getContract().getId().equals(contract.getId())) {
            throw new IllegalArgumentException("Chỉ được bù cọc cho hóa đơn thuộc chính hợp đồng đó (BR-115)");
        }
        if (invoice.getStatus() != InvoiceStatus.ISSUED) {
            throw new IllegalStateException("Chỉ được bù cọc cho hóa đơn đã phát hành (ISSUED)");
        }
        if (contract.getDepositStatus() == DepositStatus.SETTLED) {
            throw new IllegalStateException("Hợp đồng đã quyết toán cọc (SETTLED), không thể bù cọc");
        }
        vn.trohub.common.money.Money.requireWhole(request.amount());
        if (request.amount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Số tiền bù cọc phải lớn hơn 0");
        }

        BigDecimal currentHeld = depositLedgerEntryRepository.sumAmountByContractId(contract.getId());
        vn.trohub.common.money.Money.requireWhole(request.amount());
        if (request.amount().compareTo(currentHeld) > 0) {
            throw new IllegalArgumentException("Số tiền bù cọc (" + request.amount() + ") vượt quá số dư cọc đang giữ (" + currentHeld + ")");
        }

        BigDecimal effectiveDue = calculateEffectiveDue(invoice);
        BigDecimal netApplied = invoiceLedgerEntryRepository.sumAmountByInvoiceId(invoice.getId());
        BigDecimal invoiceDebt = effectiveDue.subtract(netApplied).max(BigDecimal.ZERO);

        vn.trohub.common.money.Money.requireWhole(request.amount());
        if (request.amount().compareTo(invoiceDebt) > 0) {
            throw new IllegalArgumentException("Số tiền bù cọc (" + request.amount() + ") vượt quá số nợ của hóa đơn (" + invoiceDebt + ")");
        }



        DepositLedgerEntry depositEntry = new DepositLedgerEntry(
                contract,
                DepositEntryType.OFFSET_OUT,
                request.amount().negate(),
                null,
                null,
                "Bù trừ vào hóa đơn kỳ " + invoice.getBillingMonth() + (request.note() != null ? " - " + request.note() : ""),
                "Bù cọc thanh toán nợ hóa đơn (BR-114)",
                null,
                invoice,
                op,
                user
        );
        depositLedgerEntryRepository.save(depositEntry);

        InvoiceLedgerEntry invoiceEntry = new InvoiceLedgerEntry(
                invoice,
                contract,
                LedgerEntryType.DEPOSIT_OFFSET,
                request.amount(),
                PaymentMethod.INTERNAL_TRANSFER,
                "DEP-OFFSET-" + contract.getId().toString().substring(0, 8),
                "Bù trừ từ tiền cọc hợp đồng" + (request.note() != null ? " - " + request.note() : ""),
                null,
                op,
                user
        );
        invoiceLedgerEntryRepository.save(invoiceEntry);

        BigDecimal newHeld = currentHeld.subtract(request.amount());
        updateContractDepositStatusAfterBalanceChange(contract, newHeld);

        if (op != null) {
            op.setStatus("SUCCESS");
            operationRepository.save(op);
        }

        return finish(op, buildStatusResponse(contract));
    }

    @Transactional
    public ContractDepositFinancialStatusResponse settleDeposit(SettleDepositRequest request,
                                                                UserPrincipal principal,
                                                                String idempotencyKey) {
        if (principal.isTenant()) throw new AccessDeniedException("Chỉ quản lý được ghi giao dịch cọc");
        if (idempotencyKey == null || idempotencyKey.isBlank() || idempotencyKey.length() > 100)
            throw new IllegalArgumentException("X-Idempotency-Key bắt buộc");
        operationRepository.lockKey(principal.getId() + ":" + idempotencyKey);

        Contract contract = contractRepository.findForUpdate(request.contractId())
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy hợp đồng: " + request.contractId()));

        User user = userRepository.findById(principal.getId())
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy người dùng"));

        validateManagerOnly(contract.getRoom().getBuilding().getId(), user);
        String requestHash = hashObject("DEPOSIT_SETTLE:" + request);
        FinancialOperation op = checkOrStartOperation(idempotencyKey, requestHash, FinancialAction.DEPOSIT_SETTLE, user);
        if ("SUCCESS".equals(op.getStatus())) return readSnapshot(op);


        if (contract.getStatus() != ContractStatus.ENDED) {
            throw new IllegalStateException("Chỉ được xác nhận quyết toán cọc khi hợp đồng đã kết thúc (ENDED) (BR-120)");
        }

        BigDecimal currentHeld = depositLedgerEntryRepository.sumAmountByContractId(contract.getId());
        if (currentHeld.compareTo(BigDecimal.ZERO) != 0) {
            throw new IllegalStateException("Chỉ được xác nhận quyết toán cọc khi số dư cọc đang giữ bằng 0 (hiện tại còn: " + currentHeld + ") (BR-120)");
        }



        contract.setDepositStatus(DepositStatus.SETTLED);
        contract.setDepositSettledAt(clock.instant());
        contractRepository.save(contract);

        if (op != null) {
            op.setStatus("SUCCESS");
            operationRepository.save(op);
        }

        return finish(op, buildStatusResponse(contract));
    }

    private void updateContractDepositStatusAfterBalanceChange(Contract contract, BigDecimal newHeld) {
        if (contract.getDepositStatus() == DepositStatus.SETTLED) {
            return;
        }
        if (contract.getStatus() == ContractStatus.ENDED) {
            contract.setDepositStatus(DepositStatus.SETTLING);
        } else {
            if (newHeld.compareTo(BigDecimal.ZERO) > 0) {
                contract.setDepositStatus(DepositStatus.HOLDING);
            } else if (contract.getDepositStatus() == DepositStatus.HOLDING) {
                contract.setDepositStatus(DepositStatus.NOT_RECEIVED);
            }
        }
        contractRepository.save(contract);
    }

    private ContractDepositFinancialStatusResponse buildStatusResponse(Contract contract) {
        BigDecimal depositRequired = contract.getDepositRequired() != null ? contract.getDepositRequired() : BigDecimal.ZERO;
        BigDecimal depositHeld = depositLedgerEntryRepository.sumAmountByContractId(contract.getId());
        BigDecimal totalReceipt = depositLedgerEntryRepository.sumTotalReceiptByContractId(contract.getId());
        BigDecimal totalRefund = depositLedgerEntryRepository.sumTotalRefundByContractId(contract.getId());
        BigDecimal totalDeduction = depositLedgerEntryRepository.sumTotalDeductionByContractId(contract.getId());
        BigDecimal totalOffset = depositLedgerEntryRepository.sumTotalOffsetByContractId(contract.getId());

        depositHeld = depositHeld != null ? depositHeld : BigDecimal.ZERO;
        totalReceipt = totalReceipt != null ? totalReceipt : BigDecimal.ZERO;
        totalRefund = totalRefund != null ? totalRefund : BigDecimal.ZERO;
        totalDeduction = totalDeduction != null ? totalDeduction : BigDecimal.ZERO;
        totalOffset = totalOffset != null ? totalOffset : BigDecimal.ZERO;

        List<DepositLedgerEntry> entries = depositLedgerEntryRepository.findByContractIdOrderByRecordedAtAsc(contract.getId());
        List<DepositLedgerEntryResponse> entryResponses = entries.stream()
                .map(e -> new DepositLedgerEntryResponse(
                        e.getId(),
                        contract.getId(),
                        e.getEntryType(),
                        e.getAmount().toPlainString(),
                        e.getPaymentMethod(),
                        e.getReferenceCode(),
                        e.getNote(),
                        e.getReason(),
                        e.getRefEntry() != null ? e.getRefEntry().getId() : null,
                        e.getInvoice() != null ? e.getInvoice().getId() : null,
                        e.getActor() != null ? e.getActor().getId() : null,
                        e.getActor() != null ? e.getActor().getLogin() : null,
                        e.getRecordedAt()
                ))
                .toList();

        return new ContractDepositFinancialStatusResponse(
                contract.getId(),
                contract.getRoom() != null ? contract.getRoom().getRoomNumber() : "",
                contract.getRoom() != null && contract.getRoom().getFloor() != null && contract.getRoom().getBuilding() != null
                        ? contract.getRoom().getBuilding().getName() : "",
                contract.getRepresentativeTenant() != null ? contract.getRepresentativeTenant().getFullName() : "",
                depositRequired.toPlainString(),
                depositHeld.toPlainString(),
                totalReceipt.toPlainString(),
                totalRefund.toPlainString(),
                totalDeduction.toPlainString(),
                totalOffset.toPlainString(),
                contract.getDepositStatus(),
                contract.getDepositSettledAt(),
                entryResponses
        );
    }

    private BigDecimal calculateEffectiveDue(Invoice invoice) {
        BigDecimal originalTotal = invoice.getOriginalTotal();
        BigDecimal adjustmentsTotal = adjustmentRepository.sumDeltaAmountByInvoiceId(invoice.getId());
        return originalTotal.add(adjustmentsTotal).max(BigDecimal.ZERO);
    }

    private void validateManagerOnly(UUID buildingId, User user) {
        if (user.getRole() == UserRole.OWNER) {
            return;
        }
        if (user.getRole() == UserRole.STAFF) {
            boolean assigned = staffAssignmentRepository.existsByUserIdAndBuildingId(user.getId(), buildingId);
            if (!assigned) {
                throw new AccessDeniedException("Nhân viên không được phân công quản lý tòa nhà này");
            }
            return;
        }
        throw new AccessDeniedException("Chỉ chủ nhà hoặc nhân viên quản lý mới có quyền thao tác tiền cọc");
    }

    private void validateViewAccess(Contract contract, User user) {
        if (user.getRole() == UserRole.OWNER) {
            return;
        }
        if (user.getRole() == UserRole.STAFF) {
            validateManagerOnly(contract.getRoom().getBuilding().getId(), user);
            return;
        }
        // Tenant
        boolean isRep = contract.getRepresentativeTenant() != null &&
                contract.getRepresentativeTenant().getUser() != null &&
                contract.getRepresentativeTenant().getUser().getId().equals(user.getId());
        boolean isMember = contractMemberRepository.findByContractIdOrderByJoinedOnAsc(contract.getId()).stream()
                .anyMatch(m -> m.getTenant() != null && m.getTenant().getUser() != null && m.getTenant().getUser().getId().equals(user.getId()));
        if (!isRep) {
            throw new AccessDeniedException("Người thuê không có quyền xem thông tin tiền cọc hợp đồng này");
        }
    }

    private FinancialOperation checkOrStartOperation(String key, String hash, FinancialAction action, User actor) {
        if (key == null || key.isBlank()) return null;
        Optional<FinancialOperation> existing = operationRepository.findByActorIdAndIdempotencyKey(actor.getId(), key);
        if (existing.isPresent()) {
            FinancialOperation op = existing.get();
            if (!op.getRequestHash().equals(hash)) {
                throw new vn.trohub.common.api.ConflictException("Idempotency-Key xung đột với dữ liệu yêu cầu khác trước đó");
            }
            log.info("Deposit Idempotency match for key={}", key);
            return op;
        }
        FinancialOperation op = new FinancialOperation(key, actor, action, hash, "PENDING", "{}");
        return operationRepository.save(op);
    }

    private ContractDepositFinancialStatusResponse readSnapshot(FinancialOperation op) {
        try { return objectMapper.readValue(op.getResponseSnapshot(), ContractDepositFinancialStatusResponse.class); }
        catch (Exception ex) { throw new IllegalStateException("Không đọc được kết quả giao dịch cọc", ex); }
    }
    private ContractDepositFinancialStatusResponse finish(FinancialOperation op, ContractDepositFinancialStatusResponse result) {
        try { op.setResponseSnapshot(objectMapper.writeValueAsString(result)); }
        catch (Exception ex) { throw new IllegalStateException("Không lưu được kết quả giao dịch cọc", ex); }
        op.setStatus("SUCCESS"); operationRepository.save(op); return result;
    }

    private String hashObject(Object obj) {
        try {
            String json = objectMapper.writeValueAsString(obj);
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(json.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            return Integer.toHexString(Objects.hashCode(obj));
        }
    }
}
