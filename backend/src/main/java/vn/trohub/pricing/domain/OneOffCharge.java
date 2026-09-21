package vn.trohub.pricing.domain;

import jakarta.persistence.*;
import vn.trohub.tenancy.domain.Contract;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "one_off_charges")
public class OneOffCharge {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "contract_id", nullable = false)
    private Contract contract;

    @Column(name = "billing_month", nullable = false, length = 7)
    private String billingMonth; // YYYY-MM

    @Column(nullable = false, length = 100)
    private String label;

    @Column(nullable = false, precision = 19, scale = 0)
    private BigDecimal amount;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String reason;

    @Column(name = "source_ref", length = 100)
    private String sourceRef;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public OneOffCharge() {}

    public OneOffCharge(Contract contract, String billingMonth, String label, BigDecimal amount, String reason, String sourceRef) {
        this.contract = contract;
        this.billingMonth = billingMonth;
        this.label = label;
        this.amount = amount;
        this.reason = reason;
        this.sourceRef = sourceRef;
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

    public String getBillingMonth() {
        return billingMonth;
    }

    public void setBillingMonth(String billingMonth) {
        this.billingMonth = billingMonth;
    }

    public String getLabel() {
        return label;
    }

    public void setLabel(String label) {
        this.label = label;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public String getSourceRef() {
        return sourceRef;
    }

    public void setSourceRef(String sourceRef) {
        this.sourceRef = sourceRef;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
