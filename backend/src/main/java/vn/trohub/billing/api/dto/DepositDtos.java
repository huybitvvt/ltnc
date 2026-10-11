package vn.trohub.billing.api.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import vn.trohub.billing.domain.DepositEntryType;
import vn.trohub.billing.domain.PaymentMethod;
import vn.trohub.tenancy.domain.DepositStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public class DepositDtos {

    public record RecordDepositReceiptRequest(
            @NotNull(message = "contractId không được để trống")
            UUID contractId,

            @NotNull(message = "Số tiền cọc không được để trống")
            @DecimalMin(value = "1", message = "Số tiền cọc phải lớn hơn 0")
            @jakarta.validation.constraints.Digits(integer = 19, fraction = 0)
            @io.swagger.v3.oas.annotations.media.Schema(type = "string", pattern = "^-?[0-9]{1,19}$", example = "3000000")
            @com.fasterxml.jackson.databind.annotation.JsonSerialize(using = com.fasterxml.jackson.databind.ser.std.ToStringSerializer.class)
            BigDecimal amount,

            PaymentMethod paymentMethod,
            String referenceCode,
            String note
    ) {}

    public record CorrectDepositReceiptRequest(
            @NotNull(message = "refEntryId không được để trống")
            UUID refEntryId,

            @NotNull(message = "deltaAmount không được để trống")
            @jakarta.validation.constraints.Digits(integer = 19, fraction = 0)
            @io.swagger.v3.oas.annotations.media.Schema(type = "string", pattern = "^-?[0-9]{1,19}$", example = "3000000")
            @com.fasterxml.jackson.databind.annotation.JsonSerialize(using = com.fasterxml.jackson.databind.ser.std.ToStringSerializer.class)
            BigDecimal deltaAmount,

            @NotBlank(message = "Lý do sửa thu cọc không được để trống")
            String reason
    ) {}

    public record RefundDepositRequest(
            @NotNull(message = "contractId không được để trống")
            UUID contractId,

            @NotNull(message = "Số tiền hoàn không được để trống")
            @DecimalMin(value = "1", message = "Số tiền hoàn phải lớn hơn 0")
            @jakarta.validation.constraints.Digits(integer = 19, fraction = 0)
            @io.swagger.v3.oas.annotations.media.Schema(type = "string", pattern = "^-?[0-9]{1,19}$", example = "3000000")
            @com.fasterxml.jackson.databind.annotation.JsonSerialize(using = com.fasterxml.jackson.databind.ser.std.ToStringSerializer.class)
            BigDecimal amount,

            @NotBlank(message = "Lý do hoàn cọc không được để trống")
            String reason,

            PaymentMethod paymentMethod,
            String referenceCode
    ) {}

    public record DeductDepositRequest(
            @NotNull(message = "contractId không được để trống")
            UUID contractId,

            @NotNull(message = "Số tiền khấu trừ không được để trống")
            @DecimalMin(value = "1", message = "Số tiền khấu trừ phải lớn hơn 0")
            @jakarta.validation.constraints.Digits(integer = 19, fraction = 0)
            @io.swagger.v3.oas.annotations.media.Schema(type = "string", pattern = "^-?[0-9]{1,19}$", example = "3000000")
            @com.fasterxml.jackson.databind.annotation.JsonSerialize(using = com.fasterxml.jackson.databind.ser.std.ToStringSerializer.class)
            BigDecimal amount,

            @NotBlank(message = "Lý do khấu trừ hư hại/phạt không được để trống")
            String reason,

            String expenseRef
    ) {}

    public record OffsetDepositToInvoiceRequest(
            @NotNull(message = "contractId không được để trống")
            UUID contractId,

            @NotNull(message = "invoiceId không được để trống")
            UUID invoiceId,

            @NotNull(message = "Số tiền bù cọc không được để trống")
            @DecimalMin(value = "1", message = "Số tiền bù cọc phải lớn hơn 0")
            @jakarta.validation.constraints.Digits(integer = 19, fraction = 0)
            @io.swagger.v3.oas.annotations.media.Schema(type = "string", pattern = "^-?[0-9]{1,19}$", example = "3000000")
            @com.fasterxml.jackson.databind.annotation.JsonSerialize(using = com.fasterxml.jackson.databind.ser.std.ToStringSerializer.class)
            BigDecimal amount,

            String note
    ) {}

    public record SettleDepositRequest(
            @NotNull(message = "contractId không được để trống")
            UUID contractId,
            String note
    ) {}

    public record DepositLedgerEntryResponse(
            UUID id,
            UUID contractId,
            DepositEntryType entryType,
            String amount,
            PaymentMethod paymentMethod,
            String referenceCode,
            String note,
            String reason,
            UUID refEntryId,
            UUID invoiceId,
            UUID actorId,
            String actorName,
            Instant recordedAt
    ) {}

    public record ContractDepositFinancialStatusResponse(
            UUID contractId,
            String roomName,
            String buildingName,
            String tenantName,
            String depositRequired,
            String depositHeld,
            String totalReceipt,
            String totalRefund,
            String totalDeduction,
            String totalOffset,
            DepositStatus depositStatus,
            Instant settledAt,
            List<DepositLedgerEntryResponse> entries
    ) {}
}
