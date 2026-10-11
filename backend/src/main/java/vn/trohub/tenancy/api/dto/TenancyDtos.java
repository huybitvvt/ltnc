package vn.trohub.tenancy.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import vn.trohub.tenancy.domain.ContractStatus;
import vn.trohub.tenancy.domain.MeterReadingKind;
import vn.trohub.tenancy.domain.MeterType;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public class TenancyDtos {

    // --- Tenant DTOs ---
    public record CreateTenantRequest(
            @NotBlank(message = "Họ và tên không được để trống")
            String fullName,

            @NotBlank(message = "Số điện thoại không được để trống")
            String phone,

            @NotBlank(message = "CCCD không được để trống")
            String citizenId,

            String email
    ) {}

    public record TenantSummary(
            UUID id,
            UUID userId,
            String fullName,
            String phone,
            String citizenIdMasked,
            String email,
            Instant createdAt
    ) {}

    public record TenantInviteResponse(
            String inviteCode,
            Instant expiresAt
    ) {}

    // --- Contract DTOs ---
    public record CreateContractRequest(
            @NotNull(message = "Phòng không được để trống")
            UUID roomId,

            @NotNull(message = "Người đại diện không được để trống")
            UUID representativeTenantId,

            @NotNull(message = "Ngày bắt đầu không được để trống")
            LocalDate actualStartDate,

            @NotNull(message = "Ngày kết thúc dự kiến không được để trống")
            LocalDate plannedEndExclusive,

            @NotNull(message = "Giá thuê không được để trống")
            @jakarta.validation.constraints.DecimalMin("0")
            @jakarta.validation.constraints.Digits(integer = 19, fraction = 0)
            @io.swagger.v3.oas.annotations.media.Schema(type = "string", pattern = "^-?[0-9]{1,19}$", example = "3000000")
            @com.fasterxml.jackson.databind.annotation.JsonSerialize(using = com.fasterxml.jackson.databind.ser.std.ToStringSerializer.class)
            BigDecimal rent,

            @NotNull(message = "Tiền cọc không được để trống")
            @jakarta.validation.constraints.DecimalMin("0")
            @jakarta.validation.constraints.Digits(integer = 19, fraction = 0)
            @io.swagger.v3.oas.annotations.media.Schema(type = "string", pattern = "^-?[0-9]{1,19}$", example = "3000000")
            @com.fasterxml.jackson.databind.annotation.JsonSerialize(using = com.fasterxml.jackson.databind.ser.std.ToStringSerializer.class)
            BigDecimal depositRequired
    ) {}

    public record ContractSummary(
            UUID id,
            UUID roomId,
            String roomNumber,
            UUID buildingId,
            String buildingName,
            UUID representativeTenantId,
            String representativeName,
            ContractStatus status,
            LocalDate actualStartDate,
            LocalDate plannedEndExclusive,
            LocalDate actualCheckoutDate,
            String rent,
            String depositRequired,
            String depositHeld
    ) {}

    public record HandoverReadingItem(
            UUID meterId,
            MeterType meterType,
            @NotNull
            LocalDate readingDate,
            @NotNull
            @jakarta.validation.constraints.DecimalMin("0")
            @jakarta.validation.constraints.Digits(integer = 15, fraction = 3)
            BigDecimal value
    ) {}

    public record ActivateContractRequest(
            @NotNull
            List<@jakarta.validation.Valid HandoverReadingItem> handoverReadings
    ) {}

    public record ExtendContractRequest(
            @NotNull(message = "Ngày kết thúc mới không được để trống")
            LocalDate newPlannedEndExclusive,

            @NotBlank(message = "Lý do gia hạn không được để trống")
            String reason
    ) {}

    public record CheckoutContractRequest(
            @NotNull(message = "Ngày trả phòng không được để trống")
            LocalDate actualCheckoutDate,

            List<@jakarta.validation.Valid HandoverReadingItem> finalReadings
    ) {}

    // --- Contract Member DTOs ---
    public record AddMemberRequest(
            @NotNull(message = "Hồ sơ người ở không được để trống")
            UUID tenantId,

            @NotNull(message = "Ngày vào ở không được để trống")
            LocalDate joinedOn
    ) {}

    public record ContractMemberResponse(
            UUID id,
            UUID tenantId,
            String fullName,
            String phone,
            String citizenIdMasked,
            LocalDate joinedOn,
            LocalDate leftOn,
            boolean isRepresentative
    ) {}

    // --- Meter DTOs ---
    public record RoomMeterResponse(
            UUID id,
            UUID roomId,
            MeterType type,
            String serial,
            LocalDate installedOn,
            String initialReading,
            boolean active
    ) {}

    public record CreateRoomMeterRequest(
            @NotNull MeterType type,
            @NotBlank String serial,
            @NotNull LocalDate installedOn,
            @NotNull BigDecimal initialReading
    ) {}
}
