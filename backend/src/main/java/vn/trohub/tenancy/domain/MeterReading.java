package vn.trohub.tenancy.domain;

import jakarta.persistence.*;
import vn.trohub.user.domain.User;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "meter_readings")
public class MeterReading {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "meter_id", nullable = false)
    private RoomMeter meter;

    @Column(name = "reading_date", nullable = false)
    private LocalDate readingDate;

    @Column(nullable = false, precision = 18, scale = 3)
    private BigDecimal value;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private MeterReadingKind kind;

    @Column(name = "file_id")
    private UUID fileId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @Version
    private Long version = 0L;

    public MeterReading() {}

    public MeterReading(RoomMeter meter, LocalDate readingDate, BigDecimal value, MeterReadingKind kind, User createdBy) {
        this(meter, readingDate, value, kind, null, createdBy);
    }

    public MeterReading(RoomMeter meter, LocalDate readingDate, BigDecimal value, MeterReadingKind kind, UUID fileId, User createdBy) {
        this.meter = meter;
        this.readingDate = readingDate;
        this.value = value;
        this.kind = kind;
        this.fileId = fileId;
        this.createdBy = createdBy;
    }

    public UUID getId() {
        return id;
    }

    public RoomMeter getMeter() {
        return meter;
    }

    public void setMeter(RoomMeter meter) {
        this.meter = meter;
    }

    public LocalDate getReadingDate() {
        return readingDate;
    }

    public void setReadingDate(LocalDate readingDate) {
        this.readingDate = readingDate;
    }

    public BigDecimal getValue() {
        return value;
    }

    public void setValue(BigDecimal value) {
        this.value = value;
        this.updatedAt = Instant.now();
    }

    public MeterReadingKind getKind() {
        return kind;
    }

    public void setKind(MeterReadingKind kind) {
        this.kind = kind;
    }

    public UUID getFileId() {
        return fileId;
    }

    public void setFileId(UUID fileId) {
        this.fileId = fileId;
    }

    public User getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(User createdBy) {
        this.createdBy = createdBy;
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
