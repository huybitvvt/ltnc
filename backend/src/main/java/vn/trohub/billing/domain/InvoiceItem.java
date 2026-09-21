package vn.trohub.billing.domain;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "invoice_items")
public class InvoiceItem {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "invoice_id", nullable = false)
    private Invoice invoice;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 30)
    private InvoiceItemType type;

    @Column(name = "label", nullable = false, length = 100)
    private String label;

    @Column(name = "quantity", nullable = false, precision = 18, scale = 3)
    private BigDecimal quantity;

    @Column(name = "unit_price", nullable = false, precision = 19, scale = 0)
    private BigDecimal unitPrice;

    @Column(name = "amount", nullable = false, precision = 19, scale = 0)
    private BigDecimal amount;

    @Column(name = "calculation_snapshot", nullable = false, columnDefinition = "JSONB")
    private String calculationSnapshot;

    @Column(name = "reading_refs", columnDefinition = "JSONB")
    private String readingRefs;

    @Column(name = "tariff_ref")
    private UUID tariffRef;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public InvoiceItem() {
    }

    public InvoiceItem(Invoice invoice, InvoiceItemType type, String label, BigDecimal quantity, BigDecimal unitPrice, BigDecimal amount, String calculationSnapshot, String readingRefs, UUID tariffRef) {
        this.invoice = invoice;
        this.type = type;
        this.label = label;
        this.quantity = quantity;
        this.unitPrice = unitPrice;
        this.amount = amount;
        this.calculationSnapshot = calculationSnapshot;
        this.readingRefs = readingRefs;
        this.tariffRef = tariffRef;
        this.createdAt = Instant.now();
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

    public InvoiceItemType getType() {
        return type;
    }

    public void setType(InvoiceItemType type) {
        this.type = type;
    }

    public String getLabel() {
        return label;
    }

    public void setLabel(String label) {
        this.label = label;
    }

    public BigDecimal getQuantity() {
        return quantity;
    }

    public void setQuantity(BigDecimal quantity) {
        this.quantity = quantity;
    }

    public BigDecimal getUnitPrice() {
        return unitPrice;
    }

    public void setUnitPrice(BigDecimal unitPrice) {
        this.unitPrice = unitPrice;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public String getCalculationSnapshot() {
        return calculationSnapshot;
    }

    public void setCalculationSnapshot(String calculationSnapshot) {
        this.calculationSnapshot = calculationSnapshot;
    }

    public String getReadingRefs() {
        return readingRefs;
    }

    public void setReadingRefs(String readingRefs) {
        this.readingRefs = readingRefs;
    }

    public UUID getTariffRef() {
        return tariffRef;
    }

    public void setTariffRef(UUID tariffRef) {
        this.tariffRef = tariffRef;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
