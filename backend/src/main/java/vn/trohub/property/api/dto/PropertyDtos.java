package vn.trohub.property.api.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import vn.trohub.property.domain.Building;
import vn.trohub.property.domain.Floor;
import vn.trohub.property.domain.Room;
import vn.trohub.property.domain.RoomStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public class PropertyDtos {

    public record BuildingRequest(
            @NotBlank(message = "Tên tòa nhà không được để trống")
            String name,
            @NotBlank(message = "Địa chỉ tòa nhà không được để trống")
            String address
    ) {}

    public record BuildingResponse(
            UUID id,
            String name,
            String address,
            boolean active,
            long totalRooms,
            long vacantRooms,
            Instant createdAt
    ) {
        public static BuildingResponse fromEntity(Building b, long totalRooms, long vacantRooms) {
            return new BuildingResponse(
                    b.getId(),
                    b.getName(),
                    b.getAddress(),
                    b.isActive(),
                    totalRooms,
                    vacantRooms,
                    b.getCreatedAt()
            );
        }
    }

    public record FloorRequest(
            @NotBlank(message = "Tên tầng không được để trống")
            String name,
            int floorOrder
    ) {}

    public record FloorResponse(
            UUID id,
            UUID buildingId,
            String name,
            int floorOrder,
            Instant createdAt
    ) {
        public static FloorResponse fromEntity(Floor f) {
            return new FloorResponse(
                    f.getId(),
                    f.getBuilding().getId(),
                    f.getName(),
                    f.getFloorOrder(),
                    f.getCreatedAt()
            );
        }
    }

    public record RoomRequest(
            UUID floorId,
            @NotBlank(message = "Số/mã phòng không được để trống")
            String roomNumber,
            @NotNull(message = "Giá thuê cơ bản không được để trống")
            @DecimalMin(value = "0", message = "Giá thuê cơ bản phải lớn hơn hoặc bằng 0")
            @jakarta.validation.constraints.Digits(integer = 19, fraction = 0)
            @io.swagger.v3.oas.annotations.media.Schema(type = "string", pattern = "^-?[0-9]{1,19}$", example = "3000000")
            @com.fasterxml.jackson.databind.annotation.JsonSerialize(using = com.fasterxml.jackson.databind.ser.std.ToStringSerializer.class)
            BigDecimal basePrice,
            @NotNull(message = "Tiền cọc định mức không được để trống")
            @DecimalMin(value = "0", message = "Tiền cọc định mức phải lớn hơn hoặc bằng 0")
            @jakarta.validation.constraints.Digits(integer = 19, fraction = 0)
            @io.swagger.v3.oas.annotations.media.Schema(type = "string", pattern = "^-?[0-9]{1,19}$", example = "3000000")
            @com.fasterxml.jackson.databind.annotation.JsonSerialize(using = com.fasterxml.jackson.databind.ser.std.ToStringSerializer.class)
            BigDecimal depositAmount,
            @DecimalMin("0") BigDecimal area,
            @jakarta.validation.constraints.Min(1) Integer maxTenants,
            Boolean bookable
    ) {}

    public record RoomResponse(
            UUID id,
            UUID buildingId,
            String buildingName,
            UUID floorId,
            String floorName,
            String roomNumber,
            @jakarta.validation.constraints.Digits(integer = 19, fraction = 0)
            @io.swagger.v3.oas.annotations.media.Schema(type = "string", pattern = "^-?[0-9]{1,19}$", example = "3000000")
            @com.fasterxml.jackson.databind.annotation.JsonSerialize(using = com.fasterxml.jackson.databind.ser.std.ToStringSerializer.class)
            BigDecimal basePrice,
            @jakarta.validation.constraints.Digits(integer = 19, fraction = 0)
            @io.swagger.v3.oas.annotations.media.Schema(type = "string", pattern = "^-?[0-9]{1,19}$", example = "3000000")
            @com.fasterxml.jackson.databind.annotation.JsonSerialize(using = com.fasterxml.jackson.databind.ser.std.ToStringSerializer.class)
            BigDecimal depositAmount,
            BigDecimal area,
            int maxTenants,
            boolean bookable,
            RoomStatus status,
            Instant createdAt
    ) {
        public static RoomResponse fromEntity(Room r) {
            return new RoomResponse(
                    r.getId(),
                    r.getBuilding().getId(),
                    r.getBuilding().getName(),
                    r.getFloor() != null ? r.getFloor().getId() : null,
                    r.getFloor() != null ? r.getFloor().getName() : null,
                    r.getRoomNumber(),
                    r.getBasePrice(),
                    r.getDepositAmount(),
                    r.getArea(),
                    r.getMaxTenants(),
                    r.isBookable(),
                    r.getStatus(),
                    r.getCreatedAt()
            );
        }
    }

    public record RoomBookableRequest(
            boolean bookable
    ) {}
}
