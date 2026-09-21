package vn.trohub.tenancy.domain;

import jakarta.persistence.*;
import vn.trohub.property.domain.Room;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "contracts")
public class Contract {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "room_id", nullable = false)
    private Room room;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "representative_tenant_id", nullable = false)
    private TenantProfile representativeTenant;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ContractStatus status = ContractStatus.DRAFT;

    @Column(name = "actual_start_date", nullable = false)
    private LocalDate actualStartDate;

    @Column(name = "planned_end_exclusive", nullable = false)
    private LocalDate plannedEndExclusive;

    @Column(name = "actual_checkout_date")
    private LocalDate actualCheckoutDate;

    @Column(nullable = false, precision = 19, scale = 0)
    private BigDecimal rent;

    @Column(name = "deposit_required", nullable = false, precision = 19, scale = 0)
    private BigDecimal depositRequired;

    @Column(name = "deposit_settlement_at")
    private Instant depositSettlementAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @Version
    private Long version = 0L;

    public Contract() {}

    public Contract(Room room, TenantProfile representativeTenant, LocalDate actualStartDate,
                    LocalDate plannedEndExclusive, BigDecimal rent, BigDecimal depositRequired) {
        this.room = room;
        this.representativeTenant = representativeTenant;
        this.actualStartDate = actualStartDate;
        this.plannedEndExclusive = plannedEndExclusive;
        this.rent = rent;
        this.depositRequired = depositRequired;
        this.status = ContractStatus.DRAFT;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public Room getRoom() {
        return room;
    }

    public void setRoom(Room room) {
        this.room = room;
    }

    public TenantProfile getRepresentativeTenant() {
        return representativeTenant;
    }

    public void setRepresentativeTenant(TenantProfile representativeTenant) {
        this.representativeTenant = representativeTenant;
    }

    public ContractStatus getStatus() {
        return status;
    }

    public void setStatus(ContractStatus status) {
        this.status = status;
        this.updatedAt = Instant.now();
    }

    public LocalDate getActualStartDate() {
        return actualStartDate;
    }

    public void setActualStartDate(LocalDate actualStartDate) {
        this.actualStartDate = actualStartDate;
        this.updatedAt = Instant.now();
    }

    public LocalDate getPlannedEndExclusive() {
        return plannedEndExclusive;
    }

    public void setPlannedEndExclusive(LocalDate plannedEndExclusive) {
        this.plannedEndExclusive = plannedEndExclusive;
        this.updatedAt = Instant.now();
    }

    public LocalDate getActualCheckoutDate() {
        return actualCheckoutDate;
    }

    public void setActualCheckoutDate(LocalDate actualCheckoutDate) {
        this.actualCheckoutDate = actualCheckoutDate;
        this.updatedAt = Instant.now();
    }

    public BigDecimal getRent() {
        return rent;
    }

    public void setRent(BigDecimal rent) {
        this.rent = rent;
        this.updatedAt = Instant.now();
    }

    public BigDecimal getDepositRequired() {
        return depositRequired;
    }

    public void setDepositRequired(BigDecimal depositRequired) {
        this.depositRequired = depositRequired;
        this.updatedAt = Instant.now();
    }

    public Instant getDepositSettlementAt() {
        return depositSettlementAt;
    }

    public void setDepositSettlementAt(Instant depositSettlementAt) {
        this.depositSettlementAt = depositSettlementAt;
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
