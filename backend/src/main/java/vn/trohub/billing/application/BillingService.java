package vn.trohub.billing.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.trohub.billing.api.dto.BillingDtos.*;
import vn.trohub.billing.domain.*;
import vn.trohub.billing.infrastructure.*;
import vn.trohub.common.security.UserPrincipal;
import vn.trohub.metering.domain.ConsumptionAlert;
import vn.trohub.metering.domain.EvaluationStatus;
import vn.trohub.metering.infrastructure.ConsumptionAlertRepository;
import vn.trohub.pricing.domain.*;
import vn.trohub.pricing.infrastructure.*;
import vn.trohub.tenancy.domain.*;
import vn.trohub.tenancy.infrastructure.*;
import vn.trohub.user.domain.User;
import vn.trohub.user.infrastructure.BuildingStaffAssignmentRepository;
import vn.trohub.user.infrastructure.UserRepository;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
public class BillingService {

    private final InvoiceRepository invoiceRepository;
    private final InvoiceItemRepository invoiceItemRepository;
    private final InvoiceAdjustmentRepository invoiceAdjustmentRepository;
    private final InvoiceNoteRepository invoiceNoteRepository;
    private final FinancialOperationRepository financialOperationRepository;
    private final ContractRepository contractRepository;
    private final ContractMemberRepository contractMemberRepository;
    private final RoomMeterRepository roomMeterRepository;
    private final MeterReadingRepository meterReadingRepository;
    private final ConsumptionAlertRepository consumptionAlertRepository;
    private final TariffRepository tariffRepository;
    private final ContractServiceSubscriptionRepository subscriptionRepository;
    private final BuildingBillingSettingsRepository settingsRepository;
    private final OneOffChargeRepository oneOffChargeRepository;
    private final BuildingStaffAssignmentRepository staffAssignmentRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    public BillingService(
            InvoiceRepository invoiceRepository,
            InvoiceItemRepository invoiceItemRepository,
            InvoiceAdjustmentRepository invoiceAdjustmentRepository,
            InvoiceNoteRepository invoiceNoteRepository,
            FinancialOperationRepository financialOperationRepository,
            ContractRepository contractRepository,
            ContractMemberRepository contractMemberRepository,
            RoomMeterRepository roomMeterRepository,
            MeterReadingRepository meterReadingRepository,
            ConsumptionAlertRepository consumptionAlertRepository,
            TariffRepository tariffRepository,
            ContractServiceSubscriptionRepository subscriptionRepository,
            BuildingBillingSettingsRepository settingsRepository,
            OneOffChargeRepository oneOffChargeRepository,
            BuildingStaffAssignmentRepository staffAssignmentRepository,
            UserRepository userRepository,
            ObjectMapper objectMapper) {
        this.invoiceRepository = invoiceRepository;
        this.invoiceItemRepository = invoiceItemRepository;
        this.invoiceAdjustmentRepository = invoiceAdjustmentRepository;
        this.invoiceNoteRepository = invoiceNoteRepository;
        this.financialOperationRepository = financialOperationRepository;
        this.contractRepository = contractRepository;
        this.contractMemberRepository = contractMemberRepository;
        this.roomMeterRepository = roomMeterRepository;
        this.meterReadingRepository = meterReadingRepository;
        this.consumptionAlertRepository = consumptionAlertRepository;
        this.tariffRepository = tariffRepository;
        this.subscriptionRepository = subscriptionRepository;
        this.settingsRepository = settingsRepository;
        this.oneOffChargeRepository = oneOffChargeRepository;
        this.staffAssignmentRepository = staffAssignmentRepository;
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public InvoiceDetailResponse previewInvoice(UUID contractId, String billingMonth, UserPrincipal user) {
        Contract contract = getAuthorizedContract(contractId, user);
        InvoiceCalculationResult calc = calculateInvoice(contract, billingMonth, false);

        Invoice previewInvoice = new Invoice(
                contract,
                billingMonth,
                InvoiceStatus.DRAFT,
                calc.periodStart(),
                calc.periodEndExclusive(),
                calc.dueDate()
        );

        List<InvoiceItemResponse> itemResponses = calc.items().stream()
                .map(it -> new InvoiceItemResponse(
                        null,
                        it.type(),
                        it.label(),
                        it.quantity(),
                        it.unitPrice(),
                        it.amount(),
                        it.calculationSnapshot(),
                        it.readingRefs(),
                        it.tariffRef()
                ))
                .toList();

        BigDecimal originalTotal = calc.items().stream()
                .map(CalculationItem::amount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        PaymentStatus pStatus = originalTotal.compareTo(BigDecimal.ZERO) == 0 ? PaymentStatus.PAID : PaymentStatus.UNPAID;

        return new InvoiceDetailResponse(
                null,
                contract.getId(),
                contract.getRoom().getRoomNumber(),
                contract.getRoom().getFloor().getBuilding().getName(),
                contract.getRepresentativeTenant().getFullName(),
                billingMonth,
                InvoiceStatus.DRAFT,
                calc.periodStart(),
                calc.periodEndExclusive(),
                calc.dueDate(),
                null,
                originalTotal,
                BigDecimal.ZERO,
                originalTotal,
                BigDecimal.ZERO,
                originalTotal,
                BigDecimal.ZERO,
                pStatus,
                itemResponses,
                List.of(),
                List.of()
        );
    }

    @Transactional
    public InvoiceDetailResponse createOrRecalculateDraftInvoice(UUID contractId, String billingMonth, UserPrincipal user) {
        Contract contract = getAuthorizedContract(contractId, user);
        InvoiceCalculationResult calc = calculateInvoice(contract, billingMonth, false);

        Invoice invoice = invoiceRepository.findByContractIdAndBillingMonth(contractId, billingMonth)
                .orElse(null);

        if (invoice != null) {
            if (invoice.getStatus() == InvoiceStatus.ISSUED) {
                throw new IllegalStateException("Hóa đơn cho kỳ " + billingMonth + " đã được phát hành chính thức, không thể sửa nháp (BR-079)");
            }
            invoice.setPeriodStart(calc.periodStart());
            invoice.setPeriodEndExclusive(calc.periodEndExclusive());
            invoice.setDueDate(calc.dueDate());
            invoice.clearItems();
        } else {
            invoice = new Invoice(
                    contract,
                    billingMonth,
                    InvoiceStatus.DRAFT,
                    calc.periodStart(),
                    calc.periodEndExclusive(),
                    calc.dueDate()
            );
        }

        invoice = invoiceRepository.save(invoice);

        for (CalculationItem item : calc.items()) {
            InvoiceItem invItem = new InvoiceItem(
                    invoice,
                    item.type(),
                    item.label(),
                    item.quantity(),
                    item.unitPrice(),
                    item.amount(),
                    item.calculationSnapshot(),
                    item.readingRefs(),
                    item.tariffRef()
            );
            invoice.addItem(invItem);
        }

        invoice = invoiceRepository.save(invoice);
        return mapToDetailResponse(invoice);
    }

    @Transactional
    public InvoiceDetailResponse issueInvoice(UUID invoiceId, String idempotencyKey, UserPrincipal user) {
        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy hóa đơn: " + invoiceId));

        validateManagerScope(invoice.getContract().getRoom().getFloor().getBuilding().getId(), user);

        if (invoice.getStatus() == InvoiceStatus.ISSUED) {
            return mapToDetailResponse(invoice);
        }

        // Kiểm tra Idempotency
        String requestHash = computeHash("INVOICE_ISSUE:" + invoiceId);
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            Optional<FinancialOperation> existingOp = financialOperationRepository.findByIdempotencyKey(idempotencyKey);
            if (existingOp.isPresent()) {
                FinancialOperation op = existingOp.get();
                if (!op.getRequestHash().equals(requestHash)) {
                    throw new IllegalStateException("Idempotency-Key đã được sử dụng với yêu cầu khác (BR-103)");
                }
                try {
                    return objectMapper.readValue(op.getResponseSnapshot(), InvoiceDetailResponse.class);
                } catch (Exception e) {
                    return mapToDetailResponse(invoice);
                }
            }
        }

        // Tính toán kiểm tra chặt chẽ trước khi phát hành (closed interval, đầy đủ chỉ số, cảnh báo đã xác nhận)
        InvoiceCalculationResult calc = calculateInvoice(invoice.getContract(), invoice.getBillingMonth(), true);

        invoice.setPeriodStart(calc.periodStart());
        invoice.setPeriodEndExclusive(calc.periodEndExclusive());
        invoice.setDueDate(calc.dueDate());
        invoice.setStatus(InvoiceStatus.ISSUED);
        invoice.setIssuedAt(Instant.now());
        invoice.clearItems();

        for (CalculationItem item : calc.items()) {
            InvoiceItem invItem = new InvoiceItem(
                    invoice,
                    item.type(),
                    item.label(),
                    item.quantity(),
                    item.unitPrice(),
                    item.amount(),
                    item.calculationSnapshot(),
                    item.readingRefs(),
                    item.tariffRef()
            );
            invoice.addItem(invItem);
        }

        invoice = invoiceRepository.save(invoice);
        InvoiceDetailResponse response = mapToDetailResponse(invoice);

        // Lưu FinancialOperation
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            User actor = userRepository.findById(user.getId())
                    .orElseThrow(() -> new NoSuchElementException("Không tìm thấy người dùng"));
            try {
                String responseSnapshot = objectMapper.writeValueAsString(response);
                FinancialOperation op = new FinancialOperation(
                        idempotencyKey,
                        actor,
                        FinancialAction.INVOICE_ISSUE,
                        requestHash,
                        "SUCCESS",
                        responseSnapshot
                );
                financialOperationRepository.save(op);
            } catch (Exception ignored) {}
        }

        return response;
    }

    @Transactional
    public InvoiceDetailResponse adjustInvoice(UUID invoiceId, BigDecimal deltaAmount, String reason, LocalDate effectiveDate, String idempotencyKey, UserPrincipal user) {
        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy hóa đơn: " + invoiceId));

        validateManagerScope(invoice.getContract().getRoom().getFloor().getBuilding().getId(), user);

        if (invoice.getStatus() != InvoiceStatus.ISSUED) {
            throw new IllegalStateException("Chỉ hóa đơn đã phát hành (ISSUED) mới có thể điều chỉnh (BR-080)");
        }

        if (deltaAmount == null || deltaAmount.compareTo(BigDecimal.ZERO) == 0) {
            throw new IllegalArgumentException("Số tiền điều chỉnh phải khác 0 (BR-081)");
        }

        // Kiểm tra Idempotency
        String requestHash = computeHash("INVOICE_ADJUST:" + invoiceId + ":" + deltaAmount + ":" + effectiveDate);
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            Optional<FinancialOperation> existingOp = financialOperationRepository.findByIdempotencyKey(idempotencyKey);
            if (existingOp.isPresent()) {
                FinancialOperation op = existingOp.get();
                if (!op.getRequestHash().equals(requestHash)) {
                    throw new IllegalStateException("Idempotency-Key đã được sử dụng với yêu cầu khác (BR-103)");
                }
                try {
                    return objectMapper.readValue(op.getResponseSnapshot(), InvoiceDetailResponse.class);
                } catch (Exception e) {
                    return mapToDetailResponse(invoice);
                }
            }
        }

        BigDecimal originalTotal = invoice.getItems().stream()
                .map(InvoiceItem::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal currentAdjustments = invoice.getAdjustments().stream()
                .map(InvoiceAdjustment::getDeltaAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal newEffectiveDue = originalTotal.add(currentAdjustments).add(deltaAmount);
        if (newEffectiveDue.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Tổng tiền phải trả sau điều chỉnh không được âm (effectiveDue = " + newEffectiveDue + ") (BR-081, EX-12)");
        }

        User actor = userRepository.findById(user.getId())
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy người dùng"));

        FinancialOperation op = null;
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            op = new FinancialOperation(
                    idempotencyKey,
                    actor,
                    FinancialAction.INVOICE_ADJUST,
                    requestHash,
                    "SUCCESS",
                    ""
            );
            op = financialOperationRepository.save(op);
        } else {
            op = new FinancialOperation(
                    UUID.randomUUID().toString(),
                    actor,
                    FinancialAction.INVOICE_ADJUST,
                    requestHash,
                    "SUCCESS",
                    ""
            );
            op = financialOperationRepository.save(op);
        }

        String oldSnapshot = "{\"effectiveDue\":\"" + originalTotal.add(currentAdjustments) + "\"}";
        String newSnapshot = "{\"effectiveDue\":\"" + newEffectiveDue + "\",\"delta\":\"" + deltaAmount + "\"}";

        InvoiceAdjustment adjustment = new InvoiceAdjustment(
                invoice,
                deltaAmount,
                reason,
                oldSnapshot,
                newSnapshot,
                effectiveDate,
                actor,
                op
        );
        invoice.addAdjustment(adjustment);
        invoice = invoiceRepository.save(invoice);

        InvoiceDetailResponse response = mapToDetailResponse(invoice);

        try {
            op.setResponseSnapshot(objectMapper.writeValueAsString(response));
            financialOperationRepository.save(op);
        } catch (Exception ignored) {}

        return response;
    }

    @Transactional
    public void addInvoiceNote(UUID invoiceId, String content, String reason, UserPrincipal user) {
        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy hóa đơn: " + invoiceId));

        validateManagerScope(invoice.getContract().getRoom().getFloor().getBuilding().getId(), user);

        User actor = userRepository.findById(user.getId())
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy người dùng"));

        InvoiceNote note = new InvoiceNote(invoice, content, reason, actor);
        invoice.addNote(note);
        invoiceRepository.save(invoice);
    }

    @Transactional(readOnly = true)
    public InvoiceDetailResponse getInvoice(UUID invoiceId, UserPrincipal user) {
        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy hóa đơn: " + invoiceId));

        if (user.isTenant()) {
            if (invoice.getStatus() != InvoiceStatus.ISSUED) {
                throw new NoSuchElementException("Không tìm thấy hóa đơn: " + invoiceId);
            }
            // Kiểm tra tenant thuộc hợp đồng
            validateTenantContractAccess(invoice.getContract(), user);
        } else if (user.isStaff()) {
            validateManagerScope(invoice.getContract().getRoom().getFloor().getBuilding().getId(), user);
        }

        return mapToDetailResponse(invoice);
    }

    @Transactional(readOnly = true)
    public Page<InvoiceSummaryResponse> listInvoices(UUID contractId, UUID buildingId, String billingMonth, InvoiceStatus status, Pageable pageable, UserPrincipal user) {
        if (user.isTenant()) {
            // Tenant chỉ xem hợp đồng của mình và chỉ trạng thái ISSUED
            List<Contract> tenantContracts = contractRepository.findByRepresentativeTenantUserId(user.getId());
            List<UUID> contractIds = tenantContracts.stream().map(Contract::getId).toList();
            if (contractIds.isEmpty()) {
                return Page.empty(pageable);
            }
            Page<Invoice> invoices = invoiceRepository.searchInvoicesByContracts(contractIds, buildingId, billingMonth, InvoiceStatus.ISSUED, pageable);
            return invoices.map(this::mapToSummaryResponse);
        }

        if (user.isStaff()) {
            List<UUID> assignedBuildingIds = staffAssignmentRepository.findByUserId(user.getId()).stream()
                    .map(a -> a.getBuilding().getId())
                    .toList();
            if (assignedBuildingIds.isEmpty()) {
                return Page.empty(pageable);
            }
            if (buildingId != null && !assignedBuildingIds.contains(buildingId)) {
                return Page.empty(pageable);
            }
            // Nếu không chọn buildingId, lọc trong các tòa được giao
            Page<Invoice> invoices = invoiceRepository.searchInvoices(contractId, buildingId, billingMonth, status, pageable);
            List<InvoiceSummaryResponse> filtered = invoices.getContent().stream()
                    .filter(i -> assignedBuildingIds.contains(i.getContract().getRoom().getFloor().getBuilding().getId()))
                    .map(this::mapToSummaryResponse)
                    .toList();
            return new PageImpl<>(filtered, pageable, filtered.size());
        }

        Page<Invoice> invoices = invoiceRepository.searchInvoices(contractId, buildingId, billingMonth, status, pageable);
        return invoices.map(this::mapToSummaryResponse);
    }

    // ==========================================
    // Core Calculation Engine
    // ==========================================
    private InvoiceCalculationResult calculateInvoice(Contract contract, String billingMonth, boolean isIssuing) {
        YearMonth ym = YearMonth.parse(billingMonth);
        LocalDate monthStart = ym.atDay(1);
        LocalDate monthEndExclusive = ym.plusMonths(1).atDay(1);
        int totalDaysInMonth = ym.lengthOfMonth();

        LocalDate contractStart = contract.getActualStartDate();
        LocalDate periodStart = contractStart.isAfter(monthStart) ? contractStart : monthStart;

        LocalDate contractEnd = contract.getActualCheckoutDate() != null ? contract.getActualCheckoutDate() :
                (contract.getStatus() == ContractStatus.ENDED ? contract.getPlannedEndExclusive() : monthEndExclusive);
        LocalDate periodEndExclusive = contractEnd.isBefore(monthEndExclusive) ? contractEnd : monthEndExclusive;

        long activeDays = Math.max(0, ChronoUnit.DAYS.between(periodStart, periodEndExclusive));

        List<CalculationItem> items = new ArrayList<>();

        // 1. Tiền phòng (RENT)
        BigDecimal rentAmount = contract.getRent()
                .multiply(BigDecimal.valueOf(activeDays))
                .divide(BigDecimal.valueOf(totalDaysInMonth), 0, RoundingMode.HALF_UP);

        String rentCalc = String.format("{\"baseRent\":\"%s\",\"activeDays\":%d,\"totalDaysInMonth\":%d,\"formula\":\"rent * activeDays / totalDaysInMonth\"}",
                contract.getRent(), activeDays, totalDaysInMonth);

        items.add(new CalculationItem(
                InvoiceItemType.RENT,
                "Tiền thuê phòng " + contract.getRoom().getRoomNumber() + " kỳ " + billingMonth + " (" + activeDays + "/" + totalDaysInMonth + " ngày)",
                BigDecimal.valueOf(activeDays),
                contract.getRent(),
                rentAmount,
                rentCalc,
                null,
                null
        ));

        // 2. Điện và Nước (METERED)
        UUID buildingId = contract.getRoom().getFloor().getBuilding().getId();
        List<RoomMeter> meters = roomMeterRepository.findByRoomId(contract.getRoom().getId());

        for (RoomMeter meter : meters) {
            List<MeterReading> readings = meterReadingRepository.findByMeterIdOrderByReadingDateDesc(meter.getId())
                    .stream()
                    .sorted(Comparator.comparing(MeterReading::getReadingDate))
                    .toList();

            // Tìm chỉ số đầu kỳ
            MeterReading startReading = readings.stream()
                    .filter(r -> !r.getReadingDate().isAfter(periodStart))
                    .reduce((first, second) -> second)
                    .orElse(null);

            // Tìm chỉ số cuối kỳ
            MeterReading endReading = readings.stream()
                    .filter(r -> !r.getReadingDate().isBefore(periodEndExclusive.minusDays(1)))
                    .findFirst()
                    .orElse(null);

            if (isIssuing) {
                if (startReading == null || endReading == null) {
                    throw new IllegalStateException("Thiếu chỉ số công tơ " + meter.getType() + " cho kỳ tính tiền (BR-058, BR-063)");
                }
                if (endReading.getValue().compareTo(startReading.getValue()) < 0) {
                    throw new IllegalArgumentException("INVALID_METER_READING: Chỉ số cuối nhỏ hơn chỉ số đầu ("
                            + endReading.getValue() + " < " + startReading.getValue() + ") (BR-059, EX-07)");
                }

                // Kiểm tra cảnh báo tiêu thụ chưa giải trình
                List<ConsumptionAlert> alerts = consumptionAlertRepository.findByContractId(contract.getId());
                boolean hasUnacknowledgedWarning = alerts.stream().anyMatch(a ->
                        a.getBillingMonth().equals(billingMonth) &&
                        a.getMeterType() == meter.getType() &&
                        a.getEvaluationStatus() == EvaluationStatus.WARNING &&
                        a.getAcknowledgedAt() == null
                );
                if (hasUnacknowledgedWarning) {
                    throw new IllegalStateException("Cảnh báo tiêu thụ bất thường của công tơ " + meter.getType() + " chưa được giải trình xác nhận (BR-145)");
                }
            }

            BigDecimal startVal = startReading != null ? startReading.getValue() : BigDecimal.ZERO;
            BigDecimal endVal = endReading != null ? endReading.getValue() : startVal;
            BigDecimal usage = endVal.subtract(startVal);
            if (usage.compareTo(BigDecimal.ZERO) < 0) {
                usage = BigDecimal.ZERO;
            }

            Tariff tariff = findApplicableTariff(buildingId, meter.getType(), billingMonth);
            BigDecimal unitPrice = tariff != null ? tariff.getUnitPrice() : BigDecimal.ZERO;
            BigDecimal meterAmount = usage.multiply(unitPrice).setScale(0, RoundingMode.HALF_UP);

            String readingRefs = String.format("{\"startReading\":%s,\"endReading\":%s,\"startReadingId\":\"%s\",\"endReadingId\":\"%s\"}",
                    startVal, endVal,
                    startReading != null ? startReading.getId() : "",
                    endReading != null ? endReading.getId() : "");

            String meterCalc = String.format("{\"usage\":%s,\"unitPrice\":\"%s\",\"formula\":\"usage * unitPrice\"}",
                    usage, unitPrice);

            InvoiceItemType itemType = meter.getType() == MeterType.ELECTRICITY ? InvoiceItemType.ELECTRICITY : InvoiceItemType.WATER;
            String meterLabel = (meter.getType() == MeterType.ELECTRICITY ? "Tiền điện (" : "Tiền nước (")
                    + startVal + " -> " + endVal + " " + (meter.getType() == MeterType.ELECTRICITY ? "kWh)" : "m³)");

            items.add(new CalculationItem(
                    itemType,
                    meterLabel,
                    usage,
                    unitPrice,
                    meterAmount,
                    meterCalc,
                    readingRefs,
                    tariff != null ? tariff.getId() : null
            ));
        }

        // 3. Dịch vụ hợp đồng đăng ký (Services Subscriptions)
        List<ContractServiceSubscription> subscriptions = subscriptionRepository.findByContractId(contract.getId());
        List<ContractMember> members = contractMemberRepository.findByContractIdOrderByJoinedOnAsc(contract.getId());

        for (ContractServiceSubscription sub : subscriptions) {
            if (sub.getStartMonth().compareTo(billingMonth) > 0) continue;
            if (sub.getEndMonthExclusive() != null && sub.getEndMonthExclusive().compareTo(billingMonth) <= 0) continue;

            ServiceDefinition sDef = sub.getService();
            Tariff tariff = findApplicableTariffByServiceId(buildingId, sDef.getId(), billingMonth);
            BigDecimal unitPrice = tariff != null ? tariff.getUnitPrice() : BigDecimal.ZERO;

            if (sDef.getCalculationType() == ServiceCalculationType.ROOM_MONTHLY) {
                // BR-069, EX-04: Phân bổ theo ngày ở trong tháng
                BigDecimal serviceAmount = unitPrice.multiply(BigDecimal.valueOf(activeDays))
                        .divide(BigDecimal.valueOf(totalDaysInMonth), 0, RoundingMode.HALF_UP);
                String calcJson = String.format("{\"rate\":\"%s\",\"activeDays\":%d,\"totalDays\":%d,\"formula\":\"rate * activeDays / totalDays\"}",
                        unitPrice, activeDays, totalDaysInMonth);
                items.add(new CalculationItem(
                        InvoiceItemType.SERVICE,
                        sDef.getName() + " (" + activeDays + "/" + totalDaysInMonth + " ngày)",
                        BigDecimal.valueOf(activeDays),
                        unitPrice,
                        serviceAmount,
                        calcJson,
                        null,
                        tariff != null ? tariff.getId() : null
                ));
            } else if (sDef.getCalculationType() == ServiceCalculationType.PERSON_MONTHLY) {
                // BR-070, BR-071, EX-05: Phân bổ theo số ngày cư trú của từng thành viên
                long totalPersonDays = 0;
                for (ContractMember m : members) {
                    LocalDate mStart = m.getJoinedOn().isAfter(periodStart) ? m.getJoinedOn() : periodStart;
                    LocalDate mEnd = (m.getLeftOn() != null && m.getLeftOn().isBefore(periodEndExclusive)) ? m.getLeftOn() : periodEndExclusive;
                    long mDays = Math.max(0, ChronoUnit.DAYS.between(mStart, mEnd));
                    totalPersonDays += mDays;
                }
                BigDecimal serviceAmount = unitPrice.multiply(BigDecimal.valueOf(totalPersonDays))
                        .divide(BigDecimal.valueOf(totalDaysInMonth), 0, RoundingMode.HALF_UP);
                String calcJson = String.format("{\"rate\":\"%s\",\"personDays\":%d,\"totalDays\":%d,\"formula\":\"rate * personDays / totalDays\"}",
                        unitPrice, totalPersonDays, totalDaysInMonth);
                items.add(new CalculationItem(
                        InvoiceItemType.SERVICE,
                        sDef.getName() + " (" + totalPersonDays + " người-ngày)",
                        BigDecimal.valueOf(totalPersonDays),
                        unitPrice,
                        serviceAmount,
                        calcJson,
                        null,
                        tariff != null ? tariff.getId() : null
                ));
            } else {
                // Fixed or one-off
                items.add(new CalculationItem(
                        InvoiceItemType.SERVICE,
                        sDef.getName(),
                        BigDecimal.ONE,
                        unitPrice,
                        unitPrice,
                        "{\"fixed\":true}",
                        null,
                        tariff != null ? tariff.getId() : null
                ));
            }
        }

        // 4. Khoản thu phát sinh một lần (One-off charges)
        List<OneOffCharge> oneOffs = oneOffChargeRepository.findByContractIdAndBillingMonth(contract.getId(), billingMonth);
        for (OneOffCharge o : oneOffs) {
            items.add(new CalculationItem(
                    InvoiceItemType.ONE_OFF,
                    o.getLabel(),
                    BigDecimal.ONE,
                    o.getAmount(),
                    o.getAmount(),
                    "{\"reason\":\"" + o.getReason() + "\"}",
                    null,
                    null
            ));
        }

        // 5. Ngày đến hạn
        BuildingBillingSettings settings = settingsRepository.findByBuildingId(buildingId).orElse(null);
        int dueDays = settings != null ? settings.getDueDays() : 7;
        LocalDate dueDate = LocalDate.now().plusDays(dueDays);

        return new InvoiceCalculationResult(periodStart, periodEndExclusive, dueDate, items);
    }

    private Tariff findApplicableTariff(UUID buildingId, MeterType meterType, String billingMonth) {
        List<Tariff> tariffs = tariffRepository.findByBuildingIdAndEffectiveMonthLessThanEqualOrderByEffectiveMonthDesc(buildingId, billingMonth);
        return tariffs.stream()
                .filter(t -> {
                    String name = t.getService().getName().toLowerCase();
                    if (meterType == MeterType.ELECTRICITY) {
                        return name.contains("điện") || name.contains("electri") || "kwh".equalsIgnoreCase(t.getService().getUnit());
                    } else if (meterType == MeterType.WATER) {
                        return name.contains("nước") || name.contains("water") || "m³".equalsIgnoreCase(t.getService().getUnit()) || "m3".equalsIgnoreCase(t.getService().getUnit());
                    }
                    return false;
                })
                .findFirst()
                .orElse(null);
    }

    private Tariff findApplicableTariffByServiceId(UUID buildingId, UUID serviceId, String billingMonth) {
        if (serviceId == null) return null;
        List<Tariff> tariffs = tariffRepository.findByBuildingIdAndEffectiveMonthLessThanEqualOrderByEffectiveMonthDesc(buildingId, billingMonth);
        return tariffs.stream()
                .filter(t -> t.getService().getId() != null && t.getService().getId().equals(serviceId))
                .findFirst()
                .orElse(null);
    }

    private InvoiceDetailResponse mapToDetailResponse(Invoice invoice) {
        BigDecimal originalTotal = invoice.getItems().stream()
                .map(InvoiceItem::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal adjustmentsTotal = invoice.getAdjustments().stream()
                .map(InvoiceAdjustment::getDeltaAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal effectiveDue = originalTotal.add(adjustmentsTotal);
        if (effectiveDue.compareTo(BigDecimal.ZERO) < 0) {
            effectiveDue = BigDecimal.ZERO;
        }

        BigDecimal netApplied = BigDecimal.ZERO;
        BigDecimal debt = effectiveDue.subtract(netApplied);
        if (debt.compareTo(BigDecimal.ZERO) < 0) debt = BigDecimal.ZERO;
        BigDecimal credit = netApplied.subtract(effectiveDue);
        if (credit.compareTo(BigDecimal.ZERO) < 0) credit = BigDecimal.ZERO;

        PaymentStatus pStatus;
        if (credit.compareTo(BigDecimal.ZERO) > 0) {
            pStatus = PaymentStatus.CREDIT;
        } else if (debt.compareTo(BigDecimal.ZERO) == 0) {
            pStatus = PaymentStatus.PAID;
        } else if (netApplied.compareTo(BigDecimal.ZERO) > 0) {
            pStatus = PaymentStatus.PARTIAL;
        } else {
            pStatus = PaymentStatus.UNPAID;
        }

        List<InvoiceItemResponse> itemResponses = invoice.getItems().stream()
                .map(it -> new InvoiceItemResponse(
                        it.getId(),
                        it.getType(),
                        it.getLabel(),
                        it.getQuantity(),
                        it.getUnitPrice(),
                        it.getAmount(),
                        it.getCalculationSnapshot(),
                        it.getReadingRefs(),
                        it.getTariffRef()
                ))
                .toList();

        List<InvoiceAdjustmentResponse> adjResponses = invoice.getAdjustments().stream()
                .map(a -> new InvoiceAdjustmentResponse(
                        a.getId(),
                        a.getDeltaAmount(),
                        a.getReason(),
                        a.getEffectiveDate(),
                        a.getRecordedAt(),
                        a.getCreatedBy().getLogin()
                ))
                .toList();

        List<InvoiceNoteResponse> noteResponses = invoice.getNotes().stream()
                .map(n -> new InvoiceNoteResponse(
                        n.getId(),
                        n.getContent(),
                        n.getReason(),
                        n.getRecordedAt(),
                        n.getCreatedBy().getLogin()
                ))
                .toList();

        return new InvoiceDetailResponse(
                invoice.getId(),
                invoice.getContract().getId(),
                invoice.getContract().getRoom().getRoomNumber(),
                invoice.getContract().getRoom().getFloor().getBuilding().getName(),
                invoice.getContract().getRepresentativeTenant().getFullName(),
                invoice.getBillingMonth(),
                invoice.getStatus(),
                invoice.getPeriodStart(),
                invoice.getPeriodEndExclusive(),
                invoice.getDueDate(),
                invoice.getIssuedAt(),
                originalTotal,
                adjustmentsTotal,
                effectiveDue,
                netApplied,
                debt,
                credit,
                pStatus,
                itemResponses,
                adjResponses,
                noteResponses
        );
    }

    private InvoiceSummaryResponse mapToSummaryResponse(Invoice invoice) {
        BigDecimal originalTotal = invoice.getItems().stream()
                .map(InvoiceItem::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal adjustmentsTotal = invoice.getAdjustments().stream()
                .map(InvoiceAdjustment::getDeltaAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal effectiveDue = originalTotal.add(adjustmentsTotal);
        if (effectiveDue.compareTo(BigDecimal.ZERO) < 0) effectiveDue = BigDecimal.ZERO;

        BigDecimal netApplied = BigDecimal.ZERO;
        BigDecimal debt = effectiveDue.subtract(netApplied);
        if (debt.compareTo(BigDecimal.ZERO) < 0) debt = BigDecimal.ZERO;
        BigDecimal credit = netApplied.subtract(effectiveDue);
        if (credit.compareTo(BigDecimal.ZERO) < 0) credit = BigDecimal.ZERO;

        PaymentStatus pStatus;
        if (credit.compareTo(BigDecimal.ZERO) > 0) {
            pStatus = PaymentStatus.CREDIT;
        } else if (debt.compareTo(BigDecimal.ZERO) == 0) {
            pStatus = PaymentStatus.PAID;
        } else if (netApplied.compareTo(BigDecimal.ZERO) > 0) {
            pStatus = PaymentStatus.PARTIAL;
        } else {
            pStatus = PaymentStatus.UNPAID;
        }

        return new InvoiceSummaryResponse(
                invoice.getId(),
                invoice.getContract().getId(),
                invoice.getContract().getRoom().getRoomNumber(),
                invoice.getContract().getRoom().getFloor().getBuilding().getName(),
                invoice.getContract().getRepresentativeTenant().getFullName(),
                invoice.getBillingMonth(),
                invoice.getStatus(),
                effectiveDue,
                debt,
                pStatus,
                invoice.getDueDate()
        );
    }

    private Contract getAuthorizedContract(UUID contractId, UserPrincipal user) {
        Contract contract = contractRepository.findById(contractId)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy hợp đồng: " + contractId));

        if (user.isTenant()) {
            validateTenantContractAccess(contract, user);
        } else if (user.isStaff()) {
            validateManagerScope(contract.getRoom().getFloor().getBuilding().getId(), user);
        }
        return contract;
    }

    private void validateTenantContractAccess(Contract contract, UserPrincipal user) {
        if (contract.getRepresentativeTenant().getUser() != null &&
            contract.getRepresentativeTenant().getUser().getId().equals(user.getId())) {
            return;
        }
        boolean isMember = contractMemberRepository.findByContractIdOrderByJoinedOnAsc(contract.getId()).stream()
                .anyMatch(m -> m.getTenant().getUser() != null && m.getTenant().getUser().getId().equals(user.getId()));
        if (!isMember) {
            throw new AccessDeniedException("Bạn không có quyền truy cập hợp đồng này");
        }
    }

    private void validateManagerScope(UUID buildingId, UserPrincipal user) {
        if (user.isOwner()) return;
        if (user.isStaff()) {
            boolean assigned = staffAssignmentRepository.existsByUserIdAndBuildingId(user.getId(), buildingId);
            if (!assigned) {
                throw new AccessDeniedException("Bạn không được phân công quản lý tòa nhà này");
            }
            return;
        }
        throw new AccessDeniedException("Chỉ Quản lý (Owner/Staff) mới có quyền thực hiện thao tác này");
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

    private record CalculationItem(
            InvoiceItemType type,
            String label,
            BigDecimal quantity,
            BigDecimal unitPrice,
            BigDecimal amount,
            String calculationSnapshot,
            String readingRefs,
            UUID tariffRef
    ) {}

    private record InvoiceCalculationResult(
            LocalDate periodStart,
            LocalDate periodEndExclusive,
            LocalDate dueDate,
            List<CalculationItem> items
    ) {}
}
