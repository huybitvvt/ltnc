package vn.trohub.pricing.api.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import vn.trohub.pricing.domain.ServiceCalculationType;

import java.math.BigDecimal;
import java.util.UUID;

public class PricingDtos {

    public record ServiceDefinitionResponse(
            UUID id,
            String name,
            String unit,
            ServiceCalculationType calculationType,
            boolean active
    ) {}

    public record CreateServiceRequest(
            @NotBlank(message = "Tên dịch vụ không được để trống")
            String name,
            String unit,
            @NotNull(message = "Loại tính phí không được để trống")
            ServiceCalculationType calculationType
    ) {}

    public record TariffResponse(
            UUID id,
            UUID buildingId,
            UUID serviceId,
            String serviceName,
            String serviceUnit,
            ServiceCalculationType calculationType,
            String effectiveMonth,
            @jakarta.validation.constraints.Digits(integer = 19, fraction = 0)
            @io.swagger.v3.oas.annotations.media.Schema(type = "string", pattern = "^-?[0-9]{1,19}$", example = "3000000")
            @com.fasterxml.jackson.databind.annotation.JsonSerialize(using = com.fasterxml.jackson.databind.ser.std.ToStringSerializer.class)
            BigDecimal unitPrice
    ) {}

    public record CreateTariffRequest(
            @NotNull(message = "Dịch vụ không được để trống")
            UUID serviceId,
            @NotBlank(message = "Tháng hiệu lực không được để trống")
            @Pattern(regexp = "^\\d{4}-(0[1-9]|1[0-2])$", message = "Tháng hiệu lực phải có định dạng YYYY-MM")
            String effectiveMonth,
            @NotNull(message = "Đơn giá không được để trống")
            @DecimalMin(value = "0", message = "Đơn giá không được âm")
            @jakarta.validation.constraints.Digits(integer = 19, fraction = 0)
            @io.swagger.v3.oas.annotations.media.Schema(type = "string", pattern = "^-?[0-9]{1,19}$", example = "3000000")
            @com.fasterxml.jackson.databind.annotation.JsonSerialize(using = com.fasterxml.jackson.databind.ser.std.ToStringSerializer.class)
            BigDecimal unitPrice
    ) {}

    public record BuildingBillingSettingsResponse(
            UUID buildingId,
            int dueDays,
            BigDecimal waterAbsoluteThreshold,
            BigDecimal electricityAbsoluteThreshold
    ) {}

    public record UpdateBuildingBillingSettingsRequest(
            int dueDays,
            BigDecimal waterAbsoluteThreshold,
            BigDecimal electricityAbsoluteThreshold
    ) {}

    public record SubscriptionResponse(
            UUID id,
            UUID contractId,
            UUID serviceId,
            String serviceName,
            String serviceUnit,
            String startMonth,
            String endMonthExclusive
    ) {}

    public record CreateSubscriptionRequest(
            @NotNull(message = "Dịch vụ không được để trống")
            UUID serviceId,
            @NotBlank(message = "Tháng bắt đầu không được để trống")
            @Pattern(regexp = "^\\d{4}-(0[1-9]|1[0-2])$", message = "Tháng bắt đầu phải có định dạng YYYY-MM")
            String startMonth,
            String endMonthExclusive
    ) {}

    public record OneOffChargeResponse(
            UUID id,
            UUID contractId,
            String billingMonth,
            String label,
            @jakarta.validation.constraints.Digits(integer = 19, fraction = 0)
            @io.swagger.v3.oas.annotations.media.Schema(type = "string", pattern = "^-?[0-9]{1,19}$", example = "3000000")
            @com.fasterxml.jackson.databind.annotation.JsonSerialize(using = com.fasterxml.jackson.databind.ser.std.ToStringSerializer.class)
            BigDecimal amount,
            String reason,
            String sourceRef
    ) {}

    public record CreateOneOffChargeRequest(
            @NotBlank(message = "Kỳ tính tiền không được để trống")
            @Pattern(regexp = "^\\d{4}-(0[1-9]|1[0-2])$", message = "Kỳ tính tiền phải có định dạng YYYY-MM")
            String billingMonth,
            @NotBlank(message = "Tên khoản thu không được để trống")
            String label,
            @NotNull(message = "Số tiền không được để trống")
            @DecimalMin(value = "0", message = "Số tiền không được âm")
            @jakarta.validation.constraints.Digits(integer = 19, fraction = 0)
            @io.swagger.v3.oas.annotations.media.Schema(type = "string", pattern = "^-?[0-9]{1,19}$", example = "3000000")
            @com.fasterxml.jackson.databind.annotation.JsonSerialize(using = com.fasterxml.jackson.databind.ser.std.ToStringSerializer.class)
            BigDecimal amount,
            @NotBlank(message = "Lý do thu không được để trống")
            String reason,
            String sourceRef
    ) {}
}
