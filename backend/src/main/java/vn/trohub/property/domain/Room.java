package vn.trohub.property.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "rooms", uniqueConstraints = {
    @UniqueConstraint(name = "uq_building_room_number", columnNames = {"building_id", "room_number"})
})
public class Room {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "building_id", nullable = false)
    private Building building;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "floor_id")
    private Floor floor;

    @Column(name = "room_number", nullable = false, length = 50)
    private String roomNumber;

    @Column(name = "base_price", nullable = false, precision = 19, scale = 0)
    private BigDecimal basePrice = BigDecimal.ZERO;

    @Column(name = "deposit_amount", nullable = false, precision = 19, scale = 0)
    private BigDecimal depositAmount = BigDecimal.ZERO;

    @Column(precision = 8, scale = 2)
    private BigDecimal area = new BigDecimal("20.0");

    @Column(name = "max_tenants", nullable = false)
    private int maxTenants = 2;

    @Column(nullable = false)
    private boolean bookable = true;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private RoomStatus status = RoomStatus.VACANT;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @Version
    private Long version = 0L;

    public Room() {}

    public Room(Building building, Floor floor, String roomNumber, BigDecimal basePrice, BigDecimal depositAmount) {
        this.building = building;
        this.floor = floor;
        this.roomNumber = roomNumber;
        this.basePrice = basePrice;
        this.depositAmount = depositAmount;
        this.status = RoomStatus.VACANT;
        this.bookable = true;
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public Building getBuilding() {
        return building;
    }

    public void setBuilding(Building building) {
        this.building = building;
    }

    public Floor getFloor() {
        return floor;
    }

    public void setFloor(Floor floor) {
        this.floor = floor;
    }

    public String getRoomNumber() {
        return roomNumber;
    }

    public void setRoomNumber(String roomNumber) {
        this.roomNumber = roomNumber;
    }

    public BigDecimal getBasePrice() {
        return basePrice;
    }

    public void setBasePrice(BigDecimal basePrice) {
        this.basePrice = basePrice;
    }

    public BigDecimal getDepositAmount() {
        return depositAmount;
    }

    public void setDepositAmount(BigDecimal depositAmount) {
        this.depositAmount = depositAmount;
    }

    public BigDecimal getArea() {
        return area;
    }

    public void setArea(BigDecimal area) {
        this.area = area;
    }

    public int getMaxTenants() {
        return maxTenants;
    }

    public void setMaxTenants(int maxTenants) {
        this.maxTenants = maxTenants;
    }

    public boolean isBookable() {
        return bookable;
    }

    public void setBookable(boolean bookable) {
        this.bookable = bookable;
    }

    public RoomStatus getStatus() {
        return status;
    }

    public void setStatus(RoomStatus status) {
        this.status = status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }

    public Long getVersion() {
        return version;
    }
}
