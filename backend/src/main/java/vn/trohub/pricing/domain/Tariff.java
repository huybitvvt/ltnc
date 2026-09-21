package vn.trohub.pricing.domain;

import jakarta.persistence.*;
import vn.trohub.property.domain.Building;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "tariffs", uniqueConstraints = {
    @UniqueConstraint(name = "uq_building_service_month", columnNames = {"building_id", "service_id", "effective_month"})
})
public class Tariff {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "building_id", nullable = false)
    private Building building;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "service_id", nullable = false)
    private ServiceDefinition service;

    @Column(name = "effective_month", nullable = false, length = 7)
    private String effectiveMonth; // YYYY-MM

    @Column(name = "unit_price", nullable = false, precision = 19, scale = 0)
    private BigDecimal unitPrice;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @Version
    private Long version = 0L;

    public Tariff() {}

    public Tariff(Building building, ServiceDefinition service, String effectiveMonth, BigDecimal unitPrice) {
        this.building = building;
        this.service = service;
        this.effectiveMonth = effectiveMonth;
        this.unitPrice = unitPrice;
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

    public ServiceDefinition getService() {
        return service;
    }

    public void setService(ServiceDefinition service) {
        this.service = service;
    }

    public String getEffectiveMonth() {
        return effectiveMonth;
    }

    public void setEffectiveMonth(String effectiveMonth) {
        this.effectiveMonth = effectiveMonth;
    }

    public BigDecimal getUnitPrice() {
        return unitPrice;
    }

    public void setUnitPrice(BigDecimal unitPrice) {
        this.unitPrice = unitPrice;
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
