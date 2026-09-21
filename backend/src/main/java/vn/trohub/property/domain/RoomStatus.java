package vn.trohub.property.domain;

public enum RoomStatus {
    VACANT,            // Phòng trống, sẵn sàng cho thuê
    RENTED,            // Đang có khách thuê (hợp đồng active)
    DEPOSIT_RESERVED,  // Đã nhận cọc giữ chỗ
    MAINTENANCE        // Đang sửa chữa / bảo trì
}
