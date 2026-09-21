package vn.trohub.metering.api.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import vn.trohub.metering.domain.EvaluationStatus;
import vn.trohub.tenancy.domain.MeterReadingKind;
import vn.trohub.tenancy.domain.MeterType;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public class MeteringDtos {

    public record RecordReadingRequest(
            @NotNull(message = "Đồng hồ không được để trống")
            UUID meterId,
            LocalDate readingDate,
            @NotNull(message = "Chỉ số không được để trống")
            @DecimalMin(value = "0", message = "Chỉ số không được âm")
            BigDecimal value,
            UUID fileId
    ) {}

    public record BulkRecordReadingItem(
            @NotNull(message = "Đồng hồ không được để trống")
            UUID meterId,
            @NotNull(message = "Chỉ số không được để trống")
            @DecimalMin(value = "0", message = "Chỉ số không được âm")
            BigDecimal value
    ) {}

    public record BulkRecordReadingRequest(
            LocalDate readingDate,
            @NotNull(message = "Danh sách chỉ số không được để trống")
            List<BulkRecordReadingItem> readings
    ) {}

    public record MeterReadingResponse(
            UUID id,
            UUID meterId,
            MeterType meterType,
            String roomCode,
            LocalDate readingDate,
            BigDecimal value,
            MeterReadingKind kind,
            UUID fileId,
            String createdByName,
            Instant createdAt
    ) {}

    public record ConsumptionAlertResponse(
            UUID id,
            UUID contractId,
            MeterType meterType,
            String billingMonth,
            Long readingVersion,
            EvaluationStatus evaluationStatus,
            String comparisonSnapshot,
            String acknowledgedByName,
            Instant acknowledgedAt,
            String reason,
            Instant createdAt
    ) {}

    public record AcknowledgeAlertRequest(
            @NotBlank(message = "Lý do xác nhận không được để trống")
            String reason
    ) {}
}
