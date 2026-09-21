package vn.trohub.tenancy.domain;

import jakarta.persistence.*;
import vn.trohub.property.domain.Room;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "room_meters", uniqueConstraints = {
    @UniqueConstraint(name = "uq_room_meter_type", columnNames = {"room_id", "type"})
})
public class RoomMeter {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "room_id", nullable = false)
    private Room room;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private MeterType type;

    @Column(nullable = false, length = 50)
    private String serial;

    @Column(name = "installed_on", nullable = false)
    private LocalDate installedOn;

    @Column(name = "initial_reading", nullable = false, precision = 18, scale = 3)
    private BigDecimal initialReading = BigDecimal.ZERO;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @Version
    private Long version = 0L;

    public RoomMeter() {}

    public RoomMeter(Room room, MeterType type, String serial, LocalDate installedOn, BigDecimal initialReading) {
        this.room = room;
        this.type = type;
        this.serial = serial;
        this.installedOn = installedOn;
        this.initialReading = initialReading;
    }

    public UUID getId() {
        return id;
    }

    public Room getRoom() {
        return room;
    }

    public void setRoom(Room room) {
        this.room = room;
    }

    public MeterType getType() {
        return type;
    }

    public void setType(MeterType type) {
        this.type = type;
    }

    public String getSerial() {
        return serial;
    }

    public void setSerial(String serial) {
        this.serial = serial;
    }

    public LocalDate getInstalledOn() {
        return installedOn;
    }

    public void setInstalledOn(LocalDate installedOn) {
        this.installedOn = installedOn;
    }

    public BigDecimal getInitialReading() {
        return initialReading;
    }

    public void setInitialReading(BigDecimal initialReading) {
        this.initialReading = initialReading;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
        this.updatedAt = Instant.now();
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public Long getVersion() {
        return version;
    }
}
