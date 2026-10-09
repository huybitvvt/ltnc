package vn.trohub.operations.domain;

import jakarta.persistence.*;
import vn.trohub.user.domain.User;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "invoice_feedback_replies")
public class InvoiceFeedbackReply {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "feedback_id", nullable = false)
    private InvoiceFeedback feedback;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "actor_id", nullable = false)
    private User actor;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String message;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public InvoiceFeedbackReply() {}

    public InvoiceFeedbackReply(InvoiceFeedback feedback, User actor, String message) {
        this.feedback = feedback;
        this.actor = actor;
        this.message = message;
        this.createdAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public InvoiceFeedback getFeedback() {
        return feedback;
    }

    public void setFeedback(InvoiceFeedback feedback) {
        this.feedback = feedback;
    }

    public User getActor() {
        return actor;
    }

    public void setActor(User actor) {
        this.actor = actor;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
