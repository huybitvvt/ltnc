package vn.trohub.pricing.domain;

import jakarta.persistence.*;
import vn.trohub.property.domain.Building;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "building_billing_settings")
public class BuildingBillingSettings {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "building_id", nullable = false, unique = true)
    private Building building;

    @Column(name = "due_days", nullable = false)
    private int dueDays = 7;

    @Column(name = "water_absolute_threshold", nullable = false, precision = 18, scale = 3)
    private BigDecimal waterAbsoluteThreshold = new BigDecimal("10.000");

    @Column(name = "electricity_absolute_threshold", nullable = false, precision = 18, scale = 3)
    private BigDecimal electricityAbsoluteThreshold = new BigDecimal("100.000");

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @Version
    private Long version = 0L;

    public BuildingBillingSettings() {}

    public BuildingBillingSettings(Building building) {
        this.building = building;
        this.dueDays = 7;
        this.waterAbsoluteThreshold = new BigDecimal("10.000");
        this.electricityAbsoluteThreshold = new BigDecimal("100.000");
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

    public int getDueDays() {
        return dueDays;
    }

    public void setDueDays(int dueDays) {
        this.dueDays = dueDays;
        this.updatedAt = Instant.now();
    }

    public BigDecimal getWaterAbsoluteThreshold() {
        return waterAbsoluteThreshold;
    }

    public void setWaterAbsoluteThreshold(BigDecimal waterAbsoluteThreshold) {
        this.waterAbsoluteThreshold = waterAbsoluteThreshold;
        this.updatedAt = Instant.now();
    }

    public BigDecimal getElectricityAbsoluteThreshold() {
        return electricityAbsoluteThreshold;
    }

    public void setElectricityAbsoluteThreshold(BigDecimal electricityAbsoluteThreshold) {
        this.electricityAbsoluteThreshold = electricityAbsoluteThreshold;
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
