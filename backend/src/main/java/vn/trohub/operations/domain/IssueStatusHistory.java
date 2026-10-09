package vn.trohub.operations.domain;

import jakarta.persistence.*;
import vn.trohub.user.domain.User;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "issue_status_history")
public class IssueStatusHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "issue_id", nullable = false)
    private MaintenanceIssue issue;

    @Enumerated(EnumType.STRING)
    @Column(name = "old_status", nullable = false, length = 20)
    private IssueStatus oldStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "new_status", nullable = false, length = 20)
    private IssueStatus newStatus;

    @Column(columnDefinition = "TEXT")
    private String comment;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "actor_id", nullable = false)
    private User actor;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public IssueStatusHistory() {}

    public IssueStatusHistory(MaintenanceIssue issue, IssueStatus oldStatus, IssueStatus newStatus, String comment, User actor) {
        this.issue = issue;
        this.oldStatus = oldStatus;
        this.newStatus = newStatus;
        this.comment = comment;
        this.actor = actor;
        this.createdAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public MaintenanceIssue getIssue() {
        return issue;
    }

    public void setIssue(MaintenanceIssue issue) {
        this.issue = issue;
    }

    public IssueStatus getOldStatus() {
        return oldStatus;
    }

    public void setOldStatus(IssueStatus oldStatus) {
        this.oldStatus = oldStatus;
    }

    public IssueStatus getNewStatus() {
        return newStatus;
    }

    public void setNewStatus(IssueStatus newStatus) {
        this.newStatus = newStatus;
    }

    public String getComment() {
        return comment;
    }

    public void setComment(String comment) {
        this.comment = comment;
    }

    public User getActor() {
        return actor;
    }

    public void setActor(User actor) {
        this.actor = actor;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
