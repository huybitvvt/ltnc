package vn.trohub.billing.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import vn.trohub.billing.domain.InvoiceItemType;
import vn.trohub.billing.domain.InvoiceStatus;
import vn.trohub.billing.domain.PaymentStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public class BillingDtos {

    public record InvoicePreviewRequest(
            @NotNull(message = "Mã hợp đồng không được để trống")
            UUID contractId,

            @NotBlank(message = "Kỳ tháng không được để trống (YYYY-MM)")
            String billingMonth
    ) {}

    public record AdjustInvoiceRequest(
            @NotNull(message = "Số tiền điều chỉnh không được để trống")
            BigDecimal deltaAmount,

            @NotBlank(message = "Lý do điều chỉnh không được để trống")
            String reason,

            @NotNull(message = "Ngày hiệu lực không được để trống")
            LocalDate effectiveDate
    ) {}

    public record AddInvoiceNoteRequest(
            @NotBlank(message = "Nội dung đính chính không được để trống")
            String content,

            @NotBlank(message = "Lý do không được để trống")
            String reason
    ) {}

    public record InvoiceItemResponse(
            UUID id,
            InvoiceItemType type,
            String label,
            BigDecimal quantity,
            BigDecimal unitPrice,
            BigDecimal amount,
            String calculationSnapshot,
            String readingRefs,
            UUID tariffRef
    ) {}

    public record InvoiceAdjustmentResponse(
            UUID id,
            BigDecimal deltaAmount,
            String reason,
            LocalDate effectiveDate,
            Instant recordedAt,
            String createdByName
    ) {}

    public record InvoiceNoteResponse(
            UUID id,
            String content,
            String reason,
            Instant recordedAt,
            String createdByName
    ) {}

    public record InvoiceDetailResponse(
            UUID id,
            UUID contractId,
            String roomName,
            String buildingName,
            String tenantName,
            String billingMonth,
            InvoiceStatus status,
            LocalDate periodStart,
            LocalDate periodEndExclusive,
            LocalDate dueDate,
            Instant issuedAt,
            BigDecimal originalTotal,
            BigDecimal adjustmentsTotal,
            BigDecimal effectiveDue,
            BigDecimal netApplied,
            BigDecimal debt,
            BigDecimal credit,
            PaymentStatus paymentStatus,
            List<InvoiceItemResponse> items,
            List<InvoiceAdjustmentResponse> adjustments,
            List<InvoiceNoteResponse> notes
    ) {}

    public record InvoiceSummaryResponse(
            UUID id,
            UUID contractId,
            String roomName,
            String buildingName,
            String tenantName,
            String billingMonth,
            InvoiceStatus status,
            BigDecimal effectiveDue,
            BigDecimal debt,
            PaymentStatus paymentStatus,
            LocalDate dueDate
    ) {}
}
