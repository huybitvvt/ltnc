package vn.trohub.billing.domain;

import jakarta.persistence.*;
import vn.trohub.tenancy.domain.Contract;
import vn.trohub.user.domain.User;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "invoice_ledger_entries")
public class InvoiceLedgerEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "invoice_id", nullable = false)
    private Invoice invoice;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contract_id", nullable = false)
    private Contract contract;

    @Enumerated(EnumType.STRING)
    @Column(name = "entry_type", nullable = false, length = 32)
    private LedgerEntryType entryType;

    @Column(nullable = false, precision = 19, scale = 0)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method", nullable = false, length = 32)
    private PaymentMethod paymentMethod;

    @Column(name = "reference_code", length = 128)
    private String referenceCode;

    @Column(columnDefinition = "TEXT")
    private String note;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ref_entry_id")
    private InvoiceLedgerEntry refEntry;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "operation_id")
    private FinancialOperation operation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actor_id", nullable = false)
    private User actor;

    @Column(name = "recorded_at", nullable = false, updatable = false)
    private Instant recordedAt = Instant.now();
    @Column(name = "effective_date", nullable = false, updatable = false)
    private java.time.LocalDate effectiveDate = java.time.LocalDate.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh"));

    public java.time.LocalDate getEffectiveDate() { return effectiveDate; }
    public void setEffectiveDate(java.time.LocalDate date) { this.effectiveDate = date; }

    public InvoiceLedgerEntry() {}

    public InvoiceLedgerEntry(Invoice invoice,
                              Contract contract,
                              LedgerEntryType entryType,
                              BigDecimal amount,
                              PaymentMethod paymentMethod,
                              String referenceCode,
                              String note,
                              InvoiceLedgerEntry refEntry,
                              FinancialOperation operation,
                              User actor) {
        this.invoice = invoice;
        this.contract = contract;
        this.entryType = entryType;
        this.amount = amount;
        this.paymentMethod = paymentMethod;
        this.referenceCode = referenceCode;
        this.note = note;
        this.refEntry = refEntry;
        this.operation = operation;
        this.actor = actor;
        this.recordedAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public Invoice getInvoice() {
        return invoice;
    }

    public void setInvoice(Invoice invoice) {
        this.invoice = invoice;
    }

    public Contract getContract() {
        return contract;
    }

    public void setContract(Contract contract) {
        this.contract = contract;
    }

    public LedgerEntryType getEntryType() {
        return entryType;
    }

    public void setEntryType(LedgerEntryType entryType) {
        this.entryType = entryType;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public PaymentMethod getPaymentMethod() {
        return paymentMethod;
    }

    public void setPaymentMethod(PaymentMethod paymentMethod) {
        this.paymentMethod = paymentMethod;
    }

    public String getReferenceCode() {
        return referenceCode;
    }

    public void setReferenceCode(String referenceCode) {
        this.referenceCode = referenceCode;
    }

    public String getNote() {
        return note;
    }

    public void setNote(String note) {
        this.note = note;
    }

    public InvoiceLedgerEntry getRefEntry() {
        return refEntry;
    }

    public void setRefEntry(InvoiceLedgerEntry refEntry) {
        this.refEntry = refEntry;
    }

    public FinancialOperation getOperation() {
        return operation;
    }

    public void setOperation(FinancialOperation operation) {
        this.operation = operation;
    }

    public User getActor() {
        return actor;
    }

    public void setActor(User actor) {
        this.actor = actor;
    }

    public Instant getRecordedAt() {
        return recordedAt;
    }

    public void setRecordedAt(Instant recordedAt) {
        this.recordedAt = recordedAt;
    }
}
