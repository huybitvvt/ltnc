package vn.trohub.billing.domain;

import jakarta.persistence.*;
import vn.trohub.tenancy.domain.Contract;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "invoices", uniqueConstraints = {
    @UniqueConstraint(name = "uq_invoice_contract_month", columnNames = {"contract_id", "billing_month"})
})
public class Invoice {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contract_id", nullable = false)
    private Contract contract;

    @Column(name = "billing_month", nullable = false, length = 7)
    private String billingMonth;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private InvoiceStatus status = InvoiceStatus.DRAFT;

    @Column(name = "period_start", nullable = false)
    private LocalDate periodStart;

    @Column(name = "period_end_exclusive", nullable = false)
    private LocalDate periodEndExclusive;

    @Column(name = "due_date", nullable = false)
    private LocalDate dueDate;

    @Column(name = "issued_at")
    private Instant issuedAt;

    @OneToMany(mappedBy = "invoice", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<InvoiceItem> items = new ArrayList<>();

    @OneToMany(mappedBy = "invoice", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<InvoiceAdjustment> adjustments = new ArrayList<>();

    @OneToMany(mappedBy = "invoice", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<InvoiceNote> notes = new ArrayList<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @Version
    @Column(name = "version", nullable = false)
    private Long version = 0L;

    public Invoice() {
    }

    public Invoice(Contract contract, String billingMonth, InvoiceStatus status, LocalDate periodStart, LocalDate periodEndExclusive, LocalDate dueDate) {
        this.contract = contract;
        this.billingMonth = billingMonth;
        this.status = status;
        this.periodStart = periodStart;
        this.periodEndExclusive = periodEndExclusive;
        this.dueDate = dueDate;
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = Instant.now();
    }

    public void addItem(InvoiceItem item) {
        items.add(item);
        item.setInvoice(this);
    }

    public void clearItems() {
        items.clear();
    }

    public void addAdjustment(InvoiceAdjustment adjustment) {
        adjustments.add(adjustment);
        adjustment.setInvoice(this);
    }

    public void addNote(InvoiceNote note) {
        notes.add(note);
        note.setInvoice(this);
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

    public InvoiceStatus getStatus() {
        return status;
    }

    public void setStatus(InvoiceStatus status) {
        this.status = status;
    }

    public LocalDate getPeriodStart() {
        return periodStart;
    }

    public void setPeriodStart(LocalDate periodStart) {
        this.periodStart = periodStart;
    }

    public LocalDate getPeriodEndExclusive() {
        return periodEndExclusive;
    }

    public void setPeriodEndExclusive(LocalDate periodEndExclusive) {
        this.periodEndExclusive = periodEndExclusive;
    }

    public LocalDate getDueDate() {
        return dueDate;
    }

    public void setDueDate(LocalDate dueDate) {
        this.dueDate = dueDate;
    }

    public Instant getIssuedAt() {
        return issuedAt;
    }

    public void setIssuedAt(Instant issuedAt) {
        this.issuedAt = issuedAt;
    }

    public List<InvoiceItem> getItems() {
        return items;
    }

    public List<InvoiceAdjustment> getAdjustments() {
        return adjustments;
    }

    public List<InvoiceNote> getNotes() {
        return notes;
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

    @Transient
    private BigDecimal transientOriginalTotal;

    public BigDecimal getOriginalTotal() {
        if (transientOriginalTotal != null) {
            return transientOriginalTotal;
        }
        if (items == null || items.isEmpty()) {
            return BigDecimal.ZERO;
        }
        return items.stream()
                .map(InvoiceItem::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    public void setOriginalTotal(BigDecimal total) {
        this.transientOriginalTotal = total;
    }
}
