package vn.trohub.metering.domain;

import jakarta.persistence.*;
import vn.trohub.user.domain.User;
import vn.trohub.tenancy.domain.Contract;
import vn.trohub.tenancy.domain.MeterType;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "consumption_alerts")
public class ConsumptionAlert {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "contract_id", nullable = false)
    private Contract contract;

    @Enumerated(EnumType.STRING)
    @Column(name = "meter_type", nullable = false, length = 20)
    private MeterType meterType;

    @Column(name = "billing_month", nullable = false, length = 7)
    private String billingMonth; // YYYY-MM

    @Column(name = "reading_version", nullable = false)
    private Long readingVersion = 0L;

    @Enumerated(EnumType.STRING)
    @Column(name = "evaluation_status", nullable = false, length = 30)
    private EvaluationStatus evaluationStatus;

    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.JSON)
    @Column(name = "comparison_snapshot", nullable = false, columnDefinition = "JSONB")
    private String comparisonSnapshot; // JSON string chứa snapshot so sánh

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "acknowledged_by")
    private User acknowledgedBy;

    @Column(name = "acknowledged_at")
    private Instant acknowledgedAt;

    @Column(columnDefinition = "TEXT")
    private String reason;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public ConsumptionAlert() {}

    public ConsumptionAlert(Contract contract, MeterType meterType, String billingMonth,
                            Long readingVersion, EvaluationStatus evaluationStatus,
                            String comparisonSnapshot) {
        this.contract = contract;
        this.meterType = meterType;
        this.billingMonth = billingMonth;
        this.readingVersion = readingVersion;
        this.evaluationStatus = evaluationStatus;
        this.comparisonSnapshot = comparisonSnapshot;
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

    public MeterType getMeterType() {
        return meterType;
    }

    public void setMeterType(MeterType meterType) {
        this.meterType = meterType;
    }

    public String getBillingMonth() {
        return billingMonth;
    }

    public void setBillingMonth(String billingMonth) {
        this.billingMonth = billingMonth;
    }

    public Long getReadingVersion() {
        return readingVersion;
    }

    public void setReadingVersion(Long readingVersion) {
        this.readingVersion = readingVersion;
    }

    public EvaluationStatus getEvaluationStatus() {
        return evaluationStatus;
    }

    public void setEvaluationStatus(EvaluationStatus evaluationStatus) {
        this.evaluationStatus = evaluationStatus;
    }

    public String getComparisonSnapshot() {
        return comparisonSnapshot;
    }

    public void setComparisonSnapshot(String comparisonSnapshot) {
        this.comparisonSnapshot = comparisonSnapshot;
    }

    public User getAcknowledgedBy() {
        return acknowledgedBy;
    }

    public void setAcknowledgedBy(User acknowledgedBy) {
        this.acknowledgedBy = acknowledgedBy;
    }

    public Instant getAcknowledgedAt() {
        return acknowledgedAt;
    }

    public void setAcknowledgedAt(Instant acknowledgedAt) {
        this.acknowledgedAt = acknowledgedAt;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
