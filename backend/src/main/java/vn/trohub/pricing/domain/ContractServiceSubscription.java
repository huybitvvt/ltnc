package vn.trohub.pricing.domain;

import jakarta.persistence.*;
import vn.trohub.tenancy.domain.Contract;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "contract_service_subscriptions", uniqueConstraints = {
    @UniqueConstraint(name = "uq_contract_service_period", columnNames = {"contract_id", "service_id", "start_month"})
})
public class ContractServiceSubscription {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "contract_id", nullable = false)
    private Contract contract;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "service_id", nullable = false)
    private ServiceDefinition service;

    @Column(name = "start_month", nullable = false, length = 7)
    private String startMonth; // YYYY-MM

    @Column(name = "end_month_exclusive", length = 7)
    private String endMonthExclusive; // YYYY-MM nullable

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Version
    private Long version = 0L;

    public ContractServiceSubscription() {}

    public ContractServiceSubscription(Contract contract, ServiceDefinition service, String startMonth, String endMonthExclusive) {
        this.contract = contract;
        this.service = service;
        this.startMonth = startMonth;
        this.endMonthExclusive = endMonthExclusive;
        this.createdAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public Contract getContract() {
        return contract;
    }

    public void setContract(Contract contract) {
        this.contract = contract;
    }

    public ServiceDefinition getService() {
        return service;
    }

    public void setService(ServiceDefinition service) {
        this.service = service;
    }

    public String getStartMonth() {
        return startMonth;
    }

    public void setStartMonth(String startMonth) {
        this.startMonth = startMonth;
    }

    public String getEndMonthExclusive() {
        return endMonthExclusive;
    }

    public void setEndMonthExclusive(String endMonthExclusive) {
        this.endMonthExclusive = endMonthExclusive;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Long getVersion() {
        return version;
    }
}
