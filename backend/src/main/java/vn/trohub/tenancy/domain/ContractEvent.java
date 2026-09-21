package vn.trohub.tenancy.domain;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "contract_events")
public class ContractEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "contract_id", nullable = false)
    private UUID contractId;

    @Column(nullable = false, length = 50)
    private String type; // ACTIVATION, EXTENSION, CHECKOUT

    @Column(name = "old_value", columnDefinition = "TEXT")
    private String oldValue;

    @Column(name = "new_value", nullable = false, columnDefinition = "TEXT")
    private String newValue;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String reason;

    @Column(name = "actor_id", nullable = false)
    private UUID actorId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public ContractEvent() {}

    public ContractEvent(UUID contractId, String type, String oldValue, String newValue, String reason, UUID actorId) {
        this.contractId = contractId;
        this.type = type;
        this.oldValue = oldValue;
        this.newValue = newValue;
        this.reason = reason;
        this.actorId = actorId;
    }

    public UUID getId() {
        return id;
    }

    public UUID getContractId() {
        return contractId;
    }

    public String getType() {
        return type;
    }

    public String getOldValue() {
        return oldValue;
    }

    public String getNewValue() {
        return newValue;
    }

    public String getReason() {
        return reason;
    }

    public UUID getActorId() {
        return actorId;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
