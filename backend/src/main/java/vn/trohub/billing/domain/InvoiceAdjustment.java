package vn.trohub.billing.domain;

import jakarta.persistence.*;
import vn.trohub.user.domain.User;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "invoice_adjustments")
public class InvoiceAdjustment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "invoice_id", nullable = false)
    private Invoice invoice;

    @Column(name = "delta_amount", nullable = false, precision = 19, scale = 0)
    private BigDecimal deltaAmount;

    @Column(name = "reason", nullable = false, columnDefinition = "TEXT")
    private String reason;

    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.JSON)
    @Column(name = "old_snapshot", nullable = false, columnDefinition = "JSONB")
    private String oldSnapshot;

    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.JSON)
    @Column(name = "new_snapshot", nullable = false, columnDefinition = "JSONB")
    private String newSnapshot;

    @Column(name = "effective_date", nullable = false)
    private LocalDate effectiveDate;

    @Column(name = "recorded_at", nullable = false, updatable = false)
    private Instant recordedAt = Instant.now();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "operation_id", nullable = false)
    private FinancialOperation operation;

    public InvoiceAdjustment() {
    }

    public InvoiceAdjustment(Invoice invoice, BigDecimal deltaAmount, String reason, String oldSnapshot, String newSnapshot, LocalDate effectiveDate, User createdBy, FinancialOperation operation) {
        this.invoice = invoice;
        this.deltaAmount = deltaAmount;
        this.reason = reason;
        this.oldSnapshot = oldSnapshot;
        this.newSnapshot = newSnapshot;
        this.effectiveDate = effectiveDate;
        this.createdBy = createdBy;
        this.operation = operation;
        this.recordedAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public Invoice getInvoice() {
        return invoice;
    }

    public void setInvoice(Invoice invoice) {
        this.invoice = invoice;
    }

    public BigDecimal getDeltaAmount() {
        return deltaAmount;
    }

    public void setDeltaAmount(BigDecimal deltaAmount) {
        this.deltaAmount = deltaAmount;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public String getOldSnapshot() {
        return oldSnapshot;
    }

    public void setOldSnapshot(String oldSnapshot) {
        this.oldSnapshot = oldSnapshot;
    }

    public String getNewSnapshot() {
        return newSnapshot;
    }

    public void setNewSnapshot(String newSnapshot) {
        this.newSnapshot = newSnapshot;
    }

    public LocalDate getEffectiveDate() {
        return effectiveDate;
    }

    public void setEffectiveDate(LocalDate effectiveDate) {
        this.effectiveDate = effectiveDate;
    }

    public Instant getRecordedAt() {
        return recordedAt;
    }

    public User getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(User createdBy) {
        this.createdBy = createdBy;
    }

    public FinancialOperation getOperation() {
        return operation;
    }

    public void setOperation(FinancialOperation operation) {
        this.operation = operation;
    }
}
