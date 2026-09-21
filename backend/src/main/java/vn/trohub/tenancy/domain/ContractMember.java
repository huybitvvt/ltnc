package vn.trohub.tenancy.domain;

import jakarta.persistence.*;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "contract_members")
public class ContractMember {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "contract_id", nullable = false)
    private Contract contract;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tenant_id", nullable = false)
    private TenantProfile tenant;

    @Column(name = "joined_on", nullable = false)
    private LocalDate joinedOn;

    @Column(name = "left_on")
    private LocalDate leftOn;

    @Column(name = "is_representative", nullable = false)
    private boolean isRepresentative = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @Version
    private Long version = 0L;

    public ContractMember() {}

    public ContractMember(Contract contract, TenantProfile tenant, LocalDate joinedOn, boolean isRepresentative) {
        this.contract = contract;
        this.tenant = tenant;
        this.joinedOn = joinedOn;
        this.isRepresentative = isRepresentative;
    }

    public UUID getId() {
        return id;
    }

    public Contract getContract() {
        return contract;
    }

    public void setContract(Contract contract) {
        this.contract = contract;
    }

    public TenantProfile getTenant() {
        return tenant;
    }

    public void setTenant(TenantProfile tenant) {
        this.tenant = tenant;
    }

    public LocalDate getJoinedOn() {
        return joinedOn;
    }

    public void setJoinedOn(LocalDate joinedOn) {
        this.joinedOn = joinedOn;
        this.updatedAt = Instant.now();
    }

    public LocalDate getLeftOn() {
        return leftOn;
    }

    public void setLeftOn(LocalDate leftOn) {
        this.leftOn = leftOn;
        this.updatedAt = Instant.now();
    }

    public boolean isRepresentative() {
        return isRepresentative;
    }

    public void setRepresentative(boolean representative) {
        isRepresentative = representative;
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
