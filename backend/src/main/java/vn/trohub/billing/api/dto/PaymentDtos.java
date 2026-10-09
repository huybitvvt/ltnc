package vn.trohub.billing.api.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import vn.trohub.billing.domain.LedgerEntryType;
import vn.trohub.billing.domain.PaymentMethod;
import vn.trohub.billing.domain.PaymentStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public class PaymentDtos {

    public record RecordPaymentRequest(
            @NotNull(message = "ID hóa đơn không được để trống")
            UUID invoiceId,

            @NotNull(message = "Số tiền thanh toán không được để trống")
            @DecimalMin(value = "1", message = "Số tiền thanh toán phải lớn hơn 0")
            BigDecimal amount,

            @NotNull(message = "Phương thức thanh toán không được để trống")
            PaymentMethod paymentMethod,

            String referenceCode,
            String note
    ) {}

    public record PaymentCorrectionRequest(
            @NotNull(message = "ID bút toán gốc không được để trống")
            UUID refEntryId,

            @NotNull(message = "Số tiền điều chỉnh không được để trống")
            BigDecimal deltaAmount,

            @NotBlank(message = "Lý do sửa thu là bắt buộc theo quy tắc kiểm toán")
            String reason
    ) {}

    public record RefundRequest(
            @NotNull(message = "ID hóa đơn hoàn tiền không được để trống")
            UUID invoiceId,

            @NotNull(message = "Số tiền hoàn không được để trống")
            @DecimalMin(value = "1", message = "Số tiền hoàn phải lớn hơn 0")
            BigDecimal amount,

            @NotNull(message = "Phương thức hoàn tiền không được để trống")
            PaymentMethod paymentMethod,

            String referenceCode,

            @NotBlank(message = "Lý do hoàn tiền là bắt buộc")
            String reason
    ) {}

    public record TransferCreditRequest(
            @NotNull(message = "ID hóa đơn nguồn không được để trống")
            UUID sourceInvoiceId,

            @NotNull(message = "ID hóa đơn đích không được để trống")
            UUID targetInvoiceId,

            @NotNull(message = "Số tiền chuyển dư không được để trống")
            @DecimalMin(value = "1", message = "Số tiền chuyển dư phải lớn hơn 0")
            BigDecimal amount,

            @NotBlank(message = "Lý do chuyển dư là bắt buộc")
            String reason
    ) {}

    public record LedgerEntryResponse(
            UUID id,
            UUID invoiceId,
            UUID contractId,
            LedgerEntryType entryType,
            String amount,
            PaymentMethod paymentMethod,
            String referenceCode,
            String note,
            UUID refEntryId,
            String actorName,
            Instant recordedAt
    ) {}

    public record InvoiceFinancialStatusResponse(
            UUID invoiceId,
            String originalTotal,
            String adjustmentsTotal,
            String effectiveDue,
            String netApplied,
            String debt,
            String credit,
            PaymentStatus paymentStatus,
            List<LedgerEntryResponse> entries
    ) {}
}
