package vn.trohub.billing.domain;

import jakarta.persistence.*;
import vn.trohub.user.domain.User;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "financial_operations")
public class FinancialOperation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "idempotency_key", nullable = false, length = 100)
    private String idempotencyKey;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actor_id", nullable = false)
    private User actor;

    @Enumerated(EnumType.STRING)
    @Column(name = "action", nullable = false, length = 50)
    private FinancialAction action;

    @Column(name = "request_hash", nullable = false, length = 64)
    private String requestHash;

    @Column(name = "status", nullable = false, length = 20)
    private String status; // SUCCESS, FAILED

    @Column(name = "response_snapshot", nullable = false, columnDefinition = "TEXT")
    private String responseSnapshot;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public FinancialOperation() {
    }

    public FinancialOperation(String idempotencyKey, User actor, FinancialAction action, String requestHash, String status, String responseSnapshot) {
        this.idempotencyKey = idempotencyKey;
        this.actor = actor;
        this.action = action;
        this.requestHash = requestHash;
        this.status = status;
        this.responseSnapshot = responseSnapshot;
        this.createdAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public String getIdempotencyKey() {
        return idempotencyKey;
    }

    public User getActor() {
        return actor;
    }

    public FinancialAction getAction() {
        return action;
    }

    public String getRequestHash() {
        return requestHash;
    }

    public String getStatus() {
        return status;
    }

    public String getResponseSnapshot() {
        return responseSnapshot;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setResponseSnapshot(String responseSnapshot) {
        this.responseSnapshot = responseSnapshot;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
